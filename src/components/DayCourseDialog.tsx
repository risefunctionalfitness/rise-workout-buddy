import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, User as UserIcon, Calendar, X, Dumbbell, AlertTriangle, ArrowRightLeft } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { User } from "@supabase/supabase-js"
import { format, parseISO } from "date-fns"
import { de } from "date-fns/locale"
import { ProfileImageViewer } from "./ProfileImageViewer"
import { MembershipBadge } from "./MembershipBadge"
import { OpenGymCheckin } from "./OpenGymCheckin"
import { CourseInvitationButton } from "./CourseInvitationButton"
import { AddToCalendarButton } from "./AddToCalendarButton"
import { ReliabilityScoreScale } from "./ReliabilityScoreScale"
import { ReliabilityScoreBadge } from "./ReliabilityScoreBadge"
import { FairnessCheckDialog } from "./FairnessCheckDialog"
import { useReliabilityScore } from "@/hooks/useReliabilityScore"

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
  registration_deadline_minutes: number
  cancellation_deadline_minutes: number
  registered_count: number
  waitlist_count: number
  is_registered: boolean
  is_waitlisted: boolean
  color?: string
  cancelled_due_to_low_attendance?: boolean
}

interface DayCourseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  user: User
  userRole?: string
  preselectedCourseId?: string
  rebookFromCourseId?: string
  onRebookComplete?: () => void
}

