import { Card } from '@/components/ui/card';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowUp, ArrowDown, Minus, Eye, Mail, FileEdit, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { toast } from 'sonner';

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
  category: string;
}

export const AdminRiskRadar = () => {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // Load "Never Active" 21+ member details
  const { data: neverActive21Plus } = useQuery({
    queryKey: ['never-active-21-plus-details'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('never_active_member_details')
        .select('*')
        .eq('snapshot_date', today)
        .eq('category', '21+')
        .order('days_since_signup', { ascending: false });
      if (error) throw error;
      return data as NeverActiveMember[];
    },
  });

  // Load "Inactive" 21+ member details
  const { data: inactive21Plus } = useQuery({
    queryKey: ['inactive-21-plus-details'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('inactive_member_details')
        .select('*')
        .eq('snapshot_date', today)
        .eq('category', '21+')
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

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke('calculate-risk-radar-snapshot');
      
      if (error) throw error;
      
      // Invalidate all queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['never-active-snapshots'] });
      await queryClient.invalidateQueries({ queryKey: ['inactive-snapshots'] });
      await queryClient.invalidateQueries({ queryKey: ['never-active-21-plus-details'] });
      await queryClient.invalidateQueries({ queryKey: ['inactive-21-plus-details'] });
      
      toast.success('Daten wurden erfolgreich aktualisiert');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Fehler beim Aktualisieren der Daten');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (neverActiveLoading || inactiveLoading) {
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

        {/* Category Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* 0-7 Days */}
          <Card className="p-4 border-2 border-blue-200 bg-blue-50 dark:bg-blue-950/20">
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
          <Card className="p-4 border-2 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
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
          <Card className="p-4 border-2 border-orange-200 bg-orange-50 dark:bg-orange-950/20">
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
          <Card className="p-4 border-2 border-red-200 bg-red-50 dark:bg-red-950/20">
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

        {/* 21+ Members List */}
        <div>
          <h3 className="text-lg font-semibold mb-4">
            21+ Tage Nie Aktiv
          </h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {neverActive21Plus?.map((member) => (
              <Card key={member.user_id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold">{member.display_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {member.days_since_signup} Tage • {member.membership_type}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <Mail className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <FileEdit className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Card>

      {/* ===== INACTIVE DASHBOARD ===== */}
      <Card className="p-6">
        <h2 className="text-2xl font-semibold mb-6">Inaktiv</h2>

        {/* Category Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Active (<10 Days) */}
          <Card className="p-4 border-2 border-green-200 bg-green-50 dark:bg-green-950/20">
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
          <Card className="p-4 border-2 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
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
          <Card className="p-4 border-2 border-orange-200 bg-orange-50 dark:bg-orange-950/20">
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
          <Card className="p-4 border-2 border-red-200 bg-red-50 dark:bg-red-950/20">
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

        {/* 21+ Members List */}
        <div>
          <h3 className="text-lg font-semibold mb-4">
            21+ Tage Inaktiv
          </h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {inactive21Plus?.map((member) => (
              <Card key={member.user_id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold">{member.display_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {member.days_since_last_activity} Tage • {member.membership_type} • Letzte
                    Aktivität: {new Date(member.last_activity_date).toLocaleDateString('de-DE')}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <Mail className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <FileEdit className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};
