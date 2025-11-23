import { useState, useEffect } from "react"
import { TrainingPathHeader } from "@/components/TrainingPathHeader"
import { UserProfile } from "@/components/UserProfile"
import { Leaderboard } from "@/components/Leaderboard"
import WorkoutOverview from "@/pages/WorkoutOverview"
import { WorkoutGenerator } from "@/components/WorkoutGenerator"
import { CourseBooking } from "@/components/CourseBooking"
import { NewsSection } from "@/components/NewsSection"
import ChallengeDetail from "@/components/ChallengeDetail"
import { FirstLoginDialog } from "@/components/FirstLoginDialog"
import { MemberBottomNavigation } from "@/components/MemberBottomNavigation"
import { MonthlyProgressCircle } from "@/components/MonthlyProgressCircle"
import { WeekPreview } from "@/components/WeekPreview"
import { UpcomingClassReservation } from "@/components/UpcomingClassReservation"
import { DashboardTileGrid } from "@/components/DashboardTileGrid"
import { CourseInvitationBadge } from "@/components/CourseInvitationBadge"
import { CourseInvitationsPanel } from "@/components/CourseInvitationsPanel"
import { DayCourseDialog } from "@/components/DayCourseDialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { 
  Home, 
  Calendar, 
  Users, 
  Newspaper, 
  Dumbbell, 
  CreditCard,
  Grid3X3,
  Weight,
  Trophy,
  Award
} from "lucide-react"

import { supabase } from "@/integrations/supabase/client"
import { User } from "@supabase/supabase-js"
import { useToast } from "@/hooks/use-toast"
import { useNewsNotification } from "@/hooks/useNewsNotification"

