import { useEffect, useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Clock } from "lucide-react";

interface BookingPattern {
  dayOfWeek: string;
  hour: string;
  registrations: number;
  dayIndex: number;
}

export const BookingPatternsCard = () => {
  const [loading, setLoading] = useState(true);
  const [patterns, setPatterns] = useState<BookingPattern[]>([]);

  const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

  useEffect(() => {
    loadBookingPatterns();
  }, []);

  const loadBookingPatterns = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

      const { data: registrations, error } = await supabase
        .from('course_registrations')
        .select(`
          registered_at,
          courses!inner(course_date, start_time)
        `)
        .eq('status', 'registered')
        .gte('courses.course_date', thirtyDaysAgoStr);

      if (error) throw error;

      // Create pattern map
      const patternMap = new Map<string, { dayOfWeek: string; hour: string; registrations: number; dayIndex: number }>();

      registrations?.forEach((reg: any) => {
        if (!reg.courses?.start_time) return;

        const courseDate = new Date(reg.courses.course_date);
        const dayIndex = courseDate.getDay();
        const dayOfWeek = dayNames[dayIndex];
        const hour = reg.courses.start_time.split(':')[0];
        const key = `${dayOfWeek}-${hour}`;

        const existing = patternMap.get(key);
        if (existing) {
          existing.registrations += 1;
        } else {
          patternMap.set(key, { dayOfWeek, hour, registrations: 1, dayIndex });
        }
      });

      // Convert to array and sort
      const patternsArray = Array.from(patternMap.values()).sort((a, b) => {
        if (a.dayIndex !== b.dayIndex) {
          return a.dayIndex - b.dayIndex;
        }
        return parseInt(a.hour) - parseInt(b.hour);
      });

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

  const displayPatterns = patterns.slice(0, 10);

  const mostPopular = patterns.reduce((max, pattern) =>
    pattern.registrations > max.registrations ? pattern : max,
    patterns[0] || { dayOfWeek: '-', hour: '-', registrations: 0, dayIndex: 0 }
  );

  const maxRegistrations = Math.max(...patterns.map(p => p.registrations), 1);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <CardTitle>Buchungsmuster</CardTitle>
        </div>
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
                  style={{ width: `${(pattern.registrations / maxRegistrations) * 80}px` }}
                />
                <span className="text-muted-foreground w-8 text-right">{pattern.registrations}</span>
              </div>
            </div>
          ))
        )}
      </CardContent>
      {patterns.length > 10 && (
        <CardFooter className="pb-4">
          <p className="text-xs text-muted-foreground">
            ... und {patterns.length - 10} weitere Buchungsmuster
          </p>
        </CardFooter>
      )}
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          Meiste Buchungen: {mostPopular.dayOfWeek} {mostPopular.hour}:00 ({mostPopular.registrations} Buchungen)
        </p>
      </CardFooter>
    </Card>
  );
};
