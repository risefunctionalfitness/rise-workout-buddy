import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useNavigate } from "react-router-dom"
import { TimerBottomNavigation } from "@/components/TimerBottomNavigation"

export const EmomTimer: React.FC = () => {
  const navigate = useNavigate()
  const [interval, setInterval] = useState(150) // 2:30 in seconds
  const [rounds, setRounds] = useState(10)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleStart = () => {
    navigate('/workout-timer/start', { 
      state: { 
        type: 'emom', 
        settings: { interval, rounds } 
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
          <div className="text-center mb-16">
            <h1 className="text-6xl font-bold mb-4">EMOM</h1>
            <p className="text-xl text-muted-foreground">Every Minute on the Minute</p>
          </div>

          <div className="space-y-12">
            <div className="space-y-8">
              <div className="flex items-center justify-center gap-6">
                <span className="text-2xl font-medium">Alle</span>
                <Input
                  type="number"
                  step="30"
                  value={interval}
                  onChange={(e) => setInterval(Number(e.target.value))}
                  className="w-28 h-16 text-center text-2xl border-2 border-primary rounded-xl"
                  min="30"
                  max="600"
                  placeholder={formatTime(interval)}
                />
              </div>
              
              <div className="flex items-center justify-center gap-6">
                <span className="text-2xl font-medium">für</span>
                <Input
                  type="number"
                  value={rounds}
                  onChange={(e) => setRounds(Number(e.target.value))}
                  className="w-24 h-16 text-center text-2xl border-2 border-primary rounded-xl"
                  min="1"
                  max="50"
                />
              </div>
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