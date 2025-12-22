import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import riseLogo from "@/assets/rise-logo-dark.png";

export default function EmbedWellpass() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('register-wellpass', {
        body: {
          firstName,
          lastName,
          email,
          accessCode
        }
      });

      if (fnError) throw fnError;

      if (data.success) {
        setIsSuccess(true);
        toast.success('Registrierung erfolgreich!');
      } else {
        setError(data.error || 'Registrierung fehlgeschlagen');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Willkommen im Rise!</h2>
            <p className="text-muted-foreground mb-4">
              Dein Account wurde erfolgreich erstellt.
            </p>
            <div className="bg-muted p-4 rounded-lg text-left space-y-2">
              <p className="text-sm"><strong>E-Mail:</strong> {email}</p>
              <p className="text-sm"><strong>Zugangscode:</strong> {accessCode}</p>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Du kannst dich jetzt in der Rise-App anmelden und Kurse buchen. Deine Zugangsdaten wurden dir auch per E-Mail zugesendet.
            </p>
            <Button 
              onClick={() => {
                setIsSuccess(false);
                setFirstName("");
                setLastName("");
                setEmail("");
                setAccessCode("");
                setError(null);
              }} 
              variant="outline" 
              className="mt-4"
            >
              Zurück zur Registrierung
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src={riseLogo} alt="Rise Fitness" className="h-12 mx-auto mb-2" />
          <CardTitle>Wellpass Registrierung</CardTitle>
          <CardDescription>
            Registriere dich als Wellpass-Mitglied und erhalte Zugang zur Rise-App
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">Vorname *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Max"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nachname *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Mustermann"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-Mail *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="max@beispiel.de"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessCode">Zugangscode (6 Ziffern) *</Label>
              <Input
                id="accessCode"
                value={accessCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setAccessCode(value);
                }}
                placeholder="123456"
                maxLength={6}
                pattern="[0-9]{6}"
                required
              />
              <p className="text-xs text-muted-foreground">
                Wähle einen 6-stelligen Code, den du dir gut merken kannst
              </p>
            </div>


            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Wird registriert...' : 'Jetzt registrieren'}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Mit der Registrierung erhältst du sofort Zugang zur Rise-App und kannst Kurse buchen.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
