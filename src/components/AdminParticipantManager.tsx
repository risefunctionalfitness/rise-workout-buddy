import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Search, Plus, Edit, Mail, MessageSquare } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { MembershipBadge } from "@/components/MembershipBadge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Member {
  user_id: string
  display_name: string
  membership_type: string
  email?: string
  phone_country_code?: string
  phone_number?: string
  notify_email_enabled?: boolean
  notify_whatsapp_enabled?: boolean
}

interface AdminParticipantManagerProps {
  courseId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onParticipantAdded: () => void
}

import { countryCodes, countryCodeFlags } from "@/components/CountryFlags"

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
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [editedDisplayName, setEditedDisplayName] = useState("")
  const [editedPhoneCountryCode, setEditedPhoneCountryCode] = useState("+49")
  const [editedPhoneNumber, setEditedPhoneNumber] = useState("")

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
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, membership_type, phone_country_code, phone_number, notify_email_enabled, notify_whatsapp_enabled, email')
        .not('display_name', 'is', null)
        .order('display_name')

      if (profilesError) throw profilesError

      setMembers(profilesData || [])

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

  const startEditingMember = (member: Member) => {
    setEditingMember(member)
    setEditedDisplayName(member.display_name)
    setEditedPhoneCountryCode(member.phone_country_code || "+49")
    setEditedPhoneNumber(member.phone_number || "")
  }

  const handlePhoneNumberChange = (value: string) => {
    const cleaned = value.replace(/[^\d]/g, '')
    setEditedPhoneNumber(cleaned)
  }

  const saveChanges = async () => {
    if (!editingMember) return

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          display_name: editedDisplayName,
          phone_country_code: editedPhoneCountryCode,
          phone_number: editedPhoneNumber || null
        })
        .eq('user_id', editingMember.user_id)

      if (profileError) throw profileError

      toast.success('Mitglied erfolgreich aktualisiert')
      setEditingMember(null)
      await loadMembers()
    } catch (error) {
      console.error('Error updating member:', error)
      toast.error('Fehler beim Aktualisieren des Mitglieds')
    }
  }

  const hasWhatsApp = (member: Member) => {
    return member.notify_whatsapp_enabled && member.phone_number
  }

  const hasEmail = (member: Member) => {
    return member.notify_email_enabled !== false // Default true if undefined
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
                       <div className="flex-1">
                         <div className="flex items-center gap-3 mb-1">
                           <span className="font-medium">{member.display_name}</span>
                           <MembershipBadge type={member.membership_type as any} />
                         </div>
                         <div className="flex items-center gap-2">
                           {member.email && (
                             <span className="text-sm text-muted-foreground">{member.email}</span>
                           )}
                           <div className="flex items-center gap-1">
                             {hasEmail(member) && (
                               <Mail className="h-3.5 w-3.5 text-blue-500" />
                             )}
                             {hasWhatsApp(member) && (
                               <MessageSquare className="h-3.5 w-3.5 text-green-500" />
                             )}
                           </div>
                         </div>
                       </div>
                       <div className="flex gap-2">
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={() => startEditingMember(member)}
                           className="h-8 w-8 p-0"
                         >
                           <Edit className="h-4 w-4" />
                         </Button>
                         <Button
                           size="sm"
                           onClick={() => addParticipant(member.user_id)}
                           className="h-8 w-8 p-0"
                         >
                           <Plus className="h-4 w-4" />
                         </Button>
                       </div>
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
      
      {/* Edit Member Dialog */}
      {editingMember && (
        <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Mitglied bearbeiten</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editDisplayName">Name</Label>
                <Input
                  id="editDisplayName"
                  value={editedDisplayName}
                  onChange={(e) => setEditedDisplayName(e.target.value)}
                  placeholder="Anzeigename"
                />
              </div>
              <div>
                <Label>Telefon</Label>
                <div className="flex gap-2">
                  <Select value={editedPhoneCountryCode} onValueChange={setEditedPhoneCountryCode}>
                    <SelectTrigger className="w-[110px]">
                      <SelectValue>
                        <span className="flex items-center gap-2">
                          {(() => {
                            const FlagComponent = countryCodeFlags[editedPhoneCountryCode]
                            return FlagComponent ? <FlagComponent /> : null
                          })()}
                          <span>{editedPhoneCountryCode}</span>
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      {countryCodes.map((cc) => {
                        const FlagComponent = countryCodeFlags[cc.code]
                        return (
                          <SelectItem key={cc.code} value={cc.code}>
                            <span className="flex items-center gap-2">
                              {FlagComponent ? <FlagComponent /> : null}
                              <span>{cc.code}</span>
                            </span>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    placeholder="15730440756"
                    value={editedPhoneNumber}
                    onChange={(e) => handlePhoneNumberChange(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={saveChanges} disabled={!editedDisplayName}>
                  Speichern
                </Button>
                <Button variant="outline" onClick={() => setEditingMember(null)}>
                  Abbrechen
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  )
}