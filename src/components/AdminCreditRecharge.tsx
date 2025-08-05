import { useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { CreditCard, Plus } from "lucide-react"

export const AdminCreditRecharge = () => {
  const [selectedUser, setSelectedUser] = useState<string>("")
  const [creditsToAdd, setCreditsToAdd] = useState<string>("")
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const { toast } = useToast()

  const loadTenCardUsers = async () => {
    setLoadingUsers(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, membership_type')
        .eq('membership_type', '10er Karte')
        .order('display_name')

      if (error) throw error
      setUsers(data || [])
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
          action: 'add_credits',
          user_id: selectedUser,
          credits: credits
        }
      })

      if (error) throw error

      toast({
        title: "Erfolg",
        description: `${credits} Credits wurden erfolgreich aufgeladen.`
      })
      
      setSelectedUser("")
      setCreditsToAdd("")
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          10er Karte Credits aufladen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="user-select">10er Karte Mitglied</Label>
          <div className="flex gap-2">
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Mitglied auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.user_id} value={user.user_id}>
                    {user.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={loadTenCardUsers}
              disabled={loadingUsers}
            >
              {loadingUsers ? "Lade..." : "Laden"}
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor="credits-input">Anzahl Credits</Label>
          <Input
            id="credits-input"
            type="number"
            placeholder="10"
            value={creditsToAdd}
            onChange={(e) => setCreditsToAdd(e.target.value)}
            min="1"
          />
        </div>

        <Button 
          onClick={handleRechargeCredits}
          disabled={loading || !selectedUser || !creditsToAdd}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          {loading ? "Lädt Credits auf..." : "Credits aufladen"}
        </Button>
      </CardContent>
    </Card>
  )
}