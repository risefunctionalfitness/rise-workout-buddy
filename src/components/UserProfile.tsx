import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { LogOut, Dumbbell, Target, Moon, Sun, RotateCcw, Eye, EyeOff, AlertTriangle, Pencil } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useNavigate } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"
import { AvatarUpload } from "@/components/AvatarUpload"
import { useTheme } from "next-themes"
import UserBadges from "@/components/UserBadges"
import { YearlyTrainingHeatmap } from "@/components/YearlyTrainingHeatmap"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { countryCodes, countryCodeFlags } from "@/components/CountryFlags"

interface UserProfileProps {
  onClose: () => void
}

export const UserProfile: React.FC<UserProfileProps> = ({ onClose }) => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  
  // Form states
  const [displayName, setDisplayName] = useState("")
  const [nickname, setNickname] = useState("")
  const [accessCode, setAccessCode] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [userId, setUserId] = useState<string>("")
  const [membershipType, setMembershipType] = useState<string | null>(null)
  const [accessCodeError, setAccessCodeError] = useState("")
  const [showAccessCode, setShowAccessCode] = useState(false)
  const [userEmail, setUserEmail] = useState<string>("")
  
  // Notification settings
  const [notifyEmailEnabled, setNotifyEmailEnabled] = useState(true)
  const [notifyWhatsappEnabled, setNotifyWhatsappEnabled] = useState(false)
  const [phoneCountryCode, setPhoneCountryCode] = useState("+49")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [showPhoneInput, setShowPhoneInput] = useState(false)
  const [savingNotifications, setSavingNotifications] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)
      setUserEmail(user.email || "")

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (profile) {
        setDisplayName(profile.display_name || "")
        setNickname(profile.nickname || profile.display_name || "")
        setAccessCode(profile.access_code || "")
        setAvatarUrl(profile.avatar_url)
        setMembershipType(profile.membership_type || null)
        setNotifyEmailEnabled(profile.notify_email_enabled ?? true)
        setNotifyWhatsappEnabled(profile.notify_whatsapp_enabled ?? false)
        setPhoneCountryCode(profile.phone_country_code || "+49")
        setPhoneNumber(profile.phone_number || "")
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const validateAccessCode = (code: string) => {
    if (!code) {
      setAccessCodeError("Zugangscode ist erforderlich")
      return false
    }
    if (!/^\d+$/.test(code)) {
      setAccessCodeError("Zugangscode darf nur Zahlen enthalten")
      return false
    }
    if (code.length < 6) {
      setAccessCodeError("Zugangscode muss mindestens 6 Zahlen haben")
      return false
    }
    setAccessCodeError("")
    return true
  }

  const handleAccessCodeChange = (value: string) => {
    const numericValue = value.replace(/\D/g, '')
    setAccessCode(numericValue)
    if (numericValue) {
      validateAccessCode(numericValue)
    } else {
      setAccessCodeError("")
    }
  }

  const saveProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      if (!validateAccessCode(accessCode)) {
        toast({
          title: "Fehler",
          description: "Bitte überprüfe deinen Zugangscode.",
          variant: "destructive"
        })
        return
      }

      const { error: nicknameError } = await supabase
        .from('profiles')
        .update({ nickname })
        .eq('user_id', user.id)

      if (nicknameError) throw nicknameError

      const { data, error: accessCodeError } = await supabase.functions.invoke('update-access-code', {
        body: { newAccessCode: accessCode }
      })

      if (accessCodeError) {
        console.error('Access code update error:', accessCodeError)
        throw new Error(accessCodeError.message || 'Fehler beim Aktualisieren des Zugangscodes')
      }
      
      if (data?.error) {
        console.error('Access code update error from response:', data.error)
        throw new Error(data.error)
      }

      toast({
        title: "Profil gespeichert",
        description: data?.message || "Zugangscode erfolgreich geändert.",
      })
    } catch (error) {
      console.error('Error saving profile:', error)
      toast({
        title: "Fehler",
        description: (error as any)?.message ?? "Profil konnte nicht gespeichert werden.",
        variant: "destructive"
      })
    }
  }

  const handleWhatsappToggle = async (enabled: boolean) => {
    if (enabled && !phoneNumber) {
      // Show phone input when trying to enable without a phone number
      setShowPhoneInput(true)
      return
    }
    
    // Wenn WhatsApp ausgeschaltet werden soll UND Email auch aus ist → Email anschalten
    if (!enabled && !notifyEmailEnabled) {
      setNotifyEmailEnabled(true)
      setNotifyWhatsappEnabled(false)
      await saveNotificationSettings(true, false) // Email an, WhatsApp aus
      toast({
        title: "Email aktiviert",
        description: "Email wurde automatisch aktiviert, da mindestens ein Kanal aktiv sein muss."
      })
      return
    }
    
    setNotifyWhatsappEnabled(enabled)
    await saveNotificationSettings(notifyEmailEnabled, enabled)
  }

  const handleEmailToggle = async (enabled: boolean) => {
    // Wenn Email ausgeschaltet werden soll, aber WhatsApp auch aus ist → verhindern
    if (!enabled && !notifyWhatsappEnabled) {
      toast({
        title: "Nicht möglich",
        description: "Mindestens ein Benachrichtigungskanal muss aktiv bleiben.",
        variant: "destructive"
      })
      return
    }
    setNotifyEmailEnabled(enabled)
    await saveNotificationSettings(enabled, notifyWhatsappEnabled)
  }

  const handlePhoneNumberChange = (value: string) => {
    const cleaned = value.replace(/[^\d]/g, '')
    setPhoneNumber(cleaned)
  }

  const savePhoneAndEnableWhatsapp = async () => {
    if (!phoneNumber || phoneNumber.length < 6) {
      toast({
        title: "Fehler",
        description: "Bitte gib eine gültige Telefonnummer ein",
        variant: "destructive"
      })
      return
    }

    setSavingNotifications(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          phone_country_code: phoneCountryCode,
          phone_number: phoneNumber,
          notify_whatsapp_enabled: true
        })
        .eq('user_id', userId)

      if (error) throw error

      setNotifyWhatsappEnabled(true)
      setShowPhoneInput(false)
      toast({
        title: "Gespeichert",
        description: "WhatsApp-Benachrichtigungen aktiviert"
      })
    } catch (error) {
      console.error('Error saving phone:', error)
      toast({
        title: "Fehler",
        description: "Konnte Telefonnummer nicht speichern",
        variant: "destructive"
      })
    } finally {
      setSavingNotifications(false)
    }
  }

  const cancelPhoneInput = () => {
    setShowPhoneInput(false)
    // Reset to original value if canceling
    loadProfile()
  }

  const saveNotificationSettings = async (emailEnabled: boolean, whatsappEnabled: boolean) => {
    setSavingNotifications(true)
    try {
      const updateData: any = {
        notify_email_enabled: emailEnabled,
        notify_whatsapp_enabled: whatsappEnabled
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', userId)

      if (error) throw error

      toast({
        title: "Gespeichert",
        description: "Benachrichtigungseinstellungen aktualisiert"
      })
    } catch (error) {
      console.error('Error saving notification settings:', error)
      toast({
        title: "Fehler",
        description: "Einstellungen konnten nicht gespeichert werden",
        variant: "destructive"
      })
      // Revert on error
      loadProfile()
    } finally {
      setSavingNotifications(false)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      localStorage.removeItem('mockUser')
      navigate('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const navigateToStrengthValues = () => {
    navigate('/pro/strength-values')
  }

  const navigateToExercises = () => {
    navigate('/pro/exercises')
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  const openWhatsAppAdmin = () => {
    window.open('https://wa.me/4915730440756?text=Hallo%2C%20ich%20m%C3%B6chte%20meine%20E-Mail-Adresse%20%C3%A4ndern.', '_blank')
  }

  const bothNotificationsDisabled = !notifyEmailEnabled && !notifyWhatsappEnabled

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-auto">
      <div className="max-w-2xl mx-auto p-4 pb-24">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Profil</h1>
          <Button onClick={onClose} variant="outline">
            Schließen
          </Button>
        </div>

        {/* Basisdaten - immer sichtbar */}
        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Basisdaten</CardTitle>
              <Button
                onClick={handleRefresh}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center space-y-4 mb-6">
              <AvatarUpload 
                userId={userId} 
                currentAvatarUrl={avatarUrl}
                onAvatarUpdate={(newAvatarUrl) => {
                  setAvatarUrl(newAvatarUrl)
                  loadProfile()
                }}
              />
              <div className="text-center">
                <h2 className="text-lg font-semibold">{displayName}</h2>
                <p className="text-sm text-muted-foreground">{membershipType}</p>
              </div>
            </div>

            <div>
              <Label htmlFor="nickname">Spitzname (für andere sichtbar) *</Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={displayName || "Dein Spitzname"}
              />
            </div>

            <div>
              <Label htmlFor="accessCode">Zugangscode (mindestens 6 Zahlen) *</Label>
              <div className="relative">
                <Input
                  id="accessCode"
                  name="access-code-numeric"
                  type={showAccessCode ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-form-type="other"
                  value={accessCode}
                  onChange={(e) => handleAccessCodeChange(e.target.value)}
                  placeholder="123456"
                  maxLength={12}
                  className={`pr-10 ${accessCodeError ? "border-destructive" : ""}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowAccessCode(!showAccessCode)}
                >
                  {showAccessCode ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {accessCodeError && (
                <p className="text-sm text-destructive mt-1">{accessCodeError}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Dein persönlicher Zugangscode für die App
              </p>
            </div>
            
            <Button onClick={saveProfile} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:scale-[1.02]">
              Profil speichern
            </Button>
          </CardContent>
        </Card>

        {/* Training Log */}
        <Card className="border-primary/20 mb-4">
          <CardHeader>
            <CardTitle>Training Log</CardTitle>
            <p className="text-sm text-muted-foreground">
              Monatliche Trainingstage im letzten Jahr
            </p>
          </CardHeader>
          <CardContent>
            <YearlyTrainingHeatmap userId={userId} />
          </CardContent>
        </Card>

        {/* Meine Abzeichen */}
        <Card className="border-primary/20 mb-4">
          <CardHeader>
            <CardTitle>Meine Abzeichen</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pt-0 pb-4">
            <UserBadges />
          </CardContent>
        </Card>

        {/* Navigation zu Kraftwerten und Übungen */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div 
            className="bg-muted/50 rounded-2xl p-6 cursor-pointer hover:bg-muted transition-all hover:scale-[1.02]" 
            onClick={navigateToStrengthValues}
          >
            <div className="flex flex-col items-center justify-center">
              <Dumbbell className="h-8 w-8 mb-2 text-primary" />
              <h3 className="font-semibold text-foreground">Kraftwerte</h3>
              <p className="text-sm text-muted-foreground text-center">1RM Werte verwalten</p>
            </div>
          </div>
          
          <div 
            className="bg-muted/50 rounded-2xl p-6 cursor-pointer hover:bg-muted transition-all hover:scale-[1.02]" 
            onClick={navigateToExercises}
          >
            <div className="flex flex-col items-center justify-center">
              <Target className="h-8 w-8 mb-2 text-primary" />
              <h3 className="font-semibold text-foreground">Übungen</h3>
              <p className="text-sm text-muted-foreground text-center">Präferenzen bearbeiten</p>
            </div>
          </div>
        </div>

        {/* Kontakt */}
        <Card className="border-primary/20 mb-4">
          <CardHeader>
            <CardTitle>Kontakt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <a
              href="https://wa.me/4915730440756"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 bg-muted/30 rounded-2xl hover:bg-muted/50 transition-all hover:scale-[1.02]"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-foreground">WhatsApp Flo</p>
                  <p className="text-sm text-muted-foreground">+49 157 30440756</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            
            <a
              href="https://chat.whatsapp.com/IBNa4qgknS24QAFcP9V6km?mode=hqrc"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 bg-muted/30 rounded-2xl hover:bg-muted/50 transition-all hover:scale-[1.02]"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-foreground">WhatsApp Gruppe</p>
                  <p className="text-sm text-muted-foreground">Rise FF Kurse</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            
            <a
              href="https://www.instagram.com/rise_functional_fitness?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 bg-muted/30 rounded-2xl hover:bg-muted/50 transition-all hover:scale-[1.02]"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-foreground">Instagram</p>
                  <p className="text-sm text-muted-foreground">@rise_functional_fitness</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </CardContent>
        </Card>

        {/* Anzeige Einstellungen */}
        <Card className="border-primary/20 mb-4">
          <CardHeader>
            <CardTitle>Anzeige</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {theme === 'dark' ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
                <Label htmlFor="dark-mode">Dark Mode</Label>
              </div>
              <Switch
                id="dark-mode"
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Benachrichtigungen Einstellungen */}
        <Card className="border-primary/20 mb-4">
          <CardHeader>
            <CardTitle>Benachrichtigungen</CardTitle>
            <p className="text-sm text-muted-foreground">
              Für Warteliste, Einladungen und Kurs-Erinnerungen
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Warning if both disabled */}
            {bothNotificationsDisabled && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">
                  Du erhältst keine Benachrichtigungen zu Warteliste, Einladungen und Kursen.
                </p>
              </div>
            )}

            {/* Email Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-muted-foreground fill-current" viewBox="0 0 24 24">
                      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                    </svg>
                  </div>
                  <Label className="text-base font-medium">Email</Label>
                </div>
                <Switch
                  checked={notifyEmailEnabled}
                  onCheckedChange={handleEmailToggle}
                  disabled={savingNotifications}
                />
              </div>
            </div>

            {/* WhatsApp Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                  </div>
                  <Label className="text-base font-medium">WhatsApp</Label>
                </div>
                <Switch
                  checked={notifyWhatsappEnabled}
                  onCheckedChange={handleWhatsappToggle}
                  disabled={savingNotifications}
                />
              </div>
              
              {/* Show phone number if WhatsApp enabled and number exists */}
              {notifyWhatsappEnabled && phoneNumber && !showPhoneInput && (
                <div className="ml-13 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {phoneCountryCode} {phoneNumber}
                  </p>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setShowPhoneInput(true)}
                    className="h-8 w-8"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Phone input when enabling without number or editing */}
              {showPhoneInput && (
                <div className="ml-6 space-y-3">
                  <div className="flex gap-2">
                    <Select value={phoneCountryCode} onValueChange={setPhoneCountryCode}>
                      <SelectTrigger className="w-[110px]">
                        <SelectValue>
                          <span className="flex items-center gap-2">
                            {(() => {
                              const FlagComponent = countryCodeFlags[phoneCountryCode]
                              return FlagComponent ? <FlagComponent /> : null
                            })()}
                            <span>{phoneCountryCode}</span>
                          </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-background">
                        {countryCodes.map((cc) => {
                          const FlagComponent = countryCodeFlags[cc.code]
                          return (
                            <SelectItem key={cc.code} value={cc.code}>
                              <span className="flex items-center gap-2">
                                {FlagComponent ? <FlagComponent /> : null}
                                <span>{cc.code}</span>
                              </span>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    <Input
                      type="tel"
                      inputMode="numeric"
                      placeholder="15730440756"
                      value={phoneNumber}
                      onChange={(e) => handlePhoneNumberChange(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={savePhoneAndEnableWhatsapp}
                      disabled={savingNotifications || !phoneNumber}
                    >
                      Speichern
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={cancelPhoneInput}
                    >
                      Abbrechen
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Abmelde Button - am Ende der Seite */}
        <div className="mt-8 mb-4">
          <Button 
            onClick={handleLogout} 
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:scale-[1.02]"
            size="lg"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Abmelden
          </Button>
        </div>

        {/* Rechtliche Links */}
        <div className="flex justify-center gap-4 mb-8 text-xs text-muted-foreground">
          <span 
            className="cursor-pointer hover:underline" 
            onClick={() => navigate('/terms')}
          >
            AGB
          </span>
          <span>|</span>
          <span 
            className="cursor-pointer hover:underline" 
            onClick={() => navigate('/privacy')}
          >
            Datenschutz
          </span>
        </div>
      </div>
    </div>
  )
}
