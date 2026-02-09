import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, ChevronLeft, ChevronRight } from "lucide-react";
import { Achievement, UserStats } from "@/hooks/useUserAchievements";
import { ShareDialog } from "@/components/highlights/ShareDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AchievementIcon } from "@/components/highlights/AchievementIcon";

interface AchievementsSlideProps {
  userId: string;
  achievements: Achievement[];
  stats: UserStats | null;
  isLoading: boolean;
}

export const AchievementsSlide = ({
  userId,
  achievements,
  stats,
  isLoading,
}: AchievementsSlideProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  // Generate shareable cards from achievements and stats
  const shareableCards = generateShareableCards(achievements, stats);

  if (shareableCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-6xl mb-4">🏆</div>
        <h3 className="text-lg font-semibold mb-2">Noch keine Achievements</h3>
        <p className="text-muted-foreground text-sm max-w-xs">
          Trainiere regelmäßig um deine ersten Achievements zu erreichen!
        </p>
      </div>
    );
  }

  const currentCard = shareableCards[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : shareableCards.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < shareableCards.length - 1 ? prev + 1 : 0));
  };

  const handleShare = () => {
    if (currentCard.achievement) {
      setSelectedAchievement(currentCard.achievement);
    }
    setShareDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Achievement Card Preview */}
      <div className="relative">
        <Card className="text-white border-0 overflow-hidden" style={{ background: 'linear-gradient(to bottom right, #080607, #0c090a, #060405)' }}>
          {/* Red gradient overlay from bottom */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(139, 30, 30, 0.6) 0%, rgba(100, 20, 20, 0.3) 30%, transparent 100%)' }} />
          <CardContent className="p-6 flex flex-col items-center justify-center min-h-[280px] relative">
            {/* RISE Logo placeholder */}
            <div className="absolute top-4 left-4">
              <img 
                src="/logos/rise_dark.png" 
                alt="RISE" 
                className="h-8 opacity-80"
              />
            </div>

            {/* Main content */}
            <div className="text-center">
              <div className="mb-3 flex justify-center">
                <AchievementIcon type={currentCard.type} size={56} className="text-white fill-transparent" />
              </div>
              <div className="text-lg font-bold mb-2 text-red-500">
                {currentCard.label}
              </div>
              <div className="text-4xl font-bold">{currentCard.value}</div>
              {currentCard.sublabel && (
                <div className="text-sm text-gray-400 mt-1">{currentCard.sublabel}</div>
              )}
              {/* Type-specific chart */}
              <div className="mt-4">
                <MiniChart type={currentCard.type} stats={stats} value={currentCard.value} />
              </div>
            </div>

            {/* Instagram handle */}
            <div className="absolute bottom-2 right-4 text-xs text-gray-400">
              @risefunctionalfitness
            </div>
          </CardContent>
        </Card>

        {/* Navigation arrows */}
        {shareableCards.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Dots indicator */}
      {shareableCards.length > 1 && (
        <div className="flex justify-center gap-1.5">
          {shareableCards.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === currentIndex 
                  ? "w-6 bg-primary" 
                  : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
            />
          ))}
        </div>
      )}

      {/* Share button - subtle, right aligned */}
      <div className="flex justify-end">
        <Button onClick={handleShare} variant="ghost" size="sm" className="text-muted-foreground">
          <Share2 className="h-4 w-4 mr-1.5" />
          Teilen
        </Button>
      </div>

      {/* Share Dialog */}
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        shareData={{
          type: currentCard.type,
          icon: currentCard.icon,
          value: currentCard.value,
          label: currentCard.label,
          sublabel: currentCard.sublabel,
          stats: stats ?? undefined,
        }}
      />
    </div>
  );
};

interface ShareableCard {
  type: string;
  icon: string;
  value: string;
  label: string;
  sublabel?: string;
  achievement?: Achievement;
}

function generateShareableCards(achievements: Achievement[], stats: UserStats | null): ShareableCard[] {
  const cards: ShareableCard[] = [];

  // Group achievements by type and get only the highest value per type
  const highestByType = new Map<string, Achievement>();
  achievements.forEach((achievement) => {
    const existing = highestByType.get(achievement.type);
    if (!existing || achievement.value > existing.value) {
      highestByType.set(achievement.type, achievement);
    }
  });

  // Add current streak card (live data, not milestone)
  if (stats?.currentStreak && stats.currentStreak >= 1) {
    cards.push({
      type: "streak",
      icon: "streak",
      value: `${stats.currentStreak} Wochen`,
      label: "Streak",
      sublabel: stats.longestStreak > stats.currentStreak 
        ? `Längster: ${stats.longestStreak} Wochen` 
        : undefined,
    });
  }

  // Add highest achievement per category (skip streak if already added as live)
  highestByType.forEach((achievement, type) => {
    if (type === "streak" && stats?.currentStreak && stats.currentStreak >= 1) {
      return; // Skip - already showing current streak
    }
    cards.push({
      type: achievement.type,
      icon: achievement.type,
      value: `${achievement.value} Trainings`,
      label: "Meilenstein",
      sublabel: `${achievement.value} Trainingseinheiten absolviert`,
      achievement,
    });
  });

  // Add total trainings card if user has trainings
  if (stats?.totalSessions && stats.totalSessions > 0) {
    cards.push({
      type: "total",
      icon: "total",
      value: `${stats.totalSessions} Trainings`,
      label: "Gesamt",
      sublabel: `${stats.totalBookings} Kurse + ${stats.totalTrainings} Open Gym`,
    });
  }

  // Add this week's training card
  if (stats) {
    cards.push({
      type: "weekly",
      icon: "weekly",
      value: `${stats.thisWeekTrainings}x`,
      label: "Diese Woche",
      sublabel: `Ziel: ${stats.weeklyGoal}x pro Woche`,
    });
  }

  return cards;
}
