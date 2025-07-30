import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useNavigate } from "react-router-dom"
import { TimerBottomNavigation } from "@/components/TimerBottomNavigation"

export const AmrapTimer: React.FC = () => {
  const navigate = useNavigate()
  const [minutes, setMinutes] = useState(7)

  const handleStart = () => {
    navigate('/workout-timer/start', { 
      state: { 
        type: 'amrap', 
        settings: { minutes } 
      } 
    })
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="p-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/workout-timer")}
          className="mb-4"
        >
          ← Zurück
        </Button>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold mb-4">AMRAP</h1>
            <p className="text-xl text-muted-foreground">As many reps as possible</p>
          </div>

          <div className="space-y-8">
            <div className="flex items-center justify-center gap-6">
              <Input
                type="number"
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="w-24 h-16 text-center text-2xl border-2 border-primary rounded-xl"
                min="1"
                max="60"
              />
              <span className="text-2xl font-medium">Minuten</span>
            </div>

            <Button
              onClick={handleStart}
              variant="outline"
              className="w-full h-20 text-2xl border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-2xl font-medium"
            >
              Start
            </Button>
          </div>
        </div>
      </div>
      <TimerBottomNavigation />
    </div>
  )
}