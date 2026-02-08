import { DashboardHighlightsCard } from "./DashboardHighlightsCard";
import { DashboardNewsCard } from "./DashboardNewsCard";
import { DashboardCreditsCard } from "./DashboardCreditsCard";
import { DashboardShopCard } from "./DashboardShopCard";

interface DashboardTileGridProps {
  userId: string;
  hasUnreadNews: boolean;
  onHighlightsClick: () => void;
  onNewsClick: () => void;
}

export const DashboardTileGrid = ({
  userId,
  hasUnreadNews,
  onHighlightsClick,
  onNewsClick,
}: DashboardTileGridProps) => {
  return (
    <div className="h-full flex flex-col gap-3">
      {/* Shop Card - Only shown when ordering is open */}
      <DashboardShopCard userId={userId} />
      
      {/* Highlights Row */}
      <div className="flex-1">
        <DashboardHighlightsCard
          userId={userId}
          onHighlightsClick={onHighlightsClick}
        />
      </div>
      
      {/* Bottom Row - 2 columns */}
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
