import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import { MemberBottomNavigation } from "@/components/MemberBottomNavigation"
import { ArrowLeft } from "lucide-react"

interface WorkoutTimerProps {
  embedded?: boolean
}

export const WorkoutTimer: React.FC<WorkoutTimerProps> = ({ embedded = false }) => {
  const navigate = useNavigate()

  const timerTypes = [
    { id: 'fortime', title: 'For Time', route: '/workout-timer/fortime' },
    { id: 'amrap', title: 'AMRAP', route: '/workout-timer/amrap' },
    { id: 'emom', title: 'EMOM', route: '/workout-timer/emom' },
    { id: 'tabata', title: 'TABATA', route: '/workout-timer/tabata' }
  ]

  if (embedded) {
    return (
      <div className="bg-background">
        <div className="p-6">
          <div className="max-w-md w-full mx-auto">
            <div className="text-center mb-4">
              <h1 className="text-4xl font-bold mb-1">WOD</h1>
              <h2 className="text-2xl text-muted-foreground">Timer</h2>
            </div>

            <div className="space-y-4">
              {timerTypes.map((type) => (
                <Button
                  key={type.id}
                  variant="outline"
                  onClick={() => navigate(type.route)}
                  className="w-full h-12 text-lg border-2 border-primary bg-background text-primary hover:bg-primary hover:text-primary-foreground rounded-xl font-medium transition-all duration-200"
                >
                  {type.title}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="p-4">
        <Button
          variant="ghost"
          onClick={() => {
            // Store navigation context for better back navigation
            const referrer = sessionStorage.getItem('timer-referrer')
            if (referrer && referrer !== window.location.pathname) {
              navigate(referrer)
            } else {
              navigate(-1)
            }
          }}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-6 pb-20">
        <div className="max-w-md w-full">
          <div className="text-center mb-4">
            <h1 className="text-4xl font-bold mb-1">WOD</h1>
            <h2 className="text-2xl text-muted-foreground">Timer</h2>
          </div>

          <div className="space-y-4">
            {timerTypes.map((type) => (
              <Button
                key={type.id}
                variant="outline"
                onClick={() => navigate(type.route)}
                className="w-full h-12 text-lg border-2 border-primary bg-background text-primary hover:bg-primary hover:text-primary-foreground rounded-xl font-medium transition-all duration-200"
              >
                {type.title}
              </Button>
            ))}
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