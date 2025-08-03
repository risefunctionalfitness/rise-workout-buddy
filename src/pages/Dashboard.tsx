import { useState, useEffect } from "react"
import { Home, Calendar, Trophy, Weight, Timer } from "lucide-react"
import { TrainingPathHeader } from "@/components/TrainingPathHeader"
import { TrainingPath } from "@/components/TrainingPath"
import { BottomNavigation } from "@/components/BottomNavigation"
import type { TabType as AdminTabType } from "@/components/BottomNavigation"
import { UserProfile } from "@/components/UserProfile"
import { Leaderboard } from "@/components/Leaderboard"
import { WorkoutGenerator } from "@/components/WorkoutGenerator"
import { CourseBooking } from "@/components/CourseBooking"
import { NewsSection } from "@/components/NewsSection"
import { LeaderboardPosition } from "@/components/LeaderboardPosition"
import { supabase } from "@/integrations/supabase/client"
import { User } from "@supabase/supabase-js"
import { useToast } from "@/hooks/use-toast"
import { useNewsNotification } from "@/hooks/useNewsNotification"
import { useScrollToTop } from "@/hooks/useScrollToTop"
import { useNavigate } from "react-router-dom"

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
  userRole?: string
}

export const Dashboard: React.FC<DashboardProps> = ({ user, userRole }) => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<DashboardTabType>('home')
  const [trainingDays, setTrainingDays] = useState<TrainingDay[]>([])
  const [trainingCount, setTrainingCount] = useState(0)
  const [showProfile, setShowProfile] = useState(false)
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const { toast } = useToast()
  const { hasUnreadNews, markNewsAsRead } = useNewsNotification(user)
  
  // Scroll to top when changing tabs (except home which has the overview)
  useScrollToTop(['/pro']) // Exclude the overview page from scroll to top
  
  // Check if user is Open Gym (should not see courses)
  const isOpenGym = userRole === 'open_gym'

  // Generate training days for current month and load training sessions
  useEffect(() => {
    let mounted = true
    
    const loadData = async () => {
      if (!mounted) return
      await loadUserProfile()
      if (!mounted) return
      await generateTrainingDays()
    }
    
    loadData()
    
    // Check if we should open profile from navigation state
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('openProfile') === 'true') {
      setShowProfile(true)
      // Clean URL without refreshing page
      window.history.replaceState({}, '', '/pro')
    }
    
    // Listen for custom tab change events
    const handleTabChange = (event: CustomEvent) => {
      setActiveTab(event.detail as DashboardTabType)
    }
    
    window.addEventListener('changeTab', handleTabChange as EventListener)
    
    return () => {
      mounted = false
      window.removeEventListener('changeTab', handleTabChange as EventListener)
    }
  }, [user.id])

  const loadUserProfile = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('user_id', user.id)
        .maybeSingle()
      
      setUserAvatar(profile?.avatar_url || null)
    } catch (error) {
      console.error('Error loading user profile:', error)
    }
  }

  const generateTrainingDays = async () => {
    const today = new Date()
    const currentDate = new Date(today)
    
    // Generate next 10 training days starting from today
    const days: TrainingDay[] = []
    
    for (let i = 0; i < 10; i++) {
      const date = new Date(currentDate)
      date.setDate(currentDate.getDate() + i)
      
      const isToday = date.toDateString() === today.toDateString()
      const isFuture = date > today
      const isPast = date < today && !isToday
      
      days.push({
        date: date,
        dayNumber: date.getDate(),
        isToday,
        isFuture,
        isPast,
        trainingSession: undefined // Will be filled from actual data
      })
    }

    // Load existing training sessions for the next 10 days
    try {
      const startDate = new Date(today)
      const endDate = new Date(today)
      endDate.setDate(today.getDate() + 10)
      
      const { data: sessions, error } = await supabase
        .from('training_sessions')
        .select('id, date, workout_type, status')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .lt('date', endDate.toISOString().split('T')[0])

      if (error) {
        console.error('Error loading training sessions:', error)
        return
      }

      // Map sessions to days
      sessions?.forEach(session => {
        const sessionDate = new Date(session.date)
        const dayIndex = days.findIndex(d => 
          d.date.toDateString() === sessionDate.toDateString()
        )
        
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
    
    setTrainingDays(days)
  }

  const userName = user?.user_metadata?.display_name || 
                   user?.email?.split('@')[0] || 
                   'Nutzer'

  const totalDaysShown = 10 // Changed from monthly view to next 10 days

  const handleAddTraining = async (dayNumber: number, type: 'course' | 'free_training' | 'plan') => {
    try {
      // Find the correct date from our training days
      const selectedDay = trainingDays.find(day => day.dayNumber === dayNumber)
      if (!selectedDay) return
      
      const sessionDate = selectedDay.date
      
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
            userRole={userRole}
          />
        )
      case 'wod':
        return (
          <div className="flex-1 container mx-auto px-6 py-8">
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
          totalDaysInMonth={totalDaysShown}
          userAvatar={userAvatar}
          onProfileClick={() => setShowProfile(true)}
        />
      </div>
      
      <div className="pt-16 flex-1">
        {renderTabContent()}
      </div>
      
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-2 z-50">
        <div className="flex justify-around max-w-md mx-auto">
          {[
            { id: 'home', icon: Home, label: 'Übersicht' },
            { id: 'wod', icon: Weight, label: 'WOD' },
            ...(isOpenGym ? [] : [{ id: 'courses', icon: Calendar, label: 'Kurse' }]),
            { id: 'leaderboard', icon: Trophy, label: 'Leaderboard' }
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as DashboardTabType)}
                className={`flex flex-col items-center gap-1 h-auto py-2 px-3 rounded-md transition-colors ${
                  activeTab === tab.id 
                    ? 'text-primary bg-primary/10' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Buttons nur auf der Home-Ansicht anzeigen */}
      {activeTab === 'home' && (
        <div className="fixed top-24 right-4 z-50 flex flex-col gap-4">
          <LeaderboardPosition user={user} />
          <button 
            onClick={() => navigate("/workout-timer")}
            className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border border-border shadow-lg flex items-center justify-center text-gray-700 hover:scale-105 transition-transform"
          >
            <Timer className="h-6 w-6" />
          </button>
        </div>
      )}

      {showProfile && (
        <UserProfile onClose={() => setShowProfile(false)} />
      )}
    </div>
  )
}