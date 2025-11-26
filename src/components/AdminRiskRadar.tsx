import { Card } from '@/components/ui/card';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowUp, ArrowDown, Minus, Eye, Mail, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { MemberStatsDialog } from './MemberStatsDialog';

interface NeverActiveSnapshot {
  snapshot_date: string;
  days_0_7_count: number;
  days_8_14_count: number;
  days_15_21_count: number;
  days_21_plus_count: number;
  total_never_active: number;
  days_0_7_percentage: number;
  days_8_14_percentage: number;
  days_15_21_percentage: number;
  days_21_plus_percentage: number;
}

interface InactiveSnapshot {
  snapshot_date: string;
  active_under_10_count: number;
  days_10_15_count: number;
  days_15_21_count: number;
  days_21_plus_count: number;
  total_previously_active: number;
  active_under_10_percentage: number;
  days_10_15_percentage: number;
  days_15_21_percentage: number;
  days_21_plus_percentage: number;
}

interface NeverActiveMember {
  user_id: string;
  display_name: string;
  membership_type: string;
  days_since_signup: number;
  category: string;
}

interface InactiveMember {
  user_id: string;
  display_name: string;
  membership_type: string;
  days_since_last_activity: number;
  last_activity_date: string;
  total_bookings: number;
  total_training_sessions: number;
  category: string;
}

