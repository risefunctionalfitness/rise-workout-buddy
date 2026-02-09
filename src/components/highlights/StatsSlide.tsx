import { Card, CardContent } from "@/components/ui/card";
import { Calendar, BarChart3, Star, XCircle } from "lucide-react";
import { UserStats } from "@/hooks/useUserAchievements";
import { Skeleton } from "@/components/ui/skeleton";
import { YearlyTrainingHeatmap } from "@/components/YearlyTrainingHeatmap";

interface StatsSlideProps {
  userId: string;
  stats: UserStats | null;
  isLoading: boolean;
}

const dayOrder = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export const StatsSlide = ({ userId, stats, isLoading }: StatsSlideProps) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <BarChart3 className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Keine Statistiken</h3>
        <p className="text-muted-foreground text-sm">
          Trainiere um deine ersten Statistiken zu sehen!
        </p>
      </div>
    );
  }

  const maxBookings = Math.max(...Object.values(stats.bookingsByDay), 1);

  return (
    <div className="space-y-4">
      {/* Training Log - 12 Months Chart */}
      <Card>
        <CardContent className="p-4">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            Trainingslog (12 Monate)
          </h4>
          <YearlyTrainingHeatmap userId={userId} />
        </CardContent>
      </Card>

      {/* Day distribution */}
      <Card>
        <CardContent className="p-4">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Kursbuchungen pro Wochentag
          </h4>
          <div className="space-y-2">
            {dayOrder.map((day) => {
              const count = stats.bookingsByDay[day] || 0;
              const width = maxBookings > 0 ? (count / maxBookings) * 100 : 0;
              return (
                <div key={day} className="flex items-center gap-2">
                  <span className="text-xs font-medium w-6">{day}</span>
                  <div className="flex-1 bg-muted rounded-full h-5 relative overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                      style={{ width: `${width}%` }}
                    >
                      {count > 0 && (
                        <span className="text-[10px] font-semibold text-primary-foreground">
                          {count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Star className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Beliebtester Tag</div>
              <div className="text-sm font-semibold">{stats.preferredDay}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Stornierungsrate</div>
              <div className="text-sm font-semibold">{stats.cancellationRate}%</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
