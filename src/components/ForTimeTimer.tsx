import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useNavigate } from "react-router-dom"

export const ForTimeTimer: React.FC = () => {
  const navigate = useNavigate()
  const [timeCap, setTimeCap] = useState(15)

  const handleStart = () => {
    navigate('/workout-timer/start', { 
      state: { 
        type: 'fortime', 
        settings: { timeCap } 
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
          <h1 className="text-4xl font-bold text-center mb-2">For Time</h1>
          <p className="text-lg text-center text-muted-foreground">So schnell wie möglich</p>
        </div>

        <div className="space-y-8">
          <div className="flex items-center justify-center gap-4">
            <span className="text-xl font-medium">Time Cap</span>
            <div className="relative">
              <Input
                type="number"
                value={timeCap}
                onChange={(e) => setTimeCap(Number(e.target.value))}
                className="w-20 h-12 text-center text-lg border-primary"
                min="1"
                max="60"
              />
              <span className="absolute right-3 top-3 text-primary font-medium">
                {timeCap}
              </span>
            </div>
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