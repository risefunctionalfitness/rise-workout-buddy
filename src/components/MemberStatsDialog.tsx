import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Dumbbell, Users, XCircle } from "lucide-react";
import { useState } from "react";

interface MemberStatsDialogProps {
  userId: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  totalBookings?: number;
  totalTrainings?: number;
  cancellations?: number;
  isOpen: boolean;
  onClose: () => void;
}

interface MemberStats {
  total_bookings: number;
  total_trainings: number;
  cancellations: number;
  bookings_by_day: Record<string, number>;
  trainings_by_day: Record<string, number>;
  bookings_by_trainer: Record<string, number>;
  preferred_day: string;
  preferred_time: string;
  preferred_training_day: string;
}

export const MemberStatsDialog = ({ userId, displayName, firstName, lastName, totalBookings, totalTrainings, cancellations, isOpen, onClose }: MemberStatsDialogProps) => {
  const fullName = firstName && lastName ? `${firstName} ${lastName}` : displayName;
  const [showOpenGym, setShowOpenGym] = useState(false);
  const { data: stats, isLoading } = useQuery({
    queryKey: ['member-stats', userId],
    queryFn: async () => {
      // Fetch registered bookings only
      const { data: bookings, error: bookingsError } = await supabase
        .from('course_registrations')
        .select(`
          id,
          registered_at,
          status,
          courses (
            course_date,
            start_time,
            trainer
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'registered');
      
      if (bookingsError) throw bookingsError;

      // Fetch cancellations
      const { count: cancellationsCount, error: cancellationsError } = await supabase
        .from('course_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'cancelled');
      
      if (cancellationsError) throw cancellationsError;

      // Fetch free training (Open Gym QR scans) only
      const { data: trainings, error: trainingsError } = await supabase
        .from('training_sessions')
        .select('id, status, date')
        .eq('user_id', userId)
        .eq('workout_type', 'free_training');
      
      if (trainingsError) throw trainingsError;

      // Process bookings by day of week
      const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
      const bookingsByDay: Record<string, number> = {};
      const trainingsByDay: Record<string, number> = {};
      const bookingsByTrainer: Record<string, number> = {};
      const hourCounts: Record<number, number> = {};

      bookings?.forEach((booking: any) => {
        if (booking.courses?.course_date) {
          const date = new Date(booking.courses.course_date);
          const dayName = dayNames[date.getDay()];
          bookingsByDay[dayName] = (bookingsByDay[dayName] || 0) + 1;

          if (booking.courses?.trainer) {
            bookingsByTrainer[booking.courses.trainer] = (bookingsByTrainer[booking.courses.trainer] || 0) + 1;
          }

          if (booking.courses?.start_time) {
            const hour = parseInt(booking.courses.start_time.split(':')[0]);
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
          }
        }
      });

      // Process trainings by day of week
      trainings?.forEach((training: any) => {
        if (training.date) {
          const date = new Date(training.date);
          const dayName = dayNames[date.getDay()];
          trainingsByDay[dayName] = (trainingsByDay[dayName] || 0) + 1;
        }
      });

      // Find preferred day and time
      const preferredDay = Object.entries(bookingsByDay).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
      const preferredHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
      const preferredTime = preferredHour ? `${preferredHour}:00` : 'N/A';
      const preferredTrainingDay = Object.entries(trainingsByDay).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

      return {
        total_bookings: bookings?.length || 0,
        total_trainings: trainings?.length || 0,
        cancellations: cancellationsCount || 0,
        bookings_by_day: bookingsByDay,
        trainings_by_day: trainingsByDay,
        bookings_by_trainer: bookingsByTrainer,
        preferred_day: preferredDay,
        preferred_time: preferredTime,
        preferred_training_day: preferredTrainingDay
      } as MemberStats;
    },
    enabled: isOpen
  });

  const dayOrder = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const maxBookings = stats ? Math.max(...Object.values(stats.bookings_by_day), 1) : 1;
  const maxTrainings = stats ? Math.max(...Object.values(stats.trainings_by_day), 1) : 1;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Statistiken: {fullName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-3">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Buchungen</p>
                      <p className="text-2xl font-bold">{totalBookings !== undefined ? totalBookings : stats?.total_bookings || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-3">
                      <Dumbbell className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Open Gym</p>
                      <p className="text-2xl font-bold">{totalTrainings !== undefined ? totalTrainings : stats?.total_trainings || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-3">
                      <XCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Stornierungen</p>
                      <p className="text-2xl font-bold">{cancellations !== undefined ? cancellations : stats?.cancellations || 0}</p>
                      {(() => {
                        const totalBookingsValue = totalBookings !== undefined ? totalBookings : stats?.total_bookings || 0;
                        const cancellationsValue = cancellations !== undefined ? cancellations : stats?.cancellations || 0;
                        const total = totalBookingsValue + cancellationsValue;
                        const rate = total > 0 ? (cancellationsValue / total * 100).toFixed(1) : '0';
                        return (
                          <p className="text-xs text-muted-foreground">
                            {rate}% Rate
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Preferred Day and Time */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3">Präferenzen</h3>
                <div className="flex gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Bevorzugter Kurstag</p>
                    <Badge variant="secondary" className="text-base">
                      {stats?.preferred_day}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Bevorzugte Kurszeit</p>
                    <Badge variant="secondary" className="text-base">
                      {stats?.preferred_time}
                    </Badge>
                  </div>
                  {stats && Object.keys(stats.trainings_by_day).length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Bevorzugter Open Gym Tag</p>
                      <Badge variant="secondary" className="text-base">
                        {stats.preferred_training_day}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Wochentags-Diagramme mit Switch Toggle */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">
                      {showOpenGym ? 'Open Gym pro Wochentag' : 'Kursbuchungen pro Wochentag'}
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowOpenGym(!showOpenGym)}
                    className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    style={{
                      backgroundColor: showOpenGym ? 'hsl(var(--primary))' : 'hsl(var(--muted))'
                    }}
                  >
                    <span
                      className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                      style={{
                        transform: showOpenGym ? 'translateX(1.5rem)' : 'translateX(0.25rem)'
                      }}
                    />
                  </button>
                </div>

                {!showOpenGym ? (
                  <div className="space-y-3">
                    {dayOrder.map((day) => {
                      const count = stats?.bookings_by_day[day] || 0;
                      const width = maxBookings > 0 ? (count / maxBookings) * 100 : 0;
                      return (
                        <div key={day} className="flex items-center gap-3">
                          <span className="text-sm font-medium w-8">{day}</span>
                          <div className="flex-1 bg-muted rounded-full h-8 relative overflow-hidden">
                            <div
                              className="bg-primary h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                              style={{ width: `${width}%` }}
                            >
                              {count > 0 && (
                                <span className="text-xs font-semibold text-primary-foreground">
                                  {count}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dayOrder.map((day) => {
                      const count = stats?.trainings_by_day[day] || 0;
                      const width = maxTrainings > 0 ? (count / maxTrainings) * 100 : 0;
                      return (
                        <div key={day} className="flex items-center gap-3">
                          <span className="text-sm font-medium w-8">{day}</span>
                          <div className="flex-1 bg-muted rounded-full h-8 relative overflow-hidden">
                            <div
                              className="bg-primary h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                              style={{ width: `${width}%` }}
                            >
                              {count > 0 && (
                                <span className="text-xs font-semibold text-primary-foreground">
                                  {count}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bookings by Trainer */}
            {stats && Object.keys(stats.bookings_by_trainer).length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-4">Buchungen pro Coach</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stats.bookings_by_trainer)
                      .sort((a, b) => b[1] - a[1])
                      .map(([trainer, count]) => (
                        <Badge key={trainer} variant="outline" className="px-3 py-1">
                          {trainer}: <span className="font-bold ml-1">{count}</span>
                        </Badge>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
