import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { Mail, Users, AlertTriangle, Loader2, Eye } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type StatusFilter = 'all' | 'active' | 'inactive'
type MembershipType = 'Basic Member' | 'Premium Member' | '10er Karte' | 'Administrator' | 'Trainer' | 'Wellpass' | 'Open Gym'

interface Profile {
  id: string
  user_id: string | null
  first_name: string | null
  last_name: string | null
  display_name: string | null
  membership_type: string | null
  status: string | null
}

export default function AdminEmailManager() {
  const { toast } = useToast()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>([
    'Basic Member',
    'Premium Member',
    '10er Karte',
    'Administrator',
    'Trainer',
    'Wellpass',
    'Open Gym'
  ])
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Load profiles
  useEffect(() => {
    loadProfiles()
  }, [])

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name, display_name, membership_type, status')
        .not('user_id', 'is', null)

      if (error) throw error
      setProfiles(data || [])
    } catch (error) {
      console.error('Error loading profiles:', error)
      toast({
        title: "Fehler",
        description: "Konnte Profile nicht laden",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Filter profiles based on selected filters
  const filteredProfiles = useMemo(() => {
    return profiles.filter(profile => {
      // Status filter
      if (statusFilter === 'active' && profile.status !== 'active') return false
      if (statusFilter === 'inactive' && profile.status !== 'inactive') return false

      // Membership type filter
      if (!membershipTypes.includes(profile.membership_type as MembershipType)) return false

      return true
    })
  }, [profiles, statusFilter, membershipTypes])

  // Toggle membership type
  const toggleMembershipType = (type: MembershipType) => {
    setMembershipTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  // Insert variable at cursor position
  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('email-body') as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newBody = body.substring(0, start) + variable + body.substring(end)
    setBody(newBody)

    // Set cursor position after inserted variable
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + variable.length, start + variable.length)
    }, 0)
  }

  // Get example preview with replaced variables
  const getPreviewText = (text: string) => {
    const exampleProfile = filteredProfiles[0]
    if (!exampleProfile) return text

    return text
      .replace(/\{\{first_name\}\}/g, exampleProfile.first_name || 'Max')
      .replace(/\{\{last_name\}\}/g, exampleProfile.last_name || 'Mustermann')
      .replace(/\{\{full_name\}\}/g, `${exampleProfile.first_name || 'Max'} ${exampleProfile.last_name || 'Mustermann'}`)
      .replace(/\{\{display_name\}\}/g, exampleProfile.display_name || 'Max Mustermann')
      .replace(/\{\{membership_type\}\}/g, exampleProfile.membership_type || 'Premium Member')
  }

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast({
        title: "Fehler",
        description: "Betreff und Nachricht dürfen nicht leer sein",
        variant: "destructive"
      })
      return
    }

    if (filteredProfiles.length === 0) {
      toast({
        title: "Fehler",
        description: "Keine Empfänger gefunden",
        variant: "destructive"
      })
      return
    }

    setShowConfirmDialog(true)
  }

  const confirmSend = async () => {
    setShowConfirmDialog(false)
    setSending(true)

    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast({
          title: "Fehler",
          description: "Keine aktive Sitzung gefunden. Bitte neu anmelden.",
          variant: "destructive"
        })
        setSending(false)
        return
      }

      const { data, error } = await supabase.functions.invoke('send-bulk-emails', {
        body: {
          statusFilter,
          membershipTypes,
          subject,
          body
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })

      if (error) throw error

      toast({
        title: "Erfolgreich",
        description: `${filteredProfiles.length} Emails wurden erfolgreich versendet`,
      })

      // Reset form
      setSubject('')
      setBody('')
    } catch (error: any) {
      console.error('Error sending emails:', error)
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Versenden der Emails",
        variant: "destructive"
      })
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Bulk-Emails versenden
          </CardTitle>
          <CardDescription>
            Sende personalisierte Emails an mehrere Mitglieder gleichzeitig
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="space-y-4">
            <div>
              <Label>Status Filter</Label>
              <RadioGroup value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="font-normal cursor-pointer">Alle Mitglieder</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="active" id="active" />
                  <Label htmlFor="active" className="font-normal cursor-pointer">Nur aktive</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="inactive" id="inactive" />
                  <Label htmlFor="inactive" className="font-normal cursor-pointer">Nur inaktive</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label>Mitgliedschaftsarten</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {['Basic Member', 'Premium Member', '10er Karte', 'Administrator', 'Trainer', 'Wellpass', 'Open Gym'].map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={type}
                      checked={membershipTypes.includes(type as MembershipType)}
                      onCheckedChange={() => toggleMembershipType(type as MembershipType)}
                    />
                    <Label htmlFor={type} className="font-normal cursor-pointer">{type}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recipient count */}
          <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
            <Users className="h-5 w-5 text-primary" />
            <span className="font-medium">{filteredProfiles.length} Empfänger</span>
            {filteredProfiles.length > 100 && (
              <Badge variant="outline" className="ml-auto">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Große Anzahl
              </Badge>
            )}
          </div>

          {/* Email editor */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="subject">Betreff</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email-Betreff"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="email-body">Nachricht</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {showPreview ? 'Editor' : 'Vorschau'}
                </Button>
              </div>

              {!showPreview ? (
                <>
                  <Textarea
                    id="email-body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Email-Nachricht"
                    rows={10}
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => insertVariable('{{first_name}}')}
                    >
                      Vorname
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => insertVariable('{{last_name}}')}
                    >
                      Nachname
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => insertVariable('{{full_name}}')}
                    >
                      Voller Name
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => insertVariable('{{display_name}}')}
                    >
                      Anzeigename
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => insertVariable('{{membership_type}}')}
                    >
                      Mitgliedschaft
                    </Button>
                  </div>
                </>
              ) : (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="font-medium mb-2">Betreff: {getPreviewText(subject)}</div>
                  <div className="whitespace-pre-wrap text-sm">{getPreviewText(body)}</div>
                  <div className="text-xs text-muted-foreground mt-4">
                    Vorschau mit Beispieldaten vom ersten Empfänger
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Warning for large sends */}
          {filteredProfiles.length > 100 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Sie versenden an mehr als 100 Empfänger. Die Emails werden in Batches versendet, dies kann einige Minuten dauern.
              </AlertDescription>
            </Alert>
          )}

          {/* Send button */}
          <Button
            onClick={handleSend}
            disabled={sending || filteredProfiles.length === 0 || !subject.trim() || !body.trim()}
            className="w-full"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sende Emails...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Emails versenden ({filteredProfiles.length})
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Emails versenden?</AlertDialogTitle>
            <AlertDialogDescription>
              Sie sind dabei, <strong>{filteredProfiles.length} Emails</strong> zu versenden.
              <br />
              <br />
              Betreff: <strong>{subject}</strong>
              <br />
              <br />
              Möchten Sie fortfahren?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSend}>Ja, senden</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
