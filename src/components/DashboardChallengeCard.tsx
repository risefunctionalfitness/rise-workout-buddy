import { Award } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DashboardChallengeCardProps {
  userId: string;
  currentChallenge: any;
  onChallengeClick: () => void;
}

export const DashboardChallengeCard = ({
  userId,
  currentChallenge,
  onChallengeClick,
}: DashboardChallengeCardProps) => {
  const [progress, setProgress] = useState<{ completed_checkpoints: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentChallenge) {
      loadProgress();
    } else {
      setIsLoading(false);
    }
  }, [currentChallenge]);

  const loadProgress = async () => {
    if (!currentChallenge) return;

    try {
      const { data, error } = await supabase
        .from("user_challenge_progress")
        .select("completed_checkpoints, is_completed")
        .eq("challenge_id", currentChallenge.id)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      setProgress(data);
    } catch (error) {
      console.error("Error loading challenge progress:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClick = async () => {
    if (!currentChallenge) return;

    // Create progress if it doesn't exist
    if (!progress) {
      try {
        const { error } = await supabase
          .from("user_challenge_progress")
          .insert({
            user_id: userId,
            challenge_id: currentChallenge.id,
            completed_checkpoints: 0,
            is_completed: false,
          });

        if (error) throw error;
        await loadProgress();
      } catch (error) {
        console.error("Error creating challenge progress:", error);
      }
    }

    onChallengeClick();
  };

  if (isLoading) {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 h-24 w-full">
        <div className="flex items-center justify-center h-full">
          <span className="text-sm text-muted-foreground animate-pulse">
            Lade Challenge...
          </span>
        </div>
      </div>
    );
  }

  if (!currentChallenge) {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 h-24 w-full">
        <div className="flex flex-col items-center justify-center h-full gap-2">
          <Award className="h-8 w-8 text-muted-foreground opacity-50" />
          <span className="text-sm text-muted-foreground">
            Keine Challenge verfügbar
          </span>
        </div>
      </div>
    );
  }

  const percentage = currentChallenge.checkpoint_count > 0
    ? ((progress?.completed_checkpoints || 0) / currentChallenge.checkpoint_count) * 100
    : 0;

  const circumference = 2 * Math.PI * 20; // radius = 20
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <button
      onClick={handleClick}
      className="relative bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 h-24 hover:bg-gray-150 dark:hover:bg-gray-700 transition-all hover:scale-[1.02] w-full"
    >
      {/* Progress Circle */}
      <div className="absolute top-3 right-3">
        <svg className="w-8 h-8 -rotate-90" viewBox="0 0 60 60">
          {/* Background Circle */}
          <circle
            cx="30"
            cy="30"
            r="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-gray-300 dark:text-gray-600"
          />
          {/* Progress Circle */}
          <circle
            cx="30"
            cy="30"
            r="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="text-primary transition-all duration-300"
          />
        </svg>
      </div>

      {/* Center Content */}
      <div className="flex items-center justify-center h-full">
        <span className="text-lg font-semibold text-foreground">
          Monatschallenge
        </span>
      </div>
    </button>
  );
};
