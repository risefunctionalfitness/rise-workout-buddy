import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, ChevronLeft, ChevronRight } from "lucide-react";
import { Achievement, UserStats } from "@/hooks/useUserAchievements";
import { ShareDialog } from "@/components/highlights/ShareDialog";
import { Skeleton } from "@/components/ui/skeleton";

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
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 text-white border-0 overflow-hidden">
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
              <div className="text-5xl mb-3">{currentCard.icon}</div>
              <div className="text-4xl font-bold mb-2">{currentCard.value}</div>
              <div className="text-lg font-medium text-gray-200">{currentCard.label}</div>
              {currentCard.sublabel && (
                <div className="text-sm text-gray-400 mt-1">{currentCard.sublabel}</div>
              )}
            </div>

            {/* Instagram handle */}
            <div className="absolute bottom-4 right-4 text-xs text-gray-400">
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

      {/* Share button */}
      <Button onClick={handleShare} className="w-full" size="lg">
        <Share2 className="h-4 w-4 mr-2" />
        Teilen
      </Button>

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

  // Add streak card if user has a streak
  if (stats?.currentStreak && stats.currentStreak >= 1) {
    cards.push({
      type: "streak",
      icon: "🔥",
      value: stats.currentStreak.toString(),
      label: "WOCHEN STREAK",
      sublabel: stats.longestStreak > stats.currentStreak 
        ? `Längster: ${stats.longestStreak} Wochen` 
        : undefined,
    });
  }

  // Add achievement cards
  achievements.forEach((achievement) => {
    cards.push({
      type: achievement.type,
      icon: achievement.icon,
      value: achievement.value.toString(),
      label: achievement.type === "streak" ? "WOCHEN STREAK" : "TRAININGS",
      sublabel: achievement.description,
      achievement,
    });
  });

  // Add total trainings card if user has trainings
  if (stats?.totalSessions && stats.totalSessions > 0) {
    cards.push({
      type: "total",
      icon: "💪",
      value: stats.totalSessions.toString(),
      label: "TRAININGS GESAMT",
      sublabel: `${stats.totalBookings} Kurse + ${stats.totalTrainings} Open Gym`,
    });
  }

  // Remove duplicates (keep unique by type+value)
  const seen = new Set<string>();
  return cards.filter((card) => {
    const key = `${card.type}-${card.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
