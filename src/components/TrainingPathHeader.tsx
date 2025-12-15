import { User, Grid3X3 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { StreakDisplay } from "@/components/StreakDisplay";

interface TrainingPathHeaderProps {
  user: any;
  userAvatar?: string | null;
  onProfileClick: () => void;
  onAdminClick: () => void;
}

export const TrainingPathHeader: React.FC<TrainingPathHeaderProps> = ({
  user,
  userAvatar,
  onProfileClick,
  onAdminClick,
}) => {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    const checkRole = async () => {
      if (!user?.id) return;

      try {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        setIsAdmin(!!roleData);
      } catch (error) {
        console.error("Error checking role:", error);
      }
    };

    checkRole();
  }, [user?.id]);

  return (
    <div className="flex items-center justify-between p-4 bg-background border-b">
      {/* Links: Avatar */}
      <div className="flex-1">
        <Avatar
          className="h-10 w-10 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
          onClick={onProfileClick}
        >
          <AvatarImage src={userAvatar || undefined} />
          <AvatarFallback>
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Mitte: Logo */}
      <div className="flex-1 flex justify-center">
        <Logo
          className="h-10 mt-1"
          onClick={() => (window.location.href = "/pro")}
        />
      </div>

      {/* Rechts: Streak Display + Admin Grid */}
      <div className="flex items-center gap-3 flex-1 justify-end">
        {user && <StreakDisplay user={user} />}
        {/* Admin-Zugang Button */}
        {isAdmin && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onAdminClick}
            className="p-2"
          >
            <Grid3X3 className="h-5 w-5 text-primary" />
          </Button>
        )}
      </div>
    </div>
  );
};
