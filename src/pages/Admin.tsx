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
import { UserPlus, LogOut, Users, Calendar, Newspaper, Edit, Trash2, Home, MoreVertical, Search, Dumbbell } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import CourseTemplateManager from "@/components/CourseTemplateManager";
import NewsManager from "@/components/NewsManager";
import { GymCodeManager } from "@/components/GymCodeManager";
import { CourseParticipants } from "@/components/CourseParticipants";
import { MembershipBadge } from "@/components/MembershipBadge";
import { AdminStats } from "@/components/AdminStats";
import { useScrollToTop } from "@/hooks/useScrollToTop";

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
  authors?: boolean;
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
  const [newMemberIsAuthor, setNewMemberIsAuthor] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [activePage, setActivePage] = useState<'home' | 'members' | 'courses' | 'templates' | 'news' | 'codes'>('home');
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalMembers, setTotalMembers] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const membersPerPage = 10;
  const navigate = useNavigate();
  
  // Scroll to top when navigating admin pages
  useScrollToTop([]);

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

  useEffect(() => {
    if (activePage === 'members' && isAdmin) {
      loadMembers();
    }
  }, [activePage, isAdmin, currentPage, searchTerm]);

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
      
      // Calculate offset for pagination
      const offset = (currentPage - 1) * membersPerPage;
      
      // Build query with search filter
      let query = supabase
        .from('profiles')
        .select('id, display_name, access_code, created_at, user_id, membership_type, status, last_login_at, authors', { count: 'exact' });
      
      if (searchTerm) {
        query = query.or(`display_name.ilike.%${searchTerm}%,access_code.ilike.%${searchTerm}%`);
      }
      
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + membersPerPage - 1);

      if (error) {
        console.error('Error loading members:', error);
        toast.error("Fehler beim Laden der Mitglieder");
      } else {
        setMembers((data || []) as Member[]);
        setTotalMembers(count || 0);
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
            membership_type: newMembershipType,
            authors: newMemberIsAuthor
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
        setNewMemberIsAuthor(false);
        setDialogOpen(false);
        setCurrentPage(1);
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
          membership_type: editingMember.membership_type,
          authors: editingMember.authors
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

  const handleDeleteMember = async (memberId: string, memberName: string, userId?: string) => {
    if (!confirm(`Sind Sie sicher, dass Sie das Mitglied "${memberName}" komplett löschen möchten? Dies entfernt sowohl das Profil als auch den Account unwiderruflich.`)) return;

    try {
      if (!userId) {
        // Fallback: only delete from profiles if no user_id
        const { error } = await supabase
          .from('profiles')
          .delete()
          .eq('id', memberId);

        if (error) {
          console.error('Error deleting member:', error);
          toast.error("Fehler beim Löschen des Mitglieds");
        } else {
          toast.success("Mitglied erfolgreich gelöscht");
          setCurrentPage(1);
          loadMembers();
        }
        return;
      }

      // Use edge function to delete completely
      const { data: result, error: functionError } = await supabase.functions.invoke('delete-member', {
        body: { userId }
      });

      if (functionError || !result?.success) {
        console.error('Error deleting member:', functionError || result?.error);
        toast.error("Fehler beim Löschen des Mitglieds");
      } else {
        toast.success("Mitglied und Account erfolgreich gelöscht");
        setCurrentPage(1);
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
    const totalPages = Math.ceil(totalMembers / membersPerPage);
    
    return (
      <div className="space-y-6">
        {/* Members Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Mitglieder verwalten</CardTitle>
                <CardDescription>
                  Erstellen und verwalten Sie Mitgliederaccounts ({totalMembers} insgesamt)
                </CardDescription>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Suchen..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10 w-48"
                  />
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="icon" title="Neues Mitglied erstellen">
                      <UserPlus className="h-4 w-4" />
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
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="author-checkbox"
                        checked={newMemberIsAuthor}
                        onChange={(e) => setNewMemberIsAuthor(e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor="author-checkbox" className="text-sm">
                        Autor (kann WODs erstellen)
                      </label>
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
                       <div className="flex items-center space-x-2">
                         <input
                           type="checkbox"
                           id="edit-author-checkbox"
                           checked={editingMember.authors || false}
                           onChange={(e) => setEditingMember({
                             ...editingMember,
                             authors: e.target.checked
                           })}
                           className="rounded"
                         />
                         <label htmlFor="edit-author-checkbox" className="text-sm">
                           Autor (kann WODs erstellen)
                         </label>
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
            {/* Mobile View - Cards */}
            <div className="block md:hidden space-y-4">
              {members.map((member) => (
                <Card key={member.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-sm">{member.display_name}</h3>
                        <p className="text-xs text-gray-500">{member.access_code}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(member.created_at).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs px-2 py-1 h-8"
                          onClick={() => {
                            setEditingMember(member);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="text-xs px-2 py-1 h-8"
                          onClick={() => handleDeleteMember(member.id, member.display_name, member.user_id || undefined)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <MembershipBadge type={member.membership_type} />
                        {member.authors && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-50 text-purple-700 border border-purple-200">
                            Autor
                          </span>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        member.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {member.status === 'active' ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Desktop View - Table */}
            <div className="hidden md:block">
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
                        <div className="flex items-center gap-2">
                          <MembershipBadge type={member.membership_type} />
                          {member.authors && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-50 text-purple-700 border border-purple-200">
                              Autor
                            </span>
                          )}
                        </div>
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
                            onClick={() => handleDeleteMember(member.id, member.display_name, member.user_id || undefined)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Zurück
              </Button>
              <span className="flex items-center px-4">
                Seite {currentPage} von {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Weiter
              </Button>
            </div>
          )}
        </div>
      );
    };

  const renderPageContent = () => {
    switch (activePage) {
      case 'home':
        return <AdminStats />;
      case 'members':
        return renderMembersContent();
      case 'courses':
        return <CourseParticipants />;
      case 'templates':
        return <CourseTemplateManager />;
      case 'news':
        return <NewsManager />;
      case 'codes':
        return <GymCodeManager />;
      default:
        return <AdminStats />;
    }
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
                className="h-12 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => navigate('/')}
              />
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            </div>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setDropdownOpen(true)}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
            
            {/* Navigation Overlay */}
            {dropdownOpen && (
              <div className="fixed inset-0 z-50 bg-white flex flex-col justify-center items-center p-8">
                <div className="grid grid-cols-2 gap-8 max-w-md w-full">
                  <div 
                    onClick={() => {
                      setActivePage('home');
                      setDropdownOpen(false);
                    }}
                    className="flex flex-col items-center justify-center p-6 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <Home className="h-12 w-12 text-gray-600 mb-3" />
                    <span className="text-lg font-medium">Home</span>
                  </div>
                  <div 
                    onClick={() => {
                      setActivePage('members');
                      setDropdownOpen(false);
                    }}
                    className="flex flex-col items-center justify-center p-6 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <Users className="h-12 w-12 text-gray-600 mb-3" />
                    <span className="text-lg font-medium">Mitglieder</span>
                  </div>
                  <div 
                    onClick={() => {
                      setActivePage('courses');
                      setDropdownOpen(false);
                    }}
                    className="flex flex-col items-center justify-center p-6 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <Calendar className="h-12 w-12 text-gray-600 mb-3" />
                    <span className="text-lg font-medium">Kurse</span>
                  </div>
                  <div 
                    onClick={() => {
                      setActivePage('templates');
                      setDropdownOpen(false);
                    }}
                    className="flex flex-col items-center justify-center p-6 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <Calendar className="h-12 w-12 text-gray-600 mb-3" />
                    <span className="text-lg font-medium">Vorlagen</span>
                  </div>
                  <div 
                    onClick={() => {
                      setActivePage('news');
                      setDropdownOpen(false);
                    }}
                    className="flex flex-col items-center justify-center p-6 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <Newspaper className="h-12 w-12 text-gray-600 mb-3" />
                    <span className="text-lg font-medium">News</span>
                  </div>
                  <div 
                    onClick={() => {
                      navigate('/admin/workouts');
                    }}
                    className="flex flex-col items-center justify-center p-6 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <Dumbbell className="h-12 w-12 text-gray-600 mb-3" />
                    <span className="text-lg font-medium">Workouts</span>
                  </div>
                  <div 
                    onClick={() => {
                      setActivePage('codes');
                      setDropdownOpen(false);
                    }}
                    className="flex flex-col items-center justify-center p-6 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <Users className="h-12 w-12 text-gray-600 mb-3" />
                    <span className="text-lg font-medium">Codes</span>
                  </div>
                </div>
                <div className="mt-12">
                  <div 
                    onClick={() => {
                      handleLogout();
                      setDropdownOpen(false);
                    }}
                    className="flex flex-col items-center justify-center p-6 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
                  >
                    <LogOut className="h-12 w-12 text-red-600 mb-3" />
                    <span className="text-lg font-medium text-red-600">Abmelden</span>
                  </div>
                </div>
                
                {/* Close button */}
                <div className="absolute top-6 right-6">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <span className="text-xl">×</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-6">
        {renderPageContent()}
      </div>
    </div>
  );
}