import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { Edit, Trash2, Plus } from "lucide-react"

interface NewsItem {
  id: string
  title: string
  content: string
  author_id: string
  published_at: string
  is_published: boolean
  created_at: string
  updated_at: string
}

export const NewsManager = () => {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  // Form state
  const [newsForm, setNewsForm] = useState({
    title: '',
    content: '',
    is_published: true
  })

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
      setNews(data || [])
    } catch (error) {
      console.error('Error loading news:', error)
      toast.error('Fehler beim Laden der Nachrichten')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNews = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('news')
        .insert({
          title: newsForm.title,
          content: newsForm.content,
          author_id: user.id,
          is_published: newsForm.is_published,
          published_at: newsForm.is_published ? new Date().toISOString() : null
        })

      if (error) throw error

      toast.success('Nachricht erfolgreich erstellt')
      setNewsForm({
        title: '',
        content: '',
        is_published: true
      })
      setCreateDialogOpen(false)
      await loadNews()
    } catch (error) {
      console.error('Error creating news:', error)
      toast.error('Fehler beim Erstellen der Nachricht')
    }
  }

  const handleUpdateNews = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingNews) return

    try {
      const formData = new FormData(e.target as HTMLFormElement)
      const updates = {
        title: formData.get('title') as string,
        content: formData.get('content') as string,
        is_published: formData.get('is_published') === 'on',
        published_at: formData.get('is_published') === 'on' 
          ? (editingNews.published_at || new Date().toISOString())
          : null
      }

      const { error } = await supabase
        .from('news')
        .update(updates)
        .eq('id', editingNews.id)

      if (error) throw error

      toast.success('Nachricht erfolgreich aktualisiert')
      setEditingNews(null)
      await loadNews()
    } catch (error) {
      console.error('Error updating news:', error)
      toast.error('Fehler beim Aktualisieren der Nachricht')
    }
  }

  const handleDeleteNews = async (newsId: string) => {
    if (!confirm('Sind Sie sicher, dass Sie diese Nachricht löschen möchten?')) return

    try {
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

  const handleTogglePublished = async (newsId: string, currentStatus: boolean) => {
    try {
      const updates = {
        is_published: !currentStatus,
        published_at: !currentStatus ? new Date().toISOString() : null
      }

      const { error } = await supabase
        .from('news')
        .update(updates)
        .eq('id', newsId)

      if (error) throw error

      toast.success(`Nachricht ${!currentStatus ? 'veröffentlicht' : 'versteckt'}`)
      await loadNews()
    } catch (error) {
      console.error('Error toggling news status:', error)
      toast.error('Fehler beim Ändern des Status')
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
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={newsForm.is_published}
                      onCheckedChange={(checked) => setNewsForm(prev => ({ ...prev, is_published: checked }))}
                    />
                    <Label>Sofort veröffentlichen</Label>
                  </div>
                  <Button type="submit" className="w-full">
                    Nachricht erstellen
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
                <TableHead>Status</TableHead>
                <TableHead>Erstellt</TableHead>
                <TableHead>Veröffentlicht</TableHead>
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
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={item.is_published}
                        onCheckedChange={() => handleTogglePublished(item.id, item.is_published)}
                      />
                      <Badge variant={item.is_published ? "default" : "secondary"}>
                        {item.is_published ? 'Veröffentlicht' : 'Entwurf'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(item.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                  </TableCell>
                  <TableCell>
                    {item.published_at 
                      ? format(new Date(item.published_at), 'dd.MM.yyyy HH:mm', { locale: de })
                      : '-'
                    }
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
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="is_published"
                  defaultChecked={editingNews.is_published}
                  className="rounded"
                />
                <Label>Veröffentlicht</Label>
              </div>
              <Button type="submit" className="w-full">
                Nachricht aktualisieren
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default NewsManager;