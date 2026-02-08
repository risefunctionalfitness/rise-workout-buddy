import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Achievement {
  id: string;
  type: string;
  value: number;
  achievedAt: Date;
  seenAt: Date | null;
  sharedAt: Date | null;
  label: string;
  icon: string;
  description: string;
}

export interface UserStats {
  totalBookings: number;
  totalTrainings: number;
  totalSessions: number;
  currentStreak: number;
  longestStreak: number;
  memberSince: Date | null;
  preferredDay: string;
  preferredTime: string;
  bookingsByDay: Record<string, number>;
  trainingsByDay: Record<string, number>;
  weeklyActivity: Array<{ week: string; bookings: number; trainings: number }>;
}

export interface NextMilestone {
  type: string;
  label: string;
  current: number;
  target: number;
  icon: string;
}

const STREAK_MILESTONES = [4, 8, 12, 26, 52];
const TRAINING_MILESTONES = [10, 25, 50, 100, 250, 500];

const getStreakLabel = (weeks: number) => `${weeks} Wochen Streak`;
const getTrainingLabel = (count: number) => `${count} Trainings`;

export const useUserAchievements = (userId: string) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [nextMilestones, setNextMilestones] = useState<NextMilestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasNewAchievements, setHasNewAchievements] = useState(false);

  useEffect(() => {
    if (userId) {
      loadAchievementsAndStats();
    }
  }, [userId]);

  const loadAchievementsAndStats = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadStats(),
        loadSavedAchievements(),
      ]);
    } catch (error) {
      console.error("Error loading achievements:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSavedAchievements = async () => {
    const { data, error } = await supabase
      .from("user_achievements")
      .select("*")
      .eq("user_id", userId)
      .order("achieved_at", { ascending: false });

    if (error) {
      console.error("Error loading saved achievements:", error);
      return;
    }

    const mapped: Achievement[] = (data || []).map((a) => ({
      id: a.id,
      type: a.achievement_type,
      value: a.achievement_value,
      achievedAt: new Date(a.achieved_at),
      seenAt: a.seen_at ? new Date(a.seen_at) : null,
      sharedAt: a.shared_at ? new Date(a.shared_at) : null,
      label: getAchievementLabel(a.achievement_type, a.achievement_value),
      icon: getAchievementIcon(a.achievement_type),
      description: getAchievementDescription(a.achievement_type, a.achievement_value),
    }));

    setAchievements(mapped);
    setHasNewAchievements(mapped.some((a) => !a.seenAt));
  };

  const loadStats = async () => {
    const dayNames = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

    // Load bookings
    const { data: bookings } = await supabase
      .from("course_registrations")
      .select(`id, courses (course_date, start_time)`)
      .eq("user_id", userId)
      .eq("status", "registered");

    // Load trainings (Open Gym)
    const { data: trainings } = await supabase
      .from("training_sessions")
      .select("id, date")
      .eq("user_id", userId)
      .eq("workout_type", "free_training");

    // Load streak data
    const { data: streakData } = await supabase
      .from("weekly_streaks")
      .select("current_streak, longest_streak")
      .eq("user_id", userId)
      .maybeSingle();

    // Load profile for member since
    const { data: profile } = await supabase
      .from("profiles")
      .select("created_at")
      .eq("user_id", userId)
      .maybeSingle();

    const bookingsByDay: Record<string, number> = {};
    const trainingsByDay: Record<string, number> = {};
    const hourCounts: Record<number, number> = {};

    bookings?.forEach((b: any) => {
      if (b.courses?.course_date) {
        const date = new Date(b.courses.course_date);
        const dayName = dayNames[date.getDay()];
        bookingsByDay[dayName] = (bookingsByDay[dayName] || 0) + 1;

        if (b.courses?.start_time) {
          const hour = parseInt(b.courses.start_time.split(":")[0]);
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        }
      }
    });

    trainings?.forEach((t: any) => {
      if (t.date) {
        const date = new Date(t.date);
        const dayName = dayNames[date.getDay()];
        trainingsByDay[dayName] = (trainingsByDay[dayName] || 0) + 1;
      }
    });

    const preferredDay = Object.entries(bookingsByDay).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
    const preferredHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const preferredTime = preferredHour ? `${preferredHour}:00` : "N/A";

    const totalBookings = bookings?.length || 0;
    const totalTrainings = trainings?.length || 0;
    const totalSessions = totalBookings + totalTrainings;
    const currentStreak = streakData?.current_streak || 0;
    const longestStreak = streakData?.longest_streak || 0;

    const statsData: UserStats = {
      totalBookings,
      totalTrainings,
      totalSessions,
      currentStreak,
      longestStreak,
      memberSince: profile?.created_at ? new Date(profile.created_at) : null,
      preferredDay,
      preferredTime,
      bookingsByDay,
      trainingsByDay,
      weeklyActivity: [],
    };

    setStats(statsData);

    // Calculate and save new achievements
    await checkAndSaveAchievements(currentStreak, totalSessions);

    // Calculate next milestones
    calculateNextMilestones(currentStreak, totalSessions);
  };

  const checkAndSaveAchievements = async (currentStreak: number, totalSessions: number) => {
    const newAchievements: { type: string; value: number }[] = [];

    // Check streak milestones
    for (const milestone of STREAK_MILESTONES) {
      if (currentStreak >= milestone) {
        newAchievements.push({ type: "streak", value: milestone });
      }
    }

    // Check training milestones
    for (const milestone of TRAINING_MILESTONES) {
      if (totalSessions >= milestone) {
        newAchievements.push({ type: "training", value: milestone });
      }
    }

    // Save any new achievements (upsert to avoid duplicates)
    for (const achievement of newAchievements) {
      await supabase
        .from("user_achievements")
        .upsert(
          {
            user_id: userId,
            achievement_type: achievement.type,
            achievement_value: achievement.value,
          },
          { onConflict: "user_id,achievement_type,achievement_value" }
        );
    }
  };

  const calculateNextMilestones = (currentStreak: number, totalSessions: number) => {
    const milestones: NextMilestone[] = [];

    // Next streak milestone
    const nextStreakMilestone = STREAK_MILESTONES.find((m) => m > currentStreak);
    if (nextStreakMilestone) {
      milestones.push({
        type: "streak",
        label: `${nextStreakMilestone} Wochen Streak`,
        current: currentStreak,
        target: nextStreakMilestone,
        icon: "🔥",
      });
    }

    // Next training milestone
    const nextTrainingMilestone = TRAINING_MILESTONES.find((m) => m > totalSessions);
    if (nextTrainingMilestone) {
      milestones.push({
        type: "training",
        label: `${nextTrainingMilestone} Trainings`,
        current: totalSessions,
        target: nextTrainingMilestone,
        icon: "💪",
      });
    }

    setNextMilestones(milestones);
  };

  const markAchievementsSeen = async () => {
    const unseenIds = achievements.filter((a) => !a.seenAt).map((a) => a.id);
    if (unseenIds.length === 0) return;

    await supabase
      .from("user_achievements")
      .update({ seen_at: new Date().toISOString() })
      .in("id", unseenIds);

    setAchievements((prev) =>
      prev.map((a) => (unseenIds.includes(a.id) ? { ...a, seenAt: new Date() } : a))
    );
    setHasNewAchievements(false);
  };

  const markAchievementShared = async (achievementId: string) => {
    await supabase
      .from("user_achievements")
      .update({ shared_at: new Date().toISOString() })
      .eq("id", achievementId);

    setAchievements((prev) =>
      prev.map((a) => (a.id === achievementId ? { ...a, sharedAt: new Date() } : a))
    );
  };

  return {
    achievements,
    stats,
    nextMilestones,
    isLoading,
    hasNewAchievements,
    markAchievementsSeen,
    markAchievementShared,
    refresh: loadAchievementsAndStats,
  };
};

function getAchievementLabel(type: string, value: number): string {
  if (type === "streak") return getStreakLabel(value);
  if (type === "training") return getTrainingLabel(value);
  return `${type} ${value}`;
}

// Returns icon type name for AchievementIcon component
function getAchievementIcon(type: string): string {
  if (type === "streak") return "streak";
  if (type === "training") return "training";
  return "total";
}

function getAchievementDescription(type: string, value: number): string {
  if (type === "streak") return `Du hast ${value} Wochen in Folge dein Trainingsziel erreicht!`;
  if (type === "training") return `Du hast insgesamt ${value} Trainingseinheiten absolviert!`;
  return "";
}
