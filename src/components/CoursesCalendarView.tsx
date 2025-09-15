import { useState, useEffect } from "react"
import { User } from "@supabase/supabase-js"
import { supabase } from "@/integrations/supabase/client"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { timezone } from "@/lib/timezone"

interface Course {
  id: string
  title: string
  trainer: string
  course_date: string
  start_time: string
  end_time: string
  max_participants: number
  registration_deadline_minutes: number
  cancellation_deadline_minutes: number
  is_cancelled: boolean
  registered_count?: number
  user_registered?: boolean
}

interface CoursesCalendarViewProps {
  user: User
  userRole?: string
}

export const CoursesCalendarView = ({ user, userRole }: CoursesCalendarViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [coursesForSelectedDate, setCoursesForSelectedDate] = useState<Course[]>([])
  const [registeredDates, setRegisteredDates] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCourses()
    loadRegisteredDates()
  }, [currentDate, user.id])

  useEffect(() => {
    if (selectedDate) {
      loadCoursesForDate(selectedDate)
    }
  }, [selectedDate, courses])

  const loadCourses = async () => {
    try {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)

      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          course_registrations!inner(count)
        `)
        .gte('course_date', firstDay.toISOString().split('T')[0])
        .lte('course_date', lastDay.toISOString().split('T')[0])
        .eq('is_cancelled', false)
        .order('course_date')
        .order('start_time')

      if (error) {
        console.error('Error loading courses:', error)
        return
      }

      // Get registration counts and user registration status
      const coursesWithDetails = await Promise.all(
        (data || []).map(async (course) => {
          const { data: registrations } = await supabase
            .from('course_registrations')
            .select('user_id')
            .eq('course_id', course.id)
            .eq('status', 'registered')

          const registered_count = registrations?.length || 0
          const user_registered = registrations?.some(reg => reg.user_id === user.id) || false

          return {
            ...course,
            registered_count,
            user_registered
          }
        })
      )

      setCourses(coursesWithDetails)
    } catch (error) {
      console.error('Error loading courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRegisteredDates = async () => {
    try {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)

      const { data, error } = await supabase
        .from('course_registrations')
        .select(`
          courses(course_date)
        `)
        .eq('user_id', user.id)
        .eq('status', 'registered')
        .gte('courses.course_date', firstDay.toISOString().split('T')[0])
        .lte('courses.course_date', lastDay.toISOString().split('T')[0])

      if (error) {
        console.error('Error loading registered dates:', error)
        return
      }

      const dates = new Set<string>()
      data?.forEach(reg => {
        if (reg.courses?.course_date) {
          dates.add(reg.courses.course_date)
        }
      })

      setRegisteredDates(dates)
    } catch (error) {
      console.error('Error loading registered dates:', error)
    }
  }

  const loadCoursesForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0]
    const daysCourses = courses.filter(course => course.course_date === dateString)
    setCoursesForSelectedDate(daysCourses)
  }

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfWeek = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    return firstDay === 0 ? 6 : firstDay - 1 // Convert Sunday (0) to 6, Monday (1) to 0, etc.
  }

  const handleDateClick = (day: number) => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const newDate = new Date(year, month, day)
    setSelectedDate(newDate)
  }

  const handleRegistration = async (courseId: string, isRegistered: boolean) => {
    try {
      if (isRegistered) {
        const { error } = await supabase
          .from('course_registrations')
          .update({ status: 'cancelled' })
          .eq('course_id', courseId)
          .eq('user_id', user.id)

        if (error) throw error
        toast({ title: "Erfolgreich abgemeldet" })
      } else {
        const { error } = await supabase
          .from('course_registrations')
          .insert({
            course_id: courseId,
            user_id: user.id,
            status: 'registered'
          })

        if (error) throw error
        toast({ title: "Erfolgreich angemeldet" })
      }

      // Reload data
      await loadCourses()
      await loadRegisteredDates()
      if (selectedDate) {
        loadCoursesForDate(selectedDate)
      }
    } catch (error) {
      console.error('Error with course registration:', error)
      toast({
        title: "Fehler",
        description: "Anmeldung fehlgeschlagen",
        variant: "destructive"
      })
    }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date)
  }

  const formatTime = (time: string) => {
    return time.slice(0, 5)
  }

  const monthNames = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ]

  const dayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth()
    const firstDayOfWeek = getFirstDayOfWeek()
    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="w-10 h-10"></div>)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const hasRegistration = registeredDates.has(dateString)
      const isSelected = selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === currentDate.getMonth()
      const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString()
      
      days.push(
        <div
          key={day}
          onClick={() => handleDateClick(day)}
          className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all hover:bg-accent text-sm font-medium
            ${isSelected ? 'bg-primary text-primary-foreground' : ''}
            ${isToday ? 'bg-accent' : ''}
            ${hasRegistration ? 'ring-2 ring-green-500 ring-offset-1' : ''}
          `}
        >
          {day}
        </div>
      )
    }

    return days
  }

  if (loading) {
    return <div className="flex justify-center p-8">Lade Kalender...</div>
  }

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateMonth('prev')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h2 className="text-xl font-semibold">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigateMonth('next')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-6">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="w-10 h-8 flex items-center justify-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {renderCalendarGrid()}
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Courses */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle>Kurse am {formatDate(selectedDate)}</CardTitle>
          </CardHeader>
          <CardContent>
            {coursesForSelectedDate.length === 0 ? (
              <p className="text-muted-foreground">Keine Kurse an diesem Tag</p>
            ) : (
              <div className="space-y-4">
                {coursesForSelectedDate.map(course => (
                  <div key={course.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">{course.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatTime(course.start_time)} - {formatTime(course.end_time)} • {course.trainer}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {course.user_registered && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Angemeldet
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        {course.registered_count} / {course.max_participants} Teilnehmer
                      </span>
                      
                      <Button
                        onClick={() => handleRegistration(course.id, course.user_registered)}
                        variant={course.user_registered ? "outline" : "default"}
                        size="sm"
                        disabled={!course.user_registered && course.registered_count >= course.max_participants}
                        className={course.user_registered ? "" : "bg-red-600 hover:bg-red-700"}
                      >
                        {course.user_registered ? "Abmelden" : "Anmelden"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}