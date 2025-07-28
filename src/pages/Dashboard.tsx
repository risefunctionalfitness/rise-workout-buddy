import { useState, useEffect } from "react"
import { TrainingPathHeader } from "@/components/TrainingPathHeader"
import { TrainingPath } from "@/components/TrainingPath"
import { BottomNavigation } from "@/components/BottomNavigation"
import { UserProfile } from "@/components/UserProfile"
import { supabase } from "@/integrations/supabase/client"
import { User } from "@supabase/supabase-js"

type TabType = 'home' | 'wod' | 'plans' | 'leaderboard'

interface TrainingDay {
  date: Date
  dayNumber: number
  isToday: boolean
  isFuture: boolean
  isPast: boolean
  trainingSession?: {
    type: 'course' | 'free_training' | 'plan'
    id: string
  }
}

interface DashboardProps {
  user: User
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<TabType>('home')
  const [trainingDays, setTrainingDays] = useState<TrainingDay[]>([])
  const [trainingCount, setTrainingCount] = useState(0)
  const [showProfile, setShowProfile] = useState(false)

  // Generate training days for current month (vertical path style)
  useEffect(() => {
    const generateTrainingDays = () => {
      const today = new Date()
      const currentMonth = today.getMonth()
      const currentYear = today.getFullYear()
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
      
      const days: TrainingDay[] = []
      
      // Generate all days of the current month
      for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(currentYear, currentMonth, day)
        const isToday = currentDate.toDateString() === today.toDateString()
        const isFuture = currentDate > today
        const isPast = currentDate < today && !isToday
        
        days.push({
          date: currentDate,
          dayNumber: day,
          isToday,
          isFuture,
          isPast,
          trainingSession: undefined // Will be filled from actual data
        })
      }
      
      return days
    }
    
    setTrainingDays(generateTrainingDays())
  }, [])

  const userName = user?.user_metadata?.display_name || 
                   user?.email?.split('@')[0] || 
                   'Nutzer'

  const totalDaysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()

  const handleAddTraining = (dayNumber: number, type: 'course' | 'free_training' | 'plan') => {
    setTrainingDays(prev => prev.map(day => 
      day.dayNumber === dayNumber 
        ? { 
            ...day, 
            trainingSession: { 
              type, 
              id: `training-${dayNumber}-${Date.now()}` 
            } 
          }
        : day
    ))
    
    // Update training count
    setTrainingCount(prev => prev + 1)
  }

  const handleRemoveTraining = (dayNumber: number) => {
    setTrainingDays(prev => prev.map(day => 
      day.dayNumber === dayNumber 
        ? { ...day, trainingSession: undefined }
        : day
    ))
    
    // Update training count
    setTrainingCount(prev => Math.max(0, prev - 1))
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <TrainingPath
            trainingDays={trainingDays}
            onAddTraining={handleAddTraining}
            onRemoveTraining={handleRemoveTraining}
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
        onProfileClick={() => setShowProfile(true)}
      />
      
      {renderTabContent()}
      
      <BottomNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {showProfile && (
        <UserProfile onClose={() => setShowProfile(false)} />
      )}
    </div>
  )
}