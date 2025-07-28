import { useState, useEffect } from "react"
import { TrainingPathHeader } from "@/components/TrainingPathHeader"
import { TrainingPath } from "@/components/TrainingPath"
import { BottomNavigation } from "@/components/BottomNavigation"
import { UserProfile } from "@/components/UserProfile"
import { Leaderboard } from "@/components/Leaderboard"
import { supabase } from "@/integrations/supabase/client"
import { User } from "@supabase/supabase-js"
import { useToast } from "@/hooks/use-toast"

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
  const { toast } = useToast()

  // Generate training days for current month and load training sessions
  useEffect(() => {
    const generateTrainingDays = async () => {
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

      // Load existing training sessions
      try {
        const { data: sessions, error } = await supabase
          .from('training_sessions')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`)
          .lt('date', `${currentYear}-${String(currentMonth + 2).padStart(2, '0')}-01`)

        if (error) {
          console.error('Error loading training sessions:', error)
          return days
        }

        // Map sessions to days
        sessions?.forEach(session => {
          const sessionDate = new Date(session.date)
          const dayNumber = sessionDate.getDate()
          const dayIndex = days.findIndex(d => d.dayNumber === dayNumber)
          
          if (dayIndex !== -1) {
            days[dayIndex].trainingSession = {
              type: session.workout_type as 'course' | 'free_training' | 'plan',
              id: session.id
            }
          }
        })

        // Count training sessions for header
        const completedSessions = sessions?.filter(s => s.status === 'completed').length || 0
        setTrainingCount(completedSessions)
      } catch (error) {
        console.error('Error loading training sessions:', error)
      }
      
      return days
    }
    
    generateTrainingDays().then(setTrainingDays)
  }, [user.id])

  const userName = user?.user_metadata?.display_name || 
                   user?.email?.split('@')[0] || 
                   'Nutzer'

  const totalDaysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()

  const handleAddTraining = async (dayNumber: number, type: 'course' | 'free_training' | 'plan') => {
    try {
      const currentDate = new Date()
      const sessionDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber)
      
      const { data, error } = await supabase
        .from('training_sessions')
        .insert({
          user_id: user.id,
          date: sessionDate.toISOString().split('T')[0],
          workout_type: type,
          status: 'completed'
        })
        .select()
        .single()

      if (error) {
        console.error('Error saving training session:', error)
        toast({
          title: "Fehler",
          description: "Training konnte nicht gespeichert werden.",
          variant: "destructive"
        })
        return
      }

      // Update UI
      setTrainingDays(prev => prev.map(day => 
        day.dayNumber === dayNumber 
          ? { 
              ...day, 
              trainingSession: { 
                type, 
                id: data.id
              } 
            }
          : day
      ))
      
      // Update training count
      setTrainingCount(prev => prev + 1)
      
      toast({
        title: "Training gespeichert",
        description: `${type === 'course' ? 'Kurs' : type === 'free_training' ? 'Freies Training' : 'Plan'} wurde erfolgreich eingetragen.`
      })
    } catch (error) {
      console.error('Error adding training:', error)
      toast({
        title: "Fehler",
        description: "Training konnte nicht gespeichert werden.",
        variant: "destructive"
      })
    }
  }

  const handleRemoveTraining = async (dayNumber: number) => {
    try {
      const trainingDay = trainingDays.find(day => day.dayNumber === dayNumber)
      if (!trainingDay?.trainingSession) return

      const { error } = await supabase
        .from('training_sessions')
        .delete()
        .eq('id', trainingDay.trainingSession.id)

      if (error) {
        console.error('Error removing training session:', error)
        toast({
          title: "Fehler",
          description: "Training konnte nicht entfernt werden.",
          variant: "destructive"
        })
        return
      }

      // Update UI
      setTrainingDays(prev => prev.map(day => 
        day.dayNumber === dayNumber 
          ? { ...day, trainingSession: undefined }
          : day
      ))
      
      // Update training count
      setTrainingCount(prev => Math.max(0, prev - 1))
      
      toast({
        title: "Training entfernt",
        description: "Training wurde erfolgreich entfernt."
      })
    } catch (error) {
      console.error('Error removing training:', error)
      toast({
        title: "Fehler",
        description: "Training konnte nicht entfernt werden.",
        variant: "destructive"
      })
    }
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
        return <Leaderboard />
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