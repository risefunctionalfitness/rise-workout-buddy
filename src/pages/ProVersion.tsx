import { useState, useEffect } from "react"
import { RiseHeader } from "@/components/RiseHeader"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useNavigate } from "react-router-dom"
import { Dashboard } from "./Dashboard"
import { User } from "@supabase/supabase-js"

const ProVersion = () => {
  const navigate = useNavigate()
  const [accessCode, setAccessCode] = useState("")
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)

  // Mock authentication - keine echte Supabase Auth für jetzt
  useEffect(() => {
    // Prüfe ob User bereits "eingeloggt" ist (localStorage)
    const savedUser = localStorage.getItem('mockUser')
    if (savedUser) {
      setUser(JSON.parse(savedUser) as any)
    }
  }, [])

  const handleLogin = async () => {
    if (!accessCode.trim()) return

    // Mock authentication for testing
    // Beispiel-Zugangscodes: "admin", "test", "demo"
    const validCodes = ["admin", "test", "demo", "rise", "123"]
    
    if (validCodes.includes(accessCode.toLowerCase())) {
      // Erstelle einen Mock-User
      const mockUser = {
        id: `mock-${accessCode}`,
        email: `${accessCode}@rise-fitness.com`,
        user_metadata: {
          display_name: accessCode === "admin" ? "Max Mustermann" : 
                       accessCode === "test" ? "Anna Test" :
                       accessCode === "demo" ? "Demo User" : 
                       `${accessCode.charAt(0).toUpperCase()}${accessCode.slice(1)} User`
        }
      }
      setUser(mockUser as any)
      // Speichere User in localStorage für Persistenz
      localStorage.setItem('mockUser', JSON.stringify(mockUser))
    } else {
      alert("Ungültiger Zugangscode. Versuche: admin, test, demo, rise oder 123")
    }
  }

  const handleBackToLight = () => {
    // Logout: User aus localStorage entfernen
    localStorage.removeItem('mockUser')
    setUser(null)
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
        <RiseHeader />
        
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
                  <p className="text-sm text-muted-foreground">
                    <strong>Beispiel-Zugangscodes:</strong> admin, test, demo, rise, 123
                  </p>
                  
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
                  
                  <Button 
                    variant="ghost" 
                    onClick={handleBackToLight}
                    className="w-full"
                  >
                    Zurück zur Light-Version
                  </Button>
                </div>
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