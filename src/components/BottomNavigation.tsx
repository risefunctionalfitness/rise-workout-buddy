import { Home, Dumbbell, Users, Newspaper, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type TabType = 'home' | 'wod' | 'courses' | 'news' | 'leaderboard'

interface BottomNavigationProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabChange
}) => {
  const tabs = [
    { id: 'home' as TabType, icon: Home, label: 'Startseite' },
    { id: 'wod' as TabType, icon: Dumbbell, label: 'WOD Gen.' },
    { id: 'courses' as TabType, icon: Users, label: 'Kursanmeldung' },
    { id: 'news' as TabType, icon: Newspaper, label: 'Aktuelles' },
    { id: 'leaderboard' as TabType, icon: Trophy, label: 'Leaderboard' }
  ]

  return (
    <div className="border-t bg-background p-2">
      <div className="flex justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          
          return (
            <Button
              key={tab.id}
              variant="ghost"
              size="sm"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 h-auto py-2 px-3",
                isActive && "text-primary bg-primary/10"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{tab.label}</span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}