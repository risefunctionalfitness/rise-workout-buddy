import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Flame, Snowflake, Check, Info, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Tooltip } from "recharts";
import { format, startOfWeek, subWeeks, endOfWeek, getWeek } from "date-fns";
import { de } from "date-fns/locale";
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
  { value: 1, icon: "🌱", title: "Konstant dabei", description: "Bleib am Ball - auch kleine Schritte zählen" },
  { value: 2, icon: "💪", title: "Auf Kurs", description: "Der perfekte Rhythmus für stetige Fortschritte" },
  { value: 3, icon: "🔥", title: "Vollgas", description: "Maximiere dein Potenzial mit regelmäßigem Training" },
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

    // If increasing goal, show confirmation dialog
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
        // Update existing
        const { error } = await supabase
          .from("weekly_streaks")
          .update(updateData)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        // Create new
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
        description: resetStreak 
          ? "Deine Streak beginnt jetzt von vorne." 
          : `Trainiere ${newGoal}x pro Woche für deine Streak.`,
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
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center">Deine Trainingsstreak</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Streak Status */}
            <div className="text-center py-4">
              <div className={cn("flex items-center justify-center gap-2 mb-2", getStreakColor(currentStreak))}>
                <Flame className={cn("h-12 w-12", currentStreak >= 8 && "animate-pulse")} />
                <span className="text-5xl font-bold">{currentStreak}</span>
              </div>
              <p className="text-lg font-medium">
                {currentStreak === 0 
                  ? "Starte deine Streak!" 
                  : currentStreak === 1 
                    ? "1 Woche am Stück!" 
                    : `${currentStreak} Wochen am Stück!`}
              </p>
              {longestStreak > 0 && longestStreak > currentStreak && (
                <p className="text-sm text-muted-foreground mt-1">
                  Längste Streak: {longestStreak} Wochen
                </p>
              )}
            </div>

            {/* Weekly Progress */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Diese Woche</span>
                <span className="text-sm text-muted-foreground">
                  {currentWeekTrainings}/{currentGoal} Trainings
                </span>
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
                <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                  <Check className="h-4 w-4" />
                  Wochenziel erreicht!
                </p>
              )}
            </Card>

            {/* Goal Selection */}
            <div>
              <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
                <Info className="h-4 w-4" />
                Baue dir eine Streak auf, indem du jede Woche dein Ziel erreichst!
              </p>
              <div className="grid gap-2">
                {goalOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleGoalChange(option.value)}
                    disabled={loading}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                      currentGoal === option.value
                        ? "border-primary bg-primary/5 ring-2 ring-primary"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <span className="text-2xl">{option.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{option.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {option.value}x/Woche
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                    {currentGoal === option.value && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Streak Freezes */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Streak auf Eis</span>
                <span className="text-sm text-muted-foreground">{freezes}/2</span>
              </div>
              <div className="flex gap-2 mb-3">
                {[0, 1].map((i) => (
                  <Snowflake
                    key={i}
                    className={cn(
                      "h-6 w-6 transition-colors",
                      i < freezes ? "text-blue-500" : "text-muted-foreground/30"
                    )}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Freezes werden automatisch genutzt, wenn du eine Woche verpasst.
              </p>
              <div className="mt-3 text-xs text-muted-foreground space-y-1">
                <p>So verdienst du Freezes:</p>
                <p className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> 4 Wochen Streak = +1 Freeze
                </p>
                <p className="flex items-center gap-1">
                  ⭐ Monats-Challenge abschließen = +1 Freeze
                </p>
              </div>
            </Card>

            {/* Activity Chart */}
            {weeklyStats.length > 0 && (
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Letzte 13 Wochen
                </h4>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyStats}>
                      <XAxis 
                        dataKey="week" 
                        tick={{ fontSize: 10 }} 
                        interval={2}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }}
                        stroke="hsl(var(--muted-foreground))"
                        allowDecimals={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number) => [`${value} Trainings`, '']}
                      />
                      <ReferenceLine 
                        y={currentGoal} 
                        stroke="hsl(var(--primary))" 
                        strokeDasharray="5 5"
                        label={{ value: `Ziel: ${currentGoal}`, fontSize: 10, fill: 'hsl(var(--primary))' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="trainings"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 3 }}
                        activeDot={{ r: 5 }}
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
              Wenn du dein Wochenziel erhöhst, beginnt deine Streak von vorne. 
              Deine aktuelle Streak von {currentStreak} Wochen geht verloren.
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
              Ziel erhöhen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
