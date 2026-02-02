import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Send, Copy, CheckCircle } from "lucide-react";

interface WebhookDefinition {
  id: string;
  name: string;
  description: string;
  eventType: string;
  testFunction: string;
  samplePayload: Record<string, unknown>;
}

const webhookDefinitions: WebhookDefinition[] = [
  {
    id: "registration",
    name: "Mitglieder-Registrierung",
    description: "Wird gesendet wenn ein Admin ein neues Mitglied anlegt",
    eventType: "registration",
    testFunction: "send-test-registration-webhook",
    samplePayload: {
      event_type: "registration",
      notification_method: "email | whatsapp | both",
      phone: "4915730440756",
      name: "Max Mustermann",
      first_name: "Max",
      last_name: "Mustermann",
      email: "max@example.com",
      access_code: "123456",
      membership_type: "Premium Member"
    }
  },
  {
    id: "wellpass_registration",
    name: "Wellpass Registrierung",
    description: "Wird gesendet wenn sich jemand über das Wellpass-Widget registriert (gleiche Struktur wie Registrierung)",
    eventType: "registration",
    testFunction: "send-test-registration-webhook",
    samplePayload: {
      event_type: "registration",
      notification_method: "email | whatsapp | both",
      phone: "4915730440756",
      name: "Max Mustermann",
      first_name: "Max",
      last_name: "Mustermann",
      email: "max@example.com",
      access_code: "123456",
      membership_type: "Wellpass"
    }
  },
  {
    id: "guest_ticket",
    name: "Gast-Buchung (Drop-In/Probetraining)",
    description: "Wird gesendet wenn ein Gast über das Kursplan-Widget bucht",
    eventType: "guest_ticket",
    testFunction: "send-test-guest-booking-webhook",
    samplePayload: {
      event_type: "guest_ticket",
      notification_method: "email | whatsapp | both",
      phone: "4915730440756",
      guest_name: "Max Mustermann",
      guest_email: "max@example.com",
      booking_type: "probetraining | drop_in",
      ticket: {
        ticketId: "RISE-ABC123",
        courseTitle: "Functional Fitness",
        courseDate: "2025-02-01",
        courseTime: "18:00",
        trainer: "Flo"
      }
    }
  },
  {
    id: "news_email",
    name: "News Benachrichtigung",
    description: "Wird in Batches mit emails[] Array gesendet. Iterator in Make.com auf emails[] setzen!",
    eventType: "news_email",
    testFunction: "send-test-news-webhook",
    samplePayload: {
      event_type: "news_email",
      batch_number: 1,
      total_batches: 1,
      total_recipients: 2,
      timestamp: "2025-02-01T10:00:00Z",
      news: {
        id: "uuid",
        title: "News Titel",
        content: "<p>HTML Inhalt der News...</p>"
      },
      emails: [
        {
          email: "max@example.com",
          first_name: "Max",
          last_name: "Mustermann",
          membership_type: "Premium Member",
          subject: "News Titel",
          body: "<p>HTML Inhalt der News...</p>",
          notification_method: "both",
          phone: "4915730440756"
        },
        {
          email: "anna@example.com",
          first_name: "Anna",
          last_name: "Schmidt",
          membership_type: "Basic Member",
          subject: "News Titel",
          body: "<p>HTML Inhalt der News...</p>",
          notification_method: "email",
          phone: null
        }
      ]
    }
  },
  {
    id: "waitlist_promotion",
    name: "Wartelisten-Aufrückung",
    description: "Wird gesendet wenn jemand von der Warteliste nachrückt",
    eventType: "waitlist_promotion",
    testFunction: "send-test-waitlist-webhook",
    samplePayload: {
      event_type: "waitlist_promotion",
      notification_method: "email | whatsapp | both",
      phone: "4915730440756",
      user_id: "uuid",
      display_name: "Max Mustermann",
      first_name: "Max",
      email: "max@example.com",
      course_title: "Functional Fitness",
      course_date: "2025-02-01",
      course_time: "18:00",
      trainer: "Flo"
    }
  },
  {
    id: "no_show",
    name: "No-Show Benachrichtigung",
    description: "Wird gesendet wenn jemand nicht zum Kurs erschienen ist",
    eventType: "no_show",
    testFunction: "send-test-noshow-webhook",
    samplePayload: {
      event_type: "no_show",
      notification_method: "email | whatsapp | both",
      phone: "4915730440756",
      user_id: "uuid",
      display_name: "Max Mustermann",
      first_name: "Max",
      email: "max@example.com",
      course_title: "Functional Fitness",
      course_date: "2025-02-01",
      course_time: "18:00"
    }
  },
  {
    id: "course_invitation",
    name: "Kurs-Einladung",
    description: "Wird gesendet wenn ein Mitglied ein anderes zu einem Kurs einlädt",
    eventType: "course_invitation",
    testFunction: "send-test-invitation-webhook",
    samplePayload: {
      event_type: "course_invitation",
      notification_method: "email | whatsapp | both",
      sender: {
        display_name: "Anna Musterfrau",
        first_name: "Anna"
      },
      recipient: {
        display_name: "Max Mustermann",
        first_name: "Max",
        email: "max@example.com",
        phone: "4915730440756"
      },
      course: {
        title: "Functional Fitness",
        date: "2025-02-01",
        time: "18:00",
        trainer: "Flo"
      },
      message: "Komm doch mit!"
    }
  },
  {
    id: "course_cancellation",
    name: "Kurs-Absage (zu wenig Teilnehmer)",
    description: "Wird gesendet wenn ein Kurs wegen zu weniger Teilnehmer abgesagt wird",
    eventType: "course_cancelled_low_attendance",
    testFunction: "send-test-cancellation-webhook",
    samplePayload: {
      event_type: "course_cancelled_low_attendance",
      course: {
        id: "uuid",
        title: "Functional Fitness",
        date: "2025-02-01",
        start_time: "18:00:00",
        end_time: "19:00:00",
        trainer: "Flo"
      },
      registered_count: 2,
      minimum_required: 3,
      participants: [
        { email: "max@example.com", first_name: "Max", display_name: "Max Mustermann", phone: "4915730440756", notification_method: "both" }
      ],
      cancelled_at: "2025-02-01T10:00:00Z"
    }
  },
  {
    id: "member_reactivated",
    name: "Mitglied reaktiviert",
    description: "Wird gesendet wenn ein inaktives Mitglied wieder aktiv wird",
    eventType: "member_reactivated",
    testFunction: "send-test-reactivation-webhook",
    samplePayload: {
      event_type: "member_reactivated",
      user_id: "uuid",
      display_name: "Max Mustermann",
      first_name: "Max",
      last_name: "Mustermann",
      email: "max@example.com",
      access_code: "123456",
      membership_type: "Premium Member",
      reactivated_at: "2025-02-01T10:00:00Z",
      reactivation_trigger: "course_registration | training_session",
      days_inactive: 25
    }
  },
  {
    id: "member_inactivity",
    name: "Mitglied inaktiv",
    description: "Wird gesendet wenn ein Mitglied eine bestimmte Zeit inaktiv war",
    eventType: "member_inactive",
    testFunction: "send-test-inactivity-webhook",
    samplePayload: {
      event_type: "member_inactive",
      user_id: "uuid",
      display_name: "Max Mustermann",
      first_name: "Max",
      last_name: "Mustermann",
      email: "max@example.com",
      membership_type: "Premium Member",
      days_inactive: 14,
      last_activity_date: "2025-01-15",
      was_ever_active: true
    }
  }
];

