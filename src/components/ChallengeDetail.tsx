import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, Check, Star, Snowflake } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BadgeImage } from "@/components/BadgeIconMapper";

interface Challenge {
  id: string;
  title: string;
  description: string;
  checkpoint_count: number;
  month: number;
  year: number;
  icon: string;
  bonus_points?: number;
}

interface ChallengeProgress {
  id: string;
  completed_checkpoints: number;
  is_completed: boolean;
}

interface ChallengeDetailProps {
  challenge: Challenge | null;
  progress: ChallengeProgress | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProgressUpdate: () => void;
}

export default function ChallengeDetail({ 
  challenge, 
  progress, 
  open, 
  onOpenChange, 
  onProgressUpdate 
}: ChallengeDetailProps) {
  const [checkpoints, setCheckpoints] = useState<boolean[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (challenge && progress) {
      loadCheckpoints();
    }
  }, [challenge, progress]);

  const loadCheckpoints = async () => {
    if (!challenge || !progress) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: checkpointData, error } = await supabase
        .from("challenge_checkpoints")
        .select("checkpoint_number")
        .eq("user_id", userData.user.id)
        .eq("challenge_id", challenge.id);

      if (error) throw error;

      const checkedNumbers = new Set((checkpointData || []).map(c => c.checkpoint_number));
      const checkpointArray = Array.from({ length: challenge.checkpoint_count }, (_, index) => 
        checkedNumbers.has(index + 1)
      );
      
      setCheckpoints(checkpointArray);
    } catch (error) {
      console.error("Error loading checkpoints:", error);
    }
  };

  const toggleCheckpoint = async (index: number) => {
    if (!challenge || !progress || loading) return;

    setLoading(true);
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const checkpointNumber = index + 1;
      const isCurrentlyChecked = checkpoints[index];

      // Update local state immediately for instant UI feedback
      const newCheckpoints = [...checkpoints];
      newCheckpoints[index] = !isCurrentlyChecked;
      setCheckpoints(newCheckpoints);

      // Calculate new count from actual checkpoints
      const newCheckedCount = newCheckpoints.filter(Boolean).length;

      if (isCurrentlyChecked) {
        // Remove checkpoint
        const { error } = await supabase
          .from("challenge_checkpoints")
          .delete()
          .eq("user_id", userData.user.id)
          .eq("challenge_id", challenge.id)
          .eq("checkpoint_number", checkpointNumber);

        if (error) throw error;
      } else {
        // Add checkpoint
        const { error } = await supabase
          .from("challenge_checkpoints")
          .insert({
            user_id: userData.user.id,
            challenge_id: challenge.id,
            checkpoint_number: checkpointNumber
          });

        if (error) throw error;
      }
      
      const isCompleted = newCheckedCount >= challenge.checkpoint_count;

      const { error: progressError } = await supabase
        .from("user_challenge_progress")
        .update({
          completed_checkpoints: newCheckedCount,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null
        })
        .eq("id", progress.id);

      if (progressError) throw progressError;

      // If just completed, create badge
      const wasNotCompleted = !progress.is_completed;
      
      // Update local progress object
      progress.completed_checkpoints = newCheckedCount;
      progress.is_completed = isCompleted;

      if (isCompleted && wasNotCompleted) {
        const { error: badgeError } = await supabase
          .from("user_badges")
          .insert({
            user_id: userData.user.id,
            challenge_id: challenge.id
          });

        if (badgeError && badgeError.code !== '23505') { // Ignore duplicate error
          throw badgeError;
        }

        // Award streak freeze if user has streak entry and < 2 freezes
        const { data: streakData } = await supabase
          .from("weekly_streaks")
          .select("streak_freezes")
          .eq("user_id", userData.user.id)
          .maybeSingle();

        let freezeAwarded = false;
        if (streakData && streakData.streak_freezes < 2) {
          const { error: freezeError } = await supabase
            .from("weekly_streaks")
            .update({ 
              streak_freezes: streakData.streak_freezes + 1,
              updated_at: new Date().toISOString()
            })
            .eq("user_id", userData.user.id);

          if (!freezeError) {
            freezeAwarded = true;
          }
        }

        setShowConfetti(true);
        toast({ 
          title: "Challenge abgeschlossen! 🎉", 
          description: freezeAwarded 
            ? "Du hast ein Abzeichen + 1 Streak Freeze erhalten!" 
            : "Du hast ein neues Abzeichen erhalten!" 
        });
        
        setTimeout(() => setShowConfetti(false), 3000);
      }

      // Notify parent to update progress
      onProgressUpdate();
      
    } catch (error) {
      console.error("Error toggling checkpoint:", error);
      // Revert local state on error
      await loadCheckpoints();
      toast({ title: "Fehler beim Aktualisieren", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!challenge || !progress) return null;

  const progressPercentage = (progress.completed_checkpoints / challenge.checkpoint_count) * 100;
  const gridCols = challenge.checkpoint_count <= 10 ? "grid-cols-5" : 
                   challenge.checkpoint_count <= 16 ? "grid-cols-4" : "grid-cols-6";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center">
          <div className="flex flex-col items-center gap-4 mb-2">
            <BadgeImage 
              icon={challenge.icon} 
              alt={challenge.title}
              className="w-24 h-24"
            />
            <DialogTitle className="flex items-center gap-2 justify-center">
              {challenge.title}
              {progress.is_completed && (
                <Badge variant="default" className="bg-green-500">
                  <Star className="w-3 h-3 mr-1" />
                  Abgeschlossen
                </Badge>
              )}
            </DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <p className="text-muted-foreground">{challenge.description}</p>
            {challenge.bonus_points && (
              <p className="text-sm text-primary font-medium mt-2">
                💪 {challenge.bonus_points} Bonus Punkte für das Leaderboard
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <Snowflake className="h-4 w-4 text-blue-400" />
              1 Bonus Freeze
            </p>
          </div>
          
          <div>
            <h3 className="font-medium mb-3">Checkpoints ({progress.completed_checkpoints}/{challenge.checkpoint_count})</h3>
            <div className={`grid ${gridCols} gap-2`}>
              {Array.from({ length: challenge.checkpoint_count }, (_, index) => (
                <Button
                  key={index}
                  variant={checkpoints[index] ? "default" : "outline"}
                  size="sm"
                  className="aspect-square p-0 relative"
                  onClick={() => toggleCheckpoint(index)}
                  disabled={loading || progress.is_completed}
                >
                  {checkpoints[index] ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span className="text-xs">{index + 1}</span>
                  )}
                  {showConfetti && checkpoints[index] && (
                    <div className="absolute inset-0 animate-ping bg-primary/20 rounded"></div>
                  )}
                </Button>
              ))}
            </div>
          </div>
          
          {progress.is_completed && (
            <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <Star className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <p className="font-medium text-green-800 dark:text-green-200">
                Herzlichen Glückwunsch!
              </p>
              <p className="text-sm text-green-600 dark:text-green-300">
                Du hast die Challenge erfolgreich abgeschlossen
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}