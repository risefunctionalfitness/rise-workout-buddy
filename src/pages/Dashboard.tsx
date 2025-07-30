import { useState, useEffect } from "react"
import { TrainingPathHeader } from "@/components/TrainingPathHeader"
import { TrainingPath } from "@/components/TrainingPath"
import { BottomNavigation } from "@/components/BottomNavigation"
import type { TabType as AdminTabType } from "@/components/BottomNavigation"
import { UserProfile } from "@/components/UserProfile"
import { Leaderboard } from "@/components/Leaderboard"
import { WorkoutGenerator } from "@/components/WorkoutGenerator"
import { CourseBooking } from "@/components/CourseBooking"
import { NewsSection } from "@/components/NewsSection"
import { supabase } from "@/integrations/supabase/client"
import { User } from "@supabase/supabase-js"
import { useToast } from "@/hooks/use-toast"
import { useNewsNotification } from "@/hooks/useNewsNotification"

type DashboardTabType = 'home' | 'wod' | 'courses' | 'leaderboard' | 'news'

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
  const [activeTab, setActiveTab] = useState<DashboardTabType>('home')
  const [trainingDays, setTrainingDays] = useState<TrainingDay[]>([])
  const [trainingCount, setTrainingCount] = useState(0)
  const [showProfile, setShowProfile] = useState(false)
  const { toast } = useToast()
  const { hasUnreadNews, markNewsAsRead } = useNewsNotification(user)

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
            user={user}
          />
        )
      case 'wod':
        return (
          <div className="flex-1 container mx-auto px-6 py-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                WOD Generator
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Erstelle dir dein personalisiertes Workout basierend auf deinem Profil.
              </p>
            </div>
            <WorkoutGenerator user={user} />
          </div>
        )
      case 'courses':
        return <CourseBooking user={user} />
      case 'leaderboard':
        return <Leaderboard />
      case 'news':
        return <NewsSection />
      default:
        return null
    }
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b">
        <TrainingPathHeader
          trainingDaysThisMonth={trainingCount}
          totalDaysInMonth={totalDaysInMonth}
          onProfileClick={() => setShowProfile(true)}
        />
      </div>
      
      <div className="pt-16 flex-1">
        {renderTabContent()}
      </div>
      
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-2 z-50">
        <div className="flex justify-around max-w-md mx-auto">
          {[
            { id: 'home', icon: 'home', label: 'Übersicht' },
            { id: 'wod', icon: 'weightlifter', label: 'WOD' },
            { id: 'courses', icon: 'calendar', label: 'Kurse' },
            { id: 'leaderboard', icon: 'trophy', label: 'Leaderboard' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as DashboardTabType)}
              className={`flex flex-col items-center gap-1 h-auto py-2 px-3 rounded-md transition-colors ${
                activeTab === tab.id 
                  ? 'text-primary bg-primary/10' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <div className="h-5 w-5 relative">
                {tab.icon === 'home' && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>}
                {tab.icon === 'weightlifter' && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5h-1.5a3 3 0 0 0-3 3v3a3 3 0 0 0 3 3h1.5m0-9h9m-9 0V6a1.5 1.5 0 0 1 1.5-1.5h6A1.5 1.5 0 0 1 18 6v1.5m-9 9h9m-9 0V18a1.5 1.5 0 0 0 1.5 1.5h6A1.5 1.5 0 0 0 18 18v-1.5m-1.5-9h-3m3 0h3m-3 4.5h3m-3 4.5h3" /></svg>}
                {tab.icon === 'calendar' && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>}
                {tab.icon === 'trophy' && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M15.75 4.5V2.25A2.25 2.25 0 0 0 13.5 0h-3a2.25 2.25 0 0 0-2.25 2.25V4.5m11.356 1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.119-1.243l1.263-12A1.125 1.125 0 0 1 5.513 5.25h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>}
              </div>
              <span className="text-xs">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {showProfile && (
        <UserProfile onClose={() => setShowProfile(false)} />
      )}
    </div>
  )
}