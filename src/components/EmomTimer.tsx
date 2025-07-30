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
      <div className="flex-1 p-6">
        <div className="max-w-md mx-auto h-full flex flex-col justify-center">
          <div className="text-center mb-16">
            <h1 className="text-6xl font-bold mb-4">EMOM</h1>
            <p className="text-xl text-muted-foreground">Every Minute on the Minute</p>
          </div>

          <div className="space-y-12">
            <div className="space-y-8">
              <div className="flex items-center justify-center gap-6">
                <span className="text-2xl font-medium">Alle</span>
                <div className="relative">
                  <Input
                    type="number"
                    step="30"
                    value={interval}
                    onChange={(e) => setInterval(Number(e.target.value))}
                    className="w-28 h-16 text-center text-2xl border-2 border-primary rounded-xl"
                    min="30"
                    max="600"
                  />
                  <span className="absolute -right-12 top-5 text-primary font-medium text-xl">
                    {formatTime(interval)}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-6">
                <span className="text-2xl font-medium">für</span>
                <div className="relative">
                  <Input
                    type="number"
                    value={rounds}
                    onChange={(e) => setRounds(Number(e.target.value))}
                    className="w-24 h-16 text-center text-2xl border-2 border-primary rounded-xl"
                    min="1"
                    max="50"
                  />
                  <span className="absolute -right-8 top-5 text-primary font-medium text-xl">
                    {rounds}
                  </span>
                </div>
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