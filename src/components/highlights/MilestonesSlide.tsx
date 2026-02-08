import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Award, Target, Trophy, Check, Star } from "lucide-react";
import { NextMilestone } from "@/hooks/useUserAchievements";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { BadgeImage } from "@/components/BadgeIconMapper";

interface MilestonesSlideProps {
  userId: string;
  nextMilestones: NextMilestone[];
  currentChallenge?: any;
  onChallengeClick?: () => void;
  isLoading: boolean;
}

interface ChallengeProgress {
  completed_checkpoints: number;
  is_completed: boolean;
}

interface UserBadge {
  id: string;
  earned_at: string;
  challenge: {
    id: string;
    title: string;
    icon: string;
    month: number;
    year: number;
  };
}

export const MilestonesSlide = ({
  userId,
  nextMilestones,
  currentChallenge,
  onChallengeClick,
  isLoading,
}: MilestonesSlideProps) => {
  const [challengeProgress, setChallengeProgress] = useState<ChallengeProgress | null>(null);
  const [earnedBadges, setEarnedBadges] = useState<UserBadge[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(true);

  useEffect(() => {
    if (userId) {
      loadChallengeProgress();
      loadEarnedBadges();
    }
  }, [userId, currentChallenge]);

  const loadChallengeProgress = async () => {
    if (!currentChallenge) return;

    const { data, error } = await supabase
      .from("user_challenge_progress")
      .select("completed_checkpoints, is_completed")
      .eq("user_id", userId)
      .eq("challenge_id", currentChallenge.id)
      .maybeSingle();

    if (!error) {
      setChallengeProgress(data);
    }
  };

  const loadEarnedBadges = async () => {
    setLoadingBadges(true);
    const { data, error } = await supabase
      .from("user_badges")
      .select(`
        id,
        earned_at,
        challenge:monthly_challenges (
          id,
          title,
          icon,
          month,
          year
        )
      `)
      .eq("user_id", userId)
      .order("earned_at", { ascending: false })
      .limit(6);

    if (!error && data) {
      setEarnedBadges(data as unknown as UserBadge[]);
    }
    setLoadingBadges(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const challengePercentage = currentChallenge && challengeProgress
    ? (challengeProgress.completed_checkpoints / currentChallenge.checkpoint_count) * 100
    : 0;

  return (
    <div className="space-y-4">
      {/* Monthly Challenge */}
      {currentChallenge && (
        <Card 
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={onChallengeClick}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <BadgeImage 
                  icon={currentChallenge.icon} 
                  alt={currentChallenge.title}
                  className="w-12 h-12"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm truncate">
                    Monatschallenge
                  </h3>
                  {challengeProgress?.is_completed && (
                    <Badge variant="default" className="bg-green-500 text-xs px-1.5 py-0">
                      <Check className="h-3 w-3" />
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                  {currentChallenge.title}
                </p>
                <div className="flex items-center gap-2">
                  <Progress value={challengePercentage} className="h-2 flex-1" />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {challengeProgress?.completed_checkpoints || 0}/{currentChallenge.checkpoint_count}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Milestones */}
      {nextMilestones.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Nächste Ziele
          </h3>
          <div className="space-y-3">
            {nextMilestones.map((milestone, idx) => {
              const percentage = (milestone.current / milestone.target) * 100;
              const remaining = milestone.target - milestone.current;
              return (
                <Card key={idx}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{milestone.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{milestone.label}</span>
                          <span className="text-xs text-muted-foreground">
                            noch {remaining}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={percentage} className="h-2 flex-1" />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {milestone.current}/{milestone.target}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Earned Badges */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4" />
          Erreichte Badges
        </h3>
        {loadingBadges ? (
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : earnedBadges.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {earnedBadges.map((badge) => (
              <Card key={badge.id} className="overflow-hidden">
                <CardContent className="p-2 flex flex-col items-center">
                  <BadgeImage 
                    icon={badge.challenge?.icon || "trophy"} 
                    alt={badge.challenge?.title || "Badge"}
                    className="w-10 h-10 mb-1"
                  />
                  <span className="text-[10px] text-muted-foreground text-center line-clamp-1">
                    {getMonthName(badge.challenge?.month)} {badge.challenge?.year?.toString().slice(-2)}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-4 text-center">
              <Award className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Schließe Challenges ab um Badges zu sammeln!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

function getMonthName(month?: number): string {
  if (!month) return "";
  const months = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  return months[month - 1] || "";
}