import { useNavigate, useSearchParams } from "react-router-dom"
import { timezone } from "@/lib/timezone"
import { format } from "date-fns"

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
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<DashboardTabType>('home')
  const [trainingDays, setTrainingDays] = useState<TrainingDay[]>([])
  const [trainingCount, setTrainingCount] = useState(0)
  const [showProfile, setShowProfile] = useState(false)
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const [selectedChallenge, setSelectedChallenge] = useState<{challenge: any, progress: any} | null>(null)
  const [currentChallenge, setCurrentChallenge] = useState<any>(null)
  const [wodStep, setWodStep] = useState(1)
  const [showFirstLoginDialog, setShowFirstLoginDialog] = useState(false)
  const [showAdminNav, setShowAdminNav] = useState(false)
  const [showInvitations, setShowInvitations] = useState(false)
  const [invitationCount, setInvitationCount] = useState(0)
  const [selectedCourseFromInvitation, setSelectedCourseFromInvitation] = useState<{
    courseId: string
    courseDate: string
  } | null>(null)
  const [showDayCoursesFromInvitation, setShowDayCoursesFromInvitation] = useState(false)
  const { toast } = useToast()
  const { hasUnreadNews, markNewsAsRead } = useNewsNotification(user)
  
  // Check if user is Open Gym (should not see courses)
  const isOpenGym = userRole === 'open_gym'

  // Check URL parameters to open invitations panel
  useEffect(() => {
    if (searchParams.get('invitations') === 'open') {
      setShowInvitations(true)
      // Remove the parameter from URL after opening
      searchParams.delete('invitations')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  // Generate training days for current month and load training sessions
  useEffect(() => {
    let mounted = true
    
    const loadData = async () => {
      if (!mounted) return
      
      // Verify session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      console.log("=== SESSION CHECK ===")
      console.log("Session user ID:", session?.user?.id)
      console.log("Props user ID:", user.id)
      console.log("Session error:", sessionError)
      console.log("Match:", session?.user?.id === user.id)
      
      await loadUserProfile()
      if (!mounted) return
      await generateTrainingDays()
      if (!mounted) return
      await loadCurrentChallenge()
      if (!mounted) return
      await checkFirstLogin()
      if (!mounted) return
      await loadInvitationCount()
    }
    
    loadData()
    
    // Setup realtime updates for invitations
    const channel = supabase
      .channel('course_invitations_updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'course_invitations',
        filter: `recipient_id=eq.${user.id}`
      }, (payload) => {
        console.log("New invitation received (Realtime):", payload)
        loadInvitationCount()
        toast({
          title: "Neue Kurseinladung!",
          description: "Du wurdest zu einem Kurs eingeladen."
        })
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'course_invitations',
        filter: `recipient_id=eq.${user.id}`
      }, (payload) => {
        console.log("Invitation updated (Realtime):", payload)
        loadInvitationCount()
      })
      .subscribe((status) => {
        console.log("Realtime channel status:", status)
      })

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
      supabase.removeChannel(channel)
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
        console.log('[Android Debug] Local state updated successfully, count:', trainingCount + (incremented ? 1 : 0))
      } else {
        console.log('[Android Debug] No date in event, falling back to DB refresh')
        // Fallback: just refresh from DB with protection for trainingCount
        const currentCount = trainingCount
        generateTrainingDays().catch(error => {
          console.error('[Android Debug] Fallback generateTrainingDays failed:', error)
          // Restore training count if DB refresh failed
          setTrainingCount(currentCount + 1)
        })
      }
      // In all cases, reconcile with DB shortly after with error handling
      setTimeout(() => {
        generateTrainingDays().catch(error => {
          console.error('[Android Debug] Background generateTrainingDays failed:', error)
        })
      }, 500)
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

  const checkFirstLogin = async () => {
    if (!user) return
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('welcome_dialog_shown')
        .eq('user_id', user.id)
        .maybeSingle()
      
      console.log('Welcome dialog check:', profile)
      
      // Show dialog if welcome dialog hasn't been shown yet
      if (!profile?.welcome_dialog_shown) {
        // Wait 2 seconds before showing the dialog
        setTimeout(() => {
          setShowFirstLoginDialog(true)
        }, 2000)
      }
    } catch (error) {
      console.error('Error checking welcome dialog status:', error)
    }
  }

  const loadCurrentChallenge = async () => {
    try {
      const currentDate = new Date()
      const currentMonth = currentDate.getMonth() + 1
      const currentYear = currentDate.getFullYear()

      const { data: challenge, error } = await supabase
        .from("monthly_challenges")
        .select("*")
        .eq("month", currentMonth)
        .eq("year", currentYear)
        .eq("is_archived", false)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      setCurrentChallenge(challenge)
      
      // Challenge is loaded and ready
    } catch (error) {
      console.error("Error loading current challenge:", error)
    }
  }

  const loadInvitationCount = async () => {
    console.log("=== LOADING INVITATION COUNT ===")
    console.log("User ID:", user.id)
    console.log("User Email:", user.email)
    
    // Get current time in Berlin timezone
    const nowInBerlin = timezone.nowInBerlin()
    const todayStr = format(nowInBerlin, 'yyyy-MM-dd')
    const nowTime = format(nowInBerlin, 'HH:mm:ss')
    
    const { count, error, data } = await supabase
      .from("course_invitations")
      .select("*, courses!inner(course_date, end_time)", { count: 'exact' })
      .eq("recipient_id", user.id)
      .eq("status", "pending")
      .or(`course_date.gt.${todayStr},and(course_date.eq.${todayStr},end_time.gt.${nowTime})`, { foreignTable: 'courses' })

    console.log("Raw invitation data:", data)
    console.log("Invitation count:", count)
    console.log("Error:", error)

    if (error) {
      console.error("Error loading invitation count:", error)
      toast({
        title: "Fehler beim Laden der Einladungen",
        description: error.message,
        variant: "destructive"
      })
      return
    }

    console.log("Setting invitation count to:", count || 0)
    setInvitationCount(count || 0)
  }

  const handleAcceptInvitation = (courseId: string, courseDate: string) => {
    setSelectedCourseFromInvitation({ courseId, courseDate })
    setShowDayCoursesFromInvitation(true)
  }

  const generateTrainingDays = async () => {
    const today = timezone.nowInBerlin()
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    
    const days: TrainingDay[] = []
    
    // Generate all days of the current month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = timezone.createDateInBerlin(currentYear, currentMonth, day)
      const isToday = timezone.isSameDayInBerlin(currentDate, today)
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
      
      // Debug logging for Android issue
      console.log('📊 Training Count Debug:', {
        totalSessions: sessions?.length || 0,
        completedSessions: sessions?.filter(s => s.status === 'completed').length || 0,
        uniqueTrainingDates: Array.from(uniqueTrainingDates),
        finalCount: uniqueTrainingDates.size,
        userAgent: navigator.userAgent,
        isAndroid: /Android/i.test(navigator.userAgent)
      })
      
      const calculatedCount = uniqueTrainingDates.size
      setTrainingCount(calculatedCount)
      
      // Fallback: Direct database query for training count if Android
      if (/Android/i.test(navigator.userAgent) && calculatedCount === 0) {
        console.log('🔄 Android fallback: Querying training count directly')
        try {
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]
          
          const { data: fallbackSessions, error: fallbackError } = await supabase
            .from('training_sessions')
            .select('date')
            .eq('user_id', user.id)
            .eq('status', 'completed')
            .gte('date', startOfMonth)
            .lte('date', endOfMonth)
          
          if (!fallbackError && fallbackSessions) {
            const fallbackCount = new Set(fallbackSessions.map(s => s.date)).size
            console.log('📱 Android fallback result:', fallbackCount)
            if (fallbackCount > calculatedCount) {
              setTrainingCount(fallbackCount)
            }
          }
        } catch (fallbackError) {
          console.error('Android fallback query failed:', fallbackError)
        }
      }
    } catch (error) {
      console.error('Error loading training data:', error)
      // Try alternative approach on error
      if (user?.id) {
        try {
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]
          
          const { data: emergencySessions } = await supabase
            .from('training_sessions')
            .select('date')
            .eq('user_id', user.id)
            .eq('status', 'completed')
            .gte('date', startOfMonth)
            .lte('date', endOfMonth)
          
          if (emergencySessions) {
            const emergencyCount = new Set(emergencySessions.map(s => s.date)).size
            console.log('🆘 Emergency count fallback:', emergencyCount)
            setTrainingCount(emergencyCount)
          }
        } catch (emergencyError) {
          console.error('Emergency fallback also failed:', emergencyError)
        }
      }
    }
    
    setTrainingDays(days)
  }

  const userName = user?.user_metadata?.display_name || 
                   user?.email?.split('@')[0] || 
                   'Nutzer'

  const totalDaysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()

  const handleAddTraining = async (dayNumber: number, type: 'course' | 'free_training' | 'plan') => {
    try {
      const currentDate = timezone.nowInBerlin()
      const sessionDate = timezone.createDateInBerlin(currentDate.getFullYear(), currentDate.getMonth(), dayNumber)
      
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

  const handleChallengeClick = async () => {
    if (!currentChallenge) {
      await loadCurrentChallenge()
      return
    }

    try {
      // Load user progress for this challenge
      const { data: progress } = await supabase
        .from("user_challenge_progress")
        .select("*")
        .eq("challenge_id", currentChallenge.id)
        .eq("user_id", user.id)
        .maybeSingle()

      setSelectedChallenge({
        challenge: currentChallenge,
        progress: progress || {
          completed_checkpoints: 0,
          is_completed: false
        }
      })
    } catch (error) {
      console.error("Error loading challenge progress:", error)
    }
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="flex-1 flex flex-col gap-4 p-4 pb-24 overflow-y-auto">
            {/* 50% Height - MonthlyProgressCircle */}
            <div className="flex-1 min-h-0 relative">
              <MonthlyProgressCircle 
                user={user}
              />
              <CourseInvitationBadge 
                invitationCount={invitationCount}
                onClick={() => setShowInvitations(true)}
              />
            </div>
            
            {/* Auto Height - WeekPreview */}
            <div className="flex-shrink-0">
              <WeekPreview user={user} userRole={userRole} />
            </div>
            
            {/* Auto Height - UpcomingClassReservation */}
            <div className="flex-shrink-0">
              <UpcomingClassReservation user={user} />
            </div>
            
            {/* 50% Height - DashboardTileGrid */}
            <div className="flex-1 min-h-0">
              <DashboardTileGrid
                userId={user.id}
                currentChallenge={currentChallenge}
                hasUnreadNews={hasUnreadNews}
                onChallengeClick={async () => {
                  if (currentChallenge && user?.id) {
                    let { data: progress, error } = await supabase
                      .from("user_challenge_progress")
                      .select("*")
                      .eq("user_id", user.id)
                      .eq("challenge_id", currentChallenge.id)
                      .single()

                    if (error && error.code === 'PGRST116') {
                      const { data: newProgress, error: createError } = await supabase
                        .from("user_challenge_progress")
                        .insert({
                          user_id: user.id,
                          challenge_id: currentChallenge.id,
                          completed_checkpoints: 0,
                          is_completed: false
                        })
                        .select()
                        .single()

                      if (createError) {
                        console.error("Error creating progress:", createError)
                        return
                      }
                      progress = newProgress
                    }

                    setSelectedChallenge({ challenge: currentChallenge, progress })
                  }
                }}
                onNewsClick={() => {
                  markNewsAsRead()
                  navigate('/news')
                }}
              />
            </div>
          </div>
        )
      case 'wod':
        return (
          <div className="flex-1 overflow-y-auto">
            <WorkoutOverview user={user} />
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
          user={user}
          userAvatar={userAvatar}
          onProfileClick={() => setShowProfile(true)}
          onAdminClick={() => setShowAdminNav(true)}
        />
      </div>
      
      <div className="pt-16 flex-1">
        {renderTabContent()}
      </div>
      
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-2 z-50">
        <div className="flex justify-around max-w-md mx-auto">
          {[
            { id: 'home', icon: Home, label: 'Übersicht' },
            ...(isOpenGym ? [] : [{ id: 'courses', icon: Calendar, label: 'Kurse' }]),
            { id: 'wod', icon: Weight, label: 'WOD' },
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


      {showProfile && (
        <UserProfile onClose={() => setShowProfile(false)} />
      )}
      
      {selectedChallenge && (
        <ChallengeDetail
          challenge={selectedChallenge.challenge}
          progress={selectedChallenge.progress}
          open={!!selectedChallenge}
          onOpenChange={(open) => !open && setSelectedChallenge(null)}
          onProgressUpdate={() => {
            loadCurrentChallenge()
          }}
        />
      )}

      <FirstLoginDialog 
        open={showFirstLoginDialog} 
        onClose={async () => {
          setShowFirstLoginDialog(false)
          try {
            await supabase
              .from('profiles')
              .update({ welcome_dialog_shown: true })
              .eq('user_id', user.id)
          } catch (error) {
            console.error('Error updating welcome dialog status:', error)
          }
        }} 
      />

      {/* Course Invitations Panel */}
      <CourseInvitationsPanel
        open={showInvitations}
        onOpenChange={setShowInvitations}
        user={user}
        onAcceptInvitation={handleAcceptInvitation}
      />

      {/* DayCourseDialog from Invitation */}
      {selectedCourseFromInvitation && (
        <DayCourseDialog
          open={showDayCoursesFromInvitation}
          onOpenChange={(open) => {
            setShowDayCoursesFromInvitation(open)
            if (!open) {
              setSelectedCourseFromInvitation(null)
            }
          }}
          date={selectedCourseFromInvitation.courseDate}
          user={user}
          userRole={userRole}
          preselectedCourseId={selectedCourseFromInvitation.courseId}
        />
      )}

      {/* Admin Navigation Dialog */}
      <Dialog open={showAdminNav} onOpenChange={setShowAdminNav}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Admin Navigation</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-24 flex flex-col gap-2"
              onClick={() => {
                setShowAdminNav(false)
                navigate('/admin')
              }}
            >
              <Home className="h-6 w-6" />
              <span>Dashboard</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col gap-2"
              onClick={() => {
                setShowAdminNav(false)
                navigate('/admin')
              }}
            >
              <Users className="h-6 w-6" />
              <span>Mitglieder</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col gap-2"
              onClick={() => {
                setShowAdminNav(false)
                navigate('/admin')
              }}
            >
              <Calendar className="h-6 w-6" />
              <span>Kurse</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col gap-2"
              onClick={() => {
                setShowAdminNav(false)
                navigate('/admin/workouts')
              }}
            >
              <Dumbbell className="h-6 w-6" />
              <span>Workouts</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col gap-2"
              onClick={() => {
                setShowAdminNav(false)
                navigate('/admin')
              }}
            >
              <Newspaper className="h-6 w-6" />
              <span>News</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col gap-2"
              onClick={() => {
                setShowAdminNav(false)
                navigate('/admin')
              }}
            >
              <CreditCard className="h-6 w-6" />
              <span>Credits</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}