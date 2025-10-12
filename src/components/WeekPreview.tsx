import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, isSameDay } from "date-fns";
import { de } from "date-fns/locale";
import { DayCourseDialog } from "./DayCourseDialog";

interface WeekPreviewProps {
  user: any;
  userRole?: string;
}

export const WeekPreview = ({ user, userRole }: WeekPreviewProps) => {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadRegistrations();
    }
  }, [user?.id]);

  const loadRegistrations = async () => {
    if (!user?.id) return;

    const today = new Date();
    const weekEnd = addDays(today, 6);

    try {
      const { data, error } = await supabase
        .from("course_registrations")
        .select("status, courses(course_date, id)")
        .eq("user_id", user.id)
        .in("status", ["registered", "waitlist"])
        .gte("courses.course_date", format(today, "yyyy-MM-dd"))
        .lte("courses.course_date", format(weekEnd, "yyyy-MM-dd"));

      if (error) throw error;
      setRegistrations(data || []);
    } catch (error) {
      console.error("Error loading registrations:", error);
    }
  };

  const getDayStyle = (day: Date) => {
    const today = new Date();
    const isToday = isSameDay(day, today);

    const dayRegistrations = registrations.filter((reg: any) =>
      reg.courses && isSameDay(new Date(reg.courses.course_date), day)
    );

    const hasRegistered = dayRegistrations.some((r: any) => r.status === "registered");
    const hasWaitlist = dayRegistrations.some((r: any) => r.status === "waitlist");

    if (isToday) {
      return "bg-primary text-primary-foreground";
    }

    if (hasRegistered) {
      return "bg-green-50 dark:bg-green-950 border-2 border-green-500 text-green-700 dark:text-green-300";
    }

    if (hasWaitlist) {
      return "bg-yellow-50 dark:bg-yellow-950 border-2 border-yellow-500 text-yellow-700 dark:text-yellow-300";
    }

    return "bg-muted text-muted-foreground hover:bg-muted/80";
  };

  const getNext7Days = () => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => addDays(today, i));
  };

  const days = getNext7Days();

  return (
    <>
      <div className="h-full flex items-center w-full">
        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 hover:bg-gray-150 dark:hover:bg-gray-700 transition-all hover:scale-[1.01]">
          <div className="flex gap-1">
            {days.map((day, index) => (
              <button
                key={index}
                onClick={() => {
                  setSelectedDate(day);
                  setDialogOpen(true);
                }}
                className={`min-w-0 flex-1 p-2 rounded-lg transition-all hover:scale-105 ${getDayStyle(
                  day
                )}`}
              >
                <div className="text-xs font-medium mb-0.5">
                  {format(day, "EEE", { locale: de })}
                </div>
                <div className="text-sm font-bold">{format(day, "d")}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {selectedDate && (
        <DayCourseDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          date={format(selectedDate, "yyyy-MM-dd")}
          user={user}
          userRole={userRole}
        />
      )}
    </>
  );
};
