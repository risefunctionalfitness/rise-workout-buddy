import { RiseHeader } from "@/components/RiseHeader"
import { WorkoutGenerator } from "@/components/WorkoutGenerator"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"

const LightVersion = () => {
  const navigate = useNavigate()

  const handleProClick = () => {
    navigate("/pro")
  }

  return (
    <div className="min-h-screen bg-background relative">
      <RiseHeader onProVersionClick={() => navigate("/auth")} />
      
      <main className="container mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            KI-Workout Generator
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Erstelle dir in wenigen Klicks dein personalisiertes Workout. 
            Wähle dein Ziel, die gewünschte Dauer und den Fokusbereich aus.
          </p>
        </div>

        <WorkoutGenerator user={{ id: 'demo-user' } as any} />
      </main>
    </div>
  )
}

export default LightVersion