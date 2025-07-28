import { useState, useEffect } from "react"
import { RiseHeader } from "@/components/RiseHeader"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useNavigate } from "react-router-dom"
import { Dashboard } from "./Dashboard"
import { supabase } from "@/integrations/supabase/client"
import { User } from "@supabase/supabase-js"

const ProVersion = () => {
  const navigate = useNavigate()
  const [accessCode, setAccessCode] = useState("")
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = async () => {
    if (!accessCode.trim()) return

    try {
      // For now, use simple email/password auth
      const email = `${accessCode}@rise-fitness.com`
      const password = accessCode
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        // Try to sign up if login fails
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/pro`
          }
        })
        
        if (signUpError) {
          console.error('Authentication error:', signUpError)
        }
      }
    } catch (error) {
      console.error('Auth error:', error)
    }
  }

  const handleBackToLight = () => {
    navigate("/")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Lädt...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <RiseHeader showProButton={false} />
        
        <main className="container mx-auto px-6 py-8">
          <div className="max-w-md mx-auto">
            <Card className="p-6">
              <div className="space-y-6 text-center">
                <div>
                  <h1 className="text-2xl font-bold text-foreground mb-2">
                    Pro-Version Login
                  </h1>
                  <p className="text-muted-foreground">
                    Gib deinen persönlichen Zugangscode ein, um auf die Pro-Features zuzugreifen.
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="accessCode">Zugangscode</Label>
                    <Input
                      id="accessCode"
                      type="password"
                      placeholder="Dein Zugangscode"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                    />
                  </div>
                  
                  <Button 
                    onClick={handleLogin}
                    className="w-full"
                    disabled={!accessCode.trim()}
                  >
                    Anmelden
                  </Button>
                </div>
                
                <Button 
                  variant="ghost" 
                  onClick={handleBackToLight}
                  className="w-full"
                >
                  Zurück zur Light-Version
                </Button>
              </div>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  // Show Dashboard when authenticated
  return <Dashboard user={user} />
}

export default ProVersion