import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import { TimerBottomNavigation } from "@/components/TimerBottomNavigation"

export const WorkoutTimer: React.FC = () => {
  const navigate = useNavigate()

  const timerTypes = [
    { id: 'fortime', title: 'For Time', route: '/workout-timer/fortime' },
    { id: 'amrap', title: 'AMRAP', route: '/workout-timer/amrap' },
    { id: 'emom', title: 'EMOM', route: '/workout-timer/emom' },
    { id: 'tabata', title: 'Tabata', route: '/workout-timer/tabata' }
  ]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center p-6 pb-20">
        <div className="max-w-md w-full">
          <div className="text-center mb-4">
            <h1 className="text-6xl font-bold mb-1">WOD</h1>
            <h2 className="text-2xl text-muted-foreground">Timer</h2>
          </div>

          <div className="space-y-6">
            {timerTypes.map((type) => (
              <Button
                key={type.id}
                variant="outline"
                onClick={() => navigate(type.route)}
                className="w-full h-20 text-2xl border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-2xl font-medium"
              >
                {type.title}
              </Button>
            ))}
          </div>
        </div>
      </div>
      <TimerBottomNavigation />
    </div>
  )
}