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
import { Mail, Users, AlertTriangle, Loader2, Eye, Filter, ChevronDown } from "lucide-react"
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

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
  const [filtersOpen, setFiltersOpen] = useState(true)

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
      // Refresh session to ensure token is valid
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      console.log('Session check:', { 
        hasSession: !!session, 
        hasAccessToken: !!session?.access_token,
        sessionError 
      })
      
      if (sessionError || !session?.access_token) {
        toast({
          title: "Fehler",
          description: "Keine gültige Sitzung. Bitte neu anmelden.",
          variant: "destructive"
        })
        setSending(false)
        return
      }

      console.log('Invoking send-bulk-emails function...')
      
      const { data, error } = await supabase.functions.invoke('send-bulk-emails', {
        body: {
          statusFilter,
          membershipTypes,
          subject,
          body
        }
      })

      console.log('Function response:', { data, error })

      if (error) {
        console.error('Edge function error:', error)
        throw error
      }

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
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card className="border-border/50 shadow-lg">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 rounded-lg bg-primary/10">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            Bulk-Emails versenden
          </CardTitle>
          <CardDescription className="text-base">
            Sende personalisierte Emails an mehrere Mitglieder gleichzeitig
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters - Collapsible */}
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-between group hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-primary" />
                  <span className="font-medium">Filter & Empfänger</span>
                  <Badge variant="secondary" className="ml-2">
                    {filteredProfiles.length}
                  </Badge>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${filtersOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-6 pt-6">
              <div className="grid gap-6 p-6 rounded-lg border bg-card">
                <div className="space-y-3">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    Status Filter
                  </Label>
                  <RadioGroup 
                    value={statusFilter} 
                    onValueChange={(value) => setStatusFilter(value as StatusFilter)}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-3 p-3 rounded-md hover:bg-accent/50 transition-colors cursor-pointer">
                      <RadioGroupItem value="all" id="all" />
                      <Label htmlFor="all" className="font-normal cursor-pointer flex-1">Alle Mitglieder</Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 rounded-md hover:bg-accent/50 transition-colors cursor-pointer">
                      <RadioGroupItem value="active" id="active" />
                      <Label htmlFor="active" className="font-normal cursor-pointer flex-1">Nur aktive</Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 rounded-md hover:bg-accent/50 transition-colors cursor-pointer">
                      <RadioGroupItem value="inactive" id="inactive" />
                      <Label htmlFor="inactive" className="font-normal cursor-pointer flex-1">Nur inaktive</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-semibold">Mitgliedschaftsarten</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Basic Member', 'Premium Member', '10er Karte', 'Administrator', 'Trainer', 'Wellpass', 'Open Gym'].map((type) => (
                      <div 
                        key={type} 
                        className="flex items-center space-x-3 p-3 rounded-md hover:bg-accent/50 transition-colors cursor-pointer"
                      >
                        <Checkbox
                          id={type}
                          checked={membershipTypes.includes(type as MembershipType)}
                          onCheckedChange={() => toggleMembershipType(type as MembershipType)}
                        />
                        <Label htmlFor={type} className="font-normal cursor-pointer flex-1">{type}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recipient count */}
                <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="p-2 rounded-md bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-lg">{filteredProfiles.length} Empfänger</div>
                    <div className="text-sm text-muted-foreground">werden diese Email erhalten</div>
                  </div>
                  {filteredProfiles.length > 100 && (
                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Große Anzahl
                    </Badge>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Email editor */}
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-base font-semibold">Email-Betreff</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="z.B. Neue Kurse für diesen Monat"
                className="h-11"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-body" className="text-base font-semibold">Nachricht</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="hover:bg-accent"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {showPreview ? 'Editor' : 'Vorschau'}
                </Button>
              </div>

              {!showPreview ? (
                <div className="space-y-3">
                  <Textarea
                    id="email-body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Schreibe deine Nachricht hier..."
                    rows={12}
                    className="resize-none"
                  />
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Personalisierungs-Variablen:</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => insertVariable('{{first_name}}')}
                        className="hover:bg-secondary/80"
                      >
                        Vorname
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => insertVariable('{{last_name}}')}
                        className="hover:bg-secondary/80"
                      >
                        Nachname
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => insertVariable('{{full_name}}')}
                        className="hover:bg-secondary/80"
                      >
                        Voller Name
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => insertVariable('{{display_name}}')}
                        className="hover:bg-secondary/80"
                      >
                        Anzeigename
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => insertVariable('{{membership_type}}')}
                        className="hover:bg-secondary/80"
                      >
                        Mitgliedschaft
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-muted/50 rounded-lg border border-border space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Betreff:</div>
                    <div className="font-semibold text-lg">{getPreviewText(subject) || 'Kein Betreff'}</div>
                  </div>
                  <div className="border-t pt-4">
                    <div className="whitespace-pre-wrap">{getPreviewText(body) || 'Keine Nachricht'}</div>
                  </div>
                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    💡 Vorschau mit Beispieldaten vom ersten Empfänger
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Warning for large sends */}
          {filteredProfiles.length > 100 && (
            <Alert className="border-warning/20 bg-warning/5">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-warning-foreground">
                Sie versenden an mehr als 100 Empfänger. Die Emails werden in Batches versendet, dies kann einige Minuten dauern.
              </AlertDescription>
            </Alert>
          )}

          {/* Send button */}
          <Button
            onClick={handleSend}
            disabled={sending || filteredProfiles.length === 0 || !subject.trim() || !body.trim()}
            className="w-full h-12 text-base font-semibold shadow-md hover:shadow-lg transition-all"
            size="lg"
          >
            {sending ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Sende Emails...
              </>
            ) : (
              <>
                <Mail className="h-5 w-5 mr-2" />
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
