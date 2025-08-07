import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format, parseISO } from "date-fns"
import { de } from "date-fns/locale"
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
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    try {
      setLoading(true)
      
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
        .eq('is_cancelled', false)
        // Only future courses by date and time
        .or(`course_date.gt.${nowDate},and(course_date.eq.${nowDate},end_time.gt.${nowTime})`)
        .order('course_date', { ascending: true })
        .order('start_time', { ascending: true })

      if (error) throw error

      // Get registration counts for all courses
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

      // Get only the next 10 unique course days
      const uniqueDates = new Set<string>()
      const filteredCourses = coursesWithCounts.filter(course => {
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
      toast({
        title: "Fehler",
        description: "Kurse konnten nicht geladen werden",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Group courses by date for display
  const groupedCourses = courses.reduce((acc, course) => {
    const date = course.course_date
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(course)
    return acc
  }, {} as Record<string, Course[]>)

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
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kurs-Teilnehmer verwalten</h1>
      </div>

      {/* Courses List */}
      <div className="grid grid-cols-1 gap-4">
        {Object.entries(groupedCourses).map(([date, dayCourses]) => (
          <div key={date} className="space-y-2">
            <h3 className="font-medium text-sm text-muted-foreground">
              {format(parseISO(date), 'EEEE, dd.MM.yyyy', { locale: de })}
            </h3>
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
          </div>
        ))}
        {courses.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Keine kommenden Kurse verfügbar
          </div>
        )}
      </div>
    </div>
  )
}