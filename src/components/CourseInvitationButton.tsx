import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { MemberSelectorDialog } from "./MemberSelectorDialog";

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
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setShowMemberSelector(true)}
      >
        <Share2 className="h-4 w-4" />
      </Button>

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
