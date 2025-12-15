import React, { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Flame, Snowflake, Check, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Tooltip } from "recharts";
import { format, startOfWeek, subWeeks, endOfWeek, getWeek } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface WeeklyStreak {
  id: string;
  weekly_goal: number;
  current_streak: number;
  longest_streak: number;
  streak_freezes: number;
  last_week_completed: string | null;
  streak_started_at: string | null;
}

interface StreakDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  streakData: WeeklyStreak | null;
  onStreakUpdate: () => void;
}

interface WeeklyStats {
  week: string;
  trainings: number;
  weekNumber: number;
}

const goalOptions = [
  { value: 1, icon: "🌱" },
  { value: 2, icon: "💪" },
  { value: 3, icon: "🔥" },
];

export const StreakDialog: React.FC<StreakDialogProps> = ({
  open,
  onOpenChange,
  user,
  streakData,
  onStreakUpdate,
}) => {
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([]);
  const [currentWeekTrainings, setCurrentWeekTrainings] = useState(0);
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; newGoal: number }>({ open: false, newGoal: 0 });
  const { toast } = useToast();

  useEffect(() => {
    if (open && user?.id) {
      fetchWeeklyStats();
      fetchCurrentWeekProgress();
    }
  }, [open, user?.id]);

  const fetchWeeklyStats = async () => {
    if (!user?.id) return;

    try {
      const weeks: WeeklyStats[] = [];
      const now = new Date();

      for (let i = 12; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekNumber = getWeek(weekStart, { weekStartsOn: 1 });

        const { count, error } = await supabase
          .from("training_sessions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "completed")
          .gte("date", format(weekStart, "yyyy-MM-dd"))
          .lte("date", format(weekEnd, "yyyy-MM-dd"));

        if (!error) {
          weeks.push({
            week: `KW ${weekNumber}`,
            trainings: count || 0,
            weekNumber,
          });
        }
      }

      setWeeklyStats(weeks);
    } catch (error) {
      console.error("Error fetching weekly stats:", error);
    }
  };

  const fetchCurrentWeekProgress = async () => {
    if (!user?.id) return;

    try {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

      const { count, error } = await supabase
        .from("training_sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "completed")
        .gte("date", format(weekStart, "yyyy-MM-dd"))
        .lte("date", format(weekEnd, "yyyy-MM-dd"));

      if (!error) {
        setCurrentWeekTrainings(count || 0);
      }
    } catch (error) {
      console.error("Error fetching current week progress:", error);
    }
  };

  const handleGoalChange = async (newGoal: number) => {
    if (!user?.id) return;

    const currentGoal = streakData?.weekly_goal ?? 2;

    if (newGoal > currentGoal && streakData?.current_streak && streakData.current_streak > 0) {
      setConfirmDialog({ open: true, newGoal });
      return;
    }

    await updateGoal(newGoal, false);
  };

  const updateGoal = async (newGoal: number, resetStreak: boolean) => {
    setLoading(true);

    try {
      const updateData: any = {
        weekly_goal: newGoal,
        updated_at: new Date().toISOString(),
      };

      if (resetStreak) {
        updateData.current_streak = 0;
        updateData.streak_started_at = null;
      }

      if (streakData) {
        const { error } = await supabase
          .from("weekly_streaks")
          .update(updateData)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("weekly_streaks")
          .insert({
            user_id: user.id,
            weekly_goal: newGoal,
          });

        if (error) throw error;
      }

      toast({
        title: resetStreak ? "Ziel geändert" : "Ziel gespeichert",
        description: `Trainiere ${newGoal}x pro Woche`,
      });

      onStreakUpdate();
    } catch (error) {
      console.error("Error updating goal:", error);
      toast({ title: "Fehler beim Speichern", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const currentGoal = streakData?.weekly_goal ?? 2;
  const currentStreak = streakData?.current_streak ?? 0;
  const longestStreak = streakData?.longest_streak ?? 0;
  const freezes = streakData?.streak_freezes ?? 0;

  const getStreakColor = (streak: number) => {
    if (streak === 0) return "text-muted-foreground";
    if (streak <= 3) return "text-orange-500";
    if (streak <= 7) return "text-orange-600";
    return "text-red-500";
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Streak Status - Hero Section */}
            <div className="text-center pt-2">
              <div className={cn("flex items-center justify-center gap-2", getStreakColor(currentStreak))}>
                <span className="text-7xl font-black">{currentStreak}</span>
                <Flame className={cn("h-14 w-14", currentStreak >= 8 && "animate-pulse")} />
              </div>
              <p className="text-lg font-semibold mt-2">
                {currentStreak === 0 
                  ? "Starte deine Streak!" 
                  : currentStreak === 1 
                    ? "Woche" 
                    : "Wochen"}
              </p>
              {longestStreak > 0 && longestStreak > currentStreak && (
                <p className="text-xs text-muted-foreground mt-1">
                  Rekord: {longestStreak}
                </p>
              )}
            </div>

            {/* Weekly Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Diese Woche</span>
                <span className="font-medium">{currentWeekTrainings}/{currentGoal}</span>
              </div>
              <div className="flex gap-2">
                {Array.from({ length: currentGoal }, (_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex-1 h-3 rounded-full transition-colors",
                      i < currentWeekTrainings ? "bg-primary" : "bg-muted"
                    )}
                  />
                ))}
              </div>
              {currentWeekTrainings >= currentGoal && (
                <p className="text-sm text-green-600 flex items-center justify-center gap-1">
                  <Check className="h-4 w-4" /> Geschafft!
                </p>
              )}
            </div>

            {/* Goal Selection - Compact Tiles */}
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">Ziel pro Woche</p>
              <div className="grid grid-cols-3 gap-3">
                {goalOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleGoalChange(option.value)}
                    disabled={loading}
                    className={cn(
                      "flex flex-col items-center justify-center py-4 rounded-xl border-2 transition-all",
                      currentGoal === option.value
                        ? "border-primary bg-primary/10 scale-105"
                        : "border-border hover:border-primary/50 hover:bg-accent"
                    )}
                  >
                    <span className="text-2xl mb-1">{option.icon}</span>
                    <span className="text-2xl font-bold">{option.value}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Streak Freezes - Prominent, no container */}
            <div className="flex items-center justify-center gap-4 py-2">
              <div className="flex gap-2">
                {[0, 1].map((i) => (
                  <Snowflake
                    key={i}
                    className={cn(
                      "h-8 w-8 transition-colors",
                      i < freezes ? "text-blue-500" : "text-muted-foreground/20"
                    )}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">Streak auf Eis</span>
            </div>

            {/* Activity Chart */}
            {weeklyStats.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span>Letzte 13 Wochen</span>
                </div>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyStats}>
                      <XAxis 
                        dataKey="week" 
                        tick={{ fontSize: 9 }} 
                        interval={3}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis 
                        tick={{ fontSize: 9 }}
                        stroke="hsl(var(--muted-foreground))"
                        allowDecimals={false}
                        width={20}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        formatter={(value: number) => [`${value}`, '']}
                      />
                      <ReferenceLine 
                        y={currentGoal} 
                        stroke="hsl(var(--primary))" 
                        strokeDasharray="5 5"
                      />
                      <Line
                        type="monotone"
                        dataKey="trainings"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 2 }}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Goal Increase Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ziel erhöhen?</AlertDialogTitle>
            <AlertDialogDescription>
              Deine Streak von {currentStreak} Wochen wird zurückgesetzt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                updateGoal(confirmDialog.newGoal, true);
                setConfirmDialog({ open: false, newGoal: 0 });
              }}
            >
              Erhöhen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
