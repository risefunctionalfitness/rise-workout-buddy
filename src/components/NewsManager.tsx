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
import { Edit, Trash2, Plus, Upload, X, FileText, Image as ImageIcon } from "lucide-react"

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

  useEffect(() => {
    loadNews()
  }, [])

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

      toast.success('Nachricht erfolgreich erstellt')
      setNewsForm({
        title: '',
        content: '',
        link_url: ''
      })
      setSelectedFiles([])
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
              <DialogContent className="max-w-2xl">
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
                <Textarea name="content" defaultValue={editingNews.content} rows={6} required />
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
    </div>
  )
}

export default NewsManager;