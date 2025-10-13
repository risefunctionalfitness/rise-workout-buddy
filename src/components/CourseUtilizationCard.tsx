import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp } from "lucide-react";

export const CourseUtilizationCard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalCapacity: 0,
    totalRegistrations: 0,
    utilizationRate: 0,
    avgParticipants: 0,
  });

  useEffect(() => {
    loadUtilizationStats();
  }, []);

  const loadUtilizationStats = async () => {
    try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    const { data: courses, error } = await supabase
      .from('courses')
      .select(`
        id,
        max_participants,
        course_registrations!inner(status)
      `)
      .gte('course_date', thirtyDaysAgoStr)
      .lt('course_date', today)
      .eq('is_cancelled', false);

      if (error) throw error;

      const totalCourses = courses?.length || 0;
      const totalCapacity = courses?.reduce((sum, course) => sum + (course.max_participants || 0), 0) || 0;
      const totalRegistrations = courses?.reduce((sum, course) => {
        return sum + (course.course_registrations?.filter((reg: any) => reg.status === 'registered').length || 0);
      }, 0) || 0;

      const utilizationRate = totalCapacity > 0 ? (totalRegistrations / totalCapacity) * 100 : 0;
      const avgParticipants = totalCourses > 0 ? totalRegistrations / totalCourses : 0;

      setStats({
        totalCourses,
        totalCapacity,
        totalRegistrations,
        utilizationRate: Math.round(utilizationRate),
        avgParticipants: Math.round(avgParticipants * 10) / 10,
      });
    } catch (error) {
      console.error('Error loading utilization stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-2 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle>Kursauslastung</CardTitle>
        </div>
        <CardDescription>Vergangene 30 Tage</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={stats.utilizationRate} className="h-2" />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Kurse gesamt</p>
            <p className="text-xl font-bold">{stats.totalCourses}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Ø Teilnehmer</p>
            <p className="text-xl font-bold">{stats.avgParticipants}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          {stats.totalRegistrations} von {stats.totalCapacity} Plätzen belegt
        </p>
      </CardFooter>
    </Card>
  );
};
