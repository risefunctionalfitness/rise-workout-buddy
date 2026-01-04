import { Calendar, Clock, User } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { timezone } from "@/lib/timezone";
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
import { CourseInvitationButton } from "./CourseInvitationButton";
import { AddToCalendarButton } from "./AddToCalendarButton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

interface UpcomingClassReservationProps {
  user: any;
}

export const UpcomingClassReservation = ({
  user,
}: UpcomingClassReservationProps) => {
  const [upcomingCourses, setUpcomingCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [isTrainer, setIsTrainer] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<{ imageUrl: string | null; displayName: string } | null>(null);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (!carouselApi) return;
    
    const onSelect = () => {
      setCurrentSlide(carouselApi.selectedScrollSnap());
    };
    
    carouselApi.on("select", onSelect);
    onSelect(); // Set initial state
    
    return () => {
      carouselApi.off("select", onSelect);
    };
  }, [carouselApi]);

  useEffect(() => {
    if (user?.id) {
      loadUpcomingReservations();
      loadUserInfo();
      
      const handleCourseChange = () => {
        loadUpcomingReservations();
        if (showDialog && selectedCourse) {
          loadParticipants(selectedCourse.id);
        }
      };
      
      window.addEventListener('courseRegistrationChanged', handleCourseChange);
      
      const cleanup = setupRealtimeUpdates();
      
      return () => {
        window.removeEventListener('courseRegistrationChanged', handleCourseChange);
        cleanup();
      };
    }
  }, [user?.id, showDialog, selectedCourse]);

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

  const loadUpcomingReservations = async () => {
    if (!user?.id) return;

    try {
      const now = timezone.nowInBerlin();
      const today = format(now, "yyyy-MM-dd");
      const currentTime = format(now, "HH:mm:ss");

      const { data, error } = await supabase
        .from("courses")
        .select("*, course_registrations!inner(id), color")
        .eq("course_registrations.user_id", user.id)
        .eq("course_registrations.status", "registered")
        .gte("course_date", today)
        .order("course_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;

      // Filter out courses that have already started today
      const filteredCourses = data?.filter(course => {
        if (course.course_date > today) return true;
        if (course.course_date === today && course.start_time > currentTime) return true;
        return false;
      }) || [];

      setUpcomingCourses(filteredCourses);
    } catch (error) {
      console.error("Error loading upcoming reservations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadParticipants = async (courseId: string) => {
    if (!courseId) return;

    try {
      const { data: registrations, error: regError } = await supabase
        .from("course_registrations")
        .select("status, user_id, registered_at")
        .eq("course_id", courseId)
        .in("status", ["registered", "waitlist"])
        .order("registered_at", { ascending: true });

      if (regError) throw regError;

      const userIds = registrations?.map(r => r.user_id) || [];
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, display_name, first_name, nickname, avatar_url, membership_type")
        .in("user_id", userIds);

      if (profileError) throw profileError;

      const participantsWithProfiles = registrations?.map(reg => ({
        ...reg,
        profiles: profiles?.find(p => p.user_id === reg.user_id) || { display_name: "Unbekannt" }
      })) || [];

      setParticipants(participantsWithProfiles);
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
        () => loadUpcomingReservations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const canCancelCourse = (course: any) => {
    if (!course) return false;
    
    const courseDateTime = new Date(
      `${course.course_date}T${course.start_time}`
    );
    const cancellationDeadline = new Date(
      courseDateTime.getTime() -
        course.cancellation_deadline_minutes * 60000
    );
    return new Date() < cancellationDeadline;
  };

  const handleCancel = async () => {
    if (!selectedCourse || !canCancelCourse(selectedCourse)) return;

    try {
      const { error } = await supabase
        .from("course_registrations")
        .update({ status: "cancelled" })
        .eq("course_id", selectedCourse.id)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Anmeldung erfolgreich storniert");

      window.dispatchEvent(new CustomEvent("courseRegistrationChanged"));
      setShowDialog(false);
      loadUpcomingReservations();
    } catch (error) {
      console.error("Error cancelling registration:", error);
      toast.error("Fehler bei der Stornierung");
    }
  };

  const handleCardClick = (course: any) => {
    setSelectedCourse(course);
    loadParticipants(course.id);
    setShowDialog(true);
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

  if (upcomingCourses.length === 0) {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 h-auto">
        <div className="flex items-center gap-2 justify-center text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span className="text-sm">Keine anstehenden Kursreservierungen</span>
        </div>
      </div>
    );
  }

  const registeredCount = participants.filter(p => p.status === 'registered').length;
  const waitlistCount = participants.filter(p => p.status === 'waitlist').length;

  return (
    <>
      <Carousel setApi={setCarouselApi} className="w-full">
        <CarouselContent>
          {upcomingCourses.map((course, index) => {
            const courseDateTime = new Date(
              `${course.course_date}T${course.start_time}`
            );
            
            return (
              <CarouselItem key={course.id}>
                <button
                  onClick={() => handleCardClick(course)}
                  className="relative bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 pb-6 h-auto hover:bg-gray-150 dark:hover:bg-gray-700 transition-all hover:scale-[1.02] cursor-pointer w-full border-l-8"
                  style={{
                    borderLeftColor: course.color || '#f3f4f6'
                  }}
                >
                  <Calendar className="absolute top-3 right-3 h-4 w-4 text-gray-600 dark:text-gray-400" />
                  
                  <div className="flex flex-col items-center justify-center space-y-2 text-center">
                    <span className="text-sm text-muted-foreground">
                      {index === 0 ? 'Nächste Reservierung' : 'Reservierung'}
                    </span>
                    <span className="text-base font-semibold">{course.title}</span>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {format(courseDateTime, "EEEE HH:mm", { locale: de })} -{" "}
                        {course.end_time?.slice(0, 5)}
                      </span>
                    </div>
                  </div>

                  {/* Dots inside card */}
                  {upcomingCourses.length > 1 && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {upcomingCourses.map((_, dotIndex) => (
                        <span
                          key={dotIndex}
                          className={cn(
                            "w-1.5 h-1.5 rounded-full transition-colors",
                            dotIndex === currentSlide ? "bg-gray-600" : "bg-gray-300"
                          )}
                        />
                      ))}
                    </div>
                  )}
                </button>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedCourse?.title}</DialogTitle>
          </DialogHeader>

          {selectedCourse && (
            <div className="space-y-4">
              {/* Course Details */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  {format(parseISO(selectedCourse.course_date), 'EEEE, dd.MM.yyyy', { locale: de })}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  {selectedCourse.start_time.slice(0, 5)} - {selectedCourse.end_time.slice(0, 5)}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4" />
                  Trainer: {selectedCourse.trainer}
                </div>
                {selectedCourse.strength_exercise && (
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">
                      Kraftteil: {selectedCourse.strength_exercise}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Minimum participants warning */}
              {registeredCount < 3 && (
                <p className="text-xs text-muted-foreground">
                  Min. 3 Teilnehmer erforderlich
                </p>
              )}

              {/* Participants */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    Teilnehmer ({registeredCount}/{selectedCourse.max_participants})
                  </h4>
                  <CourseInvitationButton
                    courseId={selectedCourse.id}
                    courseName={selectedCourse.title}
                    courseDate={selectedCourse.course_date}
                    courseTime={selectedCourse.start_time.slice(0, 5)}
                  />
                </div>
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
                              {isAdmin && (
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

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button 
                  variant="destructive" 
                  onClick={handleCancel}
                  disabled={!canCancelCourse(selectedCourse)}
                  className="w-full"
                >
                  {canCancelCourse(selectedCourse) ? 'Abmelden' : 'Abmeldefrist abgelaufen'}
                </Button>
                <AddToCalendarButton
                  title={selectedCourse.title}
                  startDate={selectedCourse.course_date}
                  startTime={selectedCourse.start_time}
                  endTime={selectedCourse.end_time}
                  trainer={selectedCourse.trainer}
                  variant="outline"
                  size="default"
                  className="w-full"
                />
              </div>
            </div>
          )}
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
