import { Sparkles } from "lucide-react";
import { useUserAchievements } from "@/hooks/useUserAchievements";

interface DashboardHighlightsCardProps {
  userId: string;
  onHighlightsClick: () => void;
}

export const DashboardHighlightsCard = ({
  userId,
  onHighlightsClick,
}: DashboardHighlightsCardProps) => {
  const { hasNewAchievements, isLoading } = useUserAchievements(userId);

  if (isLoading) {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 h-24 w-full">
        <div className="flex items-center justify-center h-full">
          <span className="text-sm text-muted-foreground animate-pulse">
            Lade Highlights...
          </span>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onHighlightsClick}
      className="relative bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 h-24 hover:bg-gray-150 dark:hover:bg-gray-700 transition-all hover:scale-[1.02] w-full"
    >
      {/* Icon with optional notification badge */}
      <div className="absolute top-3 right-3">
        <div className="relative">
          <Sparkles className="h-6 w-6 text-primary" />
          {hasNewAchievements && (
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-primary rounded-full animate-pulse" />
          )}
        </div>
      </div>

      {/* Center Content */}
      <div className="flex items-center justify-center h-full">
        <span className="text-lg font-semibold text-foreground">
          Persönliche Highlights
        </span>
      </div>
    </button>
  );
};
