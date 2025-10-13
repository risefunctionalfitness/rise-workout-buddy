import { useEffect, useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { UserX, ChevronLeft, ChevronRight } from "lucide-react";

interface InactiveMember {
  userId: string;
  displayName: string;
  lastLoginAt: string | null;
  daysSinceLogin: number;
  membershipType: string;
  wasEverActive?: boolean;
}

export const InactiveMembersCard = () => {
  const [loading, setLoading] = useState(true);
  const [inactiveMembers, setInactiveMembers] = useState<InactiveMember[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadInactiveMembers();
  }, []);

  const loadInactiveMembers = async () => {
    try {
      const { data, error } = await supabase.rpc('get_inactive_members', {
        days_threshold: 21
      });

      if (error) throw error;

      const members: InactiveMember[] = (data || []).map(member => {
        const displayName = member.first_name && member.last_name
          ? `${member.first_name} ${member.last_name}`
          : member.display_name || 'Unbekannt';

        return {
          userId: member.user_id,
          displayName,
          lastLoginAt: member.last_activity,
          daysSinceLogin: member.days_since_activity,
          membershipType: member.membership_type || 'Kein Abo',
          wasEverActive: member.was_ever_active,
        };
      });

      setInactiveMembers(members);
    } catch (error) {
      console.error('Error loading inactive members:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatLastActivity = (lastActivity: string | null, daysSinceActivity: number): string => {
    // Über 12 Monate (365 Tage): Zeige 12+ Mon.
    if (daysSinceActivity >= 365) {
      return '12+ Mon.';
    }
    
    // Prüfe auf '1970-01-01' → Nie aktiv
    if (!lastActivity || lastActivity === '1970-01-01T00:00:00+00:00' || lastActivity.startsWith('1970-01-01')) {
      if (daysSinceActivity === 0) return 'Nie aktiv (heute registriert)';
      if (daysSinceActivity === 1) return 'Nie aktiv (gestern registriert)';
      if (daysSinceActivity < 7) return `Nie aktiv (vor ${daysSinceActivity} Tagen registriert)`;
      if (daysSinceActivity < 30) return `Nie aktiv (vor ${Math.floor(daysSinceActivity / 7)} Wo. registriert)`;
      return `Nie aktiv (vor ${Math.floor(daysSinceActivity / 30)} Mon. registriert)`;
    }
    
    // Normale Aktivität
    if (daysSinceActivity === 0) return 'Heute';
    if (daysSinceActivity === 1) return 'Gestern';
    if (daysSinceActivity < 7) return `vor ${daysSinceActivity} Tagen`;
    if (daysSinceActivity < 30) return `vor ${Math.floor(daysSinceActivity / 7)} Wo.`;
    return `vor ${Math.floor(daysSinceActivity / 30)} Mon.`;
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

  const totalPages = Math.ceil(inactiveMembers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMembers = inactiveMembers.slice(startIndex, endIndex);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <UserX className="h-5 w-5 text-primary" />
          <CardTitle>Schläfermitglieder</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">Keine Aktivität seit 21+ Tagen</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {currentMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine inaktiven Mitglieder</p>
        ) : (
          currentMembers.map((member) => (
            <div key={member.userId} className="flex justify-between items-center">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{member.displayName}</p>
                <p className="text-xs text-muted-foreground">
                  Letzte Aktivität: {formatLastActivity(member.lastLoginAt, member.daysSinceLogin)}
                </p>
              </div>
              <Badge variant="outline" className="ml-2">
                {member.membershipType}
              </Badge>
            </div>
          ))
        )}
      </CardContent>
      {totalPages > 1 && (
        <CardFooter>
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              Seite {currentPage} von {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
};
