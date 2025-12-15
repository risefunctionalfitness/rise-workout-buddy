import React, { useState, useEffect } from "react";
import { Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { StreakDialog } from "./StreakDialog";

interface StreakDisplayProps {
  user: any;
}

interface WeeklyStreak {
  id: string;
  weekly_goal: number;
  current_streak: number;
  longest_streak: number;
  streak_freezes: number;
  last_week_completed: string | null;
  streak_started_at: string | null;
}

export const StreakDisplay: React.FC<StreakDisplayProps> = ({ user }) => {
  const [streakData, setStreakData] = useState<WeeklyStreak | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchStreakData = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from("weekly_streaks")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      setStreakData(data);
    } catch (error) {
      console.error("Error fetching streak data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStreakData();
  }, [user?.id]);

  const getStreakColor = (streak: number) => {
    if (streak === 0) return "text-muted-foreground";
    if (streak <= 3) return "text-orange-500";
    if (streak <= 7) return "text-orange-600";
    return "text-red-500";
  };

  const getStreakAnimation = (streak: number) => {
    if (streak >= 8) return "animate-pulse";
    return "";
  };

  if (loading) {
    return (
      <div className="flex items-center gap-1 px-2 py-1">
        <Flame className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">-</span>
      </div>
    );
  }

  const currentStreak = streakData?.current_streak ?? 0;

  return (
    <>
      <button
        onClick={() => setDialogOpen(true)}
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-lg transition-all hover:bg-accent",
          getStreakAnimation(currentStreak)
        )}
      >
        <Flame className={cn("h-5 w-5", getStreakColor(currentStreak))} />
        <span className={cn("text-sm font-bold", getStreakColor(currentStreak))}>
          {currentStreak}
        </span>
      </button>

      <StreakDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={user}
        streakData={streakData}
        onStreakUpdate={fetchStreakData}
      />
    </>
  );
};
