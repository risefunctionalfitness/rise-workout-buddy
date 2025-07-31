import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { UserPlus, LogOut, Users, Calendar, Newspaper, Edit, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CourseTemplateManager from "@/components/CourseTemplateManager";
import NewsManager from "@/components/NewsManager";
import { GymCodeManager } from "@/components/GymCodeManager";
import { CourseParticipants } from "@/components/CourseParticipants";
import { MembershipBadge } from "@/components/MembershipBadge";
import { AdminStats } from "@/components/AdminStats";

interface Member {
  id: string;
  display_name: string;
  access_code: string;
  user_id: string | null;
  email?: string;
  created_at: string;
  membership_type: 'Member' | 'Trainer' | 'Administrator' | 'Open Gym' | 'Wellpass' | '10er Karte';
  status: string;
  last_login_at: string | null;
}

export default function Admin() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberCode, setNewMemberCode] = useState("");
  const [newMembershipType, setNewMembershipType] = useState("Member");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [activeTab, setActiveTab] = useState<'members' | 'participants' | 'courses' | 'news' | 'gym-codes'>('members');
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

  const membershipTypes = ["Member", "Trainer", "Administrator", "Open Gym", "Wellpass", "10er Karte"];

  const loadMembers = async () => {
    try {
      // First update member status automatically
      await supabase.rpc('update_member_status');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, access_code, created_at, user_id, membership_type, status, last_login_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading members:', error);
        toast.error("Fehler beim Laden der Mitglieder");
      } else {
        setMembers((data || []) as Member[]);
      }
    } catch (error) {
      console.error('Error loading members:', error);
      toast.error("Fehler beim Laden der Mitglieder");
    }
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMemberName || !newMemberEmail || !newMemberCode) {
      toast.error("Bitte alle Felder ausfüllen");
      return;
    }

    try {
      // Check if email or access code already exists
      const { data: existingCode } = await supabase
        .from('profiles')
        .select('id')
        .eq('access_code', newMemberCode)
        .maybeSingle();

      if (existingCode) {
        toast.error("Zugangscode bereits vergeben");
        return;
      }

      // Create user via Edge Function with admin privileges
      const { data: result, error: functionError } = await supabase.functions.invoke('create-member', {
        body: {
          email: newMemberEmail,
          password: newMemberCode,
          user_metadata: {
            display_name: newMemberName,
            access_code: newMemberCode,
            membership_type: newMembershipType
          }
        }
      });

      if (functionError || !result?.success) {
        console.error('Error creating member:', functionError || result?.error);
        toast.error("Fehler beim Erstellen des Mitglieds");
      } else {
        toast.success("Mitglied erfolgreich erstellt - kann sich sofort anmelden!");
        setNewMemberName("");
        setNewMemberEmail("");
        setNewMemberCode("");
        setNewMembershipType("Member");
        setDialogOpen(false);
        loadMembers();
      }
    } catch (error) {
      console.error('Error creating member:', error);
      toast.error("Fehler beim Erstellen des Mitglieds");
    }
  };

  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingMember) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: editingMember.display_name,
          access_code: editingMember.access_code,
          membership_type: editingMember.membership_type
        })
        .eq('id', editingMember.id);

      if (error) {
        console.error('Error updating member:', error);
        toast.error("Fehler beim Aktualisieren des Mitglieds");
      } else {
        toast.success("Mitglied erfolgreich aktualisiert");
        setEditDialogOpen(false);
        setEditingMember(null);
        loadMembers();
      }
    } catch (error) {
      console.error('Error updating member:', error);
      toast.error("Fehler beim Aktualisieren des Mitglieds");
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm('Sind Sie sicher, dass Sie dieses Mitglied löschen möchten?')) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', memberId);

      if (error) {
        console.error('Error deleting member:', error);
        toast.error("Fehler beim Löschen des Mitglieds");
      } else {
        toast.success("Mitglied erfolgreich gelöscht");
        loadMembers();
      }
    } catch (error) {
      console.error('Error deleting member:', error);
      toast.error("Fehler beim Löschen des Mitglieds");
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

  const renderMembersContent = () => {
    return (
      <div className="space-y-6">
        {/* Admin Statistics */}
        <AdminStats />
        
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
                        type="email"
                        placeholder="E-Mail des Mitglieds"
                        value={newMemberEmail}
                        onChange={(e) => setNewMemberEmail(e.target.value)}
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
                    <div className="space-y-2">
                      <Select value={newMembershipType} onValueChange={setNewMembershipType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {membershipTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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

              {/* Edit Member Dialog */}
              <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Mitglied bearbeiten</DialogTitle>
                    <DialogDescription>
                      Bearbeiten Sie die Mitgliederdaten
                    </DialogDescription>
                  </DialogHeader>
                  {editingMember && (
                    <form onSubmit={handleEditMember} className="space-y-4">
                      <div className="space-y-2">
                        <Input
                          placeholder="Name des Mitglieds"
                          value={editingMember.display_name}
                          onChange={(e) => setEditingMember({
                            ...editingMember,
                            display_name: e.target.value
                          })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Input
                          placeholder="Zugangscode"
                          value={editingMember.access_code}
                          onChange={(e) => setEditingMember({
                            ...editingMember,
                            access_code: e.target.value
                          })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Select 
                          value={editingMember.membership_type} 
                          onValueChange={(value) => setEditingMember({
                            ...editingMember,
                            membership_type: value as Member['membership_type']
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {membershipTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" className="flex-1">
                          Änderungen speichern
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => {
                            setEditDialogOpen(false);
                            setEditingMember(null);
                          }}
                        >
                          Abbrechen
                        </Button>
                      </div>
                    </form>
                  )}
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
                  <TableHead>Mitgliedschaft</TableHead>
                  <TableHead>Erstellt am</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Letzter Login</TableHead>
                  <TableHead>Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.display_name}</TableCell>
                    <TableCell>{member.access_code}</TableCell>
                    <TableCell>
                      <MembershipBadge type={member.membership_type} />
                    </TableCell>
                    <TableCell>
                      {new Date(member.created_at).toLocaleDateString('de-DE')}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        member.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {member.status === 'active' ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {member.last_login_at 
                        ? new Date(member.last_login_at).toLocaleDateString('de-DE')
                        : 'Nie'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setEditingMember(member);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteMember(member.id)}
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
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src="/lovable-uploads/c96a74cb-c5bf-4636-97c3-b28e0057849e.png" 
                alt="RISE Logo" 
                className="h-12"
              />
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Abmelden
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'members' | 'participants' | 'courses' | 'news' | 'gym-codes')}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Mitglieder
            </TabsTrigger>
            <TabsTrigger value="participants" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Kurse
            </TabsTrigger>
            <TabsTrigger value="courses" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Kursvorlagen
            </TabsTrigger>
            <TabsTrigger value="news" className="flex items-center gap-2">
              <Newspaper className="h-4 w-4" />
              News
            </TabsTrigger>
            <TabsTrigger value="gym-codes" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Gym-Codes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="mt-6">{renderMembersContent()}</TabsContent>
          <TabsContent value="participants" className="mt-6"><CourseParticipants /></TabsContent>
          <TabsContent value="courses" className="mt-6"><CourseTemplateManager /></TabsContent>
          <TabsContent value="news" className="mt-6"><NewsManager /></TabsContent>
          <TabsContent value="gym-codes" className="mt-6"><GymCodeManager /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}