import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { Edit, Trash2, Plus, Upload, X, FileText, Image as ImageIcon, Mail, Eye } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const EMAIL_HTML_TEMPLATE = `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8">
    <title>{{2.subject}}</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta http-equiv="x-ua-compatible" content="ie=edge">
  </head>
  <body style="margin:0; padding:0; background-color:#f4f4f4;">
    
    <!-- Preheader -->
    <div style="display:none; font-size:1px; color:#f4f4f4; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">
      Neue News in deiner RISE App: {{2.subject}}
    </div>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="#f4f4f4">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"
                 width="600"
                 style="max-width:600px; width:100%; background:#ffffff; border-radius:8px; overflow:hidden;">

            <!-- Header -->
            <tr>
              <td align="center" style="background:#000000; padding:24px;">
                <img src="https://vdpeyaphtsbrhygupfbc.supabase.co/storage/v1/object/public/logo/RISE%20Black%20Canva.png"
                     alt="RISE Functional Fitness"
                     width="160"
                     style="display:block; width:160px; height:auto; border:0;">
              </td>
            </tr>

            <!-- Begrüßung -->
            <tr>
              <td style="padding:28px 24px 8px 24px; font-family:Arial, sans-serif;">
                <h1 style="margin:0 0 16px 0; font-size:22px; font-weight:bold; color:#000000;">
                  Neue News in deiner RISE App
                </h1>
                <p style="margin:0 0 4px 0; font-size:16px; color:#333333; line-height:1.6;">
                  Hallo {{2.first_name}},
                </p>
                <p style="margin:0; font-size:16px; color:#333333; line-height:1.6;">
                  es gibt neue News in der App.
                </p>
              </td>
            </tr>

            <!-- News-Karte -->
            <tr>
              <td style="padding:16px 24px 12px 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                       style="border:1px solid #e3e3e3; border-radius:10px;">
                  <tr>
                    <td style="padding:16px; font-family:Arial, sans-serif;">

                      <!-- Titel & Timestamp -->
                      <table role="presentation" width="100%">
                        <tr>
                          <td style="font-size:18px; font-weight:bold; color:#000000;">
                            {{2.subject}}
                          </td>
                          <td style="text-align:right;">
                            <span style="display:inline-flex; align-items:center; padding:6px 12px; border:1px solid #e3e3e3; border-radius:999px; font-size:13px; color:#333333;">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                                   stroke="#777777" fill="none" stroke-width="2"
                                   stroke-linecap="round" stroke-linejoin="round"
                                   viewBox="0 0 24 24"
                                   style="margin-right:6px;">
                                <rect width="18" height="18" x="3" y="4" rx="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                              </svg>
                              <span>{{1.timestamp}}</span>
                            </span>
                          </td>
                        </tr>
                      </table>

                      <!-- Autor -->
                      <p style="margin:10px 0 12px 0; font-size:13px; color:#777777;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"
                             stroke="#777777" fill="none" stroke-width="2"
                             stroke-linecap="round" stroke-linejoin="round"
                             viewBox="0 0 24 24"
                             style="vertical-align:middle; margin-right:6px;">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                        RISE Team
                      </p>

                      <!-- Body -->
                      <p style="margin:0; font-size:15px; line-height:1.6; color:#333333;">
                        {{2.body}}
                      </p>

                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Hinweis + App-Link -->
            <tr>
              <td style="padding:20px 24px 0 24px; font-family:Arial, sans-serif;">
                <p style="margin:0 0 16px 0; font-size:16px; color:#333333; line-height:1.6;">
                  Die News und eventuell weitere Infos findest du direkt in der App:
                </p>
              </td>
            </tr>

            <!-- Button -->
            <tr>
              <td style="padding:0 24px 24px 24px;">
                <table role="presentation">
                  <tr>
                    <td style="border-radius:4px; background:#c63661;" align="center">
                      <a href="https://rise-ff.lovable.app"
                         style="display:inline-block; padding:14px 24px; font-family:Arial, sans-serif;
                                font-size:16px; color:#ffffff; text-decoration:none; font-weight:bold;">
                        App öffnen
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Grüße -->
            <tr>
              <td style="padding:0 24px 24px 24px; font-family:Arial, sans-serif;">
                <p style="margin:24px 0 4px 0; font-size:16px; color:#333333; line-height:1.6;">
                  Viele Grüße,<br>
                  <strong>RISE Functional Fitness</strong>
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#f7f7f7; padding:14px 24px; font-family:Arial, sans-serif; font-size:12px; color:#777777;" align="center">
                © 2025 RISE Functional Fitness · Diese E-Mail wurde automatisch versendet.
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>

  </body>
</html>`

