import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { UserPlus, Edit, Trash2, Search, Mail, MessageSquare, Copy } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { countryCodes, countryCodeFlags } from "@/components/CountryFlags";
import { Label } from "@/components/ui/label";
import CourseTemplateManager from "@/components/CourseTemplateManager";
import NewsManager from "@/components/NewsManager";
import { AdminCreditRecharge } from "@/components/AdminCreditRecharge";
import { GymCodeManager } from "@/components/GymCodeManager";
import { CourseParticipants } from "@/components/CourseParticipants";
import { MembershipBadge } from "@/components/MembershipBadge";
import { AdminStats } from "@/components/AdminStats";
import { RiseHeader } from "@/components/RiseHeader";
import WorkoutManagement from "./WorkoutManagement";
import AdminChallengeManager from "@/components/AdminChallengeManager";
import { AdminLeaderboard } from "@/components/AdminLeaderboard";
import AdminEmailManager from "@/components/AdminEmailManager";
import { AdminRiskRadar } from "@/components/AdminRiskRadar";
import { AdminMerchOrders } from "@/components/AdminMerchOrders";
import { AdminWebhookTester } from "@/components/AdminWebhookTester";
import { AdminWidgetBookings } from "@/components/AdminWidgetBookings";
import { AdminMonthlyStats } from "@/components/AdminMonthlyStats";

import { useToast } from "@/hooks/use-toast";

interface Member {
  id: string;
  display_name: string;
  first_name?: string;
  last_name?: string;
  access_code: string;
  user_id: string | null;
  email?: string;
  created_at: string;
  membership_type: 'Basic Member' | 'Premium Member' | 'Trainer' | 'Administrator' | 'Open Gym' | 'Wellpass' | '10er Karte';
  status: string;
  last_login_at: string | null;
  authors?: boolean;
  show_in_leaderboard?: boolean;
  notify_email_enabled?: boolean;
  notify_whatsapp_enabled?: boolean;
  phone_country_code?: string;
  phone_number?: string;
}

