import { Users } from "lucide-react";
import { useState } from "react";
import { MemberSelectorDialog } from "./MemberSelectorDialog";
import { cn } from "@/lib/utils";

interface CourseInvitationButtonProps {
  courseId: string;
  courseName: string;
  courseDate: string;
  courseTime: string;
}

export const CourseInvitationButton = ({
  courseId,
  courseName,
  courseDate,
  courseTime
}: CourseInvitationButtonProps) => {
  const [showMemberSelector, setShowMemberSelector] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowMemberSelector(true)}
        className={cn(
          "flex items-center justify-center",
          "w-10 h-10 rounded-lg",
          "bg-background border-2 border-primary",
          "transition-all duration-200",
          "hover:scale-110 active:scale-95",
          "focus:outline-none",
          "shadow-md"
        )}
        aria-label="Mitglieder einladen"
      >
        <Users className="h-5 w-5 text-primary" />
      </button>

      <MemberSelectorDialog
        open={showMemberSelector}
        onOpenChange={setShowMemberSelector}
        courseId={courseId}
        courseName={courseName}
        courseDate={courseDate}
        courseTime={courseTime}
      />
    </>
  );
};
