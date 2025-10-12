import { Calendar, Clock, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ProfileImageViewer } from "./ProfileImageViewer";
import { MembershipBadge } from "./MembershipBadge";

interface UpcomingClassReservationProps {
  user: any;
}

export const UpcomingClassReservation = ({
  user,
}: UpcomingClassReservationProps) => {
  const [upcomingCourse, setUpcomingCourse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [isTrainer, setIsTrainer] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<{ imageUrl: string | null; displayName: string } | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadUpcomingReservation();
      loadUserInfo();
      setupRealtimeUpdates();
    }
  }, [user?.id]);

  const loadUserInfo = async () => {
    try {
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      if (rolesData) {
        const roles = rolesData.map(r => r.role);
        setIsTrainer(roles.includes('trainer'));
        setIsAdmin(roles.includes('admin'));
      }
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  };

  const loadUpcomingReservation = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*, course_registrations!inner(id)")
        .eq("course_registrations.user_id", user.id)
        .eq("course_registrations.status", "registered")
        .gte("course_date", format(new Date(), "yyyy-MM-dd"))
        .order("course_date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setUpcomingCourse(data);
    } catch (error) {
      console.error("Error loading upcoming reservation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadParticipants = async () => {
    if (!upcomingCourse?.id) return;

    try {
      const { data, error } = await supabase
        .from("course_registrations")
        .select("status, profiles(display_name, first_name, nickname, avatar_url, membership_type)")
        .eq("course_id", upcomingCourse.id)
        .in("status", ["registered", "waitlist"])
        .order("registered_at", { ascending: true });

      if (error) throw error;
      setParticipants(data || []);
    } catch (error) {
      console.error("Error loading participants:", error);
    }
  };

  const setupRealtimeUpdates = () => {
    const channel = supabase
      .channel("upcoming-course-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "course_registrations",
          filter: `user_id=eq.${user.id}`,
        },
        () => loadUpcomingReservation()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const canCancelCourse = () => {
    if (!upcomingCourse) return false;
    
    const courseDateTime = new Date(
      `${upcomingCourse.course_date}T${upcomingCourse.start_time}`
    );
    const cancellationDeadline = new Date(
      courseDateTime.getTime() -
        upcomingCourse.cancellation_deadline_minutes * 60000
    );
    return new Date() < cancellationDeadline;
  };

  const handleCancel = async () => {
    if (!upcomingCourse || !canCancelCourse()) return;

    try {
      const { error } = await supabase
        .from("course_registrations")
        .update({ status: "cancelled" })
        .eq("course_id", upcomingCourse.id)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Anmeldung erfolgreich storniert");

      window.dispatchEvent(new CustomEvent("courseRegistrationChanged"));
      setShowDialog(false);
      loadUpcomingReservation();
    } catch (error) {
      console.error("Error cancelling registration:", error);
      toast.error("Fehler bei der Stornierung");
    }
  };

  const handleCardClick = () => {
    if (upcomingCourse) {
      loadParticipants();
      setShowDialog(true);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 h-auto">
        <div className="animate-pulse text-muted-foreground text-sm text-center">
          Lade Reservierung...
        </div>
      </div>
    );
  }

  if (!upcomingCourse) {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 h-auto">
        <div className="flex items-center gap-2 justify-center text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span className="text-sm">Keine anstehenden Kursreservierungen</span>
        </div>
      </div>
    );
  }

  const courseDateTime = new Date(
    `${upcomingCourse.course_date}T${upcomingCourse.start_time}`
  );

  const registeredCount = participants.filter(p => p.status === 'registered').length;
  const waitlistCount = participants.filter(p => p.status === 'waitlist').length;

  return (
    <>
      <button
        onClick={handleCardClick}
        className="relative bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 h-auto hover:bg-gray-150 dark:hover:bg-gray-700 transition-all hover:scale-[1.02] cursor-pointer w-full"
      >
        <Calendar className="absolute top-3 right-3 h-4 w-4 text-gray-600 dark:text-gray-400" />
        
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          <span className="text-sm text-muted-foreground">
            Nächste Reservierung
          </span>
          <span className="text-base font-semibold">{upcomingCourse.title}</span>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              {format(courseDateTime, "EEEE HH:mm", { locale: de })} -{" "}
              {upcomingCourse.end_time?.slice(0, 5)}
            </span>
          </div>
        </div>
      </button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{upcomingCourse.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Course Details */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                {format(parseISO(upcomingCourse.course_date), 'EEEE, dd.MM.yyyy', { locale: de })}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                {upcomingCourse.start_time.slice(0, 5)} - {upcomingCourse.end_time.slice(0, 5)}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4" />
                Trainer: {upcomingCourse.trainer}
              </div>
              {upcomingCourse.strength_exercise && (
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">
                    Kraftteil: {upcomingCourse.strength_exercise}
                  </Badge>
                </div>
              )}
            </div>

            {/* Participants */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">
                Teilnehmer ({registeredCount}/{upcomingCourse.max_participants})
              </h4>
              <div className="max-h-64 overflow-y-auto">
                {participants.filter(p => p.status === 'registered').length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="text-muted-foreground">Keine Anmeldungen</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {participants
                      .filter(p => p.status === 'registered')
                      .map((participant, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => participant.profiles?.avatar_url && setSelectedProfile({ 
                                imageUrl: participant.profiles.avatar_url, 
                                displayName: participant.profiles?.nickname || participant.profiles?.display_name || 'Unbekannt' 
                              })}
                            >
                              {participant.profiles?.avatar_url ? (
                                <img 
                                  src={participant.profiles.avatar_url} 
                                  alt="Avatar" 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-xs font-medium">
                                  {participant.profiles?.display_name?.charAt(0) || '?'}
                                </span>
                              )}
                            </div>
                            <span className="font-medium">
                              {(isTrainer || isAdmin) 
                                ? participant.profiles?.display_name || 'Unbekannt'
                                : participant.profiles?.nickname || participant.profiles?.display_name || 'Unbekannt'
                              }
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Angemeldet
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {(isTrainer || isAdmin) && (
                              <MembershipBadge type={participant.profiles?.membership_type || 'Member'} />
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
              
              {waitlistCount > 0 && (
                <div className="space-y-3">
                  <h5 className="font-medium text-sm text-muted-foreground">
                    Warteliste ({waitlistCount})
                  </h5>
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      {waitlistCount} Person(en) auf der Warteliste
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Button */}
            <Button 
              variant="destructive" 
              onClick={handleCancel}
              disabled={!canCancelCourse()}
              className="w-full"
            >
              {canCancelCourse() ? 'Abmelden' : 'Abmeldefrist abgelaufen'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ProfileImageViewer
        isOpen={!!selectedProfile}
        onClose={() => setSelectedProfile(null)}
        imageUrl={selectedProfile?.imageUrl || null}
        displayName={selectedProfile?.displayName || ''}
      />
    </>
  );
};
