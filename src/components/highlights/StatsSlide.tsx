import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Calendar, Dumbbell, Clock, BarChart3 } from "lucide-react";
import { UserStats } from "@/hooks/useUserAchievements";
import { ShareDialog } from "@/components/highlights/ShareDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { YearlyTrainingHeatmap } from "@/components/YearlyTrainingHeatmap";
import { AchievementIcon } from "@/components/highlights/AchievementIcon";

interface StatsSlideProps {
  userId: string;
  stats: UserStats | null;
  isLoading: boolean;
}

const dayOrder = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export const StatsSlide = ({ userId, stats, isLoading }: StatsSlideProps) => {
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-12 w-full" />
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

  const handleShare = () => {
    setShareDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Stats Preview Card */}
      <Card className="bg-gradient-to-br from-gray-900 to-gray-800 text-white border-0 overflow-hidden">
        <CardContent className="p-5 relative">
          {/* RISE Logo */}
          <div className="absolute top-4 left-4">
            <img 
              src="/logos/rise_dark.png" 
              alt="RISE" 
              className="h-6 opacity-80"
            />
          </div>

          <div className="pt-8 space-y-4">
            {/* Main Stats */}
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold">{stats.totalBookings}</div>
                <div className="text-xs text-gray-400 flex items-center justify-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Kursbuchungen
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold">{stats.totalTrainings}</div>
                <div className="text-xs text-gray-400 flex items-center justify-center gap-1">
                  <Dumbbell className="h-3 w-3" />
                  Open Gym
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div className="flex justify-center gap-3 flex-wrap">
              <Badge variant="secondary" className="bg-white/10 text-white border-0">
                <Calendar className="h-3 w-3 mr-1" />
                {stats.preferredDay}
              </Badge>
              <Badge variant="secondary" className="bg-white/10 text-white border-0">
                <Clock className="h-3 w-3 mr-1" />
                {stats.preferredTime}
              </Badge>
            </div>
          </div>

          {/* Instagram handle */}
          <div className="absolute bottom-4 right-4 text-xs text-gray-400">
            @risefunctionalfitness
          </div>
        </CardContent>
      </Card>

      {/* Share button - subtle, right aligned */}
      <div className="flex justify-end">
        <Button onClick={handleShare} variant="ghost" size="sm" className="text-muted-foreground">
          <Share2 className="h-4 w-4 mr-1.5" />
          Teilen
        </Button>
      </div>

      {/* Detailed Stats */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Detaillierte Statistik
        </h3>

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
      </div>

      {/* Share Dialog */}
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        shareData={{
          type: "stats",
          icon: "stats",
          value: stats.totalSessions.toString(),
          label: "TRAININGS",
          sublabel: `${stats.totalBookings} Kurse • ${stats.totalTrainings} Open Gym`,
          stats: stats,
        }}
      />
    </div>
  );
};
