import { Home, Calendar, Weight, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MemberBottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  showCoursesTab: boolean;
}

export const MemberBottomNavigation = ({
  activeTab,
  onTabChange,
  showCoursesTab,
}: MemberBottomNavigationProps) => {
  const navigate = useNavigate();

  const handleTabClick = (tab: string) => {
    // If currently in workout-timer, navigate to /pro first
    if (window.location.pathname.includes("/workout-timer")) {
      navigate("/pro");
      setTimeout(() => onTabChange(tab), 100);
    } else {
      onTabChange(tab);
      // Scroll to top except for home tab
      if (tab !== "home") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const tabs = [
    { id: "home", label: "Übersicht", icon: Home },
    ...(showCoursesTab ? [{ id: "courses", label: "Kurse", icon: Calendar }] : []),
    { id: "wod", label: "Workout", icon: Weight },
    { id: "leaderboard", label: "Leaderboard", icon: Trophy },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-background p-2 z-50">
      <div className="flex justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`flex flex-col items-center gap-1 h-auto py-2 px-3 rounded-md transition-colors ${
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
