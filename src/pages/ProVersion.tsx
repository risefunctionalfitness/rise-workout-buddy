import { useState } from "react"
import { RiseHeader } from "@/components/RiseHeader"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useNavigate } from "react-router-dom"

const ProVersion = () => {
  const navigate = useNavigate()
  const [accessCode, setAccessCode] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const handleLogin = () => {
    // Mock authentication - in real app this would validate against Supabase
    if (accessCode.trim()) {
      setIsAuthenticated(true)
    }
  }

  const handleBackToLight = () => {
    navigate("/")
  }

  if (!isAuthenticated) {
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
                      onKeyDown={(e) => e.key === "Enter" && handleLogin()}
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

  return (
    <div className="min-h-screen bg-background">
      <RiseHeader showProButton={false} />
      
      <main className="container mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            RISE Pro Dashboard
          </h1>
          <p className="text-lg text-muted-foreground">
            Willkommen in der Pro-Version! Hier werden alle erweiterten Features implementiert.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">Profil & Setup</h3>
            <p className="text-muted-foreground mb-4">
              Vervollständige dein Profil für personalisierte Workouts
            </p>
            <Button className="w-full">Profil bearbeiten</Button>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">Trainingspläne</h3>
            <p className="text-muted-foreground mb-4">
              Wähle aus verschiedenen 4-12 Wochen Plänen
            </p>
            <Button className="w-full">Pläne ansehen</Button>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">Fortschritt</h3>
            <p className="text-muted-foreground mb-4">
              Verfolge deine Entwicklung und 1RMs
            </p>
            <Button className="w-full">Fortschritt ansehen</Button>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">Leaderboard</h3>
            <p className="text-muted-foreground mb-4">
              Sieh wie aktiv andere Mitglieder sind
            </p>
            <Button className="w-full">Ranking ansehen</Button>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">Einzelne WODs</h3>
            <p className="text-muted-foreground mb-4">
              Schnell ein einzelnes Workout auswählen
            </p>
            <Button className="w-full">WOD auswählen</Button>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">Training loggen</h3>
            <p className="text-muted-foreground mb-4">
              Trage dein heutiges Training ein
            </p>
            <Button className="w-full">Training loggen</Button>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <Button 
            variant="ghost" 
            onClick={handleBackToLight}
          >
            Zurück zur Light-Version
          </Button>
        </div>
      </main>
    </div>
  )
}

export default ProVersion