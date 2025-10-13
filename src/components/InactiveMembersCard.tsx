import { useEffect, useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { UserX } from "lucide-react";

interface InactiveMember {
  userId: string;
  displayName: string;
  lastLoginAt: string | null;
  daysSinceLogin: number;
  membershipType: string;
}

export const InactiveMembersCard = () => {
  const [loading, setLoading] = useState(true);
  const [inactiveMembers, setInactiveMembers] = useState<InactiveMember[]>([]);
  const [totalInactive, setTotalInactive] = useState(0);

  useEffect(() => {
    loadInactiveMembers();
  }, []);

  const loadInactiveMembers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('display_name, first_name, last_name, last_login_at, user_id, status, membership_type')
        .eq('status', 'inactive')
        .order('last_login_at', { ascending: true, nullsFirst: true });

      if (error) throw error;

      const currentDate = new Date();
      const members: InactiveMember[] = (profiles || []).map(profile => {
        let daysSinceLogin = 999;
        if (profile.last_login_at) {
          const lastLogin = new Date(profile.last_login_at);
          daysSinceLogin = Math.floor((currentDate.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
        }

        const displayName = profile.first_name && profile.last_name
          ? `${profile.first_name} ${profile.last_name}`
          : profile.display_name || 'Unbekannt';

        const membershipType = profile.membership_type || 'Kein Abo';

        return {
          userId: profile.user_id,
          displayName,
          lastLoginAt: profile.last_login_at,
          daysSinceLogin,
          membershipType,
        };
      });

      setTotalInactive(members.length);
      setInactiveMembers(members.slice(0, 10));
    } catch (error) {
      console.error('Error loading inactive members:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatLastLogin = (lastLoginAt: string | null, daysSinceLogin: number): string => {
    if (!lastLoginAt) return 'Nie eingeloggt';
    if (daysSinceLogin === 0) return 'Heute';
    if (daysSinceLogin === 1) return 'Gestern';
    if (daysSinceLogin < 7) return `vor ${daysSinceLogin} Tagen`;
    if (daysSinceLogin < 30) return `vor ${Math.floor(daysSinceLogin / 7)} Wo.`;
    return `vor ${Math.floor(daysSinceLogin / 30)} Mon.`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <UserX className="h-5 w-5 text-primary" />
          <CardTitle>Schläfermitglieder</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {inactiveMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine inaktiven Mitglieder</p>
        ) : (
          inactiveMembers.map((member) => (
            <div key={member.userId} className="flex justify-between items-center">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{member.displayName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatLastLogin(member.lastLoginAt, member.daysSinceLogin)}
                </p>
              </div>
              <Badge variant="outline" className="ml-2">
                {member.membershipType}
              </Badge>
            </div>
          ))
        )}
      </CardContent>
      {totalInactive > 10 && (
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            ... und {totalInactive - 10} weitere inaktive Mitglieder
          </p>
        </CardFooter>
      )}
    </Card>
  );
};
