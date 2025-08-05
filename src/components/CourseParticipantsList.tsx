import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MembershipBadge } from "@/components/MembershipBadge"
import { Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { AdminParticipantManager } from "@/components/AdminParticipantManager"

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

interface Participant {
  id: string
  user_id: string
  status: string
  registered_at: string
  display_name: string
  membership_type: string
}

interface CourseParticipantsListProps {
  course: Course
  onClose: () => void
  isAdmin?: boolean
}

export const CourseParticipantsList: React.FC<CourseParticipantsListProps> = ({
  course,
  onClose,
  isAdmin = false
}) => {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)

  useEffect(() => {
    loadParticipants()
  }, [course.id])

  const loadParticipants = async () => {
    try {
      setLoading(true)
      
      // Get registrations
      const { data: registrations, error: regError } = await supabase
        .from('course_registrations')
        .select('id, user_id, status, registered_at')
        .eq('course_id', course.id)
        .order('registered_at', { ascending: true })

      if (regError) throw regError

      if (!registrations || registrations.length === 0) {
        setParticipants([])
        return
      }

      // Get profiles for these users
      const userIds = registrations.map(r => r.user_id)
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, display_name, membership_type')
        .in('user_id', userIds)

      if (profileError) throw profileError

      // Combine data
      const participantsData = registrations.map(reg => {
        const profile = profiles?.find(p => p.user_id === reg.user_id)
        return {
          id: reg.id,
          user_id: reg.user_id,
          status: reg.status,
          registered_at: reg.registered_at,
          display_name: profile?.display_name || 'Unbekannt',
          membership_type: profile?.membership_type || 'Member'
        }
      })

      setParticipants(participantsData)
    } catch (error) {
      console.error('Error loading participants:', error)
      toast.error('Fehler beim Laden der Teilnehmer')
    } finally {
      setLoading(false)
    }
  }

  const removeParticipant = async (registrationId: string) => {
    try {
      const { error } = await supabase
        .from('course_registrations')
        .update({ status: 'cancelled' })
        .eq('id', registrationId)

      if (error) throw error
      toast.success('Teilnehmer entfernt')
      await loadParticipants()
    } catch (error) {
      console.error('Error removing participant:', error)
      toast.error('Fehler beim Entfernen des Teilnehmers')
    }
  }

  const registeredParticipants = participants.filter(p => p.status === 'registered')
  const waitlistedParticipants = participants.filter(p => p.status === 'waitlisted')

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-muted-foreground">Lade Teilnehmer...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Kurs-Teilnehmer verwalten</h2>
        <div className="flex gap-2">
          {isAdmin && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Hinzufügen
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Schließen
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{course.title}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-500 text-white">
                {registeredParticipants.length}/{course.max_participants} angemeldet
              </Badge>
              {waitlistedParticipants.length > 0 && (
                <Badge variant="outline" className="bg-yellow-500 text-white">
                  {waitlistedParticipants.length} wartend
                </Badge>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Trainer: {course.trainer} • {new Date(course.course_date).toLocaleDateString('de-DE')} • {course.start_time} - {course.end_time}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {registeredParticipants.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Keine Anmeldungen</p>
          ) : (
            registeredParticipants.map((participant) => (
              <div key={participant.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg min-h-[60px]">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{participant.display_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(participant.registered_at).toLocaleDateString('de-DE')}
                  </span>
                  <MembershipBadge type={participant.membership_type as any} />
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeParticipant(participant.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>


      <AdminParticipantManager
        courseId={course.id}
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onParticipantAdded={loadParticipants}
      />
    </div>
  )
}