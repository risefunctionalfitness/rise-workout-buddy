import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { UserPlus, LogOut, Users } from "lucide-react";

interface Member {
  id: string;
  display_name: string;
  access_code: string;
  email?: string;
  created_at: string;
}

export default function Admin() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberCode, setNewMemberCode] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session?.user) {
          navigate("/auth");
        } else {
          setTimeout(() => {
            checkAdminRole(session.user.id);
          }, 0);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        navigate("/auth");
      } else {
        checkAdminRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAdminRole = async (userId: string) => {
    try {
      // Spezielle Behandlung für Admin-E-Mail
      const user = await supabase.auth.getUser();
      if (user.data.user?.email === 'admin@rise-fitness.com') {
        setIsAdmin(true);
        loadMembers();
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
      } else {
        setIsAdmin(!!data);
        if (!!data) {
          loadMembers();
        } else {
          toast.error("Keine Admin-Berechtigung");
          navigate("/pro");
        }
      }
    } catch (error) {
      console.error('Error checking admin role:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, access_code, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading members:', error);
        toast.error("Fehler beim Laden der Mitglieder");
      } else {
        setMembers(data || []);
      }
    } catch (error) {
      console.error('Error loading members:', error);
      toast.error("Fehler beim Laden der Mitglieder");
    }
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMemberName || !newMemberCode) {
      toast.error("Bitte alle Felder ausfüllen");
      return;
    }

    try {
      // Check if access code already exists
      const { data: existingCode } = await supabase
        .from('profiles')
        .select('id')
        .eq('access_code', newMemberCode)
        .single();

      if (existingCode) {
        toast.error("Zugangscode bereits vergeben");
        return;
      }

      // Create temporary profile entry for admin-created members
      const tempUserId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const { error } = await supabase
        .from('profiles')
        .insert({
          user_id: tempUserId,
          display_name: newMemberName,
          access_code: newMemberCode
        });

      if (error) {
        console.error('Error creating member:', error);
        toast.error("Fehler beim Erstellen des Mitglieds");
      } else {
        toast.success("Mitglied erfolgreich erstellt");
        setNewMemberName("");
        setNewMemberCode("");
        setDialogOpen(false);
        loadMembers();
      }
    } catch (error) {
      console.error('Error creating member:', error);
      toast.error("Fehler beim Erstellen des Mitglieds");
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error("Fehler beim Abmelden");
      } else {
        toast.success("Erfolgreich abgemeldet");
        navigate("/");
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast.error("Fehler beim Abmelden");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg">Berechtigungen werden überprüft...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <img 
              src="/lovable-uploads/c96a74cb-c5bf-4636-97c3-b28e0057849e.png" 
              alt="RISE Functional Fitness Logo" 
              className="h-12"
            />
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">RISE Functional Fitness</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Abmelden
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mitglieder gesamt</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{members.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Members Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Mitglieder verwalten</CardTitle>
                <CardDescription>
                  Erstellen und verwalten Sie Mitgliederaccounts
                </CardDescription>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Neues Mitglied
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Neues Mitglied erstellen</DialogTitle>
                    <DialogDescription>
                      Erstellen Sie einen neuen Mitgliederaccount mit Name und Zugangscode
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateMember} className="space-y-4">
                    <div className="space-y-2">
                      <Input
                        placeholder="Name des Mitglieds"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Input
                        placeholder="Zugangscode (z.B. 2019)"
                        value={newMemberCode}
                        onChange={(e) => setNewMemberCode(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        Mitglied erstellen
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setDialogOpen(false)}
                      >
                        Abbrechen
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Zugangscode</TableHead>
                  <TableHead>Erstellt am</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.display_name || 'Unbekannt'}
                    </TableCell>
                    <TableCell>{member.access_code || '-'}</TableCell>
                    <TableCell>
                      {new Date(member.created_at).toLocaleDateString('de-DE')}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-green-100 text-green-800">
                        Aktiv
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {members.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Noch keine Mitglieder erstellt
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}