interface Attachment {
  name: string
  path: string
  type: string
  size: number
  url: string
}

interface NewsItem {
  id: string
  title: string
  content: string
  author_id: string
  published_at: string
  is_published: boolean
  created_at: string
  updated_at: string
  link_url?: string | null
  attachments?: Attachment[]
}

export const NewsManager = () => {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Form state
  const [newsForm, setNewsForm] = useState({
    title: '',
    content: '',
    link_url: ''
  })
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [editFiles, setEditFiles] = useState<File[]>([])
  
  // Email state
  const [sendEmail, setSendEmail] = useState(false)
  const [emailFilters, setEmailFilters] = useState({
    statusFilter: 'active' as 'all' | 'active' | 'inactive',
    membershipTypes: ['Premium Member', '10er Karte', 'Wellpass', 'Open Gym', 'Basic Member'] as string[]
  })
  const [showPreview, setShowPreview] = useState(false)
  const [previewRecipients, setPreviewRecipients] = useState<any[]>([])
  const [loadingPreview, setLoadingPreview] = useState(false)

  useEffect(() => {
    loadNews()
  }, [])

  // Automatisches Laden der Empfänger-Vorschau bei Filter-Änderungen
  useEffect(() => {
    if (sendEmail) {
      loadPreviewRecipients()
    } else {
      setPreviewRecipients([])
    }
  }, [sendEmail, emailFilters.statusFilter, emailFilters.membershipTypes.length])

  const loadNews = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setNews((data || []) as unknown as NewsItem[])
    } catch (error) {
      console.error('Error loading news:', error)
      toast.error('Fehler beim Laden der Nachrichten')
    } finally {
      setLoading(false)
    }
  }

  const uploadFiles = async (files: File[], newsId: string): Promise<Attachment[]> => {
    const uploadedAttachments: Attachment[] = []

    for (const file of files) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${newsId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('news-attachments')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('news-attachments')
        .getPublicUrl(filePath)

      uploadedAttachments.push({
        name: file.name,
        path: filePath,
        type: file.type,
        size: file.size,
        url: publicUrl
      })
    }

    return uploadedAttachments
  }

  const handleCreateNews = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setUploading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Create news first to get the ID
      const { data: newNews, error: insertError } = await supabase
        .from('news')
        .insert({
          title: newsForm.title,
          content: newsForm.content,
          link_url: newsForm.link_url || null,
          author_id: user.id,
          is_published: true,
          published_at: new Date().toISOString(),
          attachments: [] as any
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Upload files if any
      let attachments: Attachment[] = []
      if (selectedFiles.length > 0) {
        attachments = await uploadFiles(selectedFiles, newNews.id)

        // Update news with attachments
        const { error: updateError } = await supabase
          .from('news')
          .update({ attachments: attachments as any })
          .eq('id', newNews.id)

        if (updateError) throw updateError
      }

      // Send email if checkbox is active
      if (sendEmail && newNews.id) {
        try {
          console.log('Sending news email via edge function...')
          const { data: emailResponse, error: emailError } = await supabase.functions.invoke(
            'send-news-email',
            {
              body: {
                newsId: newNews.id,
                title: newsForm.title,
                content: newsForm.content,
                statusFilter: emailFilters.statusFilter,
                membershipTypes: emailFilters.membershipTypes
              }
            }
          )

          if (emailError) {
            console.error('Email sending error:', emailError)
            toast.error('News erstellt, aber E-Mail-Versand fehlgeschlagen')
          } else {
            toast.success(`News erstellt und E-Mail an ${emailResponse.sent} Empfänger versendet`)
          }
        } catch (error) {
          console.error('Email function error:', error)
          toast.error('News erstellt, aber E-Mail-Versand fehlgeschlagen')
        }
      } else {
        toast.success('Nachricht erfolgreich erstellt')
      }

      // Reset all form state
      setNewsForm({
        title: '',
        content: '',
        link_url: ''
      })
      setSelectedFiles([])
      setSendEmail(false)
      setEmailFilters({ statusFilter: 'active', membershipTypes: ['Premium Member', '10er Karte', 'Wellpass', 'Open Gym', 'Basic Member'] })
      setPreviewRecipients([])
      setCreateDialogOpen(false)
      await loadNews()
    } catch (error) {
      console.error('Error creating news:', error)
      toast.error('Fehler beim Erstellen der Nachricht')
    } finally {
      setUploading(false)
    }
  }

  const handleUpdateNews = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingNews) return

    try {
      setUploading(true)
      const formData = new FormData(e.target as HTMLFormElement)
      
      // Combine existing attachments with new uploads
      let allAttachments = [...(editingNews.attachments || [])]
      
      if (editFiles.length > 0) {
        const newAttachments = await uploadFiles(editFiles, editingNews.id)
        allAttachments = [...allAttachments, ...newAttachments]
      }

      const updates = {
        title: formData.get('title') as string,
        content: formData.get('content') as string,
        link_url: (formData.get('link_url') as string) || null,
        is_published: true,
        published_at: new Date().toISOString(),
        attachments: allAttachments as any
      }

      const { error } = await supabase
        .from('news')
        .update(updates)
        .eq('id', editingNews.id)

      if (error) throw error

      toast.success('Nachricht erfolgreich aktualisiert')
      setEditingNews(null)
      setEditFiles([])
      await loadNews()
    } catch (error) {
      console.error('Error updating news:', error)
      toast.error('Fehler beim Aktualisieren der Nachricht')
    } finally {
      setUploading(false)
    }
  }

  const removeAttachment = async (newsId: string, attachment: Attachment, isExisting: boolean) => {
    try {
      if (isExisting) {
        // Delete from storage
        const { error: deleteError } = await supabase.storage
          .from('news-attachments')
          .remove([attachment.path])

        if (deleteError) throw deleteError

        // Update news attachments
        const news = await supabase
          .from('news')
          .select('attachments')
          .eq('id', newsId)
          .single()

        const currentAttachments = (news.data?.attachments as unknown as Attachment[]) || []
        const updatedAttachments = currentAttachments.filter(
          (att: Attachment) => att.path !== attachment.path
        )

        const { error: updateError } = await supabase
          .from('news')
          .update({ attachments: updatedAttachments as any })
          .eq('id', newsId)

        if (updateError) throw updateError

        toast.success('Anhang erfolgreich gelöscht')
        await loadNews()
      }
    } catch (error) {
      console.error('Error removing attachment:', error)
      toast.error('Fehler beim Löschen des Anhangs')
    }
  }

  const handleDeleteNews = async (newsId: string) => {
    if (!confirm('Sind Sie sicher, dass Sie diese Nachricht löschen möchten?')) return

    try {
      // Get news to find attachments
      const { data: newsData } = await supabase
        .from('news')
        .select('attachments')
        .eq('id', newsId)
        .single()

      // Delete attachments from storage
      const attachments = (newsData?.attachments as unknown as Attachment[]) || []
      if (attachments && attachments.length > 0) {
        const filePaths = attachments.map((att: Attachment) => att.path)
        await supabase.storage
          .from('news-attachments')
          .remove(filePaths)
      }

      // Delete news
      const { error } = await supabase
        .from('news')
        .delete()
        .eq('id', newsId)

      if (error) throw error

      toast.success('Nachricht erfolgreich gelöscht')
      await loadNews()
    } catch (error) {
      console.error('Error deleting news:', error)
      toast.error('Fehler beim Löschen der Nachricht')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(file => {
      const isValidType = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'].includes(file.type)
      const isValidSize = file.size <= 10 * 1024 * 1024 // 10MB
      
      if (!isValidType) {
        toast.error(`${file.name}: Ungültiger Dateityp`)
        return false
      }
      if (!isValidSize) {
        toast.error(`${file.name}: Datei zu groß (max 10MB)`)
        return false
      }
      return true
    })

    if (isEdit) {
      setEditFiles(prev => [...prev, ...validFiles])
    } else {
      setSelectedFiles(prev => [...prev, ...validFiles])
    }
  }

  const removeSelectedFile = (index: number, isEdit: boolean = false) => {
    if (isEdit) {
      setEditFiles(prev => prev.filter((_, i) => i !== index))
    } else {
      setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    }
  }

  const loadPreviewRecipients = async () => {
    try {
      setLoadingPreview(true)
      
      // Wenn keine Mitgliedschaften ausgewählt sind, 0 Empfänger anzeigen
      if (emailFilters.membershipTypes.length === 0) {
        setPreviewRecipients([])
        setLoadingPreview(false)
        return
      }

      let query = supabase
        .from('profiles')
        .select('display_name, first_name, last_name, user_id, membership_type, status, notify_email_enabled, notify_whatsapp_enabled, phone_country_code, phone_number')
        .not('user_id', 'is', null)

      // Status-Filter
      if (emailFilters.statusFilter !== 'all') {
        query = query.eq('status', emailFilters.statusFilter)
      }

      // Membership-Type Filter - immer filtern da wir oben prüfen ob leer
      query = query.in('membership_type', emailFilters.membershipTypes)

      const { data: profiles, error } = await query

      if (error) throw error

      // Calculate notification_method and formatted phone for each recipient
      const enrichedProfiles = (profiles || []).map(p => {
        const emailEnabled = p.notify_email_enabled !== false // default true
        const whatsappEnabled = p.notify_whatsapp_enabled === true && !!p.phone_number
        
        let notification_method: 'email' | 'whatsapp' | 'both' = 'email'
        if (emailEnabled && whatsappEnabled) {
          notification_method = 'both'
        } else if (whatsappEnabled) {
          notification_method = 'whatsapp'
        }
        
        const phone = whatsappEnabled && p.phone_country_code && p.phone_number
          ? `${p.phone_country_code.replace('+', '')}${p.phone_number.replace(/\D/g, '')}`
          : null
        
        return {
          ...p,
          notification_method,
          phone
        }
      })

      setPreviewRecipients(enrichedProfiles)
    } catch (error) {
      console.error('Error loading preview:', error)
      toast.error('Fehler beim Laden der Vorschau')
    } finally {
      setLoadingPreview(false)
    }
  }

  const generateEmailPreviewHTML = () => {
    const firstRecipient = previewRecipients[0]
    const firstName = firstRecipient?.first_name || 'Max'
    const timestamp = format(new Date(), "d. MMMM yyyy", { locale: de })
    
    return EMAIL_HTML_TEMPLATE
      .replace(/\{\{2\.subject\}\}/g, newsForm.title || 'Titel der News')
      .replace(/\{\{2\.first_name\}\}/g, firstName)
      .replace(/\{\{2\.body\}\}/g, newsForm.content || 'Inhalt der News...')
      .replace(/\{\{1\.timestamp\}\}/g, timestamp)
  }


  if (loading) {
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-muted-foreground">Lade Nachrichten...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Nachrichten verwalten</CardTitle>
              <CardDescription>
                Erstellen und verwalten Sie Studio-Nachrichten
              </CardDescription>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Neue Nachricht
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Neue Nachricht erstellen</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateNews} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Titel</Label>
                    <Input
                      value={newsForm.title}
                      onChange={(e) => setNewsForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Nachrichtentitel"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="content">Inhalt</Label>
                  <Textarea
                    value={newsForm.content}
                    onChange={(e) => setNewsForm(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Nachrichteninhalt..."
                    rows={6}
                    required
                    className="max-h-[300px] overflow-y-auto resize-none"
                  />
                  </div>
                  <div>
                    <Label htmlFor="link_url">Link (Optional)</Label>
                    <Input
                      value={newsForm.link_url}
                      onChange={(e) => setNewsForm(prev => ({ ...prev, link_url: e.target.value }))}
                      placeholder="Optional: Link-URL"
                      type="url"
                    />
                  </div>

                  <div>
                    <Label>Bilder & Dateien (Optional)</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept="image/*,application/pdf"
                          multiple
                          onChange={(e) => handleFileSelect(e, false)}
                          className="hidden"
                          id="create-file-upload"
                        />
                        <Label
                          htmlFor="create-file-upload"
                          className="flex items-center gap-2 px-4 py-2 border border-border rounded-md cursor-pointer hover:bg-accent transition-colors"
                        >
                          <Upload className="h-4 w-4" />
                          Dateien auswählen
                        </Label>
                        <span className="text-sm text-muted-foreground">
                          Max 10MB pro Datei
                        </span>
                      </div>
                      {selectedFiles.length > 0 && (
                        <div className="space-y-2">
                          {selectedFiles.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 border border-border rounded-md">
                              <div className="flex items-center gap-2">
                                {file.type.startsWith('image/') ? (
                                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span className="text-sm">{file.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  ({(file.size / 1024).toFixed(1)} KB)
                                </span>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => removeSelectedFile(idx, false)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Email Section */}
                  <div className="space-y-4 border-t pt-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="sendEmail"
                        checked={sendEmail}
                        onCheckedChange={(checked) => setSendEmail(!!checked)}
                      />
                      <Label htmlFor="sendEmail" className="font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        E-Mail an Mitglieder senden
                      </Label>
                    </div>

                    {sendEmail && (
                      <div className="space-y-3 pl-6 border-l-2 border-primary/30">
                        {/* Status-Filter */}
                        <div>
                          <Label>Empfänger-Status</Label>
                          <Select 
                            value={emailFilters.statusFilter}
                            onValueChange={(value) => setEmailFilters(prev => ({
                              ...prev, 
                              statusFilter: value as 'all' | 'active' | 'inactive'
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Nur aktive Mitglieder</SelectItem>
                              <SelectItem value="inactive">Nur inaktive Mitglieder</SelectItem>
                              <SelectItem value="all">Alle Mitglieder</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Membership-Type Multi-Select */}
                        <div>
                          <Label>Mitgliedschaftstypen (Optional)</Label>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {['Premium Member', '10er Karte', 'Wellpass', 'Open Gym', 'Basic Member'].map(type => (
                              <div key={type} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={`type-${type}`}
                                  checked={emailFilters.membershipTypes.includes(type)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setEmailFilters(prev => ({
                                        ...prev,
                                        membershipTypes: [...prev.membershipTypes, type]
                                      }))
                                    } else {
                                      setEmailFilters(prev => ({
                                        ...prev,
                                        membershipTypes: prev.membershipTypes.filter(t => t !== type)
                                      }))
                                    }
                                  }}
                                />
                                <Label htmlFor={`type-${type}`} className="text-sm font-normal">{type}</Label>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Empfänger-Anzeige */}
                        <div className="p-3 bg-muted rounded-md">
                          <p className="text-sm font-medium">
                            {loadingPreview ? 'Lädt Empfänger...' : `${previewRecipients.length} Empfänger`}
                          </p>
                        </div>

                        {/* Vorschau-Button */}
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setShowPreview(true)}
                          disabled={loadingPreview || previewRecipients.length === 0}
                          className="w-full"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Detaillierte Empfänger-Liste anzeigen
                        </Button>
                      </div>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={uploading}>
                    {uploading ? 'Wird hochgeladen...' : 'Nachricht erstellen'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titel</TableHead>
                <TableHead>Anhänge</TableHead>
                <TableHead>Erstellt</TableHead>
                <TableHead>Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {news.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.title}
                  </TableCell>
                  <TableCell>
                    {item.attachments && item.attachments.length > 0 ? (
                      <div className="flex gap-1">
                        {item.attachments.slice(0, 3).map((att, idx) => (
                          att.type.startsWith('image/') ? (
                            <img
                              key={idx}
                              src={att.url}
                              alt={att.name}
                              className="w-8 h-8 object-cover rounded border border-border"
                            />
                          ) : (
                            <div key={idx} className="w-8 h-8 flex items-center justify-center rounded border border-border bg-muted">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )
                        ))}
                        {item.attachments.length > 3 && (
                          <div className="w-8 h-8 flex items-center justify-center rounded border border-border bg-muted text-xs">
                            +{item.attachments.length - 3}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(item.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingNews(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteNews(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit News Dialog */}
      <Dialog open={!!editingNews} onOpenChange={() => setEditingNews(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nachricht bearbeiten</DialogTitle>
          </DialogHeader>
          {editingNews && (
            <form onSubmit={handleUpdateNews} className="space-y-4">
              <div>
                <Label htmlFor="title">Titel</Label>
                <Input name="title" defaultValue={editingNews.title} required />
              </div>
              <div>
                <Label htmlFor="content">Inhalt</Label>
                <Textarea name="content" defaultValue={editingNews.content} rows={6} required className="max-h-[300px] overflow-y-auto resize-none" />
              </div>
              <div>
                <Label htmlFor="link_url">Link (Optional)</Label>
                <Input name="link_url" defaultValue={editingNews.link_url || ''} placeholder="Optional: Link-URL" type="url" />
              </div>
              <div>
                <Label>Bilder & Dateien</Label>
                <div className="mt-2 space-y-2">
                  {/* Existing Attachments */}
                  {editingNews.attachments && editingNews.attachments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Vorhandene Anhänge:</p>
                      {editingNews.attachments.map((att, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 border border-border rounded-md">
                          <div className="flex items-center gap-2">
                            {att.type.startsWith('image/') ? (
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="text-sm">{att.name}</span>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeAttachment(editingNews.id, att, true)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* New File Upload */}
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      onChange={(e) => handleFileSelect(e, true)}
                      className="hidden"
                      id="edit-file-upload"
                    />
                    <Label
                      htmlFor="edit-file-upload"
                      className="flex items-center gap-2 px-4 py-2 border border-border rounded-md cursor-pointer hover:bg-accent transition-colors"
                    >
                      <Upload className="h-4 w-4" />
                      Neue Dateien hinzufügen
                    </Label>
                  </div>
                  {editFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Neue Anhänge:</p>
                      {editFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 border border-border rounded-md">
                          <div className="flex items-center gap-2">
                            {file.type.startsWith('image/') ? (
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="text-sm">{file.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeSelectedFile(idx, true)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={uploading}>
                {uploading ? 'Wird hochgeladen...' : 'Nachricht aktualisieren'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>E-Mail Vorschau</DialogTitle>
            <CardDescription>
              Diese E-Mail wird an {previewRecipients.length} Mitglieder gesendet
            </CardDescription>
          </DialogHeader>
          
          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="preview">E-Mail Vorschau</TabsTrigger>
              <TabsTrigger value="recipients">Empfänger-Liste</TabsTrigger>
            </TabsList>
            
            <TabsContent value="preview" className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Dies ist eine Vorschau mit Beispieldaten des ersten Empfängers
              </p>
              <div className="border rounded-lg overflow-auto bg-muted/20 max-h-[70vh]">
                <div 
                  dangerouslySetInnerHTML={{ __html: generateEmailPreviewHTML() }}
                  className="min-h-[600px]"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="recipients" className="space-y-2">
              {/* Summary of notification methods */}
              <div className="flex gap-2 flex-wrap text-xs">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                  📧 Email: {previewRecipients.filter(r => r.notification_method === 'email').length}
                </span>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">
                  📱 WhatsApp: {previewRecipients.filter(r => r.notification_method === 'whatsapp').length}
                </span>
                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
                  📧📱 Beides: {previewRecipients.filter(r => r.notification_method === 'both').length}
                </span>
              </div>
              <div className="max-h-[600px] overflow-y-auto border rounded-lg">
                <div className="p-3 bg-muted/30 font-semibold sticky top-0 grid grid-cols-4 gap-2 text-xs">
                  <span>Name</span>
                  <span>Mitgliedschaft</span>
                  <span>Kanal</span>
                  <span>Telefon</span>
                </div>
                <div className="divide-y">
                  {previewRecipients.map((recipient, idx) => (
                    <div key={idx} className="p-2 text-sm grid grid-cols-4 gap-2 items-center">
                      <span className="truncate">{recipient.display_name || `${recipient.first_name} ${recipient.last_name}`}</span>
                      <span className="text-muted-foreground text-xs truncate">{recipient.membership_type}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded inline-block w-fit ${
                        recipient.notification_method === 'both' 
                          ? 'bg-purple-100 text-purple-800'
                          : recipient.notification_method === 'whatsapp'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {recipient.notification_method === 'both' ? '📧📱' : recipient.notification_method === 'whatsapp' ? '📱' : '📧'}
                      </span>
                      <span className="text-muted-foreground text-xs font-mono truncate">
                        {recipient.phone || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default NewsManager;