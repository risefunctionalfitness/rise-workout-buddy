import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { countryCodes, CountryFlag } from "@/components/CountryFlags";

export default function EmbedWellpass() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+49");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!termsAccepted) {
      setError("Bitte akzeptiere die AGB und Datenschutzerklärung");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('register-wellpass', {
        body: {
          firstName,
          lastName,
          email,
          accessCode,
          phoneCountryCode,
          phoneNumber: phoneNumber || null
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
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-[#242424] border-[#333] text-white">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-[#d6242b]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-[#d6242b]" />
            </div>
            <h2 className="text-xl font-bold mb-2">Willkommen im Rise!</h2>
            <p className="text-muted-foreground mb-4">
              Dein Account wurde erfolgreich erstellt.
            </p>
            <div className="bg-[#333] p-4 rounded-lg text-left space-y-2">
              <p className="text-sm"><strong>E-Mail:</strong> {email}</p>
              <p className="text-sm"><strong>Zugangscode:</strong> {accessCode}</p>
            </div>
            <p className="text-sm text-gray-400 mt-4">
              Du kannst dich jetzt in der Rise-App anmelden und Kurse buchen. Deine Zugangsdaten wurden dir auch per E-Mail zugesendet.
            </p>
            <Button 
              onClick={() => window.open('https://rise-ff.lovable.app', '_blank')}
              className="mt-4 w-full bg-[#12a6b0] hover:bg-[#0e8a93] text-white"
            >
              Zur Rise App
            </Button>
            <Button 
              onClick={() => {
                setIsSuccess(false);
                setFirstName("");
                setLastName("");
                setEmail("");
                setAccessCode("");
                setPhoneNumber("");
                setTermsAccepted(false);
                setError(null);
              }} 
              variant="outline" 
              className="mt-2 w-full border-[#444] text-white hover:bg-[#333]"
            >
              Weitere Registrierung
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#242424] border-[#333] text-white">
        <CardHeader className="text-center">
          <CardTitle className="text-white">Wellpass Registrierung</CardTitle>
          <CardDescription className="text-gray-400">
            Registriere dich als Wellpass-Mitglied und erhalte Zugang zur Rise-App
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-gray-300">Vorname *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Max"
                  required
                  className="bg-[#333] border-[#444] text-white placeholder:text-gray-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-gray-300">Nachname *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Mustermann"
                  required
                  className="bg-[#333] border-[#444] text-white placeholder:text-gray-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">E-Mail *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="max@beispiel.de"
                required
                className="bg-[#333] border-[#444] text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessCode" className="text-gray-300">Zugangscode (6 Ziffern) *</Label>
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
                className="bg-[#333] border-[#444] text-white placeholder:text-gray-500"
              />
              <p className="text-xs text-gray-500">
                Wähle einen 6-stelligen Code, den du dir gut merken kannst
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Telefon (für WhatsApp-Benachrichtigungen)</Label>
              <div className="flex gap-2">
                <Select value={phoneCountryCode} onValueChange={setPhoneCountryCode}>
                  <SelectTrigger className="w-[100px] bg-[#333] border-[#444] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#333] border-[#444]">
                    {countryCodes.map((cc) => (
                      <SelectItem key={cc.code} value={cc.code} className="text-white hover:bg-[#444]">
                        <div className="flex items-center gap-2">
                          <CountryFlag code={cc.code} />
                          <span>{cc.code}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="tel"
                  inputMode="numeric"
                  placeholder="15730440756"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 bg-[#333] border-[#444] text-white placeholder:text-gray-500"
                />
              </div>
              <p className="text-xs text-gray-500">
                Optional - für Buchungsbestätigungen per WhatsApp
              </p>
            </div>

            <div className="flex items-start gap-3 pt-2">
              <Checkbox 
                id="terms"
                checked={termsAccepted} 
                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                className="mt-0.5 border-[#444] data-[state=checked]:bg-[#12a6b0] data-[state=checked]:border-[#12a6b0]"
              />
              <Label htmlFor="terms" className="text-xs text-gray-400 leading-relaxed cursor-pointer">
                Ich akzeptiere die{' '}
                <a href="https://rise-ff.lovable.app/terms" target="_blank" rel="noopener noreferrer" className="text-[#12a6b0] hover:underline">
                  AGB
                </a>{' '}
                und{' '}
                <a href="https://rise-ff.lovable.app/privacy" target="_blank" rel="noopener noreferrer" className="text-[#12a6b0] hover:underline">
                  Datenschutzerklärung
                </a>{' '}
                *
              </Label>
            </div>

            {error && (
              <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-[#12a6b0] hover:bg-[#0e8a93] text-white" 
              disabled={isSubmitting || !termsAccepted}
            >
              {isSubmitting ? 'Wird registriert...' : 'Jetzt registrieren'}
            </Button>

            <p className="text-xs text-center text-gray-500">
              Mit der Registrierung erhältst du sofort Zugang zur Rise-App und kannst Kurse buchen.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}