import { Home, Calendar, Users, Trophy, Timer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useNavigate, useLocation } from "react-router-dom"

export const TimerBottomNavigation: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const tabs = [
    { id: 'uebersicht', icon: Home, label: 'Übersicht', route: '/pro' },
    { id: 'wod', icon: Timer, label: 'WOD', route: '/workout-timer' },
    { id: 'kurse', icon: Calendar, label: 'Kurse', route: '/pro' },
    { id: 'leaderboard', icon: Trophy, label: 'Leaderboard', route: '/pro' }
  ]

  const getActiveTab = () => {
    if (location.pathname.includes('/workout-timer')) return 'wod'
    if (location.pathname === '/pro') return 'uebersicht'
    return 'uebersicht'
  }

  const activeTab = getActiveTab()

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-3 z-50">
      <div className="flex justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          
          return (
            <Button
              key={tab.id}
              variant="ghost"
              size="sm"
              onClick={() => navigate(tab.route)}
              className={cn(
                "flex flex-col items-center gap-1 h-auto py-2 px-3",
                isActive && "text-primary bg-primary/10"
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs font-medium">{tab.label}</span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}