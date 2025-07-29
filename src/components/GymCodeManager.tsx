import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import { Plus, Edit, Save, X } from "lucide-react"

interface GymAccessCode {
  id: string
  code: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export const GymCodeManager = () => {
  const [codes, setCodes] = useState<GymAccessCode[]>([])
  const [loading, setLoading] = useState(true)
  const [newCode, setNewCode] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingCode, setEditingCode] = useState("")
  const [editingDescription, setEditingDescription] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    loadCodes()
  }, [])

  const loadCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('gym_access_codes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading gym codes:', error)
        toast({
          title: "Fehler",
          description: "Zugangscodes konnten nicht geladen werden",
          variant: "destructive",
        })
        return
      }

      setCodes(data || [])
    } catch (error) {
      console.error('Error loading gym codes:', error)
      toast({
        title: "Fehler",
        description: "Zugangscodes konnten nicht geladen werden",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newCode.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Code ein",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase
        .from('gym_access_codes')
        .insert([{
          code: newCode.trim(),
          description: newDescription.trim() || null,
          is_active: true
        }])

      if (error) {
        console.error('Error creating gym code:', error)
        toast({
          title: "Fehler",
          description: "Zugangscode konnte nicht erstellt werden",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Erfolg",
        description: "Zugangscode erfolgreich erstellt",
      })

      setNewCode("")
      setNewDescription("")
      loadCodes()
    } catch (error) {
      console.error('Error creating gym code:', error)
      toast({
        title: "Fehler",
        description: "Zugangscode konnte nicht erstellt werden",
        variant: "destructive",
      })
    }
  }

  const handleUpdateCode = async (id: string) => {
    if (!editingCode.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Code ein",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase
        .from('gym_access_codes')
        .update({
          code: editingCode.trim(),
          description: editingDescription.trim() || null
        })
        .eq('id', id)

      if (error) {
        console.error('Error updating gym code:', error)
        toast({
          title: "Fehler",
          description: "Zugangscode konnte nicht aktualisiert werden",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Erfolg",
        description: "Zugangscode erfolgreich aktualisiert",
      })

      setEditingId(null)
      setEditingCode("")
      setEditingDescription("")
      loadCodes()
    } catch (error) {
      console.error('Error updating gym code:', error)
      toast({
        title: "Fehler",
        description: "Zugangscode konnte nicht aktualisiert werden",
        variant: "destructive",
      })
    }
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('gym_access_codes')
        .update({ is_active: !isActive })
        .eq('id', id)

      if (error) {
        console.error('Error toggling gym code status:', error)
        toast({
          title: "Fehler",
          description: "Status konnte nicht geändert werden",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Erfolg",
        description: `Zugangscode ${!isActive ? 'aktiviert' : 'deaktiviert'}`,
      })

      loadCodes()
    } catch (error) {
      console.error('Error toggling gym code status:', error)
      toast({
        title: "Fehler",
        description: "Status konnte nicht geändert werden",
        variant: "destructive",
      })
    }
  }

  const startEditing = (code: GymAccessCode) => {
    setEditingId(code.id)
    setEditingCode(code.code)
    setEditingDescription(code.description || "")
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingCode("")
    setEditingDescription("")
  }

  if (loading) {
    return <div className="flex justify-center p-4">Lädt...</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Neuen Zugangscode erstellen</CardTitle>
          <CardDescription>
            Erstellen Sie einen neuen Zugangscode für das Fitnessstudio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateCode} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Code</label>
                <Input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="z.B. 1234"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Beschreibung (optional)</label>
                <Input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="z.B. Hauptzugangscode"
                />
              </div>
            </div>
            <Button type="submit" className="w-full md:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Code erstellen
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zugangscodes verwalten</CardTitle>
          <CardDescription>
            Verwalten Sie alle Zugangscodes für das Fitnessstudio
          </CardDescription>
        </CardHeader>
        <CardContent>
          {codes.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Keine Zugangscodes vorhanden
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Beschreibung</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Erstellt</TableHead>
                    <TableHead>Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell>
                        {editingId === code.id ? (
                          <Input
                            value={editingCode}
                            onChange={(e) => setEditingCode(e.target.value)}
                            className="w-24"
                          />
                        ) : (
                          <span className="font-mono">{code.code}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === code.id ? (
                          <Input
                            value={editingDescription}
                            onChange={(e) => setEditingDescription(e.target.value)}
                            placeholder="Beschreibung"
                          />
                        ) : (
                          code.description || "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={code.is_active}
                            onCheckedChange={() => handleToggleActive(code.id, code.is_active)}
                          />
                          <Badge variant={code.is_active ? "default" : "secondary"}>
                            {code.is_active ? "Aktiv" : "Inaktiv"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(code.created_at).toLocaleDateString('de-DE')}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {editingId === code.id ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleUpdateCode(code.id)}
                                variant="default"
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={cancelEditing}
                                variant="outline"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => startEditing(code)}
                              variant="outline"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}