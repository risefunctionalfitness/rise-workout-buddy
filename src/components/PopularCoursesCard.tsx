import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";

interface CourseStats {
  title: string;
  trainer: string;
  registrations: number;
  totalCapacity: number;
  courseCount: number;
  avgUtilization: number;
}

export const PopularCoursesCard = () => {
  const [loading, setLoading] = useState(true);
  const [popularCourses, setPopularCourses] = useState<CourseStats[]>([]);

  useEffect(() => {
    loadPopularCourses();
  }, []);

  const loadPopularCourses = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];

      const { data: coursesData, error } = await supabase
        .from('courses')
        .select(`
          title,
          trainer,
          max_participants,
          course_registrations!inner(status)
        `)
        .eq('is_cancelled', false)
        .eq('course_registrations.status', 'registered')
        .gte('course_date', thirtyDaysAgoStr)
        .lt('course_date', today);

      if (error) throw error;

      // Group by title and calculate stats
      const courseMap = new Map<string, CourseStats>();

      coursesData?.forEach((course: any) => {
        const title = course.title.trim();
        const existing = courseMap.get(title) || {
          title,
          trainer: (course.trainer || '').trim(),
          registrations: 0,
          totalCapacity: 0,
          courseCount: 0,
          avgUtilization: 0,
        };

        existing.registrations += course.course_registrations?.length || 0;
        existing.totalCapacity += course.max_participants || 0;
        existing.courseCount += 1;

        courseMap.set(title, existing);
      });

      // Calculate average utilization and convert to array
      const coursesArray = Array.from(courseMap.values()).map(course => ({
        ...course,
        avgUtilization: course.totalCapacity > 0
          ? Math.round((course.registrations / course.totalCapacity) * 100)
          : 0,
      }));

      // Sort by registrations descending and take top 5
      const topCourses = coursesArray
        .sort((a, b) => b.registrations - a.registrations)
        .slice(0, 5);

      setPopularCourses(topCourses);
    } catch (error) {
      console.error('Error loading popular courses:', error);
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
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-primary" />
          <CardTitle>Beliebteste Kurse</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">Vergangene 30 Tage</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {popularCourses.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine Daten verfügbar</p>
        ) : (
          popularCourses.map((course, index) => (
            <div key={course.title} className="flex justify-between items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  #{index + 1} {course.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-muted-foreground">
                    {course.avgUtilization}% Auslastung
                  </p>
                  {course.trainer && (
                    <Badge variant="outline" className="text-xs">
                      {course.trainer}
                    </Badge>
                  )}
                </div>
              </div>
              <Badge variant="secondary" className="ml-2">
                {course.registrations}x
              </Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
