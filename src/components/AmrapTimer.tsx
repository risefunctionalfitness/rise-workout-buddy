import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useNavigate } from "react-router-dom"

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
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        <div className="mb-12">
          <Button
            variant="ghost"
            onClick={() => navigate("/workout-timer")}
            className="mb-8"
          >
            ← Zurück
          </Button>
          <h1 className="text-4xl font-bold text-center mb-2">AMRAP</h1>
          <p className="text-lg text-center text-muted-foreground">As many reps as possible</p>
        </div>

        <div className="space-y-8">
          <div className="flex items-center justify-center gap-4">
            <div className="relative">
              <Input
                type="number"
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="w-20 h-12 text-center text-lg border-primary"
                min="1"
                max="60"
              />
              <span className="absolute right-3 top-3 text-primary font-medium">
                {minutes}
              </span>
            </div>
            <span className="text-xl font-medium">Minuten</span>
          </div>

          <Button
            onClick={handleStart}
            variant="outline"
            className="w-full h-16 text-lg border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-lg"
          >
            Start
          </Button>
        </div>
      </div>
    </div>
  )
}