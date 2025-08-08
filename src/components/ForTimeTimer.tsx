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
          onClick={() => navigate("/workout-timer")}
          className="mb-4 text-white hover:text-white hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-6 pb-20" style={{ marginTop: '-1cm' }}>
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-6xl font-bold mb-4">For Time</h1>
            <p className="text-xl text-muted-foreground">So schnell wie möglich</p>
          </div>

          <div className="space-y-8">
            <div className="flex items-center justify-center gap-6">
              <span className="text-2xl font-medium">Time Cap</span>
              <Select value={timeCap.toString()} onValueChange={(value) => setTimeCap(Number(value))}>
                <SelectTrigger className="w-24 h-16 text-center text-2xl border-2 border-[#B81243] bg-background text-[#B81243] rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-2 border-[#B81243] rounded-xl max-h-60">
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
              className="w-full h-20 text-2xl border-2 border-[#B81243] bg-background text-[#B81243] hover:bg-[#B81243] hover:text-white rounded-2xl font-medium transition-all duration-200"
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