import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LogOut, Dumbbell, Target } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useNavigate } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"
import { AvatarUpload } from "@/components/AvatarUpload"

interface UserProfileProps {
  onClose: () => void
}

export const UserProfile: React.FC<UserProfileProps> = ({ onClose }) => {
  const navigate = useNavigate()
  const { toast } = useToast()
  
  // Form states
  const [displayName, setDisplayName] = useState("")
  const [nickname, setNickname] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [userId, setUserId] = useState<string>("")

  useEffect(() => {
    loadProfile()
  }, [])

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
        setAvatarUrl(profile.avatar_url)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const saveProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          display_name: displayName,
          nickname: nickname
        }, {
          onConflict: 'user_id'
        })

      if (error) throw error

      toast({
        title: "Profil gespeichert",
        description: "Deine Änderungen wurden erfolgreich gespeichert."
      })
    } catch (error) {
      console.error('Error saving profile:', error)
      toast({
        title: "Fehler",
        description: "Profil konnte nicht gespeichert werden.",
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
            <CardTitle>Basisdaten</CardTitle>
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
            
            <Button onClick={saveProfile} className="w-full">
              Profil speichern
            </Button>
          </CardContent>
        </Card>

        {/* Navigation zu Kraftwerten und Übungen */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={navigateToStrengthValues}>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <Dumbbell className="h-8 w-8 mb-2 text-primary" />
              <h3 className="font-semibold">Kraftwerte</h3>
              <p className="text-sm text-muted-foreground text-center">1RM Werte verwalten</p>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={navigateToExercises}>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <Target className="h-8 w-8 mb-2 text-primary" />
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