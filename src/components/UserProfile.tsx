import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LogOut, Dumbbell, Target, Moon, Sun, RotateCcw, Eye, EyeOff } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useNavigate } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"
import { AvatarUpload } from "@/components/AvatarUpload"
import { useTheme } from "next-themes"

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

  useEffect(() => {
    loadProfile()
    checkDailyRefresh()
  }, [])

  const checkDailyRefresh = () => {
    const lastRefresh = localStorage.getItem('lastAppRefresh')
    const now = new Date()
    const today = now.toDateString()
    
    if (!lastRefresh || lastRefresh !== today) {
      localStorage.setItem('lastAppRefresh', today)
      if (lastRefresh) {
        setTimeout(() => window.location.reload(), 2000)
      }
    }
  }

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)

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
    // Only allow numbers
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
      
      // Validate access code before saving
      if (!validateAccessCode(accessCode)) {
        toast({
          title: "Fehler",
          description: "Bitte überprüfe deinen Zugangscode.",
          variant: "destructive"
        })
        return
      }
      
      const updates = { nickname, access_code: accessCode }

      // Update existing profile; if none updated, insert a new one (avoid upsert on non-unique column)
      const { data: updated, error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select('id')

      if (updateError) throw updateError

      if (!updated || updated.length === 0) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({ user_id: user.id, ...updates })
        if (insertError) throw insertError
      }

      toast({
        title: "Profil gespeichert",
        description: "Deine Änderungen wurden erfolgreich gespeichert."
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
            <div className="flex justify-center mb-4">
              {userId && (
                <AvatarUpload
                  userId={userId}
                  currentAvatarUrl={avatarUrl}
                  onAvatarUpdate={setAvatarUrl}
                  size="lg"
                  showUploadButton={false}
                />
              )}
            </div>

            <div>
              <Label htmlFor="name">Name (vergeben vom Admin)</Label>
              <Input
                id="name"
                value={displayName}
                disabled
                className="bg-muted"
                placeholder="Name wird vom Admin vergeben"
              />
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
                  type={showAccessCode ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]*"
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
            
            <Button onClick={saveProfile} className="w-full bg-rise-accent hover:bg-rise-accent-dark text-white">
              Profil speichern
            </Button>
          </CardContent>
        </Card>

        {/* Dark Mode Toggle */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Darstellung</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {theme === 'dark' ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
                <Label>Dark Mode</Label>
              </div>
              <Button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                variant="outline"
                size="sm"
              >
                {theme === 'dark' ? 'Ausschalten' : 'Einschalten'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Navigation zu Kraftwerten und Übungen */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={navigateToStrengthValues}>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <Dumbbell className="h-8 w-8 mb-2 text-rise-accent" />
              <h3 className="font-semibold">Kraftwerte</h3>
              <p className="text-sm text-muted-foreground text-center">1RM Werte verwalten</p>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={navigateToExercises}>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <Target className="h-8 w-8 mb-2 text-rise-accent" />
              <h3 className="font-semibold">Übungen</h3>
              <p className="text-sm text-muted-foreground text-center">Präferenzen bearbeiten</p>
            </CardContent>
          </Card>
        </div>

        {/* Abmelde Button - am Ende der Seite */}
        <div className="mt-8 mb-8">
          <Button 
            onClick={handleLogout} 
            className="w-full bg-[#B81243] hover:bg-[#901a36] text-white"
            size="lg"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Abmelden
          </Button>
        </div>
      </div>
    </div>
  )
}