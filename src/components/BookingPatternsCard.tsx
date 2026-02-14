import { useEffect, useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";

interface BookingPattern {
  dayOfWeek: string;
  hour: string;
  avgUtilization: number;
  courseCount: number;
  dayIndex: number;
}

export const BookingPatternsCard = () => {
  const [loading, setLoading] = useState(true);
  const [patterns, setPatterns] = useState<BookingPattern[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 18;

  const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

  useEffect(() => {
    loadBookingPatterns();
  }, []);

  const loadBookingPatterns = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];

      const { data: courses, error } = await supabase
        .from('courses')
        .select(`
          course_date,
          start_time,
          max_participants,
          course_registrations(status),
          guest_registrations(status)
        `)
        .eq('is_cancelled', false)
        .gte('course_date', thirtyDaysAgoStr)
        .lt('course_date', today);

      if (error) throw error;

      // Group by dayOfWeek + hour
      const patternMap = new Map<string, { dayOfWeek: string; hour: string; totalRegistered: number; totalCapacity: number; courseCount: number; dayIndex: number }>();

      courses?.forEach((course: any) => {
        if (!course.start_time) return;

        const courseDate = new Date(course.course_date);
        const dayIndex = courseDate.getDay();
        const dayOfWeek = dayNames[dayIndex];
        const hour = course.start_time.split(':')[0];
        const key = `${dayOfWeek}-${hour}`;

        const memberCount = course.course_registrations?.filter((r: any) => r.status === 'registered').length || 0;
        const guestCount = course.guest_registrations?.filter((r: any) => r.status === 'registered').length || 0;
        const registered = memberCount + guestCount;

        const existing = patternMap.get(key);
        if (existing) {
          existing.totalRegistered += registered;
          existing.totalCapacity += (course.max_participants || 0);
          existing.courseCount += 1;
        } else {
          patternMap.set(key, {
            dayOfWeek,
            hour,
            totalRegistered: registered,
            totalCapacity: course.max_participants || 0,
            courseCount: 1,
            dayIndex,
          });
        }
      });

      // Calculate avg utilization and sort by utilization descending
      const patternsArray: BookingPattern[] = Array.from(patternMap.values())
        .map(p => ({
          dayOfWeek: p.dayOfWeek,
          hour: p.hour,
          avgUtilization: p.totalCapacity > 0 ? Math.round((p.totalRegistered / p.totalCapacity) * 100) : 0,
          courseCount: p.courseCount,
          dayIndex: p.dayIndex,
        }))
        .sort((a, b) => b.avgUtilization - a.avgUtilization);

      setPatterns(patternsArray);
    } catch (error) {
      console.error('Error loading booking patterns:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const totalPages = Math.ceil(patterns.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const displayPatterns = patterns.slice(startIndex, endIndex);

  const mostPopular = patterns[0] || { dayOfWeek: '-', hour: '-', avgUtilization: 0, courseCount: 0, dayIndex: 0 };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <CardTitle>Buchungsmuster</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">Ø Kursauslastung der letzten 30 Tage</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {displayPatterns.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine Daten verfügbar</p>
        ) : (
          displayPatterns.map((pattern) => (
            <div key={`${pattern.dayOfWeek}-${pattern.hour}`} className="flex justify-between items-center text-sm">
              <span className="font-medium">
                {pattern.dayOfWeek} {pattern.hour}:00
              </span>
              <div className="flex items-center gap-2">
                <div
                  className="h-2 bg-primary rounded-full"
                  style={{ width: `${(pattern.avgUtilization / 100) * 80}px` }}
                />
                <span className="text-muted-foreground w-10 text-right">{pattern.avgUtilization}%</span>
              </div>
            </div>
          ))
        )}
      </CardContent>
      {totalPages > 1 && (
        <CardFooter className="pb-4">
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              Seite {currentPage} von {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      )}
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          Höchste Auslastung: {mostPopular.dayOfWeek} {mostPopular.hour}:00 ({mostPopular.avgUtilization}%)
        </p>
      </CardFooter>
    </Card>
  );
};
