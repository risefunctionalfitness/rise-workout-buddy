import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MembershipBadge } from "@/components/MembershipBadge"
import { Trash2, Plus, ArrowUp, X, UserX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { AdminParticipantManager } from "@/components/AdminParticipantManager"
import { ProfileImageViewer } from "@/components/ProfileImageViewer"

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
  avatar_url?: string
  nickname?: string
  isGuest?: boolean
  bookingType?: 'drop_in' | 'probetraining'
  attendance_status?: string | null
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
  const [selectedProfile, setSelectedProfile] = useState<{ imageUrl: string | null; displayName: string } | null>(null)

  useEffect(() => {
    loadParticipants()
  }, [course.id])

  // Removed: Waitlist processing is now handled by database trigger automatically

  const loadParticipants = async () => {
    try {
      setLoading(true)
      
      // Get registrations (attendance_status may not be in types yet)
      const { data: registrations, error: regError } = await supabase
        .from('course_registrations')
        .select('id, user_id, status, registered_at')
        .eq('course_id', course.id)
        .order('registered_at', { ascending: true }) as { data: Array<{ id: string; user_id: string; status: string; registered_at: string; attendance_status?: string | null }> | null; error: any }

      if (regError) throw regError

      // Get guest registrations
      const { data: guestRegistrations, error: guestError } = await supabase
        .from('guest_registrations')
        .select('id, guest_name, guest_email, booking_type, status, created_at')
        .eq('course_id', course.id)
        .eq('status', 'registered')

      if (guestError) console.error('Error loading guest registrations:', guestError)

      // Get profiles for regular users
      const userIds = registrations?.map(r => r.user_id) || []
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, display_name, nickname, membership_type, avatar_url')
        .in('user_id', userIds)

      if (profileError) throw profileError

      // Combine regular participants
      const regularParticipants = registrations?.map(reg => {
        const profile = profiles?.find(p => p.user_id === reg.user_id)
        return {
          id: reg.id,
          user_id: reg.user_id,
          status: reg.status,
          registered_at: reg.registered_at,
          display_name: profile?.nickname || profile?.display_name || 'Unbekannt',
          membership_type: profile?.membership_type || 'Member',
          avatar_url: profile?.avatar_url,
          nickname: profile?.nickname,
          isGuest: false,
          attendance_status: reg.attendance_status
        }
      }) || []

      // Add guest participants only for admin view
      const guestParticipants = isAdmin ? (guestRegistrations?.map(guest => ({
        id: guest.id,
        user_id: guest.id,
        status: 'registered',
        registered_at: guest.created_at,
        display_name: guest.guest_name,
        membership_type: guest.booking_type === 'drop_in' ? 'Drop-In' : 'Probetraining',
        isGuest: true,
        bookingType: guest.booking_type as 'drop_in' | 'probetraining'
      })) || []) : []

      setParticipants([...regularParticipants, ...guestParticipants])
    } catch (error) {
      console.error('Error loading participants:', error)
      toast.error('Fehler beim Laden der Teilnehmer')
    } finally {
      setLoading(false)
    }
  }

  const removeParticipant = async (registrationId: string, isGuest: boolean = false) => {
    try {
      if (isGuest) {
        // Delete guest registration directly
        const { error } = await supabase
          .from('guest_registrations')
          .delete()
          .eq('id', registrationId)

        if (error) throw error
      } else {
        // Update status for regular registrations
        const { error } = await supabase
          .from('course_registrations')
          .update({ status: 'cancelled' })
          .eq('id', registrationId)

        if (error) throw error
      }
      
      toast.success('Teilnehmer entfernt')
      await loadParticipants()
    } catch (error) {
      console.error('Error removing participant:', error)
      toast.error('Fehler beim Entfernen des Teilnehmers')
    }
  }

  const promoteFromWaitlist = async (registrationId: string, participantName: string) => {
    try {
      const { error } = await supabase
        .from('course_registrations')
        .update({ status: 'registered' })
        .eq('id', registrationId)

      if (error) throw error
      toast.success(`${participantName} zum Kurs hinzugefügt`)

      // Trigger Make.com notification via Edge Function
      try {
        const { error: notifyError } = await supabase.functions.invoke('notify-waitlist-promotion', {
          body: { registration_id: registrationId }
        })
        if (notifyError) {
          console.error('Notify waitlist promotion error:', notifyError)
          toast.warning('Benachrichtigung konnte nicht gesendet werden')
        } else {
          console.log('Waitlist notification triggered')
        }
      } catch (notifyErr) {
        console.error('Notify waitlist promotion exception:', notifyErr)
        toast.warning('Benachrichtigung konnte nicht gesendet werden')
      }

      // Removed: Waitlist processing is now handled by database trigger automatically

      await loadParticipants()
    } catch (error) {
      console.error('Error promoting participant:', error)
      toast.error('Fehler beim Hinzufügen zum Kurs')
    }
  }

  const markNoShow = async (participant: Participant) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Nicht eingeloggt')
        return
      }

      // Update attendance status in database
      const { error: updateError } = await supabase
        .from('course_registrations')
        .update({ 
          attendance_status: 'no_show',
          attendance_marked_at: new Date().toISOString(),
          attendance_marked_by: user.id
        } as any)
        .eq('id', participant.id)

      if (updateError) {
        console.error('Error updating attendance:', updateError)
        throw updateError
      }

      // Trigger no-show notification via Edge Function
      try {
        const { error: notifyError } = await supabase.functions.invoke('notify-no-show', {
          body: { 
            registration_id: participant.id,
            course_id: course.id,
            user_id: participant.user_id
          }
        })
        if (notifyError) {
          console.error('Notify no-show error:', notifyError)
          toast.warning('Anwesenheit gespeichert, aber Email konnte nicht gesendet werden')
        } else {
          console.log('No-show notification sent')
        }
      } catch (notifyErr) {
        console.error('Notify no-show exception:', notifyErr)
        toast.warning('Anwesenheit gespeichert, aber Email konnte nicht gesendet werden')
      }

      toast.success(`${participant.display_name} als nicht erschienen markiert`)
      await loadParticipants()
    } catch (error) {
      console.error('Error marking no-show:', error)
      toast.error('Fehler beim Speichern der Anwesenheit')
    }
  }

  const undoNoShow = async (participant: Participant) => {
    try {
      const { error: updateError } = await supabase
        .from('course_registrations')
        .update({ 
          attendance_status: null,
          attendance_marked_at: null,
          attendance_marked_by: null
        } as any)
        .eq('id', participant.id)

      if (updateError) {
        console.error('Error undoing no-show:', updateError)
        throw updateError
      }

      toast.success(`${participant.display_name} wieder als anwesend markiert`)
      await loadParticipants()
    } catch (error) {
      console.error('Error undoing no-show:', error)
      toast.error('Fehler beim Zurücksetzen der Anwesenheit')
    }
  }

  // Check if attendance can be marked (course is today and hasn't ended yet in terms of day)
  const canMarkAttendance = () => {
    const today = new Date().toISOString().split('T')[0]
    return course.course_date === today
  }

  const registeredParticipants = participants.filter(p => p.status === 'registered')
  const waitlistedParticipants = participants.filter(p => p.status === 'waitlisted' || p.status === 'waitlist')

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
              variant="ghost" 
              size="icon"
              onClick={() => setShowAddDialog(true)}
              className="hover:bg-muted"
            >
              <Plus className="h-5 w-5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-muted">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{course.title}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={`text-white ${registeredParticipants.length > course.max_participants ? 'bg-orange-500' : 'bg-green-500'}`}>
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
        <CardContent className="space-y-4">
          {/* Registered Participants */}
          <div>
            <h3 className="font-medium text-sm mb-3">Angemeldete Teilnehmer</h3>
            {registeredParticipants.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Keine Anmeldungen</p>
            ) : (
              <div className="space-y-3">
                {registeredParticipants.map((participant) => (
                  <div 
                    key={participant.id} 
                    className={`flex items-center justify-between p-3 rounded-lg min-h-[60px] ${
                      participant.attendance_status === 'no_show' 
                        ? 'bg-destructive/10 border border-destructive/30' 
                        : 'bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <img
                        src={participant.avatar_url || '/placeholder.svg'}
                        alt={participant.display_name}
                        className="w-8 h-8 rounded-full object-cover border border-border cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setSelectedProfile({ 
                          imageUrl: participant.avatar_url || null, 
                          displayName: participant.nickname || participant.display_name 
                        })}
                      />
                      <span className={`font-medium ${participant.attendance_status === 'no_show' ? 'line-through text-muted-foreground' : ''}`}>
                        {participant.display_name}
                      </span>
                      <MembershipBadge type={participant.membership_type as any} />
                      {participant.attendance_status === 'no_show' && (
                        <Badge variant="destructive" className="text-xs">
                          Nicht erschienen
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Attendance buttons - only for admins and only for today's courses */}
                      {isAdmin && canMarkAttendance() && !participant.isGuest && (
                        participant.attendance_status === 'no_show' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => undoNoShow(participant)}
                            className="text-xs"
                          >
                            Zurücksetzen
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => markNoShow(participant)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Als nicht erschienen markieren"
                          >
                            <UserX className="h-5 w-5" />
                          </Button>
                        )
                      )}
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeParticipant(participant.id, participant.isGuest)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Waitlist Section */}
          {waitlistedParticipants.length > 0 && (
            <div>
              <h3 className="font-medium text-sm mb-3">Warteliste</h3>
              {isAdmin ? (
                <div className="space-y-3">
                  {waitlistedParticipants.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg min-h-[60px]">
                      <div className="flex items-center gap-3">
                        <img
                          src={participant.avatar_url || '/placeholder.svg'}
                          alt={participant.display_name}
                          className="w-8 h-8 rounded-full object-cover border border-border cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setSelectedProfile({ 
                            imageUrl: participant.avatar_url || null, 
                            displayName: participant.nickname || participant.display_name 
                          })}
                        />
                        <span className="font-medium">{participant.display_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(participant.registered_at).toLocaleDateString('de-DE')}
                        </span>
                        <MembershipBadge type={participant.membership_type as any} />
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                          Wartend
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => promoteFromWaitlist(participant.id, participant.display_name)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <ArrowUp className="h-4 w-4 mr-1" />
                          Zum Kurs hinzufügen
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeParticipant(participant.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    {waitlistedParticipants.length} Person(en) auf der Warteliste
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">
                    Namen werden aus Datenschutzgründen nicht angezeigt
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>


      <AdminParticipantManager
        courseId={course.id}
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onParticipantAdded={loadParticipants}
      />
      
      <ProfileImageViewer
        isOpen={!!selectedProfile}
        onClose={() => setSelectedProfile(null)}
        imageUrl={selectedProfile?.imageUrl || null}
        displayName={selectedProfile?.displayName || ''}
      />
    </div>
  )
}
