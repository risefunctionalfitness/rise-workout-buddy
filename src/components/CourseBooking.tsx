import { useState, useEffect } from "react"
import { User } from "@supabase/supabase-js"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar, ChevronLeft, ChevronRight, Clock, Users, MapPin } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { MembershipBadge } from "@/components/MembershipBadge"
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
  registered_count: number
  waitlist_count: number
  is_registered: boolean
  is_waitlisted: boolean
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

  useEffect(() => {
    let mounted = true
    
    const loadData = async () => {
      if (mounted) {
        await Promise.all([loadCourses(), checkUserRoles()])
      }
    }
    
    loadData()
    
    return () => {
      mounted = false
    }
  }, [currentWeek])

  const checkUserRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
      
      if (data) {
        const roles = data.map(r => r.role)
        setIsTrainer(roles.includes('trainer'))
        setIsAdmin(roles.includes('admin'))
      }
    } catch (error) {
      setIsTrainer(false)
      setIsAdmin(false)
    }
  }

  const loadCourses = async () => {
    try {
      setLoading(true)
      const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })

      console.log('Loading courses for week:', format(weekStart, 'yyyy-MM-dd'), 'to', format(weekEnd, 'yyyy-MM-dd'))

      // Get courses and user registrations in parallel
      const [coursesResult, userRegistrationsResult] = await Promise.all([
        supabase
          .from('courses')
          .select(`
            *,
            course_registrations(status)
          `)
          .gte('course_date', format(weekStart, 'yyyy-MM-dd'))
          .lte('course_date', format(weekEnd, 'yyyy-MM-dd'))
          .eq('is_cancelled', false)
          .order('course_date', { ascending: true })
          .order('start_time', { ascending: true }),
        supabase
          .from('course_registrations')
          .select('course_id, status')
          .eq('user_id', user.id)
      ])

      if (coursesResult.error) throw coursesResult.error
      if (userRegistrationsResult.error) throw userRegistrationsResult.error

      console.log('Found courses:', coursesResult.data?.length || 0)

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

      setCourses(processedCourses)
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
    setSelectedCourse(course)
    await loadParticipants(course.id)
    setDialogOpen(true)
  }

  const handleRegistration = async (courseId: string) => {
    try {
      const course = courses.find(c => c.id === courseId)
      if (!course) return

      const isWaitlist = course.registered_count >= course.max_participants

      const { error } = await supabase
        .from('course_registrations')
        .insert({
          course_id: courseId,
          user_id: user.id,
          status: isWaitlist ? 'waitlist' : 'registered'
        })

      if (error) throw error

      toast.success(isWaitlist ? 'Du wurdest auf die Warteliste gesetzt' : 'Erfolgreich angemeldet!')
      await loadCourses()
      if (selectedCourse?.id === courseId) {
        await loadParticipants(courseId)
      }
    } catch (error) {
      console.error('Error registering for course:', error)
      toast.error('Fehler bei der Anmeldung')
    }
  }

  const handleCancellation = async (courseId: string) => {
    try {
      const { error } = await supabase
        .from('course_registrations')
        .update({ status: 'cancelled' })
        .eq('course_id', courseId)
        .eq('user_id', user.id)

      if (error) throw error

      toast.success('Anmeldung erfolgreich storniert')
      await loadCourses()
      if (selectedCourse?.id === courseId) {
        await loadParticipants(courseId)
      }
    } catch (error) {
      console.error('Error cancelling registration:', error)
      toast.error('Fehler bei der Stornierung')
    }
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1))
  }

  const getWeekDays = () => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 1 })
    const days = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(start)
      day.setDate(start.getDate() + i)
      days.push(day)
    }
    return days
  }

  const getCoursesByDay = (date: Date) => {
    return courses.filter(course => 
      isSameDay(parseISO(course.course_date), date)
    )
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
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigateWeek('prev')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <h2 className="font-semibold">
            {format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'dd.MM', { locale: de })} - {format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'dd.MM.yyyy', { locale: de })}
          </h2>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigateWeek('next')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Week View */}
      <div className="grid grid-cols-1 gap-4">
        {getWeekDays().map(day => {
          const dayCourses = getCoursesByDay(day)
          return (
            <div key={day.toISOString()} className="space-y-2">
              <h3 className="font-medium text-sm text-muted-foreground">
                {format(day, 'EEEE, dd.MM', { locale: de })}
              </h3>
              {dayCourses.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Keine Kurse</p>
              ) : (
                <div className="space-y-2">
                  {dayCourses.map(course => (
                    <Card 
                      key={course.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
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
                              <span className="text-xs text-muted-foreground">
                                {course.waitlist_count} Warteliste
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Course Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedCourse?.title}</DialogTitle>
          </DialogHeader>
          {selectedCourse && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  {format(parseISO(selectedCourse.course_date), 'EEEE, dd.MM.yyyy', { locale: de })}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  {selectedCourse.start_time} - {selectedCourse.end_time}
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
                <h4 className="font-medium text-sm text-muted-foreground">
                  Teilnehmer ({selectedCourse.registered_count}/{selectedCourse.max_participants})
                </h4>
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
                                 <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
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
                    <div className="max-h-32 overflow-y-auto">
                      <div className="space-y-3">
                        {participants
                          .filter(p => p.status === 'waitlist')
                          .map((participant, index) => {
                            const position = index + 1
                            return (
                              <Card key={index} className="transition-all duration-200 bg-yellow-50 border-yellow-200">
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                      <div className="flex items-center justify-center w-12 h-12">
                                        <div className="h-6 w-6 flex items-center justify-center text-muted-foreground font-bold">
                                          {position}
                                        </div>
                                      </div>
                                      <div>
                                         <h3 className="font-semibold text-lg">
                                           {(isTrainer || isAdmin) 
                                             ? participant.profiles?.display_name || 'Unbekannt'
                                             : participant.profiles?.nickname || participant.profiles?.display_name || 'Unbekannt'
                                           }
                                         </h3>
                                        <p className="text-sm text-muted-foreground">
                                          Warteliste
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <Badge variant="secondary" className="text-sm px-2 py-1 bg-yellow-500 text-white">
                                        Warteliste
                                      </Badge>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            )
                          })}
                      </div>
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
                    className="flex-1"
                  >
                    Abmelden
                  </Button>
                ) : selectedCourse.is_waitlisted ? (
                  <Button 
                    variant="destructive" 
                    onClick={() => handleCancellation(selectedCourse.id)}
                    className="flex-1"
                  >
                    Von Warteliste entfernen
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
    </div>
  )
}