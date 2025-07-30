import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useNavigate } from "react-router-dom"

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
          <h1 className="text-4xl font-bold text-center mb-2">EMOM</h1>
          <p className="text-lg text-center text-muted-foreground">Every Minute on the Minute</p>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-4">
              <span className="text-xl font-medium">Alle</span>
              <div className="relative">
                <Input
                  type="number"
                  step="30"
                  value={interval}
                  onChange={(e) => setInterval(Number(e.target.value))}
                  className="w-24 h-12 text-center text-lg border-primary"
                  min="30"
                  max="600"
                />
                <span className="absolute right-3 top-3 text-primary font-medium">
                  {formatTime(interval)}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-4">
              <span className="text-xl font-medium">für</span>
              <div className="relative">
                <Input
                  type="number"
                  value={rounds}
                  onChange={(e) => setRounds(Number(e.target.value))}
                  className="w-20 h-12 text-center text-lg border-primary"
                  min="1"
                  max="50"
                />
                <span className="absolute right-3 top-3 text-primary font-medium">
                  {rounds}
                </span>
              </div>
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