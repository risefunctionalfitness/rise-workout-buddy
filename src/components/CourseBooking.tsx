import { useState, useEffect, useRef } from "react"
import { User } from "@supabase/supabase-js"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, ChevronLeft, ChevronRight, Clock, Users, MapPin, AlertTriangle } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { MembershipBadge } from "@/components/MembershipBadge"
import { MembershipLimitDisplay } from "@/components/MembershipLimitDisplay"
import { ProfileImageViewer } from "@/components/ProfileImageViewer"
import { CoursesCalendarView } from "@/components/CoursesCalendarView"
import { CourseInvitationButton } from "@/components/CourseInvitationButton"
import { toast } from "sonner"
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameDay, parseISO } from "date-fns"
import { de } from "date-fns/locale"

interface Course {
  id: string
  title: string
  trainer: string
  strength_exercise?: string
  max_participants: number
  course_date: string
  start_time: string
  end_time: string
  duration_minutes: number
  registration_deadline_minutes: number
  cancellation_deadline_minutes: number
  registered_count: number
  waitlist_count: number
  is_registered: boolean
  is_waitlisted: boolean
  color?: string
  cancelled_due_to_low_attendance?: boolean
}

interface CourseBookingProps {
  user: User
}

export const CourseBooking = ({ user }: CourseBookingProps) => {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [participants, setParticipants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isTrainer, setIsTrainer] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userMembershipType, setUserMembershipType] = useState<string>('')
  const [selectedProfile, setSelectedProfile] = useState<{ imageUrl: string | null; displayName: string } | null>(null)
  const [activeTab, setActiveTab] = useState<string>("liste")
  const scrollPositionRef = useRef<number>(0)

  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout
    
    const loadData = async () => {
      if (!mounted) return
      
      // Debounce to prevent rapid calls
      clearTimeout(timeoutId)
      timeoutId = setTimeout(async () => {
        if (mounted) {
          await Promise.all([loadCourses(), checkUserRoles()])
        }
      }, 100)
    }
    
    loadData()
    
    return () => {
      mounted = false
      clearTimeout(timeoutId)
    }
  }, [currentWeek])

  const checkUserRoles = async () => {
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
      setIsTrainer(false)
      setIsAdmin(false)
    }
  }

  const loadCourses = async () => {
    try {
      setLoading(true)

      // Get upcoming courses and limit to next 10 unique course days
      const now = new Date()
      const nowDate = now.toISOString().split('T')[0]
      const nowTime = now.toTimeString().slice(0, 8)

      const [coursesResult, userRegistrationsResult] = await Promise.all([
        supabase
          .from('courses')
          .select(`
            *,
            color,
            cancelled_due_to_low_attendance,
            course_registrations(status)
          `)
          .eq('is_cancelled', false)
          .eq('cancelled_due_to_low_attendance', false)
          // Only future courses by date and time
          .or(`course_date.gt.${nowDate},and(course_date.eq.${nowDate},end_time.gt.${nowTime})`)
          .order('course_date', { ascending: true })
          .order('start_time', { ascending: true }),
        supabase
          .from('course_registrations')
          .select('course_id, status')
          .eq('user_id', user.id)
      ])

      if (coursesResult.error) throw coursesResult.error
      if (userRegistrationsResult.error) throw userRegistrationsResult.error

      // Process courses data
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

      // Get only the next 10 unique course days
      const uniqueDates = new Set<string>()
      const filteredCourses = processedCourses.filter(course => {
        if (uniqueDates.size >= 10) return false
        if (!uniqueDates.has(course.course_date)) {
          uniqueDates.add(course.course_date)
          return true
        }
        return uniqueDates.has(course.course_date)
      })

      setCourses(filteredCourses)
    } catch (error) {
      console.error('Error loading courses:', error)
      toast.error('Fehler beim Laden der Kurse')
    } finally {
      setLoading(false)
    }
  }

  const loadParticipants = async (courseId: string) => {
    try {
      console.log('Loading participants for course:', courseId)
      
      // First get the registrations
      const { data: registrations, error: regError } = await supabase
        .from('course_registrations')
        .select('status, user_id, registered_at')
        .eq('course_id', courseId)
        .order('registered_at', { ascending: true })

      if (regError) {
        console.error('Error loading registrations:', regError)
        throw regError
      }

      // Then get the profiles for these users
      const userIds = registrations?.map(r => r.user_id) || []
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, display_name, nickname, membership_type, avatar_url')
        .in('user_id', userIds)

      if (profileError) {
        console.error('Error loading profiles:', profileError)
        throw profileError
      }

      // Combine the data
      const participantsWithNames = registrations?.map(reg => ({
        ...reg,
        profiles: profiles?.find(p => p.user_id === reg.user_id) || { display_name: 'Unbekannt' }
      })) || []

      console.log('Loaded participants:', participantsWithNames)
      setParticipants(participantsWithNames)
    } catch (error) {
      console.error('Error loading participants:', error)
      toast.error('Fehler beim Laden der Teilnehmer')
      setParticipants([]) // Set empty array on error
    }
  }

  const handleCourseClick = async (course: Course) => {
    // Save scroll position before opening dialog
    scrollPositionRef.current = window.scrollY
    setSelectedCourse(course)
    await loadParticipants(course.id)
    setDialogOpen(true)
  }

  // Restore scroll position after dialog closes
  useEffect(() => {
    if (!dialogOpen && scrollPositionRef.current > 0) {
      setTimeout(() => {
        window.scrollTo({ top: scrollPositionRef.current, behavior: 'instant' })
      }, 50)
    }
  }, [dialogOpen])

  const handleRegistration = async (courseId: string) => {
    try {
      const course = courses.find(c => c.id === courseId)
      if (!course) return

      // Check if user can register (limits and credits)
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

      // Check registration deadline before registering
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

      // Check if user already has a registration (including cancelled ones)
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
        // Update existing registration (reactivate if cancelled)
        const { error } = await supabase
          .from('course_registrations')
          .update({ 
            status: newStatus,
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
            status: newStatus
          })

        if (error) throw error
      }

      // Immediately update local state
      setCourses(prev => prev.map(c => 
        c.id === courseId 
          ? { 
              ...c, 
              is_registered: newStatus === 'registered',
              is_waitlisted: newStatus === 'waitlist',
              registered_count: newStatus === 'registered' ? c.registered_count + 1 : c.registered_count,
              waitlist_count: newStatus === 'waitlist' ? c.waitlist_count + 1 : c.waitlist_count
            }
          : c
      ))

      // Update selected course state
      if (selectedCourse?.id === courseId) {
        setSelectedCourse(prev => prev ? {
          ...prev,
          is_registered: newStatus === 'registered',
          is_waitlisted: newStatus === 'waitlist',
          registered_count: newStatus === 'registered' ? prev.registered_count + 1 : prev.registered_count,
          waitlist_count: newStatus === 'waitlist' ? prev.waitlist_count + 1 : prev.waitlist_count
        } : null)
      }

      toast.success(isWaitlist ? 'Du wurdest auf die Warteliste gesetzt' : 'Für Kurs angemeldet')
      
      // Dispatch event to update other components
      window.dispatchEvent(new CustomEvent('courseRegistrationChanged'))
      
      await loadCourses()
      if (selectedCourse?.id === courseId) {
        await loadParticipants(courseId)
      }
    } catch (error) {
      console.error('Error registering for course:', error)
      toast.error('Fehler bei der Anmeldung')
    }
  }

  const canCancelCourse = (course: Course) => {
    const now = new Date()
    const courseDateTime = new Date(`${course.course_date}T${course.start_time}`)
    const cancellationDeadline = new Date(courseDateTime.getTime() - (course.cancellation_deadline_minutes * 60 * 1000))
    return now < cancellationDeadline
  }

  const handleCancellation = async (courseId: string, course?: Course) => {
    const targetCourse = course || selectedCourse
    if (!targetCourse) return

    if (!canCancelCourse(targetCourse)) {
      toast.error(`Die Abmeldefrist ist bereits ${targetCourse.cancellation_deadline_minutes} Minuten vor Kursbeginn abgelaufen.`)
      return
    }

    try {
      const { error } = await supabase
        .from('course_registrations')
        .update({ status: 'cancelled' })
        .eq('course_id', courseId)
        .eq('user_id', user.id)

      if (error) throw error

      // Immediately update local state
      setCourses(prev => prev.map(c => 
        c.id === courseId 
          ? { 
              ...c, 
              is_registered: false,
              is_waitlisted: false,
              registered_count: c.is_registered ? Math.max(0, c.registered_count - 1) : c.registered_count,
              waitlist_count: c.is_waitlisted ? Math.max(0, c.waitlist_count - 1) : c.waitlist_count
            }
          : c
      ))

      // Update selected course state
      if (selectedCourse?.id === courseId) {
        setSelectedCourse(prev => prev ? {
          ...prev,
          is_registered: false,
          is_waitlisted: false,
          registered_count: prev.is_registered ? Math.max(0, prev.registered_count - 1) : prev.registered_count,
          waitlist_count: prev.is_waitlisted ? Math.max(0, prev.waitlist_count - 1) : prev.waitlist_count
        } : null)
      }

      toast.success('Anmeldung erfolgreich storniert')
      
      // Dispatch event to update other components  
      window.dispatchEvent(new CustomEvent('courseRegistrationChanged'))
      
      await loadCourses()
      if (selectedCourse?.id === courseId) {
        await loadParticipants(courseId)
      }
    } catch (error) {
      console.error('Error cancelling registration:', error)
      toast.error('Fehler bei der Stornierung')
    }
  }

  // Remove week navigation - we only show next 10 courses

  // Group courses by date for display
  const groupedCourses = courses.reduce((acc, course) => {
    const date = course.course_date
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(course)
    return acc
  }, {} as Record<string, Course[]>)

  const isPastDate = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const courseDate = new Date(date)
    courseDate.setHours(0, 0, 0, 0)
    return courseDate < today
  }

  const getStatusColor = (course: Course) => {
    if (course.is_registered) return "bg-green-500"
    if (course.is_waitlisted) return "bg-yellow-500"
    if (course.registered_count >= course.max_participants) return "bg-red-500"
    return "bg-blue-500"
  }

  const getStatusText = (course: Course) => {
    if (course.is_registered) return "Angemeldet"
    if (course.is_waitlisted) return "Warteliste"
    if (course.registered_count >= course.max_participants) return "Ausgebucht"
    return "Verfügbar"
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Lade Kurse...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Membership limits display for Basic Member and 10er Karte */}
      {(userMembershipType === 'Basic Member' || userMembershipType === '10er Karte') && (
        <MembershipLimitDisplay 
          userId={user.id} 
          membershipType={userMembershipType} 
        />
      )}
      
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-4">Kurse</h2>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex justify-center items-center gap-8 mb-6">
        <button
          onClick={() => setActiveTab("liste")}
          className={`text-base font-medium pb-1 transition-colors ${
            activeTab === "liste"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Liste
        </button>
        <button
          onClick={() => setActiveTab("kalender")}
          className={`text-base font-medium pb-1 transition-colors ${
            activeTab === "kalender"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Kalender
        </button>
      </div>
      
      {activeTab === "liste" ? (
        <div className="space-y-4 animate-in fade-in-50 slide-in-from-left-5 duration-300">
          {/* Courses List */}
          <div className="grid grid-cols-1 gap-4 pb-24">
            {Object.entries(groupedCourses).map(([date, dayCourses]) => (
              <div key={date} className="space-y-2">
                <h3 className="font-medium text-sm text-muted-foreground">
                  {format(parseISO(date), 'EEEE, dd.MM.yyyy', { locale: de })}
                </h3>
                <div className="space-y-2">
                  {dayCourses.map(course => (
                    <Card 
                      key={course.id} 
                      className={`cursor-pointer hover:shadow-md transition-all duration-200 ${
                        course.is_registered 
                          ? 'border-green-500 border-2' 
                          : ''
                      }`}
                      style={{
                        borderLeft: `8px solid ${course.color || '#f3f4f6'}`
                      }}
                      onClick={() => handleCourseClick(course)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 whitespace-nowrap overflow-hidden">
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
                            {(() => {
                              const percentage = (course.registered_count / course.max_participants) * 100;
                              let badgeColor = "bg-green-500";
                              if (percentage >= 100) badgeColor = "bg-red-500";
                              else if (percentage >= 75) badgeColor = "bg-[#edb408]";
                              
                              return (
                                <Badge className={`text-white ${badgeColor}`}>
                                  {course.registered_count}/{course.max_participants}
                                </Badge>
                              );
                            })()}
                            {course.waitlist_count > 0 && (
                              <Badge style={{ backgroundColor: '#ff914d' }} className="text-white">
                                WL {course.waitlist_count}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
            {courses.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Keine kommenden Kurse verfügbar
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in-50 slide-in-from-right-5 duration-300">
          <CoursesCalendarView 
            user={user} 
            onCourseClick={handleCourseClick}
          />
        </div>
      )}

      {/* Course Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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

              {/* Minimum participants warning */}
              {selectedCourse.registered_count < 3 && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>Ein Kurs mit weniger als 3 Teilnehmern findet nicht statt.</span>
                </div>
              )}

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
                        .map((participant, index) => {
                          const position = index + 1
                           return (
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
                          )
                        })}
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
    </div>
  )
}