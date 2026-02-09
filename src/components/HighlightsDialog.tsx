import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Trophy, BarChart3, Target } from "lucide-react";
import { useUserAchievements } from "@/hooks/useUserAchievements";
import { AchievementsSlide } from "@/components/highlights/AchievementsSlide";
import { StatsSlide } from "@/components/highlights/StatsSlide";
import { MilestonesSlide } from "@/components/highlights/MilestonesSlide";

interface HighlightsDialogProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentChallenge?: any;
  onChallengeClick?: () => void;
}

export const HighlightsDialog = ({
  userId,
  open,
  onOpenChange,
  currentChallenge,
  onChallengeClick,
}: HighlightsDialogProps) => {
  const [activeTab, setActiveTab] = useState("achievements");
  const { achievements, stats, nextMilestones, isLoading, markAchievementsSeen } = useUserAchievements(userId);

  useEffect(() => {
    if (open) {
      markAchievementsSeen();
    }
  }, [open]);

  const tabs = [
    { id: "achievements", label: "Achievements", icon: Trophy },
    { id: "stats", label: "Statistiken", icon: BarChart3 },
    { id: "milestones", label: "Meilensteine", icon: Target },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden p-0">
        {/* Custom pill navigation */}
        <div className="sticky top-0 z-10 px-4 pt-4 pb-2 bg-background">
          <div className="flex gap-1 p-1 rounded-xl bg-muted/60">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(85vh-72px)]">
          {activeTab === "achievements" && (
            <div className="p-4">
              <AchievementsSlide 
                userId={userId}
                achievements={achievements} 
                stats={stats}
                isLoading={isLoading} 
              />
            </div>
          )}

          {activeTab === "stats" && (
            <div className="p-4">
              <StatsSlide 
                userId={userId}
                stats={stats} 
                isLoading={isLoading} 
              />
            </div>
          )}

          {activeTab === "milestones" && (
            <div className="p-4">
              <MilestonesSlide
                userId={userId}
                nextMilestones={nextMilestones}
                currentChallenge={currentChallenge}
                onChallengeClick={onChallengeClick}
                isLoading={isLoading}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
