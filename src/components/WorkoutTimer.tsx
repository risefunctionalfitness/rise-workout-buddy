import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"

export const WorkoutTimer: React.FC = () => {
  const navigate = useNavigate()

  const timerTypes = [
    { id: 'fortime', title: 'For Time', route: '/workout-timer/fortime' },
    { id: 'amrap', title: 'AMRAP', route: '/workout-timer/amrap' },
    { id: 'emom', title: 'EMOM', route: '/workout-timer/emom' }
  ]

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        <div className="mb-12">
          <Button
            variant="ghost"
            onClick={() => navigate("/pro")}
            className="mb-8"
          >
            ← Zurück
          </Button>
          <h1 className="text-4xl font-bold text-center mb-2">WOD</h1>
          <h2 className="text-xl text-center text-muted-foreground">Timer</h2>
        </div>

        <div className="space-y-4">
          {timerTypes.map((type) => (
            <Button
              key={type.id}
              variant="outline"
              onClick={() => navigate(type.route)}
              className="w-full h-16 text-lg border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-lg"
            >
              {type.title}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}