import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { generateGoogleCalendarUrl, downloadICSFile } from "@/lib/calendarUtils";
import { useState } from "react";

interface AddToCalendarButtonProps {
  title: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm:ss or HH:mm
  endTime: string;   // HH:mm:ss or HH:mm
  trainer?: string;
  variant?: "ghost" | "outline" | "default";
  size?: "sm" | "icon" | "default";
  className?: string;
}

export const AddToCalendarButton = ({
  title,
  startDate,
  startTime,
  endTime,
  trainer,
  variant = "ghost",
  size = "icon",
  className = "",
}: AddToCalendarButtonProps) => {
  const [open, setOpen] = useState(false);

  const event = {
    title,
    startDate,
    startTime,
    endTime,
    trainer,
  };

  const handleGoogleCalendar = () => {
    const url = generateGoogleCalendarUrl(event);
    window.open(url, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  const handleAppleCalendar = () => {
    downloadICSFile(event);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`${className}`}
          title="Zum Kalender hinzufügen"
        >
          <CalendarPlus className="h-4 w-4" />
          {size !== "icon" && <span className="ml-2">Kalender</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="end">
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="justify-start"
            onClick={handleGoogleCalendar}
          >
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.5 22h-15A2.5 2.5 0 0 1 2 19.5v-15A2.5 2.5 0 0 1 4.5 2h15A2.5 2.5 0 0 1 22 4.5v15a2.5 2.5 0 0 1-2.5 2.5zM12 5v7l5 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Google Calendar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start"
            onClick={handleAppleCalendar}
          >
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83z"/>
            </svg>
            Apple/Outlook (.ics)
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
