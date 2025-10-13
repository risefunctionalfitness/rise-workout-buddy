import { useEffect, useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";

type TrendType = 'up' | 'down' | 'stable';

export const CancellationRateCard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRegistrations: 0,
    cancellations: 0,
    cancellationRate: 0,
    trend: 'stable' as TrendType,
  });

  useEffect(() => {
    loadCancellationStats();
  }, []);

  const loadCancellationStats = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: registrations, error } = await supabase
        .from('course_registrations')
        .select('status, registered_at')
        .gte('registered_at', thirtyDaysAgo.toISOString());

      if (error) throw error;

      const totalRegistrations = registrations?.length || 0;
      const cancellations = registrations?.filter(r => r.status === 'cancelled').length || 0;
      const cancellationRate = totalRegistrations > 0 ? (cancellations / totalRegistrations) * 100 : 0;

      // Calculate trend (last 15 days vs previous 15 days)
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      const recentRegs = registrations?.filter(r => new Date(r.registered_at) >= fifteenDaysAgo) || [];
      const olderRegs = registrations?.filter(r => new Date(r.registered_at) < fifteenDaysAgo) || [];

      const recentCancellationRate = recentRegs.length > 0
        ? (recentRegs.filter(r => r.status === 'cancelled').length / recentRegs.length) * 100
        : 0;
      const olderCancellationRate = olderRegs.length > 0
        ? (olderRegs.filter(r => r.status === 'cancelled').length / olderRegs.length) * 100
        : 0;

      let trend: TrendType = 'stable';
      if (recentCancellationRate > olderCancellationRate + 2) {
        trend = 'up';
      } else if (recentCancellationRate < olderCancellationRate - 2) {
        trend = 'down';
      }

      setStats({
        totalRegistrations,
        cancellations,
        cancellationRate: Math.round(cancellationRate),
        trend,
      });
    } catch (error) {
      console.error('Error loading cancellation stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-2 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const trendConfig = {
    up: { color: 'text-red-600', icon: TrendingUp, text: 'Steigend' },
    down: { color: 'text-green-600', icon: TrendingDown, text: 'Fallend' },
    stable: { color: 'text-muted-foreground', icon: AlertTriangle, text: 'Stabil' },
  };

  const TrendIcon = trendConfig[stats.trend].icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-primary" />
          <CardTitle>Stornierungsrate</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={stats.cancellationRate} className="h-2" />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Gesamt Anmeldungen</p>
            <p className="text-xl font-bold">{stats.totalRegistrations}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Storniert</p>
            <p className="text-xl font-bold">{stats.cancellations}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <div className={`flex items-center gap-1 text-xs ${trendConfig[stats.trend].color}`}>
          <TrendIcon className="h-3 w-3" />
          <span>{trendConfig[stats.trend].text}</span>
        </div>
      </CardFooter>
    </Card>
  );
};
