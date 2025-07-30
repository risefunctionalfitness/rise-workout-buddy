import React, { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MembershipBadge } from '@/components/MembershipBadge'
import { useToast } from '@/hooks/use-toast'
import { Trash2, Users, Clock } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'

interface Course {
  id: string
  title: string
  trainer: string
  course_date: string
  start_time: string
  end_time: string
  max_participants: number
}

interface Participant {
  id: string
  user_id: string
  status: 'registered' | 'waitlist'
  registered_at: string
  display_name: string
  membership_type: string
}

export const CourseParticipants: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .gte('course_date', new Date().toISOString().split('T')[0])
        .order('course_date', { ascending: true })
        .order('start_time', { ascending: true })

      if (error) throw error
      setCourses(data || [])
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

  const loadParticipants = async (courseId: string) => {
    try {
      const { data, error } = await supabase
        .from('course_registrations')
        .select(`
          id,
          user_id,
          status,
          registered_at
        `)
        .eq('course_id', courseId)
        .order('registered_at', { ascending: true })

      if (error) throw error

      // Get profile data separately
      const userIds = data.map(reg => reg.user_id)
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, display_name, membership_type')
        .in('user_id', userIds)

      if (profileError) throw profileError

      const formattedParticipants = data.map(reg => {
        const profile = profiles?.find(p => p.user_id === reg.user_id)
        return {
          id: reg.id,
          user_id: reg.user_id,
          status: reg.status as 'registered' | 'waitlist',
          registered_at: reg.registered_at,
          display_name: profile?.display_name || 'Unbekannt',
          membership_type: profile?.membership_type || 'Member'
        }
      })

      setParticipants(formattedParticipants)
    } catch (error) {
      console.error('Error loading participants:', error)
      toast({
        title: "Fehler",
        description: "Teilnehmer konnten nicht geladen werden",
        variant: "destructive"
      })
    }
  }

  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course)
    loadParticipants(course.id)
  }

  const removeParticipant = async (registrationId: string) => {
    try {
      const { error } = await supabase
        .from('course_registrations')
        .delete()
        .eq('id', registrationId)

      if (error) throw error

      toast({
        title: "Erfolg",
        description: "Teilnehmer wurde entfernt"
      })

      // Reload participants
      if (selectedCourse) {
        loadParticipants(selectedCourse.id)
      }
    } catch (error) {
      console.error('Error removing participant:', error)
      toast({
        title: "Fehler",
        description: "Teilnehmer konnte nicht entfernt werden",
        variant: "destructive"
      })
    }
  }

  const registeredParticipants = participants.filter(p => p.status === 'registered')
  const waitlistParticipants = participants.filter(p => p.status === 'waitlist')

  if (loading) {
    return <div className="flex justify-center p-8">Lade Kurse...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Kurs-Teilnehmer verwalten</h2>
        
        <div className="grid gap-4 mb-6">
          {courses.map((course) => (
            <Card 
              key={course.id} 
              className={`cursor-pointer transition-colors ${
                selectedCourse?.id === course.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => handleCourseSelect(course)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{course.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Trainer: {course.trainer}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(course.course_date).toLocaleDateString('de-DE')} • 
                      {course.start_time} - {course.end_time}
                    </p>
                  </div>
                  <Badge variant="outline">
                    Max. {course.max_participants}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedCourse && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Teilnehmer für "{selectedCourse.title}"
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="default" className="bg-green-500">
                    Angemeldet ({registeredParticipants.length}/{selectedCourse.max_participants})
                  </Badge>
                </h4>
                <div className="space-y-2">
                  {registeredParticipants.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{participant.display_name}</span>
                        <MembershipBadge type={participant.membership_type as any} />
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(participant.registered_at).toLocaleDateString('de-DE')}
                        </Badge>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Teilnehmer entfernen</AlertDialogTitle>
                            <AlertDialogDescription>
                              Möchten Sie {participant.display_name} aus diesem Kurs entfernen?
                              Dies kann nicht rückgängig gemacht werden.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => removeParticipant(participant.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Entfernen
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                  {registeredParticipants.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">
                      Keine angemeldeten Teilnehmer
                    </p>
                  )}
                </div>
              </div>

              {waitlistParticipants.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Badge variant="secondary">
                      Warteliste ({waitlistParticipants.length})
                    </Badge>
                  </h4>
                  <div className="space-y-2">
                    {waitlistParticipants.map((participant) => (
                      <div key={participant.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{participant.display_name}</span>
                          <MembershipBadge type={participant.membership_type as any} />
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {new Date(participant.registered_at).toLocaleDateString('de-DE')}
                          </Badge>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Von Warteliste entfernen</AlertDialogTitle>
                              <AlertDialogDescription>
                                Möchten Sie {participant.display_name} von der Warteliste entfernen?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => removeParticipant(participant.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Entfernen
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}