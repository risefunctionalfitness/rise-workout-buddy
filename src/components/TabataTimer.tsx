import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useNavigate } from "react-router-dom"
import { MemberBottomNavigation } from "@/components/MemberBottomNavigation"
import { ArrowLeft } from "lucide-react"

export const TabataTimer: React.FC = () => {
  const navigate = useNavigate()
  const [rounds, setRounds] = useState(8)
  const [workSeconds, setWorkSeconds] = useState(20)
  const [restSeconds, setRestSeconds] = useState(10)

  const handleStart = () => {
    navigate('/workout-timer/start', { 
      state: { 
        type: 'tabata', 
        settings: { rounds, workSeconds, restSeconds } 
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
            <h1 className="text-3xl font-bold mb-2">TABATA</h1>
            <p className="text-base text-muted-foreground">High Intensity Interval Training</p>
          </div>

          <div className="space-y-8">
            {/* Runden */}
            <div className="flex items-center justify-center gap-4">
              <span className="text-base font-medium">Runden:</span>
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

            {/* Work Zeit */}
            <div className="flex items-center justify-center gap-4">
              <span className="text-base font-medium">Work:</span>
              <Select value={workSeconds.toString()} onValueChange={(value) => setWorkSeconds(Number(value))}>
                <SelectTrigger className="w-20 h-10 text-center text-base border-2 border-primary bg-background text-primary rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-2 border-primary rounded-lg max-h-60">
                  {[10, 15, 20, 30, 45, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360, 390, 420, 450, 480, 510, 540, 570, 600].map((num) => (
                    <SelectItem key={num} value={num.toString()} className="text-lg">
                      {num >= 60 ? `${Math.floor(num / 60)}:${(num % 60).toString().padStart(2, '0')}` : `${num}s`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rest Zeit */}
            <div className="flex items-center justify-center gap-4">
              <span className="text-base font-medium">Rest:</span>
              <Select value={restSeconds.toString()} onValueChange={(value) => setRestSeconds(Number(value))}>
                <SelectTrigger className="w-20 h-10 text-center text-base border-2 border-primary bg-background text-primary rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-2 border-primary rounded-lg max-h-60">
                  {[5, 10, 15, 20, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360, 390, 420, 450, 480, 510, 540, 570, 600].map((num) => (
                    <SelectItem key={num} value={num.toString()} className="text-lg">
                      {num >= 60 ? `${Math.floor(num / 60)}:${(num % 60).toString().padStart(2, '0')}` : `${num}s`}
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