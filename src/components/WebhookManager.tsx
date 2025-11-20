import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Loader2, TestTube } from "lucide-react"

interface WebhookSetting {
  id: string
  webhook_type: string
  webhook_url: string
  description: string
  is_active: boolean
}

export const WebhookManager = () => {
  const [webhooks, setWebhooks] = useState<WebhookSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [testing, setTesting] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadWebhooks()
  }, [])

  const loadWebhooks = async () => {
    try {
      const { data, error } = await supabase
        .from('webhook_settings')
        .select('*')
        .order('webhook_type')

      if (error) throw error
      setWebhooks(data || [])
    } catch (error) {
      console.error('Error loading webhooks:', error)
      toast({
        title: "Fehler",
        description: "Webhooks konnten nicht geladen werden",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const updateWebhook = async (id: string, updates: Partial<WebhookSetting>) => {
    setSaving(id)
    try {
      const { error } = await supabase
        .from('webhook_settings')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      setWebhooks(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w))
      
      toast({
        title: "Gespeichert",
        description: "Webhook-Einstellung wurde aktualisiert"
      })
    } catch (error) {
      console.error('Error updating webhook:', error)
      toast({
        title: "Fehler",
        description: "Webhook konnte nicht aktualisiert werden",
        variant: "destructive"
      })
    } finally {
      setSaving(null)
    }
  }

  const testWebhook = async (webhookType: string) => {
    setTesting(webhookType)
    try {
      const { data, error } = await supabase.functions.invoke('send-test-reactivation-webhook', {
        body: { webhook_type: webhookType }
      })

      if (error) throw error

      toast({
        title: "Test erfolgreich",
        description: "Test-Webhook wurde gesendet"
      })
    } catch (error) {
      console.error('Error testing webhook:', error)
      toast({
        title: "Fehler",
        description: "Test-Webhook konnte nicht gesendet werden",
        variant: "destructive"
      })
    } finally {
      setTesting(null)
    }
  }

  const getWebhookLabel = (type: string) => {
    switch (type) {
      case 'member_registration':
        return 'Mitglieder-Anmeldung'
      case 'member_reactivation':
        return 'Mitglieder-Reaktivierung'
      default:
        return type
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhook-Verwaltung</CardTitle>
        <CardDescription>
          Konfiguriere Webhooks für verschiedene Events
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {webhooks.map((webhook) => (
          <div key={webhook.id} className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{getWebhookLabel(webhook.webhook_type)}</h3>
                <p className="text-sm text-muted-foreground">{webhook.description}</p>
              </div>
              <Switch
                checked={webhook.is_active}
                onCheckedChange={(checked) => 
                  updateWebhook(webhook.id, { is_active: checked })
                }
                disabled={saving === webhook.id}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`url-${webhook.id}`}>Webhook URL</Label>
              <div className="flex gap-2">
                <Input
                  id={`url-${webhook.id}`}
                  type="url"
                  placeholder="https://hook.eu2.make.com/..."
                  value={webhook.webhook_url}
                  onChange={(e) => {
                    setWebhooks(prev => prev.map(w => 
                      w.id === webhook.id ? { ...w, webhook_url: e.target.value } : w
                    ))
                  }}
                  className="flex-1"
                />
                <Button
                  onClick={() => updateWebhook(webhook.id, { webhook_url: webhook.webhook_url })}
                  disabled={saving === webhook.id}
                >
                  {saving === webhook.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Speichern"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => testWebhook(webhook.webhook_type)}
                  disabled={!webhook.webhook_url || testing === webhook.webhook_type}
                >
                  {testing === webhook.webhook_type ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <TestTube className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
