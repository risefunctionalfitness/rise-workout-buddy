import { Calendar, Clock, X } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [registrationCount, setRegistrationCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (user?.id) {
      loadUpcomingReservation();
      setupRealtimeUpdates();
    }
  }, [user?.id]);

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
        .select(
          "profiles(display_name, first_name, nickname, avatar_url)"
        )
        .eq("course_id", upcomingCourse.id)
        .eq("status", "registered")
        .order("registered_at", { ascending: true });

      if (error) throw error;
      setParticipants(data?.map((d: any) => d.profiles).filter(Boolean) || []);
      setRegistrationCount(data?.length || 0);
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

  const handleCancel = async () => {
    if (!upcomingCourse) return;

    try {
      const { error } = await supabase
        .from("course_registrations")
        .update({ status: "cancelled" })
        .eq("course_id", upcomingCourse.id)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Abmeldung erfolgreich",
        description: "Du wurdest vom Kurs abgemeldet",
      });

      window.dispatchEvent(new CustomEvent("courseRegistrationChanged"));
      setShowDialog(false);
      loadUpcomingReservation();
    } catch (error) {
      console.error("Error cancelling registration:", error);
      toast({
        title: "Fehler",
        description: "Abmeldung fehlgeschlagen",
        variant: "destructive",
      });
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
  const cancellationDeadline = new Date(
    courseDateTime.getTime() -
      upcomingCourse.cancellation_deadline_minutes * 60000
  );
  const canCancel = new Date() < cancellationDeadline;

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
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(courseDateTime, "EEEE, dd. MMMM yyyy", { locale: de })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {upcomingCourse.start_time?.slice(0, 5)} -{" "}
                  {upcomingCourse.end_time?.slice(0, 5)} Uhr
                </span>
              </div>
              {upcomingCourse.trainer && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Trainer: </span>
                  <span className="font-medium">{upcomingCourse.trainer}</span>
                </div>
              )}
            </div>

            {/* Participants */}
            <div>
              <h3 className="text-sm font-medium mb-2">
                Teilnehmer ({registrationCount}/{upcomingCourse.max_participants})
              </h3>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {participants.map((participant, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={participant.avatar_url} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {participant.display_name ||
                        participant.first_name ||
                        participant.nickname ||
                        "Unbekannt"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cancel Button */}
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleCancel}
              disabled={!canCancel}
            >
              <X className="h-4 w-4 mr-2" />
              Vom Kurs abmelden
            </Button>
            {!canCancel && (
              <p className="text-xs text-muted-foreground text-center">
                Abmeldefrist abgelaufen
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