export const DayCourseDialog: React.FC<DayCourseDialogProps> = ({
  open,
  onOpenChange,
  date,
  user,
  userRole,
  preselectedCourseId,
  rebookFromCourseId,
  onRebookComplete
}) => {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [participants, setParticipants] = useState<any[]>([])
  const [userMembershipType, setUserMembershipType] = useState<string>('')
  const [isTrainer, setIsTrainer] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<{ imageUrl: string | null; displayName: string } | null>(null)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [fairnessCheckOpen, setFairnessCheckOpen] = useState(false)
  const [pendingCancellationId, setPendingCancellationId] = useState<string | null>(null)
  const [duplicateWarningOpen, setDuplicateWarningOpen] = useState(false)
  const [pendingRegistrationId, setPendingRegistrationId] = useState<string | null>(null)
  const [rebookFromId, setRebookFromId] = useState<string | null>(rebookFromCourseId || null)
  const { data: reliabilityScore, refetch: refetchScore } = useReliabilityScore(user.id)

  useEffect(() => {
    if (open) {
      loadCoursesForDay()
      loadUserInfo()
    }
  }, [open, date, preselectedCourseId])

  const loadUserInfo = async () => {
    try {
      const [rolesResult, profileResult] = await Promise.all([
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id),
        supabase
          .from('profiles')
          .select('membership_type')
          .eq('user_id', user.id)
          .single()
      ])
      
      if (rolesResult.data) {
        const roles = rolesResult.data.map(r => r.role)
        setIsTrainer(roles.includes('trainer'))
        setIsAdmin(roles.includes('admin'))
      }
      
      if (profileResult.data) {
        setUserMembershipType(profileResult.data.membership_type || '')
      }
    } catch (error) {
      console.error('Error loading user info:', error)
    }
  }

  const loadCoursesForDay = async () => {
    setLoading(true)
    try {
      // Ensure valid session before querying (prevents iOS auth token issues)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        const { error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError) {
          console.warn('Session refresh failed:', refreshError.message)
        }
      }

      const now = new Date()
      const nowTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`
      const nowDate = now.toISOString().split('T')[0]
      
      let query = supabase
        .from('courses')
        .select(`
          *,
          color,
          cancelled_due_to_low_attendance,
          course_registrations(status)
        `)
        .eq('is_cancelled', false)
        // Show cancelled_due_to_low_attendance courses too (with badge)
        .eq('course_date', date)

      // If today, only show courses that haven't ended
      if (date === nowDate) {
        query = query.gt('end_time', nowTime)
      }

      const [coursesResult, userRegistrationsResult] = await Promise.all([
        query.order('start_time', { ascending: true }),
        supabase
          .from('course_registrations')
          .select('course_id, status')
          .eq('user_id', user.id)
          .in('status', ['registered', 'waitlist'])
      ])

      if (coursesResult.error) throw coursesResult.error
      if (userRegistrationsResult.error) throw userRegistrationsResult.error

      // Get course IDs to fetch guest registrations (guard against empty array)
      const courseIds = (coursesResult.data || []).map(c => c.id)
      
      let guestRegistrations: { course_id: string; status: string }[] = []
      if (courseIds.length > 0) {
        const { data: guestData } = await supabase
          .from('guest_registrations')
          .select('course_id, status')
          .in('course_id', courseIds)
          .eq('status', 'registered')
        guestRegistrations = guestData || []
      }

      // Process courses including guest counts
      const processedCourses = (coursesResult.data || []).map(course => {
        const registrations = course.course_registrations || []
        const regularRegisteredCount = registrations.filter(r => r.status === 'registered').length
        const waitlist_count = registrations.filter(r => r.status === 'waitlist').length
        
        // Add guest count to registered count
        const guestCount = guestRegistrations.filter(g => g.course_id === course.id).length
        const registered_count = regularRegisteredCount + guestCount
        
        const userReg = userRegistrationsResult.data?.find(r => r.course_id === course.id)
        const is_registered = userReg?.status === 'registered'
        const is_waitlisted = userReg?.status === 'waitlist'

        return {
          ...course,
          registered_count,
          waitlist_count,
          is_registered,
          is_waitlisted
        }
      })

      setCourses(processedCourses)
      
      // Auto-select course if preselectedCourseId is provided
      if (preselectedCourseId) {
        const preselectedCourse = processedCourses.find(c => c.id === preselectedCourseId)
        if (preselectedCourse) {
          handleCourseClick(preselectedCourse)
        }
      }
    } catch (error) {
      console.error('Error loading courses:', error)
      toast.error('Fehler beim Laden der Kurse')
    } finally {
      setLoading(false)
    }
  }

  const loadParticipants = async (courseId: string) => {
    try {
      // Load regular registrations
      const { data: registrations, error: regError } = await supabase
        .from('course_registrations')
        .select('status, user_id, registered_at')
        .eq('course_id', courseId)
        .order('registered_at', { ascending: true })

      if (regError) throw regError

      const userIds = registrations?.map(r => r.user_id) || []
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, display_name, nickname, first_name, membership_type, avatar_url')
        .in('user_id', userIds)

      if (profileError) throw profileError

      const participantsWithNames = registrations?.map(reg => ({
        ...reg,
        profiles: profiles?.find(p => p.user_id === reg.user_id) || { display_name: 'Unbekannt' },
        isGuest: false
      })) || []

      // Load guest registrations (Drop-Ins and Probetrainings)
      const { data: guestRegistrations, error: guestError } = await supabase
        .from('guest_registrations')
        .select('id, guest_name, booking_type, created_at')
        .eq('course_id', courseId)
        .eq('status', 'registered')
        .order('created_at', { ascending: true })

      if (guestError) {
        console.error('Error loading guest registrations:', guestError)
      }

      // Convert guest registrations to participant format
      const guestParticipants = (guestRegistrations || []).map(guest => ({
        user_id: guest.id,
        status: 'registered',
        registered_at: guest.created_at,
        profiles: {
          display_name: guest.guest_name,
          nickname: null,
          membership_type: guest.booking_type === 'drop_in' ? 'Drop-In' : 'Probetraining',
          avatar_url: null
        },
        isGuest: true
      }))

      // Combine regular participants and guests
      setParticipants([...participantsWithNames, ...guestParticipants])
    } catch (error) {
      console.error('Error loading participants:', error)
      toast.error('Fehler beim Laden der Teilnehmer')
      setParticipants([])
    }
  }

  const handleCourseClick = async (course: Course) => {
    setSelectedCourse(course)
    await loadParticipants(course.id)
    setDetailDialogOpen(true)
  }

  const canCancelCourse = (course: Course) => {
    const now = new Date()
    const courseDateTime = new Date(`${course.course_date}T${course.start_time}`)
    const cancellationDeadline = new Date(courseDateTime.getTime() - (course.cancellation_deadline_minutes * 60 * 1000))
    return now < cancellationDeadline
  }

  const handleRegistration = async (courseId: string, skipDuplicateCheck = false) => {
    try {
      const course = courses.find(c => c.id === courseId)
      if (!course) return

      // Skip duplicate check if rebooking (we're replacing a course on the same day)
      if (!skipDuplicateCheck && !rebookFromId) {
        const existingRegistration = courses.find(c => 
          c.course_date === course.course_date && 
          c.id !== courseId && 
          (c.is_registered || c.is_waitlisted)
        )
        if (existingRegistration) {
          setPendingRegistrationId(courseId)
          setDuplicateWarningOpen(true)
          return
        }
      }

      // Check if user can register
      const { data: canRegister, error: checkError } = await supabase
        .rpc('can_user_register_for_course', {
          user_id_param: user.id,
          course_id_param: courseId
        })

      if (checkError || !canRegister) {
        if (userMembershipType === 'Basic Member') {
          toast.error("Du hast dein wöchentliches Limit von 2 Anmeldungen erreicht")
        } else if (userMembershipType === '10er Karte') {
          toast.error("Du hast keine Credits mehr. Bitte lade deine 10er Karte am Empfang auf")
        } else {
          toast.error("Anmeldung nicht möglich")
        }
        return
      }

      // Check registration deadline
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
        toast.error(`Die Anmeldefrist ist bereits ${courseData.registration_deadline_minutes} Minuten vor Kursbeginn abgelaufen.`)
        return
      }

      // If rebooking, first cancel the old course with 'rebooked' status
      if (rebookFromId) {
        const { error: rebookError } = await supabase
          .from('course_registrations')
          .update({ status: 'rebooked' })
          .eq('course_id', rebookFromId)
          .eq('user_id', user.id)
        if (rebookError) throw rebookError
      }

      // Server-side atomic registration (handles capacity check + insert/update)
      const { data: result, error: rpcError } = await supabase
        .rpc('register_for_course', {
          p_user_id: user.id,
          p_course_id: courseId
        })

      if (rpcError) throw rpcError

      const newStatus = (result as any)?.status as string
      const isWaitlist = newStatus === 'waitlist'

      toast.success(
        rebookFromId 
          ? (isWaitlist ? 'Umgebucht – du stehst auf der Warteliste' : 'Erfolgreich umgebucht!')
          : (isWaitlist ? 'Du wurdest auf die Warteliste gesetzt' : 'Für Kurs angemeldet')
      )
      
      window.dispatchEvent(new CustomEvent('courseRegistrationChanged'))
      
      if (rebookFromId) {
        setRebookFromId(null)
        refetchScore()
        onRebookComplete?.()
        onOpenChange(false)
      }

      await loadCoursesForDay()
      if (selectedCourse?.id === courseId) {
        await loadParticipants(courseId)
        setSelectedCourse(prev => prev ? {
          ...prev,
          is_registered: newStatus === 'registered',
          is_waitlisted: newStatus === 'waitlist',
          registered_count: newStatus === 'registered' ? prev.registered_count + 1 : prev.registered_count,
          waitlist_count: newStatus === 'waitlist' ? prev.waitlist_count + 1 : prev.waitlist_count
        } : null)
      }
    } catch (error) {
      console.error('Error registering:', error)
      toast.error('Fehler bei der Anmeldung')
    }
  }

  const initiateCancellation = (courseId: string) => {
    const course = selectedCourse
    if (!course) return

    if (!canCancelCourse(course)) {
      toast.error(`Die Abmeldefrist ist bereits ${course.cancellation_deadline_minutes} Minuten vor Kursbeginn abgelaufen.`)
      return
    }

    // Skip fairness check for waitlist cancellations
    if (course.is_waitlisted) {
      handleCancellation(courseId)
      return
    }

    if (reliabilityScore && !isAdmin) {
      setPendingCancellationId(courseId)
      setFairnessCheckOpen(true)
      return
    }

    handleCancellation(courseId)
  }

  const handleCancellation = async (courseId: string) => {
    const course = selectedCourse
    if (!course) return

    if (!canCancelCourse(course)) {
      toast.error(`Die Abmeldefrist ist bereits ${course.cancellation_deadline_minutes} Minuten vor Kursbeginn abgelaufen.`)
      return
    }

    try {
      // Use waitlist_cancelled for waitlist cancellations (doesn't affect reliability score)
      const newStatus = course?.is_waitlisted ? 'waitlist_cancelled' : 'cancelled'
      
      const { error } = await supabase
        .from('course_registrations')
        .update({ status: newStatus })
        .eq('course_id', courseId)
        .eq('user_id', user.id)

      if (error) throw error

      toast.success('Anmeldung erfolgreich storniert')
      refetchScore()
      
      window.dispatchEvent(new CustomEvent('courseRegistrationChanged'))
      
      await loadCoursesForDay()
      if (selectedCourse?.id === courseId) {
        await loadParticipants(courseId)
        setSelectedCourse(prev => prev ? {
          ...prev,
          is_registered: false,
          is_waitlisted: false,
          registered_count: prev.is_registered ? Math.max(0, prev.registered_count - 1) : prev.registered_count,
          waitlist_count: prev.is_waitlisted ? Math.max(0, prev.waitlist_count - 1) : prev.waitlist_count
        } : null)
      }
    } catch (error) {
      console.error('Error cancelling:', error)
      toast.error('Fehler bei der Stornierung')
    }
  }

  const handleQRCheckinComplete = async () => {
    try {
      const { data, error } = await supabase
        .from('training_sessions')
        .insert({
          user_id: user.id,
          date: date,
          workout_type: 'free_training',
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .select()

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      console.log('Open Gym Check-In gespeichert:', data)
      toast.success('Open Gym Check-In erfolgreich!')
      
      window.dispatchEvent(new CustomEvent('courseRegistrationChanged'))
      
      setShowQRScanner(false)
    } catch (error: any) {
      console.error('Error saving open gym check-in:', {
        error,
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      })
      
      // Spezifischere Fehlermeldungen
      if (error?.code === '23505') {
        toast.error('Du hast heute bereits ein Open Gym Check-In!')
      } else if (error?.message?.includes('timeout')) {
        toast.error('Zeitüberschreitung - bitte versuche es erneut')
      } else if (error?.message?.includes('network')) {
        toast.error('Netzwerkfehler - bitte Verbindung prüfen')
      } else {
        toast.error(`Fehler beim Speichern: ${error?.message || 'Unbekannter Fehler'}`)
      }
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center">
              {rebookFromId 
                ? `Umbuchen – ${format(parseISO(date), 'EEEE, dd.MM.yyyy', { locale: de })}`
                : `Kurse am ${format(parseISO(date), 'EEEE, dd.MM.yyyy', { locale: de })}`
              }
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
              courses.map((course) => {
                const percentage = (course.registered_count / course.max_participants) * 100
                let badgeColor = "bg-green-500"
                if (percentage >= 100) badgeColor = "bg-red-500"
                else if (percentage >= 75) badgeColor = "bg-[#edb408]"

                return (
                  <Card 
                    key={course.id} 
                    className={`cursor-pointer hover:shadow-md transition-all duration-200 ${
                      course.is_registered 
                        ? 'border-green-500 border-2' 
                        : ''
                    } ${course.cancelled_due_to_low_attendance ? 'opacity-60' : ''}`}
                    style={{
                      borderLeft: `8px solid ${course.color || '#f3f4f6'}`
                    }}
                    onClick={() => handleCourseClick(course)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium truncate">{course.title}</h4>
                            {course.cancelled_due_to_low_attendance && (
                              <Badge variant="destructive" className="text-xs flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Abgesagt
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {course.start_time.slice(0, 5)} - {course.end_time.slice(0, 5)}
                            </div>
                            <div className="flex items-center gap-1">
                              <UserIcon className="h-3 w-3" />
                              {course.trainer}
                            </div>
                          </div>
                          {course.strength_exercise && (
                            <Badge variant="outline" className="text-xs mt-1 w-fit">
                              {course.strength_exercise}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {course.cancelled_due_to_low_attendance ? (
                            <Badge className="text-white bg-muted-foreground">
                              {course.registered_count}/{course.max_participants}
                            </Badge>
                          ) : (
                            <Badge className={`text-white ${badgeColor}`}>
                              {course.registered_count}/{course.max_participants}
                            </Badge>
                          )}
                          {course.waitlist_count > 0 && !course.cancelled_due_to_low_attendance && (
                            <Badge style={{ backgroundColor: '#ff914d' }} className="text-white">
                              WL {course.waitlist_count}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}

            {!loading && userMembershipType !== '10er Karte' && (
              <div className="mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowQRScanner(true)}
                  className="w-full h-16 flex items-center gap-4 justify-start"
                >
                  <Dumbbell className="h-6 w-6 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">Open Gym Check-In</div>
                    <div className="text-sm text-muted-foreground">
                      QR Code scannen fürs Leaderboard
                    </div>
                  </div>
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Course Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedCourse?.title}</DialogTitle>
          </DialogHeader>
          {selectedCourse && (
            <div className="space-y-4 overflow-y-auto">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  {format(parseISO(selectedCourse.course_date), 'EEEE, dd.MM.yyyy', { locale: de })}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  {selectedCourse.start_time.slice(0, 5)} - {selectedCourse.end_time.slice(0, 5)}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <UserIcon className="h-4 w-4" />
                  Trainer: {selectedCourse.trainer}
                </div>
                {selectedCourse.strength_exercise && (
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">
                      Kraftteil: {selectedCourse.strength_exercise}
                    </Badge>
                  </div>
                )}
              </div>


              {/* Minimum participants warning */}
              {participants.filter(p => p.status === 'registered').length < 3 && !selectedCourse.cancelled_due_to_low_attendance && (
                <p className="text-xs text-muted-foreground">
                  Min. 3 Teilnehmer erforderlich
                </p>
              )}

              {/* Participants */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    Teilnehmer ({participants.filter(p => p.status === 'registered').length}/{selectedCourse.max_participants})
                  </h4>
                  <div className="flex items-center gap-1">
                    {reliabilityScore && !isAdmin && (
                      <ReliabilityScoreBadge score={reliabilityScore} />
                    )}
                    <CourseInvitationButton
                      courseId={selectedCourse.id}
                      courseName={selectedCourse.title}
                      courseDate={format(parseISO(selectedCourse.course_date), 'dd.MM.yyyy', { locale: de })}
                      courseTime={`${selectedCourse.start_time.slice(0, 5)} - ${selectedCourse.end_time.slice(0, 5)}`}
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {participants.filter(p => p.status === 'registered').length === 0 ? (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <p className="text-muted-foreground">Keine Anmeldungen</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {participants
                        .filter(p => p.status === 'registered')
                        .map((participant, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => participant.profiles?.avatar_url && setSelectedProfile({ 
                                  imageUrl: participant.profiles.avatar_url, 
                                  displayName: participant.profiles?.nickname || participant.profiles?.first_name || participant.profiles?.display_name || 'Unbekannt' 
                                })}
                              >
                                {participant.profiles?.avatar_url ? (
                                  <img 
                                    src={participant.profiles.avatar_url} 
                                    alt="Avatar" 
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-xs font-medium">
                                    {(participant.profiles?.nickname || participant.profiles?.first_name || participant.profiles?.display_name || '?').charAt(0)}
                                  </span>
                                )}
                              </div>
                              <span className="font-medium">
                                {participant.profiles?.nickname || participant.profiles?.first_name || participant.profiles?.display_name || 'Unbekannt'}
                              </span>
                              {participant.isGuest ? (
                                <Badge 
                                  variant={participant.profiles?.membership_type === 'Drop-In' ? 'destructive' : 'default'}
                                  className={participant.profiles?.membership_type === 'Probetraining' ? 'bg-green-500 text-white' : ''}
                                >
                                  {participant.profiles?.membership_type}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  Angemeldet
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {isAdmin && !participant.isGuest && (
                                <MembershipBadge type={participant.profiles?.membership_type || 'Member'} />
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                
                {participants.filter(p => p.status === 'waitlist').length > 0 && (
                  <div className="space-y-3">
                    <h5 className="font-medium text-sm text-muted-foreground">
                      Warteliste ({selectedCourse.waitlist_count})
                    </h5>
                    <div className="space-y-3">
                      {participants
                        .filter(p => p.status === 'waitlist')
                        .map((participant, index) => {
                          const position = index + 1
                          return (
                            <div key={index} className="flex items-center justify-between p-3 rounded-lg border" style={{ backgroundColor: '#ff914d20', borderColor: '#ff914d40' }}>
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => participant.profiles?.avatar_url && setSelectedProfile({ 
                                    imageUrl: participant.profiles.avatar_url, 
                                    displayName: participant.profiles?.nickname || participant.profiles?.first_name || participant.profiles?.display_name || 'Unbekannt' 
                                  })}
                                >
                                  {participant.profiles?.avatar_url ? (
                                    <img 
                                      src={participant.profiles.avatar_url} 
                                      alt="Avatar" 
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-xs font-medium">
                                      {(participant.profiles?.nickname || participant.profiles?.first_name || participant.profiles?.display_name || '?').charAt(0)}
                                    </span>
                                  )}
                                </div>
                                <span className="font-medium">
                                  {participant.profiles?.nickname || participant.profiles?.first_name || participant.profiles?.display_name || 'Unbekannt'}
                                </span>
                                <span className="text-xs text-yellow-700">
                                  Warteliste #{position}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {isAdmin && (
                                  <MembershipBadge type={participant.profiles?.membership_type || 'Member'} />
                                )}
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {selectedCourse.cancelled_due_to_low_attendance ? (
                  <Button 
                    disabled
                    variant="secondary"
                    className="w-full"
                  >
                    Kurs wurde abgesagt
                  </Button>
                ) : selectedCourse.is_registered ? (
                  <>
                    <Button 
                      variant="destructive" 
                       onClick={() => initiateCancellation(selectedCourse.id)}
                      disabled={!canCancelCourse(selectedCourse)}
                      className="w-full"
                    >
                      {canCancelCourse(selectedCourse) ? 'Abmelden' : 'Abmeldefrist abgelaufen'}
                    </Button>
                    {canCancelCourse(selectedCourse) && (
                      <Button
                        variant="outline"
                        className="w-full border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white"
                        onClick={() => {
                          setDetailDialogOpen(false)
                          setRebookFromId(selectedCourse.id)
                        }}
                      >
                        <ArrowRightLeft className="h-4 w-4 mr-2" />
                        Umbuchen
                      </Button>
                    )}
                    <AddToCalendarButton
                      title={selectedCourse.title}
                      startDate={selectedCourse.course_date}
                      startTime={selectedCourse.start_time}
                      endTime={selectedCourse.end_time}
                      trainer={selectedCourse.trainer}
                      variant="outline"
                      size="default"
                      className="w-full"
                    />
                  </>
                ) : selectedCourse.is_waitlisted ? (
                  <Button 
                    variant="destructive" 
                    onClick={() => initiateCancellation(selectedCourse.id)}
                    disabled={!canCancelCourse(selectedCourse)}
                    className="w-full"
                  >
                    {canCancelCourse(selectedCourse) ? 'Von Warteliste entfernen' : 'Abmeldefrist abgelaufen'}
                  </Button>
                ) : (() => {
                  const isOutsideWindow = reliabilityScore && !isAdmin && (() => {
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    const courseDate = new Date(selectedCourse.course_date + 'T00:00:00')
                    const maxDate = new Date(today)
                    maxDate.setDate(maxDate.getDate() + reliabilityScore.bookingWindowDays)
                    return courseDate > maxDate
                  })()

                  if (isOutsideWindow && reliabilityScore) {
                    const courseDate = new Date(selectedCourse.course_date + 'T00:00:00')
                    const availableDate = new Date(courseDate)
                    availableDate.setDate(availableDate.getDate() - reliabilityScore.bookingWindowDays)
                    return (
                      <Button disabled className="w-full" variant="outline">
                        Ab {format(availableDate, 'dd.MM.', { locale: de })} buchbar
                      </Button>
                    )
                  }

                  return (
                    <Button 
                      onClick={() => handleRegistration(selectedCourse.id)}
                      className="w-full"
                    >
                      {selectedCourse.registered_count >= selectedCourse.max_participants 
                        ? 'Auf Warteliste' 
                        : 'Anmelden'
                      }
                    </Button>
                  )
                })()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ProfileImageViewer
        isOpen={!!selectedProfile}
        onClose={() => setSelectedProfile(null)}
        imageUrl={selectedProfile?.imageUrl || null}
        displayName={selectedProfile?.displayName || ''}
      />

      <OpenGymCheckin
        open={showQRScanner}
        onOpenChange={setShowQRScanner}
        onCheckinComplete={handleQRCheckinComplete}
        date={new Date(date)}
      />

      {reliabilityScore && pendingCancellationId && (
        <FairnessCheckDialog
          open={fairnessCheckOpen}
          onOpenChange={(open) => {
            setFairnessCheckOpen(open)
            if (!open) setPendingCancellationId(null)
          }}
          currentScore={reliabilityScore}
          onConfirmCancel={() => {
            if (pendingCancellationId) {
              handleCancellation(pendingCancellationId)
              setPendingCancellationId(null)
            }
          }}
          onRebook={async () => {
            if (pendingCancellationId) {
              try {
                const { error } = await supabase
                  .from('course_registrations')
                  .update({ status: 'rebooked' })
                  .eq('course_id', pendingCancellationId)
                  .eq('user_id', user.id)
                if (error) throw error
                toast.success('Kurs storniert – wähle jetzt einen neuen Kurs')
                refetchScore()
                window.dispatchEvent(new CustomEvent('courseRegistrationChanged'))
                setDetailDialogOpen(false)
                await loadCoursesForDay()
              } catch (error) {
                console.error('Error rebooking:', error)
                toast.error('Fehler beim Umbuchen')
              }
              setPendingCancellationId(null)
            }
          }}
        />
      )}

      <AlertDialog open={duplicateWarningOpen} onOpenChange={setDuplicateWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bereits angemeldet</AlertDialogTitle>
            <AlertDialogDescription>
              Du bist bereits für einen anderen Kurs an diesem Tag angemeldet. Bist du sicher, dass du dich trotzdem anmelden möchtest?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setDuplicateWarningOpen(false); setPendingRegistrationId(null) }}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setDuplicateWarningOpen(false)
              if (pendingRegistrationId) {
                handleRegistration(pendingRegistrationId, true)
                setPendingRegistrationId(null)
              }
            }}>
              Trotzdem anmelden
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
