import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, Users, User as UserIcon, Check, Weight } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { User } from "@supabase/supabase-js"

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
  const { toast } = useToast()
  
  const isOpenGym = userRole === 'open_gym'

  useEffect(() => {
    if (open) {
      loadCoursesForDay()
    }
  }, [open, date])

  const loadCoursesForDay = async () => {
    setLoading(true)
    try {
      const now = new Date()
      const currentDateTime = now.toISOString()

      // Get courses for the specific date or next 10 upcoming courses
      let query = supabase
        .from('courses')
        .select('*')
        .eq('is_cancelled', false)

      if (date) {
        // Load courses for specific date - only future courses
        const dateString = date
        query = query
          .eq('course_date', dateString)
          .or(`end_time.gt.${now.toTimeString().slice(0, 8)}`)
      } else {
        // Load next 10 upcoming courses (based on date and time)
        query = query
          .or(`course_date.gt.${new Date().toISOString().split('T')[0]},and(course_date.eq.${new Date().toISOString().split('T')[0]},end_time.gt.${now.toTimeString().slice(0, 8)})`)
          .order('course_date')
          .order('start_time')
          .limit(10)
      }

      const { data: coursesData, error: coursesError } = await query

      if (coursesError) throw coursesError

      // Filter future courses only (considering both date and time)
      const filteredCourses = (coursesData || []).filter(course => {
        const courseDateTime = new Date(`${course.course_date}T${course.end_time}`)
        return courseDateTime > now
      }).slice(0, 10)

      // Get registration counts and user registrations
      const coursesWithCounts = await Promise.all(
        filteredCourses.map(async (course) => {
          const { data: registrations } = await supabase
            .from('course_registrations')
            .select('user_id')
            .eq('course_id', course.id)
            .eq('status', 'registered')

          const userRegistered = registrations?.some(reg => reg.user_id === user.id) || false

          return {
            ...course,
            registration_count: registrations?.length || 0,
            user_registered: userRegistered
          }
        })
      )

      setCourses(coursesWithCounts)
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

  const handleRegistration = async (courseId: string, isRegistered: boolean) => {
    try {
      if (isRegistered) {
        // Unregister
        const { error } = await supabase
          .from('course_registrations')
          .delete()
          .eq('course_id', courseId)
          .eq('user_id', user.id)

        if (error) throw error

        toast({
          title: "Abgemeldet",
          description: "Du wurdest erfolgreich vom Kurs abgemeldet."
        })
      } else {
        // Register
        const { error } = await supabase
          .from('course_registrations')
          .insert({
            course_id: courseId,
            user_id: user.id
          })

        if (error) throw error

        toast({
          title: "Angemeldet",
          description: "Du wurdest erfolgreich für den Kurs angemeldet."
        })
      }

      // Reload courses to update counts
      loadCoursesForDay()
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
    return timeString.slice(0, 5) // HH:MM format
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit'
    })
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
              <div key={course.id} className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 text-sm">
                        {course.title}
                      </h3>
                      {course.strength_exercise && (
                        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                          {course.strength_exercise}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600">
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
                        disabled={!course.user_registered && course.registration_count >= course.max_participants}
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                          course.user_registered 
                            ? 'bg-red-600 hover:bg-red-700' 
                            : course.registration_count >= course.max_participants
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-primary hover:bg-primary/90'
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

          {!isOpenGym && (
            <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 text-sm">
                      Open Gym
                    </h3>
                  </div>
                  <div className="text-xs text-gray-600">
                    Ich habe frei trainiert
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      // This would trigger the free training logic from TrainingSessionDialog
                      onOpenChange(false)
                    }}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-sm bg-primary hover:bg-primary/90"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}