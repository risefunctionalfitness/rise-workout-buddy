import { useState, useEffect, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { de } from "date-fns/locale";
import { format } from "date-fns";

interface Course {
  id: string;
  title: string;
  trainer: string;
  course_date: string;
  start_time: string;
  end_time: string;
  max_participants: number;
  registered_count: number;
  waitlisted_count: number;
  waitlist_count: number;
  color?: string;
}

interface AdminCoursesCalendarViewProps {
  onCourseClick: (course: Course) => void;
}

export const AdminCoursesCalendarView = ({ onCourseClick }: AdminCoursesCalendarViewProps) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCoursesData();
  }, []);

  const loadCoursesData = async () => {
    try {
      setLoading(true);
      
      // Load courses from 3 months ago to 3 months in the future
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const threeMonthsLater = new Date();
      threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select("*")
        .gte("course_date", threeMonthsAgo.toISOString().split('T')[0])
        .lte("course_date", threeMonthsLater.toISOString().split('T')[0])
        .order("course_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (coursesError) throw coursesError;

      // Get registration counts for all courses
      const coursesWithCounts = await Promise.all(
        (coursesData || []).map(async (course) => {
          const { data: registrations } = await supabase
            .from("course_registrations")
            .select("status")
            .eq("course_id", course.id);

          const registered_count = registrations?.filter(r => r.status === "registered").length || 0;
          const waitlist_count = registrations?.filter(r => r.status === "waitlist").length || 0;

          return {
            ...course,
            registered_count,
            waitlist_count,
            waitlisted_count: waitlist_count,
          };
        })
      );

      setCourses(coursesWithCounts);
    } catch (error) {
      console.error("Error loading courses:", error);
      toast.error("Fehler beim Laden der Kurse");
    } finally {
      setLoading(false);
    }
  };

  const coursesForSelectedDate = useMemo(() => {
    return courses.filter(
      (course) => course.course_date === format(selectedDate, "yyyy-MM-dd")
    );
  }, [courses, selectedDate]);

  const datesWithCourses = useMemo(() => {
    return courses.map((course) => new Date(course.course_date));
  }, [courses]);

  if (loading) {
    return <div className="text-center py-8">Lade Kurse...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => date && setSelectedDate(date)}
          locale={de}
          modifiers={{
            hasCourses: datesWithCourses,
          }}
          modifiersClassNames={{
            hasCourses: "border-2 border-primary font-bold",
          }}
          className="rounded-md border"
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          Kurse am {format(selectedDate, "dd.MM.yyyy", { locale: de })}
        </h3>

        {coursesForSelectedDate.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Keine Kurse an diesem Tag
          </p>
        ) : (
          <div className="grid gap-4">
            {coursesForSelectedDate.map((course) => (
              <Card
                key={course.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => onCourseClick(course)}
                style={{ borderLeft: `4px solid ${course.color || '#f3f4f6'}` }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{course.title}</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {course.registered_count}/{course.max_participants}
                      </Badge>
                      {course.waitlist_count > 0 && (
                        <Badge variant="secondary">
                          Warteliste: {course.waitlist_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {course.start_time.slice(0, 5)} - {course.end_time.slice(0, 5)}
                    </div>
                    <div>Trainer: {course.trainer}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