export const AdminRiskRadar = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{ userId: string; displayName: string } | null>(null);
  const [emailQueue, setEmailQueue] = useState<Set<string>>(new Set());
  const [selectedNeverActiveCategory, setSelectedNeverActiveCategory] = useState<string | null>(null);
  const [selectedInactiveCategory, setSelectedInactiveCategory] = useState<string | null>(null);

  // Load last 30 snapshots for "Never Active"
  const { data: neverActiveSnapshots, isLoading: neverActiveLoading } = useQuery({
    queryKey: ['never-active-snapshots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('never_active_snapshots')
        .select('*')
        .order('snapshot_date', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data.reverse() as NeverActiveSnapshot[];
    },
  });

  // Load last 30 snapshots for "Inactive"
  const { data: inactiveSnapshots, isLoading: inactiveLoading } = useQuery({
    queryKey: ['inactive-snapshots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inactive_member_snapshots')
        .select('*')
        .order('snapshot_date', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data.reverse() as InactiveSnapshot[];
    },
  });

  // Fetch all never active members for filtering
  const { data: allNeverActiveMembers, isLoading: neverActiveMembersLoading } = useQuery({
    queryKey: ['never-active-members-all'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('never_active_member_details')
        .select('*')
        .eq('snapshot_date', today)
        .order('days_since_signup', { ascending: false });
      if (error) throw error;
      return data as NeverActiveMember[];
    },
  });

  // Fetch all inactive members for filtering
  const { data: allInactiveMembers, isLoading: inactiveMembersLoading } = useQuery({
    queryKey: ['inactive-members-all'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('inactive_member_details')
        .select('*')
        .eq('snapshot_date', today)
        .order('days_since_last_activity', { ascending: false });
      if (error) throw error;
      return data as InactiveMember[];
    },
  });

  const latestNeverActive = neverActiveSnapshots?.[neverActiveSnapshots.length - 1];
  const previousNeverActive = neverActiveSnapshots?.[neverActiveSnapshots.length - 2];

  const latestInactive = inactiveSnapshots?.[inactiveSnapshots.length - 1];
  const previousInactive = inactiveSnapshots?.[inactiveSnapshots.length - 2];

  const calculateChange = (current: number, previous: number) => {
    if (!previous) return 0;
    return current - previous;
  };

  const renderChangeIndicator = (change: number) => {
    if (change > 0) return <ArrowUp className="h-4 w-4 text-red-500" />;
    if (change < 0) return <ArrowDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const handleAddToEmailQueue = (userId: string, displayName: string) => {
    if (emailQueue.has(userId)) {
      toast.info(`${displayName} ist bereits in der E-Mail-Liste`);
      return;
    }
    
    setEmailQueue(prev => new Set(prev).add(userId));
    toast.success(`${displayName} zur E-Mail-Liste hinzugefügt ✓`);
  };

  const handleRemoveFromQueue = (userId: string) => {
    setEmailQueue(prev => {
      const newSet = new Set(prev);
      newSet.delete(userId);
      return newSet;
    });
  };

  const handleClearQueue = () => {
    setEmailQueue(new Set());
    toast.info("E-Mail-Liste geleert");
  };

  const handleSendEmails = () => {
    const userIds = Array.from(emailQueue).join(',');
    navigate(`/admin?tab=emails&userIds=${userIds}`);
  };

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke('calculate-risk-radar-snapshot');
      
      if (error) throw error;
      
      // Invalidate all queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['never-active-snapshots'] });
      await queryClient.invalidateQueries({ queryKey: ['inactive-snapshots'] });
      await queryClient.invalidateQueries({ queryKey: ['never-active-members-all'] });
      await queryClient.invalidateQueries({ queryKey: ['inactive-members-all'] });
      
      toast.success('Daten wurden erfolgreich aktualisiert');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Fehler beim Aktualisieren der Daten');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter members based on selected categories
  const filteredNeverActiveMembers = allNeverActiveMembers?.filter(m => {
    if (!selectedNeverActiveCategory) return false;
    const categoryMap: Record<string, string> = {
      'days_0_7': '0-7',
      'days_8_14': '8-14',
      'days_15_21': '15-21',
      'days_21_plus': '21+'
    };
    return m.category === categoryMap[selectedNeverActiveCategory];
  }) || [];

  const filteredInactiveMembers = allInactiveMembers?.filter(m => {
    if (!selectedInactiveCategory) return false;
    const categoryMap: Record<string, string> = {
      'active_under_10': 'active',
      'days_10_15': '10-15',
      'days_15_21': '15-21',
      'days_21_plus': '21+'
    };
    return m.category === categoryMap[selectedInactiveCategory];
  }) || [];

  // Get member names from queue
  const queuedMemberNames = Array.from(emailQueue).map(userId => {
    const neverActive = allNeverActiveMembers?.find(m => m.user_id === userId);
    const inactive = allInactiveMembers?.find(m => m.user_id === userId);
    return (neverActive?.display_name || inactive?.display_name || 'Unbekannt').split(' ')[0];
  });

  if (neverActiveLoading || inactiveLoading || neverActiveMembersLoading || inactiveMembersLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[600px] w-full" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Risk Radar</h1>
          <p className="text-sm text-muted-foreground mt-1">Mitglieder-Aktivität und Engagement-Tracking</p>
        </div>
        <Button 
          onClick={handleRefreshData} 
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Wird aktualisiert...' : 'Daten aktualisieren'}
        </Button>
      </div>

      {/* ===== NEVER ACTIVE DASHBOARD ===== */}
      <Card className="p-6">
        <h2 className="text-2xl font-semibold mb-6">Nie Aktiv</h2>

        {/* Category Cards - Clickable */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* 0-7 Days */}
          <Card 
            className={`p-4 border-2 border-blue-200 bg-blue-50 dark:bg-blue-950/20 cursor-pointer transition-all hover:scale-105 ${
              selectedNeverActiveCategory === 'days_0_7' ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedNeverActiveCategory(
              selectedNeverActiveCategory === 'days_0_7' ? null : 'days_0_7'
            )}
          >
            <div className="text-sm text-muted-foreground mb-2">0-7 Tage</div>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {latestNeverActive?.days_0_7_count || 0}
            </div>
            <div className="text-sm text-muted-foreground">
              {latestNeverActive?.days_0_7_percentage?.toFixed(1) || 0}%
            </div>
            <div className="flex items-center gap-1 mt-2">
              {renderChangeIndicator(
                calculateChange(
                  latestNeverActive?.days_0_7_count || 0,
                  previousNeverActive?.days_0_7_count || 0
                )
              )}
              <span className="text-sm">
                {calculateChange(
                  latestNeverActive?.days_0_7_count || 0,
                  previousNeverActive?.days_0_7_count || 0
                ) > 0 && '+'}
                {calculateChange(
                  latestNeverActive?.days_0_7_count || 0,
                  previousNeverActive?.days_0_7_count || 0
                )}
              </span>
            </div>
          </Card>

          {/* 8-14 Days */}
          <Card 
            className={`p-4 border-2 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 cursor-pointer transition-all hover:scale-105 ${
              selectedNeverActiveCategory === 'days_8_14' ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedNeverActiveCategory(
              selectedNeverActiveCategory === 'days_8_14' ? null : 'days_8_14'
            )}
          >
            <div className="text-sm text-muted-foreground mb-2">8-14 Tage</div>
            <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
              {latestNeverActive?.days_8_14_count || 0}
            </div>
            <div className="text-sm text-muted-foreground">
              {latestNeverActive?.days_8_14_percentage?.toFixed(1) || 0}%
            </div>
            <div className="flex items-center gap-1 mt-2">
              {renderChangeIndicator(
                calculateChange(
                  latestNeverActive?.days_8_14_count || 0,
                  previousNeverActive?.days_8_14_count || 0
                )
              )}
              <span className="text-sm">
                {calculateChange(
                  latestNeverActive?.days_8_14_count || 0,
                  previousNeverActive?.days_8_14_count || 0
                ) > 0 && '+'}
                {calculateChange(
                  latestNeverActive?.days_8_14_count || 0,
                  previousNeverActive?.days_8_14_count || 0
                )}
              </span>
            </div>
          </Card>

          {/* 15-21 Days */}
          <Card 
            className={`p-4 border-2 border-orange-200 bg-orange-50 dark:bg-orange-950/20 cursor-pointer transition-all hover:scale-105 ${
              selectedNeverActiveCategory === 'days_15_21' ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedNeverActiveCategory(
              selectedNeverActiveCategory === 'days_15_21' ? null : 'days_15_21'
            )}
          >
            <div className="text-sm text-muted-foreground mb-2">15-21 Tage</div>
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              {latestNeverActive?.days_15_21_count || 0}
            </div>
            <div className="text-sm text-muted-foreground">
              {latestNeverActive?.days_15_21_percentage?.toFixed(1) || 0}%
            </div>
            <div className="flex items-center gap-1 mt-2">
              {renderChangeIndicator(
                calculateChange(
                  latestNeverActive?.days_15_21_count || 0,
                  previousNeverActive?.days_15_21_count || 0
                )
              )}
              <span className="text-sm">
                {calculateChange(
                  latestNeverActive?.days_15_21_count || 0,
                  previousNeverActive?.days_15_21_count || 0
                ) > 0 && '+'}
                {calculateChange(
                  latestNeverActive?.days_15_21_count || 0,
                  previousNeverActive?.days_15_21_count || 0
                )}
              </span>
            </div>
          </Card>

          {/* 21+ Days */}
          <Card 
            className={`p-4 border-2 border-red-200 bg-red-50 dark:bg-red-950/20 cursor-pointer transition-all hover:scale-105 ${
              selectedNeverActiveCategory === 'days_21_plus' ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedNeverActiveCategory(
              selectedNeverActiveCategory === 'days_21_plus' ? null : 'days_21_plus'
            )}
          >
            <div className="text-sm text-muted-foreground mb-2">21+ Tage</div>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">
              {latestNeverActive?.days_21_plus_count || 0}
            </div>
            <div className="text-sm text-muted-foreground">
              {latestNeverActive?.days_21_plus_percentage?.toFixed(1) || 0}%
            </div>
            <div className="flex items-center gap-1 mt-2">
              {renderChangeIndicator(
                calculateChange(
                  latestNeverActive?.days_21_plus_count || 0,
                  previousNeverActive?.days_21_plus_count || 0
                )
              )}
              <span className="text-sm">
                {calculateChange(
                  latestNeverActive?.days_21_plus_count || 0,
                  previousNeverActive?.days_21_plus_count || 0
                ) > 0 && '+'}
                {calculateChange(
                  latestNeverActive?.days_21_plus_count || 0,
                  previousNeverActive?.days_21_plus_count || 0
                )}
              </span>
            </div>
          </Card>
        </div>

        {/* Trend Chart */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">30-Tage-Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={neverActiveSnapshots}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="snapshot_date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="days_0_7_count" stroke="#3b82f6" name="0-7 Tage" />
              <Line type="monotone" dataKey="days_8_14_count" stroke="#eab308" name="8-14 Tage" />
              <Line type="monotone" dataKey="days_15_21_count" stroke="#f97316" name="15-21 Tage" />
              <Line type="monotone" dataKey="days_21_plus_count" stroke="#ef4444" name="21+ Tage" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Member List - shown when category is selected */}
        {selectedNeverActiveCategory && (
          <div>
            <h3 className="text-lg font-semibold mb-4">
              Mitglieder: {
                selectedNeverActiveCategory === 'days_0_7' ? '0-7 Tage' :
                selectedNeverActiveCategory === 'days_8_14' ? '8-14 Tage' :
                selectedNeverActiveCategory === 'days_15_21' ? '15-21 Tage' : '21+ Tage'
              } Nie Aktiv
            </h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredNeverActiveMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Keine Mitglieder in dieser Kategorie</p>
              ) : (
                filteredNeverActiveMembers.map((member) => (
                  <Card key={member.user_id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{member.display_name || 'Unbekannt'}</div>
                      <div className="text-sm text-muted-foreground">
                        {member.days_since_signup} Tage seit Anmeldung • {member.membership_type || 'N/A'}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setSelectedMember({ userId: member.user_id, displayName: member.display_name || 'Unbekannt' })}
                        title="Statistiken anzeigen"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant={emailQueue.has(member.user_id) ? "default" : "ghost"}
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleAddToEmailQueue(member.user_id, member.display_name || 'Unbekannt')}
                        title="Zur E-Mail-Liste hinzufügen"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
      </Card>

      {/* ===== INACTIVE DASHBOARD ===== */}
      <Card className="p-6">
        <h2 className="text-2xl font-semibold mb-6">Inaktiv</h2>

        {/* Category Cards - Clickable */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Active (<10 Days) */}
          <Card 
            className={`p-4 border-2 border-green-200 bg-green-50 dark:bg-green-950/20 cursor-pointer transition-all hover:scale-105 ${
              selectedInactiveCategory === 'active_under_10' ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedInactiveCategory(
              selectedInactiveCategory === 'active_under_10' ? null : 'active_under_10'
            )}
          >
            <div className="text-sm text-muted-foreground mb-2">Aktiv</div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {latestInactive?.active_under_10_count || 0}
            </div>
            <div className="text-sm text-muted-foreground">
              {latestInactive?.active_under_10_percentage?.toFixed(1) || 0}%
            </div>
            <div className="flex items-center gap-1 mt-2">
              {renderChangeIndicator(
                calculateChange(
                  latestInactive?.active_under_10_count || 0,
                  previousInactive?.active_under_10_count || 0
                )
              )}
              <span className="text-sm">
                {calculateChange(
                  latestInactive?.active_under_10_count || 0,
                  previousInactive?.active_under_10_count || 0
                ) > 0 && '+'}
                {calculateChange(
                  latestInactive?.active_under_10_count || 0,
                  previousInactive?.active_under_10_count || 0
                )}
              </span>
            </div>
          </Card>

          {/* 10-15 Days */}
          <Card 
            className={`p-4 border-2 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 cursor-pointer transition-all hover:scale-105 ${
              selectedInactiveCategory === 'days_10_15' ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedInactiveCategory(
              selectedInactiveCategory === 'days_10_15' ? null : 'days_10_15'
            )}
          >
            <div className="text-sm text-muted-foreground mb-2">10-15 Tage</div>
            <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
              {latestInactive?.days_10_15_count || 0}
            </div>
            <div className="text-sm text-muted-foreground">
              {latestInactive?.days_10_15_percentage?.toFixed(1) || 0}%
            </div>
            <div className="flex items-center gap-1 mt-2">
              {renderChangeIndicator(
                calculateChange(
                  latestInactive?.days_10_15_count || 0,
                  previousInactive?.days_10_15_count || 0
                )
              )}
              <span className="text-sm">
                {calculateChange(
                  latestInactive?.days_10_15_count || 0,
                  previousInactive?.days_10_15_count || 0
                ) > 0 && '+'}
                {calculateChange(
                  latestInactive?.days_10_15_count || 0,
                  previousInactive?.days_10_15_count || 0
                )}
              </span>
            </div>
          </Card>

          {/* 15-21 Days */}
          <Card 
            className={`p-4 border-2 border-orange-200 bg-orange-50 dark:bg-orange-950/20 cursor-pointer transition-all hover:scale-105 ${
              selectedInactiveCategory === 'days_15_21' ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedInactiveCategory(
              selectedInactiveCategory === 'days_15_21' ? null : 'days_15_21'
            )}
          >
            <div className="text-sm text-muted-foreground mb-2">15-21 Tage</div>
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              {latestInactive?.days_15_21_count || 0}
            </div>
            <div className="text-sm text-muted-foreground">
              {latestInactive?.days_15_21_percentage?.toFixed(1) || 0}%
            </div>
            <div className="flex items-center gap-1 mt-2">
              {renderChangeIndicator(
                calculateChange(
                  latestInactive?.days_15_21_count || 0,
                  previousInactive?.days_15_21_count || 0
                )
              )}
              <span className="text-sm">
                {calculateChange(
                  latestInactive?.days_15_21_count || 0,
                  previousInactive?.days_15_21_count || 0
                ) > 0 && '+'}
                {calculateChange(
                  latestInactive?.days_15_21_count || 0,
                  previousInactive?.days_15_21_count || 0
                )}
              </span>
            </div>
          </Card>

          {/* 21+ Days */}
          <Card 
            className={`p-4 border-2 border-red-200 bg-red-50 dark:bg-red-950/20 cursor-pointer transition-all hover:scale-105 ${
              selectedInactiveCategory === 'days_21_plus' ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedInactiveCategory(
              selectedInactiveCategory === 'days_21_plus' ? null : 'days_21_plus'
            )}
          >
            <div className="text-sm text-muted-foreground mb-2">21+ Tage</div>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">
              {latestInactive?.days_21_plus_count || 0}
            </div>
            <div className="text-sm text-muted-foreground">
              {latestInactive?.days_21_plus_percentage?.toFixed(1) || 0}%
            </div>
            <div className="flex items-center gap-1 mt-2">
              {renderChangeIndicator(
                calculateChange(
                  latestInactive?.days_21_plus_count || 0,
                  previousInactive?.days_21_plus_count || 0
                )
              )}
              <span className="text-sm">
                {calculateChange(
                  latestInactive?.days_21_plus_count || 0,
                  previousInactive?.days_21_plus_count || 0
                ) > 0 && '+'}
                {calculateChange(
                  latestInactive?.days_21_plus_count || 0,
                  previousInactive?.days_21_plus_count || 0
                )}
              </span>
            </div>
          </Card>
        </div>

        {/* Trend Chart */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">30-Tage-Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={inactiveSnapshots}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="snapshot_date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="active_under_10_count" stroke="#22c55e" name="Aktiv" />
              <Line type="monotone" dataKey="days_10_15_count" stroke="#eab308" name="10-15 Tage" />
              <Line type="monotone" dataKey="days_15_21_count" stroke="#f97316" name="15-21 Tage" />
              <Line type="monotone" dataKey="days_21_plus_count" stroke="#ef4444" name="21+ Tage" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Member List - shown when category is selected */}
        {selectedInactiveCategory && (
          <div>
            <h3 className="text-lg font-semibold mb-4">
              Mitglieder: {
                selectedInactiveCategory === 'active_under_10' ? 'Aktiv (<10 Tage)' :
                selectedInactiveCategory === 'days_10_15' ? '10-15 Tage' :
                selectedInactiveCategory === 'days_15_21' ? '15-21 Tage' : '21+ Tage'
              } Inaktiv
            </h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredInactiveMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Keine Mitglieder in dieser Kategorie</p>
              ) : (
                filteredInactiveMembers.map((member) => (
                  <Card key={member.user_id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{member.display_name || 'Unbekannt'}</div>
                      <div className="text-sm text-muted-foreground">
                        {member.days_since_last_activity} Tage seit letzter Aktivität • {member.membership_type || 'N/A'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {member.total_bookings} Buchungen • {member.total_training_sessions} Trainings
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setSelectedMember({ userId: member.user_id, displayName: member.display_name || 'Unbekannt' })}
                        title="Statistiken anzeigen"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant={emailQueue.has(member.user_id) ? "default" : "ghost"}
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleAddToEmailQueue(member.user_id, member.display_name || 'Unbekannt')}
                        title="Zur E-Mail-Liste hinzufügen"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Email Queue Floating Button */}
      {emailQueue.size > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <Card className="shadow-lg">
            <div className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="font-semibold text-sm mb-1">E-Mail-Liste ({emailQueue.size})</div>
                  <div className="text-xs text-muted-foreground max-w-xs truncate">
                    {queuedMemberNames.join(', ')}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleClearQueue}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSendEmails}
                  >
                    E-Mails senden →
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {selectedMember && (
        <MemberStatsDialog
          userId={selectedMember.userId}
          displayName={selectedMember.displayName}
          isOpen={!!selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </div>
  );
};
