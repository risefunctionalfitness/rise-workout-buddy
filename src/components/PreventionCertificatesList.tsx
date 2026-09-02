import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { FileText, RefreshCw, Send, Download, Mail } from "lucide-react"

interface Certificate {
  id: string
  user_id: string
  period_from: string
  period_to: string
  signature_date: string
  units: number
  units_counted: number
  recipient_email: string | null
  status: string
  error: string | null
  sent_at: string | null
  pdf_path: string | null
  created_at: string
  name: string
}

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('de-DE') : '–'

export const PreventionCertificatesList = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('prevention_certificates')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const userIds = [...new Set((data || []).map(c => c.user_id))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, display_name')
        .in('user_id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000'])

      setCertificates((data || []).map(c => {
        const p = profiles?.find(x => x.user_id === c.user_id)
        const name = `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim() || p?.display_name || 'Unbekannt'
        return { ...c, name } as Certificate
      }))
    } catch (error) {
      console.error('Error loading certificates:', error)
      toast({
        title: "Fehler",
        description: "Bescheinigungen konnten nicht geladen werden.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const oeffnePdf = async (cert: Certificate) => {
    if (!cert.pdf_path) return
    const { data, error } = await supabase.storage
      .from('praevention')
      .createSignedUrl(cert.pdf_path, 60 * 10)
    if (error || !data) {
      toast({ title: "Fehler", description: "PDF konnte nicht geöffnet werden.", variant: "destructive" })
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  const erneutSenden = async (cert: Certificate) => {
    setBusyId(cert.id)
    try {
      const { error } = await supabase.functions.invoke('send-prevention-certificates', {
        body: { certificate_id: cert.id }
      })
      if (error) throw error
      toast({ title: "Verschickt", description: `Bescheinigung für ${cert.name} wurde erneut gesendet.` })
      await load()
    } catch (error) {
      console.error('Error resending certificate:', error)
      toast({
        title: "Fehler",
        description: "Die Bescheinigung konnte nicht erneut gesendet werden.",
        variant: "destructive"
      })
    } finally {
      setBusyId(null)
    }
  }

  const testmailSenden = async () => {
    setBusyId('test')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) throw new Error('Keine E-Mail-Adresse gefunden')
      const { error } = await supabase.functions.invoke('send-prevention-certificates', {
        body: { test_email: user.email }
      })
      if (error) throw error
      toast({
        title: "Testmail unterwegs",
        description: `Eine Musterbescheinigung geht an ${user.email}.`
      })
    } catch (error) {
      console.error('Error sending test mail:', error)
      toast({
        title: "Fehler",
        description: "Die Testmail konnte nicht verschickt werden.",
        variant: "destructive"
      })
    } finally {
      setBusyId(null)
    }
  }

  const statusBadge = (cert: Certificate) => {
    if (cert.status === 'sent') return <Badge className="bg-green-600 text-white">Verschickt</Badge>
    if (cert.status === 'failed') return <Badge variant="destructive">Fehler</Badge>
    return <Badge variant="secondary">In Arbeit</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Teilnahmebescheinigungen
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={testmailSenden}
              disabled={busyId === 'test'}
              title="Schickt eine Musterbescheinigung an deine eigene Adresse"
            >
              <Mail className="h-4 w-4 mr-2" />
              {busyId === 'test' ? 'Sendet…' : 'Testmail'}
            </Button>
            <Button variant="outline" size="icon" onClick={load} disabled={loading} title="Aktualisieren">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && certificates.length === 0 ? (
          <p className="text-sm text-muted-foreground">Lade…</p>
        ) : certificates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Noch keine Bescheinigungen verschickt. Sie entstehen automatisch, sobald
            die 8 Wochen einer Präventionskurs-Karte abgelaufen sind.
          </p>
        ) : (
          <div className="space-y-3">
            {certificates.map(cert => (
              <div key={cert.id} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{cert.name}</p>
                      {statusBadge(cert)}
                      <Badge variant="outline" className="text-xs">
                        {cert.units} von 8 Einheiten
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Kurszeitraum: {formatDate(cert.period_from)} – {formatDate(cert.period_to)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Unterschriftsdatum: {formatDate(cert.signature_date)}
                      {cert.sent_at && ` · verschickt am ${formatDate(cert.sent_at)}`}
                    </p>
                    {cert.recipient_email && (
                      <p className="text-sm text-muted-foreground truncate">
                        An: {cert.recipient_email}
                      </p>
                    )}
                    {cert.units_counted > cert.units && (
                      <p className="text-xs text-muted-foreground">
                        Tatsächlich {cert.units_counted} Buchungen im Zeitraum, auf dem Formular
                        stehen wie vorgesehen maximal 8.
                      </p>
                    )}
                    {cert.status === 'failed' && cert.error && (
                      <p className="text-sm text-destructive">{cert.error}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => oeffnePdf(cert)}
                      disabled={!cert.pdf_path}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => erneutSenden(cert)}
                      disabled={busyId === cert.id || !cert.pdf_path}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {busyId === cert.id ? 'Sendet…' : 'Erneut senden'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
