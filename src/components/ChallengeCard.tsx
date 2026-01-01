import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, Calendar, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Challenge {
  id: string;
  title: string;
  description: string;
  checkpoint_count: number;
  month: number;
  year: number;
  icon: string;
}

interface ChallengeProgress {
  id: string;
  completed_checkpoints: number;
  is_completed: boolean;
}

interface ChallengeCardProps {
  onOpenChallenge: (challenge: Challenge, progress: ChallengeProgress) => void;
}

const ICON_MAP = {
  target: Target,
  dumbbell: Target,
  flame: Star,
  clock: Calendar,
  sun: Star,
  star: Star,
  trophy: Star,
  zap: Star
};

export default function ChallengeCard({ onOpenChallenge }: ChallengeCardProps) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [progress, setProgress] = useState<ChallengeProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadCurrentChallenge();
  }, []);

  const loadCurrentChallenge = async () => {
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      // First try to find a challenge for the current year
      let { data: challengeData, error: challengeError } = await supabase
        .from("monthly_challenges")
        .select("*")
        .eq("month", currentMonth)
        .eq("year", currentYear)
        .eq("is_archived", false)
        .single();

      // If no challenge found for current year, look for recurring challenge from previous years
      if (!challengeData && (!challengeError || challengeError.code === 'PGRST116')) {
        const { data: recurringChallenge, error: recurringError } = await supabase
          .from("monthly_challenges")
          .select("*")
          .eq("month", currentMonth)
          .eq("is_recurring", true)
          .eq("is_archived", false)
          .order("year", { ascending: false })
          .limit(1)
          .single();

        if (recurringError && recurringError.code !== 'PGRST116') {
          throw recurringError;
        }
        challengeData = recurringChallenge;
      } else if (challengeError && challengeError.code !== 'PGRST116') {
        throw challengeError;
      }

      if (!challengeData) {
        setLoading(false);
        return;
      }

      setChallenge(challengeData);

      // Get user's progress for this challenge
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: progressData, error: progressError } = await supabase
          .from("user_challenge_progress")
          .select("*")
          .eq("user_id", userData.user.id)
          .eq("challenge_id", challengeData.id)
          .single();

        if (progressError && progressError.code !== 'PGRST116') {
          throw progressError;
        }

        if (progressData) {
          setProgress(progressData);
        } else {
          // Create initial progress record
          const { data: newProgress, error: insertError } = await supabase
            .from("user_challenge_progress")
            .insert({
              user_id: userData.user.id,
              challenge_id: challengeData.id,
              completed_checkpoints: 0,
              is_completed: false
            })
            .select()
            .single();

          if (insertError) throw insertError;
          setProgress(newProgress);
        }
      }
    } catch (error) {
      console.error("Error loading challenge:", error);
      toast({ title: "Fehler beim Laden der Challenge", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-muted rounded w-1/2 mb-4"></div>
          <div className="h-2 bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!challenge || !progress) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <Calendar className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">Keine aktive Challenge für diesen Monat</p>
        </CardContent>
      </Card>
    );
  }

  const IconComponent = ICON_MAP[challenge.icon as keyof typeof ICON_MAP] || Target;
  const progressPercentage = (progress.completed_checkpoints / challenge.checkpoint_count) * 100;

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconComponent className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">{challenge.title}</CardTitle>
          </div>
          {progress.is_completed && (
            <Badge variant="default" className="bg-green-500">
              <Star className="w-3 h-3 mr-1" />
              Abgeschlossen
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{challenge.description}</p>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Fortschritt</span>
              <span>{progress.completed_checkpoints}/{challenge.checkpoint_count}</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
          
          <Button 
            onClick={() => onOpenChallenge(challenge, progress)}
            className="w-full"
            variant={progress.is_completed ? "outline" : "default"}
          >
            {progress.is_completed ? "Challenge anzeigen" : "Challenge öffnen"}
          </Button>
        </div>
      </CardContent>
      
      {/* Decorative gradient overlay */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full" />
    </Card>
  );
}