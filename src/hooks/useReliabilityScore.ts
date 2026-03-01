import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ReliabilityScore {
  score: number;
  level: number;
  bookingWindowDays: number;
  totalBookings: number;
  cancellations: number;
}

export const RELIABILITY_LEVELS = [
  { level: 1, label: "Level 1", maxScore: 15, windowDays: 14, color: "#22c55e" },
  { level: 2, label: "Level 2", maxScore: 25, windowDays: 7, color: "#eab308" },
  { level: 3, label: "Level 3", maxScore: 35, windowDays: 5, color: "#f97316" },
  { level: 4, label: "Level 4", maxScore: 100, windowDays: 3, color: "#ef4444" },
] as const;

export const getLevelColor = (level: number) => {
  return RELIABILITY_LEVELS.find((l) => l.level === level)?.color || "#22c55e";
};

export const getLevelInfo = (level: number) => {
  return RELIABILITY_LEVELS.find((l) => l.level === level) || RELIABILITY_LEVELS[0];
};

export const getProjectedScore = (
  current: ReliabilityScore
): { score: number; level: number } => {
  if (current.totalBookings < 4) {
    // After this cancellation they'll have at least 1 cancellation
    const newTotal = current.totalBookings;
    const newCancellations = current.cancellations + 1;
    if (newTotal < 4) return { score: 0, level: 1 };
    const score = Math.round((newCancellations / newTotal) * 100);
    const level = score <= 15 ? 1 : score <= 25 ? 2 : score <= 35 ? 3 : 4;
    return { score, level };
  }
  const newCancellations = current.cancellations + 1;
  const score = Math.round((newCancellations / current.totalBookings) * 100);
  const level = score <= 15 ? 1 : score <= 25 ? 2 : score <= 35 ? 3 : 4;
  return { score, level };
};

export const useReliabilityScore = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["reliability-score", userId],
    queryFn: async (): Promise<ReliabilityScore> => {
      if (!userId) throw new Error("No user ID");

      const { data, error } = await supabase.rpc(
        "get_user_reliability_score" as any,
        { p_user_id: userId }
      );

      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      return {
        score: Math.round(Number(row.score) || 0),
        level: Number(row.level) || 1,
        bookingWindowDays: Number(row.booking_window_days) || 14,
        totalBookings: Number(row.total_bookings) || 0,
        cancellations: Number(row.cancellations) || 0,
      };
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
};
