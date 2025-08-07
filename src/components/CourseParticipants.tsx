import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format, parseISO, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameDay } from "date-fns"
import { de } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { CourseParticipantsList } from "@/components/CourseParticipantsList"
import { useToast } from "@/hooks/use-toast"

interface Course {
  id: string
  title: string
  trainer: string
  course_date: string
  start_time: string
  end_time: string
  max_participants: number
  registered_count: number
  waitlisted_count: number
}

export const CourseParticipants = () => {
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadCourses()
  }, [currentWeek])

  const loadCourses = async () => {
    try {
      setLoading(true)
      const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })
      
      // Get current date and time to filter out past courses
      const now = new Date()
      const nowDate = now.toISOString().split('T')[0]
      const nowTime = now.toTimeString().slice(0, 8)

      const { data, error } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          trainer,
          course_date,
          start_time,
          end_time,
          max_participants
        `)
        .gte('course_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('course_date', format(weekEnd, 'yyyy-MM-dd'))
        // Only future courses by date and time
        .or(`course_date.gt.${nowDate},and(course_date.eq.${nowDate},end_time.gt.${nowTime})`)
        .order('course_date', { ascending: true })
        .order('start_time', { ascending: true })

      if (error) throw error

      // Get registration counts
      const coursesWithCounts = await Promise.all(
        (data || []).map(async (course) => {
          const { data: registrations } = await supabase
            .from('course_registrations')
            .select('status')
            .eq('course_id', course.id)
            .in('status', ['registered', 'waitlist'])

          const registered_count = registrations?.filter(r => r.status === 'registered').length || 0
          const waitlisted_count = registrations?.filter(r => r.status === 'waitlist').length || 0

          return {
            ...course,
            registered_count,
            waitlisted_count
          }
        })
      )

      setCourses(coursesWithCounts)
    } catch (error) {
      console.error('Error loading courses:', error)
      toast({
        title: "Fehler",
        description: "Kurse konnten nicht geladen werden",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
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

  if (loading) {
    return <div className="flex justify-center p-8">Lade Kurse...</div>
  }

  if (selectedCourse) {
    return (
      <CourseParticipantsList 
        course={selectedCourse}
        onClose={() => setSelectedCourse(null)}
        isAdmin={true}
      />
    )
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kurs-Teilnehmer verwalten</h1>
      </div>

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
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                  Keine Kurse geplant
                </div>
              ) : (
                <div className="space-y-2">
                  {dayCourses.map(course => (
                    <Card 
                      key={course.id}
                      className="cursor-pointer transition-all duration-200 hover:shadow-md"
                      onClick={() => setSelectedCourse(course)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{course.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {course.trainer} • {course.start_time} - {course.end_time}
                            </p>
                          </div>
                          <div className="text-right space-y-1">
                            {(() => {
                              const percentage = (course.registered_count / course.max_participants) * 100;
                              let badgeColor = "bg-green-500";
                              if (percentage >= 100) badgeColor = "bg-red-500";
                              else if (percentage >= 75) badgeColor = "bg-[#edb408]";
                              
                              return (
                                <Badge variant="secondary" className={`text-white ${badgeColor}`}>
                                  {course.registered_count}/{course.max_participants}
                                </Badge>
                              );
                            })()}
                            {course.waitlisted_count > 0 && (
                              <Badge variant="outline" className="bg-yellow-500 text-white block">
                                Warteliste: {course.waitlisted_count}
                              </Badge>
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
    </div>
  )
}