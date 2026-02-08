import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  // Mark achievements as seen when dialog opens
  useEffect(() => {
    if (open) {
      markAchievementsSeen();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="sticky top-0 bg-background z-10 border-b">
            <TabsList className="w-full grid grid-cols-3 h-14 rounded-none bg-muted/50">
              <TabsTrigger 
                value="achievements" 
                className="flex flex-col gap-0.5 text-xs data-[state=active]:bg-background"
              >
                <Trophy className="h-4 w-4" />
                Achievements
              </TabsTrigger>
              <TabsTrigger 
                value="stats" 
                className="flex flex-col gap-0.5 text-xs data-[state=active]:bg-background"
              >
                <BarChart3 className="h-4 w-4" />
                Statistiken
              </TabsTrigger>
              <TabsTrigger 
                value="milestones" 
                className="flex flex-col gap-0.5 text-xs data-[state=active]:bg-background"
              >
                <Target className="h-4 w-4" />
                Meilensteine
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="overflow-y-auto max-h-[calc(85vh-56px)]">
            <TabsContent value="achievements" className="m-0 p-4">
              <AchievementsSlide 
                userId={userId}
                achievements={achievements} 
                stats={stats}
                isLoading={isLoading} 
              />
            </TabsContent>

            <TabsContent value="stats" className="m-0 p-4">
              <StatsSlide 
                userId={userId}
                stats={stats} 
                isLoading={isLoading} 
              />
            </TabsContent>

            <TabsContent value="milestones" className="m-0 p-4">
              <MilestonesSlide
                userId={userId}
                nextMilestones={nextMilestones}
                currentChallenge={currentChallenge}
                onChallengeClick={onChallengeClick}
                isLoading={isLoading}
              />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
