import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, User } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { format } from "date-fns"
import { de } from "date-fns/locale"

interface NewsItem {
  id: string
  title: string
  content: string
  published_at: string
  author_id: string
  profiles?: {
    display_name: string
  } | null
}

export const NewsSection = () => {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNews()
  }, [])

  const loadNews = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false })

      if (error) throw error
      setNews(data || [])
    } catch (error) {
      console.error('Error loading news:', error)
      toast.error('Fehler beim Laden der Nachrichten')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Lade Nachrichten...</p>
        </div>
      </div>
    )
  }

  if (news.length === 0) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-semibold mb-2">Keine Nachrichten</h3>
            <p className="text-muted-foreground">
              Aktuell sind keine Nachrichten verfügbar.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 pt-6">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">RISE News</h1>
        <p className="text-muted-foreground">
          Die neuesten Nachrichten aus dem Studio
        </p>
      </div>

      <div className="space-y-4">
        {news.map(item => (
          <Card key={item.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  <Calendar className="h-4 w-4 mr-2" />
                  {format(new Date(item.published_at), 'dd.MM.yyyy', { locale: de })}
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <User className="h-3 w-3" />
                RISE Team
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{item.content}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}