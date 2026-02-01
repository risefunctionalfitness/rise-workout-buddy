import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function AdminMonthlyStats() {
  const [currentMonthEntries, setCurrentMonthEntries] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;

      const { data: leaderboardData } = await supabase
        .from('leaderboard_entries')
        .select('training_count')
        .eq('year', currentYear)
        .eq('month', currentMonth);

      const total = leaderboardData?.reduce((sum, entry) => sum + (entry.training_count || 0), 0) || 0;
      setCurrentMonthEntries(total);
    } catch (error) {
      console.error('Error loading monthly stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse flex items-center">
            <div className="h-8 w-8 bg-muted rounded" />
            <div className="ml-4 space-y-2">
              <div className="h-4 bg-muted rounded w-40" />
              <div className="h-6 bg-muted rounded w-16" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center">
          <Calendar className="h-8 w-8 text-primary" />
          <div className="ml-4">
            <p className="text-sm font-medium text-muted-foreground">Anmeldungen diesen Monat</p>
            <p className="text-2xl font-bold">{currentMonthEntries}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
