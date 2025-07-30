import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, Users, User as UserIcon, Check } from "lucide-react"
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
      // Get courses for the specific date
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .eq('course_date', date)
        .eq('is_cancelled', false)
        .order('start_time')

      if (coursesError) throw coursesError

      // Get registration counts and user registrations
      const coursesWithCounts = await Promise.all(
        (coursesData || []).map(async (course) => {
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
              <Card key={course.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-primary mb-1">
                        {course.title}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Clock className="h-4 w-4" />
                        <span>{formatTime(course.start_time)} - {formatTime(course.end_time)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <UserIcon className="h-4 w-4" />
                        <span>{course.trainer}</span>
                      </div>
                    </div>
                    <Badge 
                      variant={course.registration_count >= course.max_participants ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {course.registration_count}/{course.max_participants}
                    </Badge>
                  </div>

                  {course.strength_exercise && (
                    <div className="mb-3">
                      <Badge variant="outline" className="text-xs">
                        {course.strength_exercise}
                      </Badge>
                    </div>
                  )}

                  {!isOpenGym && (
                    <Button
                      onClick={() => handleRegistration(course.id, course.user_registered)}
                      disabled={!course.user_registered && course.registration_count >= course.max_participants}
                      className={`w-full ${course.user_registered ? 'bg-green-600 hover:bg-green-700' : ''}`}
                      variant={course.user_registered ? "default" : "outline"}
                    >
                      {course.user_registered ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Angemeldet - Abmelden
                        </>
                      ) : course.registration_count >= course.max_participants ? (
                        "Ausgebucht"
                      ) : (
                        "Anmelden"
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}

          {!isOpenGym && (
            <div className="bg-muted/50 p-3 rounded-lg mt-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Open Gym
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                Ich habe frei trainiert
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  // This would trigger the free training logic from TrainingSessionDialog
                  onOpenChange(false)
                }}
              >
                Freies Training hinzufügen
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}