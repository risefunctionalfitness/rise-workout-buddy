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
import { Mail, Users, AlertTriangle, Loader2, Eye, Filter, ChevronDown, Search, Plus, X, Tag, FileText } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { MembershipBadge } from "@/components/MembershipBadge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
  email: string | null
  access_code: string | null
  membership_type: string | null
  status: string | null
}

export default function AdminEmailManager() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'recipients' | 'compose'>('recipients')
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
  const [selectedMembers, setSelectedMembers] = useState<Profile[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [previewMemberIndex, setPreviewMemberIndex] = useState(0)
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Load profiles
  useEffect(() => {
    loadProfiles()
  }, [])

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name, display_name, email, access_code, membership_type, status')
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

  // Filter available members (not yet selected, and matching filters)
  const availableMembers = useMemo(() => {
    const selectedIds = new Set(selectedMembers.map(m => m.id))
    return profiles.filter(profile => {
      if (selectedIds.has(profile.id)) return false
      
      // Status filter
      if (statusFilter === 'active' && profile.status !== 'active') return false
      if (statusFilter === 'inactive' && profile.status !== 'inactive') return false
      
      // Membership type filter
      if (!membershipTypes.includes(profile.membership_type as MembershipType)) return false
      
      // Search filter
      if (searchTerm && !profile.display_name?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }
      
      return true
    })
  }, [profiles, selectedMembers, statusFilter, membershipTypes, searchTerm])

  // Only use explicitly selected members
  const recipientProfiles = useMemo(() => {
    return selectedMembers
  }, [selectedMembers])

  // Toggle membership type
  const toggleMembershipType = (type: MembershipType) => {
    setMembershipTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  const addMember = (member: Profile) => {
    setSelectedMembers(prev => [...prev, member])
  }

  const removeMember = (memberId: string) => {
    setSelectedMembers(prev => prev.filter(m => m.id !== memberId))
  }

  const clearAllMembers = () => {
    setSelectedMembers([])
  }

  const addAllFiltered = () => {
    const newMembers = availableMembers.filter(
      m => !selectedMembers.some(sm => sm.id === m.id)
    )
    setSelectedMembers(prev => [...prev, ...newMembers])
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
  const getPreviewText = (text: string, profile: Profile) => {
    return text
      .replace(/\{\{first_name\}\}/g, profile.first_name || 'Max')
      .replace(/\{\{last_name\}\}/g, profile.last_name || 'Mustermann')
      .replace(/\{\{membership_type\}\}/g, profile.membership_type || 'Premium Member')
      .replace(/\{\{email_and_code\}\}/g, `Email: ${profile.email || 'user@example.com'}\nZugangscode: ${profile.access_code || 'N/A'}`)
  }

  const handleSend = async () => {
    if (selectedMembers.length === 0) {
      toast({
        title: "Keine Empfänger ausgewählt",
        description: "Bitte wähle mindestens einen Empfänger aus.",
        variant: "destructive"
      })
      return
    }

    if (!subject.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte gib einen Betreff ein",
        variant: "destructive"
      })
      return
    }

    if (!body.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte gib eine Nachricht ein",
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
          subject,
          body,
          selectedUserIds: selectedMembers.map(m => m.user_id).filter(Boolean)
        }
      })

      console.log('Function response:', { data, error })

      if (error) {
        console.error('Edge function error:', error)
        throw error
      }

      toast({
        title: "Erfolgreich",
        description: `${selectedMembers.length} Emails wurden erfolgreich versendet`,
      })

      // Reset form
      setSubject('')
      setBody('')
      setSelectedMembers([])
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
    <div className="space-y-6 max-w-6xl mx-auto">
      <Card className="border-border/50 shadow-lg">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 rounded-lg bg-primary/10">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            Bulk-Emails versenden
          </CardTitle>
          <CardDescription className="text-base">
            Wähle Empfänger aus und verfasse personalisierte Emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'recipients' | 'compose')}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="recipients" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Empfänger auswählen
                {selectedMembers.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{selectedMembers.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="compose" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Email verfassen
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Recipients Selection */}
            <TabsContent value="recipients" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Left Panel: Available Members */}
                <Card className="border-muted/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      Verfügbare Mitglieder
                      <Badge variant="outline">{availableMembers.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Suche nach Namen..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>

                    {/* Collapsible Filters */}
                    <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" className="w-full justify-between" size="sm">
                          <div className="flex items-center gap-2">
                            <Filter className="h-3 w-3" />
                            Filter
                          </div>
                          <ChevronDown className={`h-3 w-3 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-4 pt-4">
                        {/* Status Filter */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Status</Label>
                          <RadioGroup value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="all" id="all-status" />
                              <Label htmlFor="all-status" className="font-normal">Alle</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="active" id="active-status" />
                              <Label htmlFor="active-status" className="font-normal">Aktiv</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="inactive" id="inactive-status" />
                              <Label htmlFor="inactive-status" className="font-normal">Inaktiv</Label>
                            </div>
                          </RadioGroup>
                        </div>

                        {/* Membership Filter */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Mitgliedschaft</Label>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {['Basic Member', 'Premium Member', '10er Karte', 'Administrator', 'Trainer', 'Wellpass', 'Open Gym'].map((type) => (
                              <div key={type} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`filter-${type}`}
                                  checked={membershipTypes.includes(type as MembershipType)}
                                  onCheckedChange={() => toggleMembershipType(type as MembershipType)}
                                />
                                <Label htmlFor={`filter-${type}`} className="font-normal text-sm">{type}</Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Available Members List */}
                    <div className="space-y-3">
                      {availableMembers.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={addAllFiltered}
                          className="w-full"
                        >
                          Alle gefilterten hinzufügen ({availableMembers.length})
                        </Button>
                      )}
                      <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                        {availableMembers.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            Keine Mitglieder gefunden
                          </p>
                        ) : (
                          availableMembers.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {member.first_name && member.last_name 
                                  ? `${member.first_name} ${member.last_name}`
                                  : member.display_name || 'Unbekannt'}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <MembershipBadge type={member.membership_type as any} className="text-xs" />
                                <Badge variant="outline" className="text-xs">
                                  {member.status === 'active' ? '✓ Aktiv' : '○ Inaktiv'}
                                </Badge>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => addMember(member)}
                              className="ml-2"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          ))
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Right Panel: Selected Members */}
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      Ausgewählt
                      <Badge className="bg-primary">{selectedMembers.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedMembers.length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Keine Mitglieder ausgewählt
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Wähle Mitglieder manuell aus oder nutze "Alle gefilterten hinzufügen"
                        </p>
                      </div>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearAllMembers}
                          className="w-full"
                        >
                          Alle entfernen
                        </Button>
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                          {selectedMembers.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between p-3 rounded-lg border bg-background"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {member.first_name && member.last_name 
                                    ? `${member.first_name} ${member.last_name}`
                                    : member.display_name || 'Unbekannt'}
                                </p>
                              <div className="flex items-center gap-2 mt-1">
                                <MembershipBadge type={member.membership_type as any} className="text-xs" />
                                <Badge variant="outline" className="text-xs">
                                  {member.status === 'active' ? '✓ Aktiv' : '○ Inaktiv'}
                                </Badge>
                              </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeMember(member.id)}
                                className="ml-2 hover:bg-destructive/10 hover:text-destructive"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Button 
                className="w-full" 
                size="lg"
                onClick={() => setActiveTab('compose')}
              >
                Weiter zur Email-Erstellung
              </Button>
            </TabsContent>

            {/* Tab 2: Email Composition */}
            <TabsContent value="compose" className="space-y-6">
              {/* Recipients Summary */}
              <Card className="bg-muted/30 border-muted">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">
                          {selectedMembers.length} Empfänger
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedMembers.length > 0 
                            ? 'Manuell ausgewählte Mitglieder' 
                            : 'Keine Mitglieder ausgewählt'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab('recipients')}
                    >
                      Ändern
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="email-subject" className="text-base font-semibold">Betreff</Label>
                <Input
                  id="email-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="z.B. Neue Kurse verfügbar"
                  className="h-11"
                />
              </div>

              {/* Body */}
              <div className="space-y-3">
                <Label htmlFor="email-body" className="text-base font-semibold">Nachricht</Label>
                <Textarea
                  id="email-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Schreibe deine Nachricht hier..."
                  rows={12}
                  className="resize-none"
                />
                
                {/* Variables */}
                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-2">
                    <Tag className="h-3 w-3" />
                    Personalisierungs-Variablen:
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => insertVariable('{{first_name}}')}
                      className="hover:bg-primary/10"
                    >
                      {'{{first_name}}'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => insertVariable('{{last_name}}')}
                      className="hover:bg-primary/10"
                    >
                      {'{{last_name}}'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => insertVariable('{{membership_type}}')}
                      className="hover:bg-primary/10"
                    >
                      {'{{membership_type}}'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => insertVariable('{{email_and_code}}')}
                      className="hover:bg-primary/10"
                    >
                      {'{{email_and_code}}'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Preview Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  if (selectedMembers.length > 0) {
                    setPreviewMemberIndex(0)
                    setPreviewDialogOpen(true)
                  }
                }}
                disabled={selectedMembers.length === 0}
              >
                <Eye className="h-4 w-4 mr-2" />
                Vorschau anzeigen
              </Button>

              {/* Warning for large batches */}
              {selectedMembers.length > 50 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Du versendest an {selectedMembers.length} Empfänger. Dies kann einige Minuten dauern.
                  </AlertDescription>
                </Alert>
              )}

              {/* Send Button */}
              <Button
                onClick={handleSend}
                disabled={!subject.trim() || !body.trim() || sending || selectedMembers.length === 0}
                size="lg"
                className="w-full shadow-lg"
              >
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Versende...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-5 w-5" />
                    Email versenden ({selectedMembers.length} Empfänger)
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Email-Vorschau
            </DialogTitle>
          </DialogHeader>
          {selectedMembers.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Empfänger:</p>
                  <p className="font-medium">
                    {selectedMembers[previewMemberIndex]?.first_name && selectedMembers[previewMemberIndex]?.last_name
                      ? `${selectedMembers[previewMemberIndex].first_name} ${selectedMembers[previewMemberIndex].last_name}`
                      : selectedMembers[previewMemberIndex]?.display_name || 'Unbekannt'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPreviewMemberIndex(Math.max(0, previewMemberIndex - 1))}
                    disabled={previewMemberIndex === 0}
                  >
                    ← Vorheriger
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPreviewMemberIndex(Math.min(selectedMembers.length - 1, previewMemberIndex + 1))}
                    disabled={previewMemberIndex === selectedMembers.length - 1}
                  >
                    Nächster →
                  </Button>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-sm text-muted-foreground">Betreff:</Label>
                  <p className="font-semibold mt-1">{getPreviewText(subject, selectedMembers[previewMemberIndex])}</p>
                </div>
                <div className="h-px bg-border" />
                <div>
                  <Label className="text-sm text-muted-foreground">Nachricht:</Label>
                  <div className="mt-2 p-4 bg-muted/30 rounded-lg whitespace-pre-wrap">
                    {getPreviewText(body, selectedMembers[previewMemberIndex])}
                  </div>
                </div>
              </div>
              
              <Alert>
                <AlertDescription className="text-sm">
                  💡 Dies ist eine Vorschau mit Beispieldaten des ausgewählten Empfängers.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Email versenden bestätigen</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du die Email wirklich an {selectedMembers.length} Empfänger versenden?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSend}>
              Jetzt versenden
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
