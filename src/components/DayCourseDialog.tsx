import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, MapPin, Calendar, X, Dumbbell } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { User } from "@supabase/supabase-js"
import { format, parseISO } from "date-fns"
import { de } from "date-fns/locale"
import { ProfileImageViewer } from "./ProfileImageViewer"
import { MembershipBadge } from "./MembershipBadge"
import { OpenGymCheckin } from "./OpenGymCheckin"
import { CourseInvitationButton } from "./CourseInvitationButton"

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
}

interface DayCourseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  user: User
  userRole?: string
  preselectedCourseId?: string
}

export const DayCourseDialog: React.FC<DayCourseDialogProps> = ({
  open,
  onOpenChange,
  date,
  user,
  userRole,
  preselectedCourseId
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
      const now = new Date()
      const nowTime = now.toTimeString().slice(0, 8)
      const nowDate = now.toISOString().split('T')[0]
      
      let query = supabase
        .from('courses')
        .select(`
          *,
          color,
          course_registrations(status)
        `)
        .eq('is_cancelled', false)
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
      ])

      if (coursesResult.error) throw coursesResult.error
      if (userRegistrationsResult.error) throw userRegistrationsResult.error

      // Process courses
      const processedCourses = (coursesResult.data || []).map(course => {
        const registrations = course.course_registrations || []
        const registered_count = registrations.filter(r => r.status === 'registered').length
        const waitlist_count = registrations.filter(r => r.status === 'waitlist').length
        
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
      const { data: registrations, error: regError } = await supabase
        .from('course_registrations')
        .select('status, user_id, registered_at')
        .eq('course_id', courseId)
        .order('registered_at', { ascending: true })

      if (regError) throw regError

      const userIds = registrations?.map(r => r.user_id) || []
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, display_name, nickname, membership_type, avatar_url')
        .in('user_id', userIds)

      if (profileError) throw profileError

      const participantsWithNames = registrations?.map(reg => ({
        ...reg,
        profiles: profiles?.find(p => p.user_id === reg.user_id) || { display_name: 'Unbekannt' }
      })) || []

      setParticipants(participantsWithNames)
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

  const handleRegistration = async (courseId: string) => {
    try {
      const course = courses.find(c => c.id === courseId)
      if (!course) return

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

      // Check existing registration
      const { data: existingReg, error: regCheckError } = await supabase
        .from('course_registrations')
        .select('id, status')
        .eq('course_id', courseId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (regCheckError && regCheckError.code !== 'PGRST116') throw regCheckError

      const isWaitlist = course.registered_count >= course.max_participants
      const newStatus = isWaitlist ? 'waitlist' : 'registered'

      if (existingReg) {
        const { error } = await supabase
          .from('course_registrations')
          .update({ 
            status: newStatus,
            registered_at: new Date().toISOString()
          })
          .eq('id', existingReg.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('course_registrations')
          .insert({
            course_id: courseId,
            user_id: user.id,
            status: newStatus
          })

        if (error) throw error
      }

      toast.success(isWaitlist ? 'Du wurdest auf die Warteliste gesetzt' : 'Für Kurs angemeldet')
      
      window.dispatchEvent(new CustomEvent('courseRegistrationChanged'))
      
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

  const handleCancellation = async (courseId: string) => {
    const course = selectedCourse
    if (!course) return

    if (!canCancelCourse(course)) {
      toast.error(`Die Abmeldefrist ist bereits ${course.cancellation_deadline_minutes} Minuten vor Kursbeginn abgelaufen.`)
      return
    }

    try {
      const { error } = await supabase
        .from('course_registrations')
        .update({ status: 'cancelled' })
        .eq('course_id', courseId)
        .eq('user_id', user.id)

      if (error) throw error

      toast.success('Anmeldung erfolgreich storniert')
      
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
              Kurse am {format(parseISO(date), 'EEEE, dd.MM.yyyy', { locale: de })}
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
                    className={`cursor-pointer hover:shadow-md transition-all duration-200 shadow-md rounded-lg p-4 bg-card border-l-8 ${
                      course.is_registered 
                        ? 'ring-2 ring-green-500' 
                        : ''
                    }`}
                    style={{
                      borderLeftColor: course.color || '#f3f4f6'
                    }}
                    onClick={() => handleCourseClick(course)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium truncate">{course.title}</h4>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {course.start_time.slice(0, 5)} - {course.end_time.slice(0, 5)}
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
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
                          <Badge className={`text-white ${badgeColor}`}>
                            {course.registered_count}/{course.max_participants}
                          </Badge>
                          {course.waitlist_count > 0 && (
                            <span className="text-xs" style={{ color: '#ff914d' }}>
                              {course.waitlist_count} Warteliste
                            </span>
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
                  <MapPin className="h-4 w-4" />
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

              {/* Participants */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    Teilnehmer ({selectedCourse.registered_count}/{selectedCourse.max_participants})
                  </h4>
                  <CourseInvitationButton
                    courseId={selectedCourse.id}
                    courseName={selectedCourse.title}
                    courseDate={format(parseISO(selectedCourse.course_date), 'dd.MM.yyyy', { locale: de })}
                    courseTime={`${selectedCourse.start_time.slice(0, 5)} - ${selectedCourse.end_time.slice(0, 5)}`}
                  />
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
                                  displayName: participant.profiles?.nickname || participant.profiles?.display_name || 'Unbekannt' 
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
                                    {participant.profiles?.display_name?.charAt(0) || '?'}
                                  </span>
                                )}
                              </div>
                              <span className="font-medium">
                                {(isTrainer || isAdmin) 
                                  ? participant.profiles?.display_name || 'Unbekannt'
                                  : participant.profiles?.nickname || participant.profiles?.display_name || 'Unbekannt'
                                }
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Angemeldet
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {(isTrainer || isAdmin) && (
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
                            <div key={index} className="flex items-center justify-between p-3 bg-yellow-50/50 rounded-lg border border-yellow-200">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => participant.profiles?.avatar_url && setSelectedProfile({ 
                                    imageUrl: participant.profiles.avatar_url, 
                                    displayName: participant.profiles?.nickname || participant.profiles?.display_name || 'Unbekannt' 
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
                                      {participant.profiles?.display_name?.charAt(0) || '?'}
                                    </span>
                                  )}
                                </div>
                                <span className="font-medium">
                                  {(isTrainer || isAdmin) 
                                    ? participant.profiles?.display_name || 'Unbekannt'
                                    : participant.profiles?.nickname || participant.profiles?.display_name || 'Unbekannt'
                                  }
                                </span>
                                <span className="text-xs text-yellow-700">
                                  Warteliste #{position}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {(isTrainer || isAdmin) && (
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
              <div className="flex gap-2">
                {selectedCourse.is_registered ? (
                  <Button 
                    variant="destructive" 
                    onClick={() => handleCancellation(selectedCourse.id)}
                    disabled={!canCancelCourse(selectedCourse)}
                    className="flex-1"
                  >
                    {canCancelCourse(selectedCourse) ? 'Abmelden' : 'Abmeldefrist abgelaufen'}
                  </Button>
                ) : selectedCourse.is_waitlisted ? (
                  <Button 
                    variant="destructive" 
                    onClick={() => handleCancellation(selectedCourse.id)}
                    disabled={!canCancelCourse(selectedCourse)}
                    className="flex-1"
                  >
                    {canCancelCourse(selectedCourse) ? 'Von Warteliste entfernen' : 'Abmeldefrist abgelaufen'}
                  </Button>
                ) : (
                  <Button 
                    onClick={() => handleRegistration(selectedCourse.id)}
                    className="flex-1"
                  >
                    {selectedCourse.registered_count >= selectedCourse.max_participants 
                      ? 'Auf Warteliste' 
                      : 'Anmelden'
                    }
                  </Button>
                )}
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
    </>
  )
}
