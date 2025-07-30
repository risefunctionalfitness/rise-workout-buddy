import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useNavigate } from "react-router-dom"
import { TimerBottomNavigation } from "@/components/TimerBottomNavigation"

export const EmomTimer: React.FC = () => {
  const navigate = useNavigate()
  const [interval, setInterval] = useState(150) // 2:30 in seconds
  const [rounds, setRounds] = useState(10)

  // Generate options for every 30 seconds from 0:30 to 10:00
  const intervalOptions = []
  for (let seconds = 30; seconds <= 600; seconds += 30) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    const label = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    intervalOptions.push({ value: seconds, label })
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
      
      <div className="flex-1 flex items-center justify-center p-6 pb-20">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-6xl font-bold mb-4">EMOM</h1>
            <p className="text-xl text-muted-foreground">Every Minute on the Minute</p>
          </div>

          <div className="space-y-8">
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-6">
                <span className="text-2xl font-medium">Alle</span>
                <Select value={interval.toString()} onValueChange={(value) => setInterval(Number(value))}>
                  <SelectTrigger className="w-32 h-16 text-center text-2xl border-2 border-primary rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-2 border-primary rounded-xl max-h-60">
                    {intervalOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()} className="text-lg">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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