import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useNavigate } from "react-router-dom"
import { TimerBottomNavigation } from "@/components/TimerBottomNavigation"
import { ArrowLeft } from "lucide-react"

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
            <h1 className="text-3xl font-bold mb-2">For Time</h1>
            <p className="text-base text-muted-foreground">So schnell wie möglich</p>
          </div>

          <div className="space-y-8">
            <div className="flex items-center justify-center gap-4">
              <span className="text-base font-medium">Time Cap</span>
              <Select value={timeCap.toString()} onValueChange={(value) => setTimeCap(Number(value))}>
                <SelectTrigger className="w-20 h-10 text-center text-base border-2 border-primary bg-background text-primary rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-2 border-primary rounded-lg max-h-60">
                  {Array.from({ length: 60 }, (_, i) => i + 1).map((num) => (
                    <SelectItem key={num} value={num.toString()} className="text-lg">
                      {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
      <TimerBottomNavigation />
    </div>
  )
}