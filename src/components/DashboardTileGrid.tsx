import { DashboardChallengeCard } from "./DashboardChallengeCard";
import { DashboardNewsCard } from "./DashboardNewsCard";
import { DashboardCreditsCard } from "./DashboardCreditsCard";

interface DashboardTileGridProps {
  userId: string;
  currentChallenge: any;
  hasUnreadNews: boolean;
  onChallengeClick: () => void;
  onNewsClick: () => void;
}

export const DashboardTileGrid = ({
  userId,
  currentChallenge,
  hasUnreadNews,
  onChallengeClick,
  onNewsClick,
}: DashboardTileGridProps) => {
  return (
    <div className="h-full flex flex-col gap-3">
      {/* Top Row - 50% height */}
      <div className="flex-1">
        <DashboardChallengeCard
          userId={userId}
          currentChallenge={currentChallenge}
          onChallengeClick={onChallengeClick}
        />
      </div>
      
      {/* Bottom Row - 50% height, 2 columns */}
      <div className="flex-1 grid grid-cols-2 gap-2">
        <DashboardNewsCard
          hasUnreadNews={hasUnreadNews}
          onNewsClick={onNewsClick}
        />
        <DashboardCreditsCard userId={userId} />
      </div>
    </div>
  );
};
