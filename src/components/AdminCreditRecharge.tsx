import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
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

export const AdminCreditRecharge = () => {
  const [selectedUser, setSelectedUser] = useState<string>("")
  const [creditsToAdd, setCreditsToAdd] = useState<string>("10")
  const [users, setUsers] = useState<UserCredit[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadTenCardUsers()
  }, [])

  const loadTenCardUsers = async () => {
    setLoadingUsers(true)
    try {
      // First get all 10er Karte users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name')
        .eq('membership_type', '10er Karte')
        .order('display_name')

      if (profilesError) throw profilesError

      // Then get all credits for these users
      const userIds = profilesData?.map(p => p.user_id) || []
      const { data: creditsData, error: creditsError } = await supabase
        .from('membership_credits')
        .select('user_id, credits_remaining, credits_total, last_recharged_at')
        .in('user_id', userIds)

      if (creditsError) throw creditsError

      // Combine the data
      const usersWithCredits = profilesData?.map(user => {
        const credits = creditsData?.find(c => c.user_id === user.user_id);
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
      toast({
        title: "Fehler",
        description: "Benutzer konnten nicht geladen werden.",
        variant: "destructive"
      })
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleRechargeCredits = async () => {
    if (!selectedUser || !creditsToAdd) {
      toast({
        title: "Fehler",
        description: "Bitte wähle einen Benutzer und gib die Anzahl Credits ein.",
        variant: "destructive"
      })
      return
    }

    const credits = parseInt(creditsToAdd)
    if (isNaN(credits) || credits <= 0) {
      toast({
        title: "Fehler",
        description: "Bitte gib eine gültige Anzahl Credits ein.",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.functions.invoke('manage-credits', {
        body: {
          user_id: selectedUser,
          credits_to_add: credits
        }
      })

      if (error) throw error

      toast({
        title: "Erfolg",
        description: `${credits} Credits wurden erfolgreich aufgeladen.`
      })
      
      setSelectedUser("")
      setCreditsToAdd("10")
      loadTenCardUsers() // Refresh the list
    } catch (error) {
      console.error('Error recharging credits:', error)
      toast({
        title: "Fehler",
        description: "Credits konnten nicht aufgeladen werden.",
        variant: "destructive"
      })
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
              <Label htmlFor="user-select">Mitglied auswählen</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Mitglied wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{user.first_name} {user.last_name}</span>
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
                onChange={(e) => setCreditsToAdd(e.target.value)}
                placeholder="10"
              />
            </div>

            <div className="flex items-end">
              <Button 
                onClick={handleRechargeCredits}
                disabled={loading || !selectedUser || !creditsToAdd}
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
                {loadingUsers ? "Lade Mitglieder..." : "Keine 10er Karte Mitglieder gefunden"}
              </p>
            ) : (
              users.map(user => (
                <div key={user.user_id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{user.first_name} {user.last_name}</p>
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