export const AdminWebhookTester = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyPayload = (webhook: WebhookDefinition) => {
    navigator.clipboard.writeText(JSON.stringify(webhook.samplePayload, null, 2));
    setCopiedId(webhook.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: "Kopiert!",
      description: "Payload wurde in die Zwischenablage kopiert."
    });
  };

  const testWebhook = async (webhook: WebhookDefinition) => {
    setLoading(webhook.id);
    try {
      const { data, error } = await supabase.functions.invoke(webhook.testFunction);

      if (error) throw error;

      toast({
        title: "Test erfolgreich!",
        description: `Webhook "${webhook.name}" wurde gesendet.`
      });

      console.log("Webhook response:", data);
    } catch (error: any) {
      console.error("Webhook test error:", error);
      toast({
        title: "Fehler",
        description: error.message || "Webhook konnte nicht gesendet werden.",
        variant: "destructive"
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Webhook Tester</h2>
        <p className="text-muted-foreground">
          Teste alle Webhooks und sieh dir die Payload-Strukturen für Make.com an.
        </p>
        <div className="p-4 bg-muted rounded-lg space-y-3">
          <div>
            <p className="text-sm font-medium mb-2">Filter in Make.com:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <code className="bg-background px-1 rounded">notification_method = "email"</code> → Nur Email senden</li>
              <li>• <code className="bg-background px-1 rounded">notification_method = "whatsapp"</code> → Nur WhatsApp senden</li>
              <li>• <code className="bg-background px-1 rounded">notification_method = "both"</code> → Beides senden</li>
              <li>• <code className="bg-background px-1 rounded">phone</code> enthält formatierte Nummer ohne + (z.B. "4915730440756")</li>
            </ul>
          </div>
          <div className="border-t pt-2">
            <p className="text-sm font-medium mb-1 text-amber-600">⚠️ Bei News Benachrichtigung:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Iterator auf <code className="bg-background px-1 rounded">emails[]</code> setzen</li>
              <li>• Pro Empfänger: <code className="bg-background px-1 rounded">emails[].notification_method</code> und <code className="bg-background px-1 rounded">emails[].phone</code></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {webhookDefinitions.map((webhook) => (
          <Card key={webhook.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{webhook.name}</CardTitle>
                  <CardDescription>{webhook.description}</CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {webhook.eventType}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto max-h-64">
                  {JSON.stringify(webhook.samplePayload, null, 2)}
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyPayload(webhook)}
                >
                  {copiedId === webhook.id ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyPayload(webhook)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Payload kopieren
                </Button>
                <Button
                  size="sm"
                  onClick={() => testWebhook(webhook)}
                  disabled={loading === webhook.id}
                >
                  {loading === webhook.id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Test senden
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
