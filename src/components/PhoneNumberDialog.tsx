import { useState } from "react"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"

interface PhoneNumberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  onComplete: () => void
}

const countryCodes = [
  { code: "+49", country: "DE", flag: "🇩🇪" },
  { code: "+43", country: "AT", flag: "🇦🇹" },
  { code: "+41", country: "CH", flag: "🇨🇭" },
  { code: "+31", country: "NL", flag: "🇳🇱" },
  { code: "+32", country: "BE", flag: "🇧🇪" },
  { code: "+33", country: "FR", flag: "🇫🇷" },
  { code: "+39", country: "IT", flag: "🇮🇹" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+1", country: "US", flag: "🇺🇸" },
]

export const PhoneNumberDialog: React.FC<PhoneNumberDialogProps> = ({
  open,
  onOpenChange,
  userId,
  onComplete
}) => {
  const [countryCode, setCountryCode] = useState("+49")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [saving, setSaving] = useState(false)

  const handlePhoneChange = (value: string) => {
    // Only allow numbers and remove spaces
    const cleaned = value.replace(/[^\d]/g, '')
    setPhoneNumber(cleaned)
  }

  const handleSave = async () => {
    if (!phoneNumber || phoneNumber.length < 6) {
      toast.error("Bitte gib eine gültige Telefonnummer ein")
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          phone_country_code: countryCode,
          phone_number: phoneNumber,
          notify_whatsapp_enabled: true,
          phone_prompt_shown: true
        })
        .eq('user_id', userId)

      if (error) throw error

      toast.success("WhatsApp-Benachrichtigungen aktiviert!")
      onComplete()
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving phone number:', error)
      toast.error("Fehler beim Speichern der Telefonnummer")
    } finally {
      setSaving(false)
    }
  }

  const handleDecline = async () => {
    try {
      await supabase
        .from('profiles')
        .update({ phone_prompt_shown: true })
        .eq('user_id', userId)
    } catch (error) {
      console.error('Error updating phone_prompt_shown:', error)
    }
    onComplete()
    onOpenChange(false)
  }

  const handleLater = async () => {
    try {
      await supabase
        .from('profiles')
        .update({ phone_prompt_shown: true })
        .eq('user_id', userId)
    } catch (error) {
      console.error('Error updating phone_prompt_shown:', error)
    }
    onComplete()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          {/* WhatsApp Logo */}
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-white fill-current" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-foreground">
            Neu: WhatsApp Benachrichtigungen!
          </h2>

          {/* Description */}
          <p className="text-muted-foreground text-sm">
            Erhalte Benachrichtigungen zu Einladungen, Warteliste, etc, direkt per WhatsApp.
          </p>

          {/* Phone Input */}
          <div className="w-full flex gap-2">
            <Select value={countryCode} onValueChange={setCountryCode}>
              <SelectTrigger className="w-[110px]">
                <SelectValue>
                  <span className="flex items-center gap-1">
                    <span>{countryCodes.find(cc => cc.code === countryCode)?.flag}</span>
                    <span>{countryCode}</span>
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-background">
                {countryCodes.map((cc) => (
                  <SelectItem key={cc.code} value={cc.code}>
                    <span className="flex items-center gap-1">
                      <span>{cc.flag}</span>
                      <span>{cc.code}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="tel"
              inputMode="numeric"
              placeholder="15730440756"
              value={phoneNumber}
              onChange={(e) => handlePhoneChange(e.target.value)}
              className="flex-1"
            />
          </div>

          {/* Save Button */}
          <Button 
            onClick={handleSave} 
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={saving || !phoneNumber}
          >
            {saving ? "Speichern..." : "Nummer hinterlegen"}
          </Button>

          {/* Decline/Later Options */}
          <div className="flex justify-between w-full pt-2">
            <Button 
              variant="ghost" 
              onClick={handleDecline}
              className="text-muted-foreground text-sm"
            >
              Ablehnen
            </Button>
            <Button 
              variant="ghost" 
              onClick={handleLater}
              className="text-muted-foreground text-sm"
            >
              Später
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
