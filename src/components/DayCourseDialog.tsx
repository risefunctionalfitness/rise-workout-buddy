import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, Users, User as UserIcon, Check, Weight } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { User } from "@supabase/supabase-js"
import { OpenGymCheckin } from "./OpenGymCheckin"

interface Course {
  id: string
  title: string
  trainer: string
  start_time: string
  end_time: string
  max_participants: number
  course_date: string
  is_cancelled: boolean
  strength_exercise: string | null
  registration_count: number
  registration_deadline_minutes: number
  cancellation_deadline_minutes: number
  user_registered: boolean
}

interface DayCourseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  user: User
  userRole?: string
}

export const DayCourseDialog: React.FC<DayCourseDialogProps> = ({
  open,
  onOpenChange,
  date,
  user,
  userRole
}) => {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(false)
  const [userMembershipType, setUserMembershipType] = useState<string>('')
  const [showQRScanner, setShowQRScanner] = useState(false)
  const { toast } = useToast()
  
  const isOpenGym = userRole === 'open_gym'

  useEffect(() => {
    if (open) {
      loadCoursesForDay()
      loadUserMembershipType()
    }
  }, [open, date])

  const loadUserMembershipType = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('membership_type')
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      setUserMembershipType(data?.membership_type || '')
    } catch (error) {
      console.error('Error loading user membership type:', error)
    }
  }

  const loadCoursesForDay = async () => {
    setLoading(true)
    try {
      const now = new Date()
      const currentDateTime = now.toISOString()

      let query = supabase
        .from('courses')
        .select('*')
        .eq('is_cancelled', false)

      if (date) {
        const dateString = date
        const nowTime = now.toTimeString().slice(0, 8)
        const nowDate = now.toISOString().split('T')[0]
        
        if (dateString === nowDate) {
          query = query.eq('course_date', dateString).gt('end_time', nowTime)
        } else {
          query = query.eq('course_date', dateString)
        }
      } else {
        const nowTime = now.toTimeString().slice(0, 8)
        const nowDate = now.toISOString().split('T')[0]
        
        query = query
          .or(`course_date.gt.${nowDate},and(course_date.eq.${nowDate},end_time.gt.${nowTime})`)
          .order('course_date', { ascending: true })
          .order('start_time', { ascending: true })
          .limit(10)
      }

      const { data: coursesData, error: coursesError } = await query

      if (coursesError) throw coursesError

      const filteredCourses = (coursesData || []).filter(course => {
        const courseDateTime = new Date(`${course.course_date}T${course.end_time}`)
        return courseDateTime > now
      }).slice(0, 10)

      const coursesWithCounts = await Promise.all(
        filteredCourses.map(async (course) => {
          const [registrationsResult, userRegistrationResult] = await Promise.all([
            supabase
              .from('course_registrations')
              .select('user_id')
              .eq('course_id', course.id)
              .eq('status', 'registered'),
            supabase
              .from('course_registrations')
              .select('status')
              .eq('course_id', course.id)
              .eq('user_id', user.id)
              .in('status', ['registered', 'waitlist'])
              .maybeSingle()
          ])

          return {
            ...course,
            registration_count: registrationsResult.data?.length || 0,
            user_registered: (userRegistrationResult.data?.status === 'registered' || userRegistrationResult.data?.status === 'waitlist') || false
          }
        })
      )

      // Sort courses by start_time (earliest first)
      const sortedCourses = coursesWithCounts.sort((a, b) => 
        a.start_time.localeCompare(b.start_time)
      )

      setCourses(sortedCourses)
    } catch (error) {
      console.error('Error loading courses:', error)
      toast({
        title: "Fehler",
        description: "Kurse konnten nicht geladen werden.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const canCancelCourse = (course: Course) => {
    const now = new Date()
    const courseDateTime = new Date(`${course.course_date}T${course.start_time}`)
    const cancellationDeadline = new Date(courseDateTime.getTime() - (course.cancellation_deadline_minutes * 60 * 1000))
    return now < cancellationDeadline
  }

  const handleRegistration = async (courseId: string, isRegistered: boolean) => {
    try {
      if (isRegistered) {
        // Check cancellation deadline before unregistering
        const course = courses.find(c => c.id === courseId)
        if (course && !canCancelCourse(course)) {
          toast({
            title: "Abmeldung nicht möglich",
            description: `Die Abmeldefrist ist bereits ${course.cancellation_deadline_minutes} Minuten vor Kursbeginn abgelaufen.`,
            variant: "destructive"
          })
          return
        }

        // Unregister
        const { error } = await supabase
          .from('course_registrations')
          .update({ status: 'cancelled' })
          .eq('course_id', courseId)
          .eq('user_id', user.id)
          .in('status', ['registered', 'waitlist'])

        if (error) throw error

        // Immediately update local state
        setCourses(prev => prev.map(c => 
          c.id === courseId 
            ? { ...c, user_registered: false, registration_count: Math.max(0, c.registration_count - 1) }
            : c
        ))

        toast({
          title: "Abgemeldet",
          description: "Du wurdest erfolgreich vom Kurs abgemeldet."
        })
      } else {
        // Check if user can register (limits and credits)
        const { data: canRegister, error: checkError } = await supabase
          .rpc('can_user_register_for_course', {
            user_id_param: user.id,
            course_id_param: courseId
          })

        if (checkError || !canRegister) {
          if (userMembershipType === 'Basic Member') {
            toast({
              title: "Wöchentliches Limit erreicht",
              description: "Du hast dein wöchentliches Limit von 2 Anmeldungen erreicht",
              variant: "destructive",
            })
          } else if (userMembershipType === '10er Karte') {
            toast({
              title: "Keine Credits verfügbar",
              description: "Du hast keine Credits mehr. Bitte lade deine 10er Karte am Empfang auf",
              variant: "destructive",
            })
          } else {
            toast({
              title: "Anmeldung nicht möglich",
              description: "Anmeldung nicht möglich",
              variant: "destructive",
            })
          }
          return
        }

        // Check registration deadline before registering
        const course = courses.find(c => c.id === courseId)
        if (course) {
          // Get course template to check registration deadline
          const { data: courseData, error: courseError } = await supabase
            .from('courses')
            .select('registration_deadline_minutes, course_date, start_time')
            .eq('id', courseId)
            .single()

          if (courseError) throw courseError

          const now = new Date()
          const courseStart = new Date(`${courseData.course_date}T${courseData.start_time}`)
          const deadlineTime = new Date(courseStart.getTime() - (courseData.registration_deadline_minutes * 60 * 1000))

          if (now > deadlineTime) {
            toast({
              title: "Anmeldung nicht möglich",
              description: `Die Anmeldefrist ist bereits ${courseData.registration_deadline_minutes} Minuten vor Kursbeginn abgelaufen.`,
              variant: "destructive"
            })
            return
          }
        }

        // Check if user already has a registration (including cancelled ones)
        const { data: existingReg, error: regCheckError } = await supabase
          .from('course_registrations')
          .select('id, status')
          .eq('course_id', courseId)
          .eq('user_id', user.id)
          .maybeSingle()

        if (regCheckError && regCheckError.code !== 'PGRST116') throw regCheckError

        if (existingReg) {
          // Update existing registration (reactivate if cancelled)
          const { error } = await supabase
            .from('course_registrations')
            .update({ 
              status: 'registered',
              registered_at: new Date().toISOString()
            })
            .eq('id', existingReg.id)

          if (error) throw error
        } else {
          // Create new registration
          const { error } = await supabase
            .from('course_registrations')
            .insert({
              course_id: courseId,
              user_id: user.id,
              status: 'registered'
            })

          if (error) throw error
        }

        // Immediately update local state
        setCourses(prev => prev.map(c => 
          c.id === courseId 
            ? { ...c, user_registered: true, registration_count: c.registration_count + 1 }
            : c
        ))

        toast({
          title: "Angemeldet",
          description: "Du wurdest erfolgreich für den Kurs angemeldet."
        })
      }

      // Reload data as fallback to ensure consistency
      await loadCoursesForDay()
      
      window.dispatchEvent(new CustomEvent('courseRegistrationChanged'))
      window.dispatchEvent(new CustomEvent('creditsUpdated'))
    } catch (error) {
      console.error('Error with registration:', error)
      toast({
        title: "Fehler",
        description: "Anmeldung konnte nicht verarbeitet werden.",
        variant: "destructive"
      })
    }
  }

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5) // HH:MM format ohne Sekunden
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit'
    })
  }

  const handleQRCheckinComplete = async () => {
    try {
      // Erstelle ein Training für Open Gym
      const { error } = await supabase
        .from('training_sessions')
        .insert({
          user_id: user.id,
          date: date,
          workout_type: 'free_training',
          status: 'completed',
          completed_at: new Date().toISOString()
        })

      if (error) throw error

      toast({
        title: "Open Gym Check-In erfolgreich",
        description: "Dein freies Training wurde registriert."
      })

      setShowQRScanner(false)
      
      // Dispatch events to update other components immediately
      window.dispatchEvent(
        new CustomEvent('open-gym-checkin-success', {
          detail: { date, type: 'free_training' }
        })
      )
    } catch (error) {
      console.error('Error creating training session:', error)
      toast({
        title: "Fehler",
        description: "Training konnte nicht registriert werden.",
        variant: "destructive"
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">
            Kurse am {formatDate(date)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8">Lade Kurse...</div>
          ) : courses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Keine Kurse an diesem Tag
            </div>
          ) : (
            courses.map((course) => (
              <div 
                key={course.id} 
                className={`bg-card rounded-lg p-3 border shadow-sm ${
                  course.user_registered 
                    ? 'border-green-500 border-2' 
                    : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-card-foreground text-sm">
                        {course.title}
                      </h3>
                      {course.strength_exercise && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          {course.strength_exercise}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatTime(course.start_time)} - {formatTime(course.end_time)} • {course.trainer}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span 
                      className={`text-xs font-medium px-2 py-1 rounded ${
                        course.registration_count >= course.max_participants 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {course.registration_count}/{course.max_participants}
                    </span>
                    
                    {!isOpenGym && (
                      <button
                        onClick={() => handleRegistration(course.id, course.user_registered)}
                        disabled={
                          (course.user_registered && !canCancelCourse(course)) ||
                          (!course.user_registered && course.registration_count >= course.max_participants)
                        }
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                          course.user_registered 
                            ? (canCancelCourse(course) ? 'bg-[#B81243] hover:bg-[#9A0F39]' : 'bg-gray-400 cursor-not-allowed')
                            : course.registration_count >= course.max_participants
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-[#B81243] hover:bg-[#9A0F39]'
                        }`}
                      >
                        {course.user_registered ? '−' : '+'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          {userMembershipType !== '10er Karte' && (
            <div className="bg-card rounded-lg p-3 border border-border shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-card-foreground text-sm">
                      Open Gym
                    </h3>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    QR Code scannen fürs Leaderboard
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onOpenChange(false)
                      setShowQRScanner(true)
                    }}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-sm bg-[#B81243] hover:bg-[#9A0F39]"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
      
      <OpenGymCheckin
        open={showQRScanner}
        onOpenChange={setShowQRScanner}
        onCheckinComplete={handleQRCheckinComplete}
      />
    </Dialog>
  )
}