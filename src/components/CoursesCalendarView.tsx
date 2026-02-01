import { useState, useEffect, useMemo } from "react"
import { User } from "@supabase/supabase-js"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, MapPin, AlertTriangle } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { format, parseISO, isSameDay } from "date-fns"
import { de } from "date-fns/locale"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

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

interface CoursesCalendarViewProps {
  user: User
  onCourseClick: (course: Course) => void
}

export const CoursesCalendarView = ({ user, onCourseClick }: CoursesCalendarViewProps) => {
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [loading, setLoading] = useState(true)
  const [userRegistrations, setUserRegistrations] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadCoursesData()
  }, [user.id])

  const loadCoursesData = async () => {
    try {
      setLoading(true)
      
      // Get next 3 months of courses
      const now = new Date()
      const threeMonthsLater = new Date()
      threeMonthsLater.setMonth(now.getMonth() + 3)
      
      const nowDate = now.toISOString().split('T')[0]
      const nowTime = now.toTimeString().slice(0, 8)
      const endDate = threeMonthsLater.toISOString().split('T')[0]

      const [coursesResult, userRegistrationsResult, guestRegistrationsResult] = await Promise.all([
        supabase
          .from('courses')
          .select(`
            *,
            color,
            cancelled_due_to_low_attendance,
            course_registrations(status)
          `)
          .eq('is_cancelled', false)
          // Show cancelled_due_to_low_attendance courses too (with badge)
          .or(`course_date.gt.${nowDate},and(course_date.eq.${nowDate},end_time.gt.${nowTime})`)
          .lte('course_date', endDate)
          .order('course_date', { ascending: true })
          .order('start_time', { ascending: true }),
        supabase
          .from('course_registrations')
          .select('course_id, status')
          .eq('user_id', user.id)
          .in('status', ['registered', 'waitlist']),
        supabase
          .from('guest_registrations')
          .select('course_id')
          .eq('status', 'registered')
      ])

      if (coursesResult.error) throw coursesResult.error
      if (userRegistrationsResult.error) throw userRegistrationsResult.error
      if (guestRegistrationsResult.error) throw guestRegistrationsResult.error

      // Create a map of guest counts per course
      const guestCountMap = new Map<string, number>()
      for (const guest of guestRegistrationsResult.data || []) {
        guestCountMap.set(guest.course_id, (guestCountMap.get(guest.course_id) || 0) + 1)
      }

      // Process courses data
      const processedCourses = (coursesResult.data || []).map(course => {
        const registrations = course.course_registrations || []
        const memberCount = registrations.filter(r => r.status === 'registered').length
        const guestCount = guestCountMap.get(course.id) || 0
        const registered_count = memberCount + guestCount
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
      
      // Create set of dates where user is registered
      const registeredDates = new Set<string>()
      processedCourses.forEach(course => {
        if (course.is_registered) {
          registeredDates.add(course.course_date)
        }
      })
      setUserRegistrations(registeredDates)
      
    } catch (error) {
      console.error('Error loading courses:', error)
      toast.error('Fehler beim Laden der Kurse')
    } finally {
      setLoading(false)
    }
  }

  // Get courses for selected date
  const coursesForSelectedDate = useMemo(() => {
    if (!selectedDate) return []
    
    const selectedDateString = format(selectedDate, 'yyyy-MM-dd')
    return courses.filter(course => course.course_date === selectedDateString)
  }, [courses, selectedDate])

  // Custom day styling for calendar
  const getDayProps = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd')
    const hasRegistration = userRegistrations.has(dateString)
    
    return {
      className: cn(
        hasRegistration && "relative after:absolute after:inset-0 after:rounded-md after:border-2 after:border-green-500 after:pointer-events-none"
      )
    }
  }


  if (loading) {
    return (
      <div className="text-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-muted-foreground">Lade Kurse...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Calendar with centered layout and reduced mobile margins */}
      <div className="flex justify-center px-1 sm:px-2">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          locale={de}
          weekStartsOn={1}
          className="w-full max-w-sm mx-auto"
          modifiers={{
            hasRegistration: (date) => {
              const dateString = format(date, 'yyyy-MM-dd')
              return userRegistrations.has(dateString)
            }
          }}
          modifiersClassNames={{
            hasRegistration: "relative after:absolute after:inset-0 after:rounded-md after:border-2 after:border-green-500 after:pointer-events-none"
          }}
        />
      </div>

      {/* Courses for selected date */}
      {selectedDate && (
        <div className="space-y-4 px-1 sm:px-4">
          <h3 className="font-medium text-center">
            Kurse am {format(selectedDate, 'EEEE, dd.MM.yyyy', { locale: de })}
          </h3>
          
          {coursesForSelectedDate.length === 0 ? (
            <p className="text-center text-muted-foreground">
              Keine Kurse an diesem Tag
            </p>
          ) : (
            <div className="space-y-2 pb-24 px-1 sm:px-0">
              {coursesForSelectedDate.map(course => (
                <Card 
                  key={course.id} 
                  className={`rounded-2xl p-4 cursor-pointer hover:scale-[1.02] transition-all duration-200 shadow-md bg-card border-l-8 ${
                    course.is_registered 
                      ? 'ring-2 ring-green-500' 
                      : ''
                  } ${course.cancelled_due_to_low_attendance ? 'opacity-60' : ''}`}
                  style={{
                    borderLeftColor: course.color || '#f3f4f6'
                  }}
                  onClick={() => onCourseClick(course)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 whitespace-nowrap overflow-hidden">
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
                          if (course.cancelled_due_to_low_attendance) badgeColor = "bg-muted-foreground";
                          else if (percentage >= 100) badgeColor = "bg-red-500";
                          else if (percentage >= 75) badgeColor = "bg-[#edb408]";
                          
                          return (
                            <Badge className={`text-white ${badgeColor}`}>
                              {course.registered_count}/{course.max_participants}
                            </Badge>
                          );
                        })()}
                         {course.waitlist_count > 0 && !course.cancelled_due_to_low_attendance && (
                           <span className="text-xs" style={{ color: '#ff914d' }}>
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
      )}
    </div>
  )
}