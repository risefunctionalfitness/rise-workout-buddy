import { Flame, Dumbbell, Trophy, Medal, Award, Target, CalendarCheck } from "lucide-react";

interface AchievementIconProps {
  type: string;
  className?: string;
  size?: number;
}

export const AchievementIcon = ({ type, className = "", size = 24 }: AchievementIconProps) => {
  const iconProps = { className, size };

  switch (type) {
    case "streak":
      return <Flame {...iconProps} />;
    case "training":
      return <Dumbbell {...iconProps} />;
    case "total":
      return <Trophy {...iconProps} />;
    case "ranking":
      return <Medal {...iconProps} />;
    case "challenge":
      return <Award {...iconProps} />;
    default:
      return <Target {...iconProps} />;
  }
};

// For canvas rendering - SVG paths
export const getAchievementIconPath = (type: string): string => {
  switch (type) {
    case "streak":
      // Flame icon path
      return "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z";
    case "training":
      // Dumbbell icon path
      return "M6.5 6.5h11M3 12h18M6.5 17.5h11M17.5 6.5v11M6.5 6.5v11";
    case "total":
      // Trophy icon path
      return "M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z";
    default:
      return "M12 13V2l8 4-8 4M20.55 10.23A9 9 0 1 1 8 4.94M8 10a5 5 0 1 0 8.9 2.02";
  }
};
