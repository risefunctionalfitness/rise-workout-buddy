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
  isRegisteredForCourse?: boolean
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
      // Scroll to top when tab changes (except for home tab which is the overview)
      if (event.detail !== 'home') {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'smooth'
        })
      }
    }
    
    // Listen for course registration changes
    const handleCourseRegistrationChanged = () => {
      generateTrainingDays()
    }
    
    window.addEventListener('changeTab', handleTabChange as EventListener)
    window.addEventListener('courseRegistrationChanged', handleCourseRegistrationChanged)
    
    return () => {
      mounted = false
      window.removeEventListener('changeTab', handleTabChange as EventListener)
      window.removeEventListener('courseRegistrationChanged', handleCourseRegistrationChanged)
    }
  }, [user.id])

  useEffect(() => {
    const handleCheckin = (e: Event) => {
      const ce = e as CustomEvent<{ date?: string; type?: string }>
      const dateStr = ce.detail?.date
      if (dateStr) {
        const d = new Date(dateStr)
        const dayNumber = d.getDate()
        let incremented = false
        setTrainingDays(prev => {
          const idx = prev.findIndex(day => day.dayNumber === dayNumber)
          if (idx === -1) return prev
          const hadSession = !!prev[idx].trainingSession
          const updated = prev.map(day =>
            day.dayNumber === dayNumber
              ? {
                  ...day,
                  trainingSession: prev[idx].trainingSession ?? {
                    type: 'free_training',
                    id: 'local'
                  }
                }
              : day
          )
          if (!hadSession) incremented = true
          return updated
        })
        if (incremented) {
          setTrainingCount(prev => prev + 1)
        }
      } else {
        // Fallback: just refresh from DB
        generateTrainingDays()
      }
      // In all cases, reconcile with DB shortly after
      setTimeout(() => generateTrainingDays(), 500)
    }
    window.addEventListener('open-gym-checkin-success', handleCheckin as EventListener)
    return () => {
      window.removeEventListener('open-gym-checkin-success', handleCheckin as EventListener)
    }
  }, [])

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
        trainingSession: undefined, // Will be filled from actual data
        isRegisteredForCourse: false // Will be set based on course registrations
      })
    }

    try {
      // Load existing training sessions
      const { data: sessions, error } = await supabase
        .from('training_sessions')
        .select('id, date, workout_type, status')
        .eq('user_id', user.id)
        .gte('date', `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`)
        .lt('date', `${currentYear}-${String(currentMonth + 2).padStart(2, '0')}-01`)

      if (error) {
        console.error('Error loading training sessions:', error)
        return
      }

      // Load course registrations for the month
      const { data: registrations, error: regError } = await supabase
        .from('course_registrations')
        .select(`
          course_id,
          status,
          courses(course_date, start_time, end_time)
        `)
        .eq('user_id', user.id)
        .eq('status', 'registered')
        .gte('courses.course_date', `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`)
        .lt('courses.course_date', `${currentYear}-${String(currentMonth + 2).padStart(2, '0')}-01`)

      if (regError) {
        console.error('Error loading course registrations:', regError)
      }

      const expiredCourses = registrations?.filter(reg => {
        if (!reg.courses?.course_date || !reg.courses?.end_time) return false
        
        const courseDate = new Date(reg.courses.course_date)
        const [hours, minutes] = reg.courses.end_time.split(':').map(Number)
        const courseEndTime = new Date(courseDate)
        courseEndTime.setHours(hours, minutes, 0, 0)
        
        return courseEndTime < today
      }) || []

      for (const expiredCourse of expiredCourses) {
        if (!expiredCourse.courses?.course_date) continue
        
        const courseDate = expiredCourse.courses.course_date
        const existingSession = sessions?.find(s => s.date === courseDate)
        
        if (!existingSession) {
          const { data: newSession, error: insertError } = await supabase
            .from('training_sessions')
            .insert({
              user_id: user.id,
              date: courseDate,
              workout_type: 'course',
              status: 'completed'
            })
            .select()
            .single()

          if (!insertError && newSession) {
            sessions?.push(newSession)
          }
        }
      }

      // Map future course registrations to days
      registrations?.forEach(reg => {
        if (!reg.courses?.course_date) return
        
        const courseDate = new Date(reg.courses.course_date)
        const dayNumber = courseDate.getDate()
        const dayIndex = days.findIndex(d => d.dayNumber === dayNumber)
        
        if (dayIndex !== -1 && days[dayIndex].isFuture) {
          days[dayIndex].isRegisteredForCourse = true
        }
      })

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

      // Count unique training days for header (not individual sessions)
      const uniqueTrainingDates = new Set()
      sessions?.forEach(session => {
        if (session.status === 'completed') {
          uniqueTrainingDates.add(session.date)
        }
      })
      setTrainingCount(uniqueTrainingDates.size)
    } catch (error) {
      console.error('Error loading training data:', error)
    }
    
    setTrainingDays(days)
  }

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
          <div className="p-4 space-y-6">
            
            <TrainingPath 
              trainingDays={trainingDays} 
              onAddTraining={handleAddTraining}
              onRemoveTraining={handleRemoveTraining}
              user={user}
              userRole={userRole}
            />
          </div>
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
          totalDaysInMonth={totalDaysInMonth}
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
                onClick={() => {
                  setActiveTab(tab.id as DashboardTabType)
                  // Scroll to top when tab changes (except for home tab which is the overview)
                  if (tab.id !== 'home') {
                    window.scrollTo({
                      top: 0,
                      left: 0,
                      behavior: 'smooth'
                    })
                  }
                }}
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
            className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 dark:from-gray-700 dark:to-gray-800 light:from-[#B81243] light:to-[#9A0F39] border border-border shadow-lg flex items-center justify-center text-gray-100 dark:text-gray-100 light:text-white hover:scale-105 transition-transform"
          >
            <Timer className="h-6 w-6 text-gray-100 dark:text-gray-100 light:text-white" />
          </button>
        </div>
      )}

      {showProfile && (
        <UserProfile onClose={() => setShowProfile(false)} />
      )}
    </div>
  )
}