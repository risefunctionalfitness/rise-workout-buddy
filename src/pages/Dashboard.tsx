import { useState, useEffect } from "react"
import { TrainingPathHeader } from "@/components/TrainingPathHeader"
import { TrainingPath } from "@/components/TrainingPath"
import { BottomNavigation } from "@/components/BottomNavigation"
import { supabase } from "@/integrations/supabase/client"
import { User } from "@supabase/supabase-js"

type TabType = 'home' | 'wod' | 'plans' | 'leaderboard'

interface TrainingSession {
  id: string
  date: string
  status: 'completed' | 'current' | 'pending' | 'locked'
  workoutType?: 'course' | 'free_training' | 'plan'
}

interface DashboardProps {
  user: User
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<TabType>('home')
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [trainingCount, setTrainingCount] = useState(0)

  // Mock data for demonstration
  useEffect(() => {
    const mockSessions: TrainingSession[] = [
      { id: '1', date: '27. Jan', status: 'completed', workoutType: 'course' },
      { id: '2', date: '28. Jan', status: 'current' },
      { id: '3', date: '29. Jan', status: 'locked' },
      { id: '4', date: '30. Jan', status: 'locked' },
      { id: '5', date: '31. Jan', status: 'locked' },
    ]
    setSessions(mockSessions)
    setTrainingCount(12) // Mock training count
  }, [])

  const currentDate = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })

  const totalDaysInMonth = new Date().getDate()
  const userName = user?.user_metadata?.display_name || 
                   user?.email?.split('@')[0] || 
                   'Nutzer'

  const handleSelectWorkout = (id: string) => {
    console.log('Selected workout:', id)
    // Here you would handle workout selection
  }

  const handleSelectCurrentWorkout = () => {
    console.log('Selected current workout')
    // Here you would handle current workout selection
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <TrainingPath
            sessions={sessions}
            onSelectWorkout={handleSelectWorkout}
            onSelectCurrentWorkout={handleSelectCurrentWorkout}
          />
        )
      case 'wod':
        return (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2">WOD Generator</h2>
              <p className="text-muted-foreground">Generiere dein freies Workout</p>
            </div>
          </div>
        )
      case 'plans':
        return (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2">Trainingspläne</h2>
              <p className="text-muted-foreground">Deine persönlichen Pläne</p>
            </div>
          </div>
        )
      case 'leaderboard':
        return (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2">Leaderboard</h2>
              <p className="text-muted-foreground">Vergleiche dich mit anderen</p>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <TrainingPathHeader
        trainingDaysThisMonth={trainingCount}
        totalDaysInMonth={totalDaysInMonth}
        currentDate={currentDate}
        userName={userName}
      />
      
      {renderTabContent()}
      
      <BottomNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  )
}