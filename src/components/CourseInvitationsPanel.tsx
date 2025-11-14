import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, Check, X, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { User } from "@supabase/supabase-js";

interface Invitation {
  id: string;
  course_id: string;
  sender_id: string;
  status: string;
  created_at: string;
  courses: {
    title: string;
    course_date: string;
    start_time: string;
    end_time: string;
    trainer: string;
  };
  sender_profile: {
    nickname: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface CourseInvitationsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  onAcceptInvitation: (courseId: string, courseDate: string) => void;
}

export const CourseInvitationsPanel = ({
  open,
  onOpenChange,
  user,
  onAcceptInvitation
}: CourseInvitationsPanelProps) => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && user?.id) {
      loadInvitations();
    }
  }, [open, user?.id]);

  const loadInvitations = async () => {
    setLoading(true);
    console.log("=== LOADING INVITATIONS ===")
    console.log("User ID:", user.id)

    const { data, error } = await supabase
      .from("course_invitations")
      .select(`
        id,
        course_id,
        sender_id,
        status,
        created_at,
        courses (
          title,
          course_date,
          start_time,
          end_time,
          trainer
        )
      `)
      .eq("recipient_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    console.log("Invitations loaded:", data)
    console.log("Error:", error)

    if (error) {
      console.error("Error loading invitations:", error);
      toast.error("Fehler beim Laden der Einladungen: " + error.message)
      setLoading(false);
      return;
    }

    // Load sender profiles
    const invitationsWithProfiles = await Promise.all(
      (data || []).map(async (invitation) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("nickname, display_name, avatar_url")
          .eq("user_id", invitation.sender_id)
          .single();

        return {
          ...invitation,
          sender_profile: profile || { nickname: null, display_name: null, avatar_url: null }
        };
      })
    );

    console.log("Invitations with profiles:", invitationsWithProfiles)
    setInvitations(invitationsWithProfiles);
    setLoading(false);
  };

  const handleAccept = async (invitation: Invitation) => {
    try {
      // Check if user can register for this course
      const { data: canRegister, error: checkError } = await supabase
        .rpc('can_user_register_for_course', {
          user_id_param: user.id,
          course_id_param: invitation.course_id
        });

      if (checkError) {
        console.error("Error checking registration eligibility:", checkError);
        // Continue anyway - let the database constraints handle it
      }

      if (canRegister === false) {
        toast.error("Du kannst dich nicht für diesen Kurs anmelden (Credits/Limit erreicht)");
        return;
      }

      // Try to register for the course
      const { error: registrationError } = await supabase
        .from("course_registrations")
        .insert({
          user_id: user.id,
          course_id: invitation.course_id,
          status: "registered"
        });

      if (registrationError) {
        // Check if already registered
        if (registrationError.code === '23505') {
          toast.error("Du bist bereits für diesen Kurs angemeldet");
        } else {
          toast.error("Fehler bei der Kursanmeldung: " + registrationError.message);
          console.error("Error registering for course:", registrationError);
        }
        return;
      }

      // Update invitation status
      const { error: invitationError } = await supabase
        .from("course_invitations")
        .update({ 
          status: "accepted", 
          responded_at: new Date().toISOString() 
        })
        .eq("id", invitation.id);

      if (invitationError) {
        console.error("Error updating invitation:", invitationError);
      }

      toast.success("Du bist jetzt für den Kurs angemeldet!");
      
      // Reload invitations
      loadInvitations();
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("Ein unerwarteter Fehler ist aufgetreten");
    }
  };

  const handleDecline = async (invitationId: string) => {
    const { error } = await supabase
      .from("course_invitations")
      .update({ 
        status: "declined", 
        responded_at: new Date().toISOString() 
      })
      .eq("id", invitationId);

    if (error) {
      toast.error("Fehler beim Ablehnen der Einladung");
      console.error("Error declining invitation:", error);
      return;
    }

    toast.success("Einladung abgelehnt");
    loadInvitations();
  };

  const handleCardClick = (invitation: Invitation) => {
    onOpenChange(false);
    onAcceptInvitation(invitation.course_id, invitation.courses.course_date);
  };

  const renderInvitation = (invitation: Invitation) => {
    const senderName = invitation.sender_profile.nickname || 
                       invitation.sender_profile.display_name || 
                       "Unbekannt";
    const initials = senderName.split(" ").map(n => n[0]).join("").toUpperCase();
    
    const courseDate = parseISO(invitation.courses.course_date);
    const formattedDate = format(courseDate, "EEEE, dd.MM.yyyy", { locale: de });

    return (
      <Card key={invitation.id} className="p-4">
        <div className="space-y-4">
          {/* Sender Info */}
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={invitation.sender_profile.avatar_url || undefined} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm text-muted-foreground">Einladung von</p>
              <p className="font-medium">{senderName}</p>
            </div>
          </div>

          {/* Course Info - Clickable */}
          <div 
            className="space-y-2 cursor-pointer hover:bg-gray-100 -mx-2 px-2 py-2 rounded-md transition-colors"
            onClick={() => handleCardClick(invitation)}
          >
            <h3 className="font-bold text-lg">{invitation.courses.title}</h3>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="capitalize">{formattedDate}</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{invitation.courses.start_time} - {invitation.courses.end_time}</span>
            </div>

            <p className="text-sm text-muted-foreground">
              Trainer: {invitation.courses.trainer}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleAccept(invitation);
              }}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4 mr-2" />
              Annehmen
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleDecline(invitation.id);
              }}
              variant="outline"
              className="flex-1 border-red-500 text-red-600 hover:bg-red-50"
            >
              <X className="h-4 w-4 mr-2" />
              Ablehnen
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader className="mt-6">
          <div className="flex items-center justify-between">
            <SheetTitle>Kurseinladungen</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                console.log("Manual panel refresh triggered")
                loadInvitations()
              }}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {invitations.length > 0 
              ? `Du hast ${invitations.length} ausstehende Einladung${invitations.length !== 1 ? 'en' : ''}`
              : 'Keine offenen Einladungen'
            }
          </p>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Lädt...</p>
          </div>
        ) : invitations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Keine offenen Einladungen</p>
          </div>
        ) : (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4">
              {invitations.map(renderInvitation)}
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
};
