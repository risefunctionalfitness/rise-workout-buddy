import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CourseInvitationBadgeProps {
  invitationCount: number;
  onClick: () => void;
}

export const CourseInvitationBadge = ({ 
  invitationCount, 
  onClick 
}: CourseInvitationBadgeProps) => {
  if (invitationCount === 0) return null;

  return (
    <button
      onClick={onClick}
      className={cn(
        "absolute top-2 right-2 z-10",
        "flex items-center justify-center",
        "w-12 h-12 rounded-lg",
        "bg-white border-2 border-red-500",
        "transition-all duration-200",
        "hover:scale-110 active:scale-95",
        "focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2",
        "shadow-lg",
        "animate-in fade-in zoom-in duration-300"
      )}
      aria-label={`${invitationCount} neue Kurseinladung${invitationCount > 1 ? 'en' : ''}`}
    >
      <div className="relative">
        <Users className="h-6 w-6 text-red-500" />
        <Badge 
          variant="destructive" 
          className="absolute -top-2 -right-2 h-5 min-w-[20px] flex items-center justify-center px-1 text-xs font-bold"
        >
          {invitationCount > 99 ? '99+' : invitationCount}
        </Badge>
      </div>
    </button>
  );
};
