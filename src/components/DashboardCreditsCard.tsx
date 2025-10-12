import { Key, Dumbbell, Infinity } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DashboardCreditsCardProps {
  userId: string;
}

export const DashboardCreditsCard = ({ userId }: DashboardCreditsCardProps) => {
  const [membershipType, setMembershipType] = useState<string | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [gymCode, setGymCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    loadMembershipInfo();
    setupRealtimeUpdates();
  }, [userId]);

  const loadMembershipInfo = async () => {
    try {
      // Get membership type
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("membership_type")
        .eq("user_id", userId)
        .single();

      if (profileError) throw profileError;
      setMembershipType(profileData.membership_type);

      // If 10er Karte, get credits
      if (profileData.membership_type === "10er Karte") {
        const { data: creditsData, error: creditsError } = await supabase
          .from("membership_credits")
          .select("credits_remaining")
          .eq("user_id", userId)
          .maybeSingle();

        if (creditsError) throw creditsError;
        setCredits(creditsData?.credits_remaining || 0);
      } else {
        // Otherwise, get gym code
        const { data: codeData, error: codeError } = await supabase
          .from("gym_access_codes")
          .select("code")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (codeError) throw codeError;
        setGymCode(codeData?.code || "");
      }
    } catch (error) {
      console.error("Error loading membership info:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeUpdates = () => {
    const channel1 = supabase
      .channel("credits-card-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "membership_credits",
          filter: `user_id=eq.${userId}`,
        },
        () => loadMembershipInfo()
      )
      .subscribe();

    const channel2 = supabase
      .channel("gym-code-card-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "gym_access_codes",
        },
        () => loadMembershipInfo()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
    };
  };

  const handleClick = () => {
    setShowContent(true);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center gap-1">
          <div className="animate-pulse text-muted-foreground">...</div>
        </div>
      );
    }

    // If clicked and content should be shown
    if (showContent) {
      if (membershipType === "10er Karte") {
        return (
          <>
            <span className="text-4xl font-bold text-primary">{credits}</span>
            <span className="text-sm text-muted-foreground">Credits</span>
          </>
        );
      } else if (gymCode) {
        return (
          <>
            <span className="text-2xl font-mono font-bold text-primary">
              {gymCode}
            </span>
            <span className="text-sm text-muted-foreground">Tür-Code</span>
          </>
        );
      } else {
        return (
          <>
            <span className="text-4xl font-bold text-muted-foreground">-</span>
            <span className="text-sm text-muted-foreground">Kein Zugang</span>
          </>
        );
      }
    }

    // Default view (before click)
    return (
      <>
        <Key className="h-10 w-10 text-primary" />
        <span className="text-sm text-muted-foreground">Tür-Code</span>
      </>
    );
  };

  const popoverContent = () => {
    if (membershipType === "10er Karte") {
      return (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Mitgliedschaftsdetails</h3>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Plan</p>
              <p className="font-medium">10er Karte</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Verbleibende Credits</p>
              <p className="font-medium text-2xl text-primary">{credits}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Credits werden bei Kursanmeldungen verwendet
            </p>
          </div>
        </div>
      );
    } else if (gymCode) {
      return (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Gym-Zugang</h3>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Plan</p>
              <p className="font-medium">{membershipType || "Member"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Zugangscode</p>
              <p className="font-mono text-3xl font-bold text-primary">{gymCode}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Code für den Gym-Eingang
            </p>
          </div>
        </div>
      );
    } else {
      return (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Keine Mitgliedschaft</h3>
          <p className="text-sm text-muted-foreground">
            Du hast noch keine aktive Mitgliedschaft. Bitte wende dich an das Team.
          </p>
        </div>
      );
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          onClick={handleClick}
          className="relative bg-gray-100 dark:bg-gray-800 rounded-2xl p-3 h-24 hover:bg-gray-150 dark:hover:bg-gray-700 transition-all hover:scale-[1.02] w-full"
        >
          {/* Icon top-right */}
          <Dumbbell className="absolute top-3 right-3 h-5 w-5 text-primary" />

          {/* Center Content */}
          <div className="flex flex-col items-center justify-center h-full text-center gap-1">
            {renderContent()}
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        {popoverContent()}
      </PopoverContent>
    </Popover>
  );
};
