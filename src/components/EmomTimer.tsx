import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useNavigate } from "react-router-dom"
import { MemberBottomNavigation } from "@/components/MemberBottomNavigation"
import { ArrowLeft } from "lucide-react"

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
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-6 pb-20" style={{ marginTop: '-1cm' }}>
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">EMOM</h1>
            <p className="text-base text-muted-foreground">Every Minute on the Minute</p>
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-4">
                <span className="text-base font-medium">Alle</span>
                <Select value={interval.toString()} onValueChange={(value) => setInterval(Number(value))}>
                  <SelectTrigger className="w-24 h-10 text-center text-base border-2 border-primary bg-background text-primary rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-2 border-primary rounded-lg max-h-60">
                    {intervalOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()} className="text-lg">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-center gap-4">
                <span className="text-base font-medium">für</span>
                <Select value={rounds.toString()} onValueChange={(value) => setRounds(Number(value))}>
                  <SelectTrigger className="w-20 h-10 text-center text-base border-2 border-primary bg-background text-primary rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-2 border-primary rounded-lg max-h-60">
                    {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                      <SelectItem key={num} value={num.toString()} className="text-lg">
                        {num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleStart}
              variant="outline"
              className="w-full h-12 text-lg border-2 border-primary bg-background text-primary hover:bg-primary hover:text-primary-foreground rounded-xl font-medium transition-all duration-200"
            >
              Start
            </Button>
          </div>
        </div>
      </div>
      <MemberBottomNavigation 
        activeTab="wod" 
        showCoursesTab={true}
        onTabChange={(tab) => {
          navigate('/pro')
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('changeTab', { detail: tab }))
          }, 100)
        }}
      />
    </div>
  )
}