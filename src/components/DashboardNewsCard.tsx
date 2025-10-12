import { Bell } from "lucide-react";

interface DashboardNewsCardProps {
  hasUnreadNews: boolean;
  onNewsClick: () => void;
}

export const DashboardNewsCard = ({
  hasUnreadNews,
  onNewsClick,
}: DashboardNewsCardProps) => {
  return (
    <button
      onClick={onNewsClick}
      className="relative bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 h-24 hover:bg-gray-150 dark:hover:bg-gray-700 transition-all hover:scale-[1.02] w-full"
    >
      {/* Bell Icon */}
      <Bell className="absolute top-4 right-4 h-5 w-5 text-muted-foreground" />
      
      {/* Unread Indicator */}
      {hasUnreadNews && (
        <div className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full" />
      )}
      
      {/* Center Content */}
      <div className="flex items-center justify-center h-full">
        <span className="text-lg font-semibold text-foreground">News</span>
      </div>
    </button>
  );
};
