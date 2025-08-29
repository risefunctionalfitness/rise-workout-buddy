import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { CreditCard, Plus, RefreshCw, User } from "lucide-react"

interface UserCredit {
  user_id: string
  display_name: string
  first_name: string
  last_name: string
  credits_remaining: number
  credits_total: number
  last_recharged_at: string
}

export const CreditManagement = () => {
  const [users, setUsers] = useState<UserCredit[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [creditsToAdd, setCreditsToAdd] = useState<number>(10)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      // Get all 10er Karte users with their credit information
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          user_id,
          display_name,
          first_name,
          last_name,
          membership_credits (
            credits_remaining,
            credits_total,
            last_recharged_at
          )
        `)
        .eq('membership_type', '10er Karte')

      if (error) throw error

      const usersWithCredits = data?.map(user => {
        const credits = Array.isArray(user.membership_credits) ? user.membership_credits[0] : null;
        return {
          user_id: user.user_id,
          display_name: user.display_name || 'Unbekannt',
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          credits_remaining: credits?.credits_remaining || 0,
          credits_total: credits?.credits_total || 0,
          last_recharged_at: credits?.last_recharged_at || '',
        };
      }) || []

      setUsers(usersWithCredits)
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error('Fehler beim Laden der Benutzer')
    } finally {
      setLoading(false)
    }
  }

  const handleAddCredits = async () => {
    if (!selectedUserId || creditsToAdd <= 0) {
      toast.error('Bitte wähle einen Benutzer und gib eine gültige Anzahl Credits ein')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('manage-credits', {
        body: {
          user_id: selectedUserId,
          credits_to_add: creditsToAdd
        }
      })

      if (error) throw error

      toast.success(data.message)
      setSelectedUserId("")
      setCreditsToAdd(10)
      loadUsers()
    } catch (error: any) {
      console.error('Error adding credits:', error)
      toast.error(error.message || 'Fehler beim Hinzufügen der Credits')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Credits hinzufügen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="user-select">Benutzer auswählen</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Benutzer wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      <div className="flex items-center justify-between w-full">
                        <span>
                          {user.first_name && user.last_name 
                            ? `${user.first_name} ${user.last_name}` 
                            : user.display_name}
                        </span>
                        <Badge variant="outline" className="ml-2">
                          {user.credits_remaining} Credits
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="credits-input">Anzahl Credits</Label>
              <Input
                id="credits-input"
                type="number"
                min="1"
                max="50"
                value={creditsToAdd}
                onChange={(e) => setCreditsToAdd(parseInt(e.target.value) || 0)}
                placeholder="10"
              />
            </div>

            <div className="flex items-end">
              <Button 
                onClick={handleAddCredits}
                disabled={loading || !selectedUserId || creditsToAdd <= 0}
                className="w-full"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                Credits hinzufügen
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            10er Karte Übersicht
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {users.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Keine 10er Karte Mitglieder gefunden
              </p>
            ) : (
              users.map(user => (
                <div key={user.user_id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      {user.first_name && user.last_name 
                        ? `${user.first_name} ${user.last_name}` 
                        : user.display_name}
                    </p>
                    {user.last_recharged_at && (
                      <p className="text-sm text-muted-foreground">
                        Zuletzt aufgeladen: {new Date(user.last_recharged_at).toLocaleDateString('de-DE')}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge variant={user.credits_remaining > 0 ? "default" : "destructive"}>
                      {user.credits_remaining} / {user.credits_total} Credits
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}