export default function Admin() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [newMemberFirstName, setNewMemberFirstName] = useState("");
  const [newMemberLastName, setNewMemberLastName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberCode, setNewMemberCode] = useState("");
  const [newMembershipType, setNewMembershipType] = useState("Premium Member");
  const [newMemberIsAuthor, setNewMemberIsAuthor] = useState(false);
  const [newMemberShowInLeaderboard, setNewMemberShowInLeaderboard] = useState(true);
  const [newMemberPhoneCountryCode, setNewMemberPhoneCountryCode] = useState('+49');
  const [newMemberPhoneNumber, setNewMemberPhoneNumber] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editedEmail, setEditedEmail] = useState('')
  const [editedDisplayName, setEditedDisplayName] = useState('')
  const [editedFirstName, setEditedFirstName] = useState('')
  const [editedLastName, setEditedLastName] = useState('')
  const [editedPhoneCountryCode, setEditedPhoneCountryCode] = useState('+49')
  const [editedPhoneNumber, setEditedPhoneNumber] = useState('')
  const [activePage, setActivePage] = useState<'home' | 'members' | 'courses' | 'templates' | 'news' | 'codes' | 'credits' | 'workouts' | 'challenges' | 'leaderboard' | 'emails' | 'risk-radar' | 'orders' | 'webhooks'>('home');
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMembershipType, setFilterMembershipType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalMembers, setTotalMembers] = useState(0);
  const membersPerPage = 10;
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  

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
      // Mark pending Wellpass registrations as approved when viewing members
      markWellpassRegistrationsAsApproved();
    }
  }, [activePage, isAdmin, currentPage, searchTerm, filterMembershipType, filterStatus]);

  const markWellpassRegistrationsAsApproved = async () => {
    try {
      const { error } = await supabase
        .from('wellpass_registrations')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('status', 'pending');

      if (error) {
        console.error('Error marking wellpass registrations as approved:', error);
      }
    } catch (error) {
      console.error('Error in markWellpassRegistrationsAsApproved:', error);
    }
  };

  // Read URL parameters and set active page
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && tab !== activePage) {
      setActivePage(tab as typeof activePage);
    }
  }, [location.search]);

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
          toast({
            title: "Fehler",
            description: "Keine Admin-Berechtigung",
            variant: "destructive",
          });
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

  const membershipTypes = ["Basic Member", "Premium Member", "Trainer", "Administrator", "Open Gym", "Wellpass", "10er Karte"];

  const loadMembers = async () => {
    try {
      // First update member status automatically
      await supabase.rpc('update_member_status');
      
      // Calculate offset for pagination
      const offset = (currentPage - 1) * membersPerPage;
      
      // Build query with search filter - removed email from profiles query
      let query = supabase
        .from('profiles')
        .select('id, display_name, first_name, last_name, access_code, created_at, user_id, membership_type, status, last_login_at, authors, show_in_leaderboard, notify_email_enabled, notify_whatsapp_enabled, phone_country_code, phone_number', { count: 'exact' });
      
      if (searchTerm) {
        query = query.or(`display_name.ilike.%${searchTerm}%,first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,access_code.ilike.%${searchTerm}%`);
      }
      
      if (filterMembershipType !== 'all') {
        query = query.eq('membership_type', filterMembershipType);
      }
      
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
      
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + membersPerPage - 1);

      if (error) {
        console.error('Error loading members:', error);
        toast({
          title: "Fehler",
          description: "Fehler beim Laden der Mitglieder",
          variant: "destructive",
        });
      } else {
        setMembers((data || []) as Member[]);
        setTotalMembers(count || 0);
      }
    } catch (error) {
      console.error('Error loading members:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Laden der Mitglieder",
        variant: "destructive",
      });
    }
  };

  const loadMemberEmailForEdit = async (member: Member) => {
    setEditingMember(member);
    setEditedDisplayName(member.display_name || '');
    setEditedFirstName(member.first_name || '');
    setEditedLastName(member.last_name || '');
    setEditedPhoneCountryCode(member.phone_country_code || '+49');
    setEditedPhoneNumber(member.phone_number || '');
    
    if (!member.user_id) {
      setEditedEmail('');
      setEditDialogOpen(true);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('get-member-email', {
        body: { userId: member.user_id }
      });

      if (error) {
        console.error('Error loading member email:', error);
        setEditedEmail('');
        toast({
          title: "Warnung",
          description: "E-Mail-Adresse konnte nicht geladen werden",
          variant: "destructive",
        });
      } else {
        setEditedEmail(data?.email || '');
      }
    } catch (error) {
      console.error('Error in loadMemberEmailForEdit:', error);
      setEditedEmail('');
      toast({
        title: "Warnung", 
        description: "E-Mail-Adresse konnte nicht geladen werden",
        variant: "destructive",
      });
    }
    
    setEditDialogOpen(true);
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMemberFirstName || !newMemberLastName || !newMemberEmail || !newMemberCode) {
      toast({
        title: "Fehler",
        description: "Bitte alle Felder ausfüllen",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create user via Edge Function with admin privileges
      const { data: result, error: functionError } = await supabase.functions.invoke('create-member', {
        body: {
          email: newMemberEmail,
          password: newMemberCode,
          user_metadata: {
            display_name: newMemberFirstName, // Vorname wird als display_name verwendet
            first_name: newMemberFirstName,
            last_name: newMemberLastName,
            access_code: newMemberCode,
            membership_type: newMembershipType,
            authors: newMemberIsAuthor,
            show_in_leaderboard: newMemberShowInLeaderboard,
            phone_country_code: newMemberPhoneNumber ? newMemberPhoneCountryCode : null,
            phone_number: newMemberPhoneNumber || null
          }
        }
      });

      if (functionError || !result?.success) {
        console.error('Error creating member:', functionError || result?.error);
        toast({
          title: "Fehler",
          description: "Fehler beim Erstellen des Mitglieds",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Mitglied erstellt",
          description: (
            <div className="flex flex-col gap-2">
              <span>{newMemberFirstName} kann sich jetzt anmelden!</span>
              <Button
                size="sm"
                variant="outline"
                className="w-fit"
                onClick={() => {
                  const text = `Hallo ${newMemberFirstName},\n\nDeine Rise-Zugangsdaten:\nE-Mail: ${newMemberEmail}\nPasswort: ${newMemberCode}\n\nApp: https://rise-ff.lovable.app`;
                  navigator.clipboard.writeText(text);
                  toast({ title: "Kopiert!" });
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Zugangsdaten kopieren
              </Button>
            </div>
          ),
        });
        setNewMemberFirstName("");
        setNewMemberLastName("");
        setNewMemberEmail("");
        setNewMemberCode("");
        setNewMembershipType("Premium Member");
        setNewMemberIsAuthor(false);
        setNewMemberShowInLeaderboard(true);
        setNewMemberPhoneCountryCode('+49');
        setNewMemberPhoneNumber('');
        setDialogOpen(false);
        setCurrentPage(1);
        loadMembers();
      }
    } catch (error) {
      console.error('Error creating member:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Erstellen des Mitglieds",
        variant: "destructive",
      });
    }
  };

  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingMember) return;

    setLoading(true);
    try {
      const hasEmailChanged = editedEmail !== editingMember.email;

      // If email changed, use the edge function to update it in auth.users
      if (hasEmailChanged && editingMember.user_id && editedEmail) {
        const { error: emailError } = await supabase.functions.invoke('update-member-email', {
          body: { 
            userId: editingMember.user_id,
            newEmail: editedEmail 
          }
        });

        if (emailError) {
          console.error('Error updating email:', emailError);
          toast({
            title: "Fehler",
            description: "Fehler beim Aktualisieren der E-Mail",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      // Update profile data (display_name, first_name, last_name, membership_type, authors, phone, etc.)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          display_name: `${editedFirstName} ${editedLastName}`.trim() || editedFirstName || editedLastName,
          first_name: editedFirstName,
          last_name: editedLastName,
          email: editedEmail,
          access_code: editingMember.access_code,
          membership_type: editingMember.membership_type,
          authors: editingMember.authors,
          show_in_leaderboard: editingMember.show_in_leaderboard ?? true,
          phone_country_code: editedPhoneNumber ? editedPhoneCountryCode : null,
          phone_number: editedPhoneNumber || null,
          notify_whatsapp_enabled: editedPhoneNumber ? true : false
        })
        .eq('user_id', editingMember.user_id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        toast({
          title: "Fehler",
          description: "Fehler beim Aktualisieren des Profils",
          variant: "destructive",
        });
        return;
      }

      // Handle "10er Karte" membership credits
      if (editingMember.membership_type === '10er Karte') {
        const { data: existingCredits } = await supabase
          .from('membership_credits')
          .select('id')
          .eq('user_id', editingMember.user_id)
          .maybeSingle();

        if (!existingCredits) {
          const { error: creditsError } = await supabase
            .from('membership_credits')
            .insert({
              user_id: editingMember.user_id,
              credits_remaining: 0,
              credits_total: 0
            });

          if (creditsError) {
            console.error('Error creating credits entry:', creditsError);
            toast({
              title: "Warnung",
              description: "Mitgliedschaft aktualisiert, aber Credits-Eintrag konnte nicht erstellt werden",
              variant: "destructive",
            });
          }
        }
      }

      // Update the auth password to match the new access code
      if (editingMember.access_code) {
        const { error: accessCodeError } = await supabase.functions.invoke('update-access-code', {
          body: { 
            newAccessCode: editingMember.access_code,
            targetUserId: editingMember.user_id
          }
        });

        if (accessCodeError) {
          console.error('Access code update error:', accessCodeError);
          toast({
            title: "Warnung",
            description: "Profil aktualisiert, aber Zugangscode-Synchronisation fehlgeschlagen",
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Erfolg",
        description: "Mitglied erfolgreich aktualisiert",
      });
      setEditDialogOpen(false);
      setEditingMember(null);
      setEditedFirstName('');
      setEditedLastName('');
      setEditedEmail('');
      loadMembers();
    } catch (error) {
      console.error('Error in handleEditMember:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Aktualisieren des Mitglieds",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
          toast({
            title: "Fehler",
            description: "Fehler beim Löschen des Mitglieds",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erfolg",
            description: "Mitglied erfolgreich gelöscht",
          });
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
        toast({
          title: "Fehler",
          description: "Fehler beim Löschen des Mitglieds",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erfolg",
          description: "Mitglied und Account erfolgreich gelöscht",
        });
        setCurrentPage(1);
        loadMembers();
      }
    } catch (error) {
      console.error('Error deleting member:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Löschen des Mitglieds",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({
          title: "Fehler",
          description: "Fehler beim Abmelden",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erfolg",
          description: "Erfolgreich abgemeldet",
        });
        navigate("/");
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Abmelden",
        variant: "destructive",
      });
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
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
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
                <Select value={filterMembershipType} onValueChange={(v) => { setFilterMembershipType(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Mitgliedschaft" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Typen</SelectItem>
                    {membershipTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Status</SelectItem>
                    <SelectItem value="active">Aktiv</SelectItem>
                    <SelectItem value="inactive">Inaktiv</SelectItem>
                  </SelectContent>
                </Select>
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
                     <div className="grid grid-cols-2 gap-2">
                       <Input
                         placeholder="Vorname"
                         value={newMemberFirstName}
                         onChange={(e) => setNewMemberFirstName(e.target.value)}
                         required
                       />
                       <Input
                         placeholder="Nachname"
                         value={newMemberLastName}
                         onChange={(e) => setNewMemberLastName(e.target.value)}
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
                       <div className="flex gap-2">
                         <Input
                           placeholder="Zugangscode (z.B. 123456)"
                           value={newMemberCode}
                           onChange={(e) => setNewMemberCode(e.target.value)}
                           required
                         />
                         <Button
                           type="button"
                           variant="outline"
                           onClick={() => {
                             const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
                             setNewMemberCode(randomCode);
                           }}
                         >
                           Generieren
                         </Button>
                       </div>
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
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="leaderboard-checkbox"
                        checked={newMemberShowInLeaderboard}
                        onChange={(e) => setNewMemberShowInLeaderboard(e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor="leaderboard-checkbox" className="text-sm">
                        Im Leaderboard anzeigen
                      </label>
                    </div>
                    <div className="space-y-2">
                      <Label>Telefon (optional)</Label>
                      <div className="flex gap-2">
                        <Select value={newMemberPhoneCountryCode} onValueChange={setNewMemberPhoneCountryCode}>
                          <SelectTrigger className="w-[110px]">
                            <SelectValue>
                              <span className="flex items-center gap-2">
                                {(() => {
                                  const FlagComponent = countryCodeFlags[newMemberPhoneCountryCode]
                                  return FlagComponent ? <FlagComponent /> : null
                                })()}
                                <span>{newMemberPhoneCountryCode}</span>
                              </span>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-background">
                            {countryCodes.map((cc) => {
                              const FlagComponent = countryCodeFlags[cc.code]
                              return (
                                <SelectItem key={cc.code} value={cc.code}>
                                  <span className="flex items-center gap-2">
                                    {FlagComponent ? <FlagComponent /> : null}
                                    <span>{cc.code}</span>
                                  </span>
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                        <Input
                          type="tel"
                          inputMode="numeric"
                          placeholder="15730440756"
                          value={newMemberPhoneNumber}
                          onChange={(e) => setNewMemberPhoneNumber(e.target.value.replace(/[^\d]/g, ''))}
                          className="flex-1"
                        />
                      </div>
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
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Vorname"
                            value={editedFirstName}
                            onChange={(e) => setEditedFirstName(e.target.value)}
                            required
                          />
                          <Input
                            placeholder="Nachname"
                            value={editedLastName}
                            onChange={(e) => setEditedLastName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Input
                            type="email"
                            placeholder="E-Mail Adresse"
                            value={editedEmail}
                            onChange={(e) => setEditedEmail(e.target.value)}
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
                       <div className="flex items-center space-x-2">
                         <input
                           type="checkbox"
                           id="edit-leaderboard-checkbox"
                           checked={editingMember.show_in_leaderboard ?? true}
                           onChange={(e) => setEditingMember({
                             ...editingMember,
                             show_in_leaderboard: e.target.checked
                           })}
                           className="rounded"
                         />
                         <label htmlFor="edit-leaderboard-checkbox" className="text-sm">
                           Im Leaderboard anzeigen
                         </label>
                       </div>
                       <div className="space-y-2">
                         <Label>Telefon (optional)</Label>
                         <div className="flex gap-2">
                           <Select value={editedPhoneCountryCode} onValueChange={setEditedPhoneCountryCode}>
                             <SelectTrigger className="w-[110px]">
                               <SelectValue>
                                 <span className="flex items-center gap-2">
                                   {(() => {
                                     const FlagComponent = countryCodeFlags[editedPhoneCountryCode]
                                     return FlagComponent ? <FlagComponent /> : null
                                   })()}
                                   <span>{editedPhoneCountryCode}</span>
                                 </span>
                               </SelectValue>
                             </SelectTrigger>
                             <SelectContent className="bg-background">
                               {countryCodes.map((cc) => {
                                 const FlagComponent = countryCodeFlags[cc.code]
                                 return (
                                   <SelectItem key={cc.code} value={cc.code}>
                                     <span className="flex items-center gap-2">
                                       {FlagComponent ? <FlagComponent /> : null}
                                       <span>{cc.code}</span>
                                     </span>
                                   </SelectItem>
                                 )
                               })}
                             </SelectContent>
                           </Select>
                           <Input
                             type="tel"
                             inputMode="numeric"
                             placeholder="15730440756"
                             value={editedPhoneNumber}
                             onChange={(e) => setEditedPhoneNumber(e.target.value.replace(/[^\d]/g, ''))}
                             className="flex-1"
                           />
                         </div>
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
                          <h3 className="font-medium text-sm">
                            {member.first_name && member.last_name 
                              ? `${member.first_name} ${member.last_name}` 
                              : member.display_name}
                          </h3>
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
                             const name = member.first_name || member.display_name || '';
                             const text = `Hallo ${name},\n\nDeine Rise-Zugangsdaten:\nE-Mail: ${member.email || ''}\nPasswort: ${member.access_code}\n\nApp: https://rise-ff.lovable.app`;
                             navigator.clipboard.writeText(text);
                             toast({ title: "Kopiert!" });
                           }}
                         >
                           <Copy className="h-3 w-3" />
                         </Button>
                         <Button
                           variant="outline"
                           size="sm"
                           className="text-xs px-2 py-1 h-8"
                           onClick={() => loadMemberEmailForEdit(member)}
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
                        <MembershipBadge type={member.membership_type as any} />
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
                      <TableHead>Benachrichtigung</TableHead>
                      <TableHead>Erstellt am</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Letzter Login</TableHead>
                      <TableHead>Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {members.map((member) => (
                     <TableRow key={member.id}>
                          <TableCell className="font-medium">
                            {member.first_name && member.last_name 
                              ? `${member.first_name} ${member.last_name}` 
                              : member.display_name}
                          </TableCell>
                        <TableCell>{member.access_code}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MembershipBadge type={member.membership_type as any} />
                          {member.authors && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-50 text-purple-700 border border-purple-200">
                              Autor
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {member.notify_email_enabled !== false && (
                            <Mail className="h-4 w-4 text-foreground" />
                          )}
                          {member.notify_whatsapp_enabled && member.phone_number && (
                            <MessageSquare className="h-4 w-4 text-foreground" />
                          )}
                          {member.notify_email_enabled === false && !(member.notify_whatsapp_enabled && member.phone_number) && (
                            <span className="text-xs text-muted-foreground">-</span>
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
                               const name = member.first_name || member.display_name || '';
                               const text = `Hallo ${name},\n\nDeine Rise-Zugangsdaten:\nE-Mail: ${member.email || ''}\nPasswort: ${member.access_code}\n\nApp: https://rise-ff.lovable.app`;
                               navigator.clipboard.writeText(text);
                               toast({ title: "Kopiert!" });
                             }}
                           >
                             <Copy className="h-4 w-4" />
                           </Button>
                           <Button 
                             variant="outline" 
                             size="sm"
                             onClick={() => loadMemberEmailForEdit(member)}
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
        return (
          <div className="space-y-6">
            <AdminMonthlyStats />
            <AdminWidgetBookings />
            <AdminStats />
          </div>
        );
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
      case 'credits':
        return <AdminCreditRecharge />;
      case 'workouts':
        return <WorkoutManagement hideHeader />;
      case 'challenges':
        return <AdminChallengeManager />;
      case 'leaderboard':
        return <AdminLeaderboard />;
      case 'emails':
        return <AdminEmailManager />;
      case 'risk-radar':
        return <AdminRiskRadar />;
      case 'orders':
        return <AdminMerchOrders />;
      case 'webhooks':
        return <AdminWebhookTester />;
      default:
        return <AdminStats />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <RiseHeader 
        showAdminAccess={true}
        onLogout={handleLogout}
        activePage={activePage}
        onPageChange={(page) => setActivePage(page as 'home' | 'members' | 'courses' | 'templates' | 'news' | 'codes' | 'credits' | 'workouts' | 'challenges' | 'leaderboard' | 'emails' | 'risk-radar' | 'orders' | 'webhooks')}
      />
      
      <div className="container mx-auto px-4 py-6">
        {renderPageContent()}
      </div>
    </div>
  );
}