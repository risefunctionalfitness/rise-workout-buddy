import { Mail } from "lucide-react";
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
        "w-10 h-10 rounded-full",
        "bg-primary/10 hover:bg-primary/20",
        "transition-all duration-200",
        "hover:scale-110 active:scale-95",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        "shadow-lg",
        "animate-in fade-in zoom-in duration-300"
      )}
      aria-label={`${invitationCount} neue Kurseinladung${invitationCount > 1 ? 'en' : ''}`}
    >
      <div className="relative">
        <Mail className="h-5 w-5 text-primary" />
        <Badge 
          variant="destructive" 
          className="absolute -top-2 -right-2 h-5 min-w-[20px] flex items-center justify-center px-1 text-xs font-bold animate-pulse"
        >
          {invitationCount > 99 ? '99+' : invitationCount}
        </Badge>
      </div>
    </button>
  );
};
