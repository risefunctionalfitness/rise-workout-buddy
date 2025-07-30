import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useNavigate } from "react-router-dom"
import { TimerBottomNavigation } from "@/components/TimerBottomNavigation"

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
            <h1 className="text-6xl font-bold mb-4">For Time</h1>
            <p className="text-xl text-muted-foreground">So schnell wie möglich</p>
          </div>

          <div className="space-y-8">
            <div className="flex items-center justify-center gap-6">
              <span className="text-2xl font-medium">Time Cap</span>
              <Input
                type="number"
                value={timeCap}
                onChange={(e) => setTimeCap(Number(e.target.value))}
                className="w-24 h-16 text-center text-2xl border-2 border-primary rounded-xl"
                min="1"
                max="60"
              />
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