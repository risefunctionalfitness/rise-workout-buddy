import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Target, Trophy, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface UserBadge {
  id: string;
  earned_at: string;
  monthly_challenges: {
    title: string;
    icon: string;
    month: number;
    year: number;
  };
}

const ICON_MAP = {
  target: Target,
  dumbbell: Target,
  flame: Star,
  clock: Calendar,
  sun: Star,
  star: Star,
  trophy: Trophy,
  zap: Star
};

const MONTHS = [
  "Jan", "Feb", "Mär", "Apr", "Mai", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"
];

export default function UserBadges() {
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserBadges();
  }, []);

  const loadUserBadges = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from("user_badges")
        .select(`
          id,
          earned_at,
          monthly_challenges (
            title,
            icon,
            month,
            year
          )
        `)
        .eq("user_id", userData.user.id)
        .order("earned_at", { ascending: false });

      if (error) throw error;
      setBadges(data || []);
    } catch (error) {
      console.error("Error loading badges:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <h3 className="font-medium">Abzeichen</h3>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (badges.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="font-medium">Abzeichen</h3>
        <div className="text-center py-8 text-muted-foreground">
          <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Noch keine Abzeichen erhalten</p>
          <p className="text-xs">Schließe Challenges ab, um Abzeichen zu sammeln!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium">Abzeichen ({badges.length})</h3>
      <div className="grid grid-cols-3 gap-2">
        {badges.map((badge) => {
          const IconComponent = ICON_MAP[badge.monthly_challenges.icon as keyof typeof ICON_MAP] || Target;
          const monthName = MONTHS[badge.monthly_challenges.month - 1];
          
          return (
            <Card key={badge.id} className="aspect-square p-2 relative group hover:scale-105 transition-transform">
              <CardContent className="p-0 h-full flex flex-col items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                  <IconComponent className="w-4 h-4 text-primary" />
                </div>
                <Badge variant="outline" className="text-xs px-1 py-0">
                  {monthName} {badge.monthly_challenges.year}
                </Badge>
                
                {/* Tooltip */}
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-popover border rounded px-2 py-1 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  {badge.monthly_challenges.title}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}