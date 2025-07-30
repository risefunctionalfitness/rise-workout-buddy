import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Plus, X } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { MembershipBadge } from "@/components/MembershipBadge"

interface Member {
  user_id: string
  display_name: string
  membership_type: string
}

interface AdminParticipantManagerProps {
  courseId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onParticipantAdded: () => void
}

export const AdminParticipantManager: React.FC<AdminParticipantManagerProps> = ({
  courseId,
  open,
  onOpenChange,
  onParticipantAdded
}) => {
  const [searchTerm, setSearchTerm] = useState("")
  const [members, setMembers] = useState<Member[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  const [registeredUserIds, setRegisteredUserIds] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      loadMembers()
      loadRegisteredUsers()
    }
  }, [open, courseId])

  useEffect(() => {
    const filtered = members.filter(member =>
      member.display_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !registeredUserIds.includes(member.user_id)
    )
    setFilteredMembers(filtered)
  }, [searchTerm, members, registeredUserIds])

  const loadMembers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, membership_type')
        .not('display_name', 'is', null)
        .order('display_name')

      if (error) throw error
      setMembers(data || [])
    } catch (error) {
      console.error('Error loading members:', error)
      toast.error('Fehler beim Laden der Mitglieder')
    } finally {
      setLoading(false)
    }
  }

  const loadRegisteredUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('course_registrations')
        .select('user_id')
        .eq('course_id', courseId)
        .neq('status', 'cancelled')

      if (error) throw error
      setRegisteredUserIds(data?.map(r => r.user_id) || [])
    } catch (error) {
      console.error('Error loading registered users:', error)
    }
  }

  const addParticipant = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('course_registrations')
        .insert({
          course_id: courseId,
          user_id: userId,
          status: 'registered'
        })

      if (error) throw error
      
      toast.success('Teilnehmer hinzugefügt')
      await loadRegisteredUsers()
      onParticipantAdded()
    } catch (error) {
      console.error('Error adding participant:', error)
      toast.error('Fehler beim Hinzufügen des Teilnehmers')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Teilnehmer hinzufügen</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 overflow-hidden">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nach Mitglied suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          <div className="overflow-y-auto max-h-96 space-y-2">
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                {searchTerm ? 'Keine Mitglieder gefunden' : 'Alle Mitglieder sind bereits angemeldet'}
              </div>
            ) : (
              filteredMembers.map((member) => (
                <Card key={member.user_id} className="cursor-pointer hover:bg-muted/50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{member.display_name}</span>
                        <MembershipBadge type={member.membership_type as any} />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => addParticipant(member.user_id)}
                        className="h-8 w-8 p-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}