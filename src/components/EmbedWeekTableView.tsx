import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, addDays, startOfDay } from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Course {
  id: string;
  title: string;
  trainer: string;
  course_date: string;
  start_time: string;
  end_time: string;
  max_participants: number;
  duration_minutes: number;
  color?: string;
  registered_count: number;
  guest_count: number;
}

interface EmbedWeekTableViewProps {
  courses: Course[];
  weekStart: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onCourseClick: (course: Course) => void;
  canGoPrev: boolean;
}

export default function EmbedWeekTableView({
  courses,
  weekStart,
  onPrevWeek,
  onNextWeek,
  onCourseClick,
  canGoPrev,
}: EmbedWeekTableViewProps) {
  // Get 7 days for the week
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Extract unique time slots and sort them
  const timeSlots = [...new Set(courses.map((c) => c.start_time.slice(0, 5)))].sort();

  // Get course for a specific day and time
  const getCoursesForSlot = (day: Date, time: string): Course[] => {
    const dayStr = format(day, "yyyy-MM-dd");
    return courses.filter(
      (c) => c.course_date === dayStr && c.start_time.slice(0, 5) === time
    );
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] p-2 sm:p-4 text-white">
      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPrevWeek}
          disabled={!canGoPrev}
          className="text-white hover:bg-[#333]"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <h2 className="text-lg font-semibold text-center text-white">
          {format(weekStart, "d. MMM", { locale: de })} -{" "}
          {format(addDays(weekStart, 6), "d. MMM yyyy", { locale: de })}
        </h2>

        <Button variant="ghost" size="icon" onClick={onNextWeek} className="text-white hover:bg-[#333]">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Week Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[700px]">
          <thead>
            <tr>
              <th className="p-2 text-left text-sm font-medium text-gray-400 w-16">
                Zeit
              </th>
              {weekDays.map((day) => (
                <th
                  key={day.toISOString()}
                  className={`p-2 text-center text-sm font-medium min-w-[100px] ${
                    isToday(day)
                      ? "bg-[#d6242b]/20 text-[#d6242b] rounded-t-lg"
                      : "text-gray-400"
                  }`}
                >
                  <div className="font-semibold">
                    {format(day, "EEEEEE", { locale: de })}
                  </div>
                  <div className={`text-xs ${isToday(day) ? "font-bold" : ""}`}>
                    {format(day, "d.MM")}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="p-8 text-center text-gray-400"
                >
                  Keine Kurse in dieser Woche verfügbar
                </td>
              </tr>
            ) : (
              timeSlots.map((time) => (
                <tr key={time} className="border-t border-[#333]">
                  <td className="p-2 text-sm font-medium text-gray-400 align-top">
                    {time}
                  </td>
                  {weekDays.map((day) => {
                    const slotCourses = getCoursesForSlot(day, time);
                    return (
                      <td
                        key={`${day.toISOString()}-${time}`}
                        className={`p-1 align-top ${
                          isToday(day) ? "bg-[#d6242b]/5" : ""
                        }`}
                      >
                        {slotCourses.map((course) => {
                          const totalRegistered =
                            course.registered_count + course.guest_count;
                          const isFull =
                            totalRegistered >= course.max_participants;

                          return (
                            <Card
                              key={course.id}
                              className={`p-2 mb-1 cursor-pointer transition-all hover:shadow-md text-xs bg-[#242424] border-[#333] text-white ${
                                isFull ? "opacity-60" : ""
                              }`}
                              style={{
                                borderLeftColor: course.color || "#d6242b",
                                borderLeftWidth: 3,
                              }}
                              onClick={() => !isFull && onCourseClick(course)}
                            >
                              <div className="font-semibold truncate">
                                {course.title}
                              </div>
                              <div className="text-gray-400">
                                {course.start_time.slice(0, 5)}-
                                {course.end_time.slice(0, 5)}
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-gray-400">
                                  {course.trainer.split(" ")[0]}
                                </span>
                                {isFull ? (
                                  <Badge
                                    className="text-[10px] px-1 py-0 bg-[#d6242b] text-white"
                                  >
                                    Voll
                                  </Badge>
                                ) : (
                                  <span className="text-gray-400">
                                    {totalRegistered}/{course.max_participants}
                                  </span>
                                )}
                              </div>
                            </Card>
                          );
                        })}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-400 justify-center">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 border-l-2 border-[#d6242b] bg-[#242424] rounded"></div>
          <span>Plätze frei</span>
        </div>
        <div className="flex items-center gap-1">
          <Badge className="text-[10px] px-1 py-0 bg-[#d6242b] text-white">
            Voll
          </Badge>
          <span>Ausgebucht</span>
        </div>
      </div>
    </div>
  );
}
