import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function AdminMonthlyRegistrations() {
  const [currentMonthCount, setCurrentMonthCount] = useState(0);
  const [lastMonthCount, setLastMonthCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      
      // Previous month calculation
      const lastMonthDate = new Date(currentDate);
      lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
      const lastMonthYear = lastMonthDate.getFullYear();
      const lastMonth = lastMonthDate.getMonth() + 1;

      // Get current month training count
      const { data: currentData } = await supabase
        .from('leaderboard_entries')
        .select('training_count')
        .eq('year', currentYear)
        .eq('month', currentMonth);

      const currentTotal = currentData?.reduce((sum, entry) => sum + (entry.training_count || 0), 0) || 0;

      // Get last month training count
      const { data: lastData } = await supabase
        .from('leaderboard_entries')
        .select('training_count')
        .eq('year', lastMonthYear)
        .eq('month', lastMonth);

      const lastTotal = lastData?.reduce((sum, entry) => sum + (entry.training_count || 0), 0) || 0;

      setCurrentMonthCount(currentTotal);
      setLastMonthCount(lastTotal);
    } catch (error) {
      console.error('Error loading monthly stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendInfo = () => {
    if (lastMonthCount === 0) return { icon: Minus, color: "text-muted-foreground", text: "Keine Daten vom Vormonat" };
    
    const diff = currentMonthCount - lastMonthCount;
    const percentChange = Math.round((diff / lastMonthCount) * 100);
    
    if (diff > 0) {
      return { 
        icon: TrendingUp, 
        color: "text-green-500", 
        text: `+${percentChange}% vs. Vormonat` 
      };
    } else if (diff < 0) {
      return { 
        icon: TrendingDown, 
        color: "text-red-500", 
        text: `${percentChange}% vs. Vormonat` 
      };
    }
    return { icon: Minus, color: "text-muted-foreground", text: "Gleich wie Vormonat" };
  };

  const currentMonthName = new Date().toLocaleDateString('de-DE', { month: 'long' });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse flex items-center gap-4">
            <div className="w-12 h-12 bg-muted rounded-full" />
            <div className="flex-1">
              <div className="h-4 bg-muted rounded w-32 mb-2" />
              <div className="h-6 bg-muted rounded w-16" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const trend = getTrendInfo();
  const TrendIcon = trend.icon;

  return (
    <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">
                Anmeldungen {currentMonthName}
              </p>
              <p className="text-3xl font-bold text-foreground">{currentMonthCount}</p>
            </div>
          </div>
          
          <div className={`flex items-center gap-1 ${trend.color}`}>
            <TrendIcon className="h-4 w-4" />
            <span className="text-xs font-medium hidden sm:inline">{trend.text}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
