import { useState, useEffect } from "react"
import { TrainingPathHeader } from "@/components/TrainingPathHeader"
import { TrainingPath } from "@/components/TrainingPath"
import { BottomNavigation } from "@/components/BottomNavigation"
import { supabase } from "@/integrations/supabase/client"
import { User } from "@supabase/supabase-js"

type TabType = 'home' | 'wod' | 'plans' | 'leaderboard'

interface CalendarDay {
  date: Date
  dayNumber: number
  isToday: boolean
  isFuture: boolean
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
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([])
  const [trainingCount, setTrainingCount] = useState(0)

  // Generate calendar days for current month
  useEffect(() => {
    const generateCalendarDays = () => {
      const today = new Date()
      const currentMonth = today.getMonth()
      const currentYear = today.getFullYear()
      const firstDay = new Date(currentYear, currentMonth, 1)
      const lastDay = new Date(currentYear, currentMonth + 1, 0)
      
      // Get Monday of the week containing the first day
      const startDate = new Date(firstDay)
      const dayOfWeek = firstDay.getDay()
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      startDate.setDate(firstDay.getDate() + mondayOffset)
      
      const days: CalendarDay[] = []
      const currentDate = new Date(startDate)
      
      // Generate 6 weeks worth of days
      for (let week = 0; week < 6; week++) {
        for (let day = 0; day < 7; day++) {
          const isCurrentMonth = currentDate.getMonth() === currentMonth
          const isToday = currentDate.toDateString() === today.toDateString()
          const isFuture = currentDate > today
          
          if (isCurrentMonth) {
            days.push({
              date: new Date(currentDate),
              dayNumber: currentDate.getDate(),
              isToday,
              isFuture,
              trainingSession: undefined // Will be filled from actual data
            })
          }
          
          currentDate.setDate(currentDate.getDate() + 1)
        }
      }
      
      return days
    }
    
    setCalendarDays(generateCalendarDays())
  }, [])

  const userName = user?.user_metadata?.display_name || 
                   user?.email?.split('@')[0] || 
                   'Nutzer'

  const totalDaysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()

  const handleAddTraining = (dayNumber: number, type: 'course' | 'free_training' | 'plan') => {
    setCalendarDays(prev => prev.map(day => 
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
    setCalendarDays(prev => prev.map(day => 
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
            calendarDays={calendarDays}
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