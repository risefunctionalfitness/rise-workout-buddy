import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, StarOff, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Member {
  user_id: string;
  nickname: string | null;
  display_name: string | null;
  avatar_url: string | null;
  isFavorite: boolean;
}

interface MemberSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseName: string;
  courseDate: string;
  courseTime: string;
}

export const MemberSelectorDialog = ({
  open,
  onOpenChange,
  courseId,
  courseName,
  courseDate,
  courseTime
}: MemberSelectorDialogProps) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadCurrentUser();
      loadMembers();
      loadFavorites();
      setSelectedMembers(new Set());
      setSearchQuery("");
    }
  }, [open, currentUserId]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const loadMembers = async () => {
    if (!currentUserId) return;
    
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, nickname, display_name, avatar_url")
      .eq("status", "active")
      .order("nickname", { ascending: true });

    if (error) {
      console.error("Error loading members:", error);
      return;
    }

    // Filter out current user
    const filteredMembers = data.filter(m => m.user_id !== currentUserId);
    setMembers(filteredMembers.map(m => ({ ...m, isFavorite: false })));
  };

  const loadFavorites = async () => {
    if (!currentUserId) return;
    
    const { data, error } = await supabase
      .from("member_favorites")
      .select("favorite_user_id")
      .eq("user_id", currentUserId);

    if (error) {
      console.error("Error loading favorites:", error);
      return;
    }

    setFavorites(new Set(data.map(f => f.favorite_user_id)));
  };

  const toggleFavorite = async (memberId: string) => {
    const isFavorite = favorites.has(memberId);

    if (isFavorite) {
      // Remove favorite
      const { error } = await supabase
        .from("member_favorites")
        .delete()
        .eq("user_id", currentUserId!)
        .eq("favorite_user_id", memberId);

      if (error) {
        toast.error("Fehler beim Entfernen des Favoriten");
        return;
      }

      const newFavorites = new Set(favorites);
      newFavorites.delete(memberId);
      setFavorites(newFavorites);
      toast.success("Favorit entfernt");
    } else {
      // Check limit
      if (favorites.size >= 10) {
        toast.error("Maximal 10 Favoriten möglich");
        return;
      }

      // Add favorite
      const { error } = await supabase
        .from("member_favorites")
        .insert({ user_id: currentUserId!, favorite_user_id: memberId });

      if (error) {
        if (error.message.includes("Maximum 10 favorites")) {
          toast.error("Maximal 10 Favoriten möglich");
        } else {
          toast.error("Fehler beim Hinzufügen des Favoriten");
        }
        return;
      }

      const newFavorites = new Set(favorites);
      newFavorites.add(memberId);
      setFavorites(newFavorites);
      toast.success("Favorit hinzugefügt");
    }
  };

  const toggleMember = (memberId: string) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
    }
    setSelectedMembers(newSelected);
  };

  const sendInvitations = async () => {
    if (selectedMembers.size === 0) return;

    if (!currentUserId) {
      toast.error("Benutzer-ID nicht gefunden");
      return;
    }

    setLoading(true);

    const invitations = Array.from(selectedMembers).map(recipientId => ({
      course_id: courseId,
      sender_id: currentUserId,
      recipient_id: recipientId,
      status: 'pending'
    }));

    console.log('Sending invitations:', invitations);

    const { error } = await supabase
      .from("course_invitations")
      .insert(invitations);

    setLoading(false);

    if (error) {
      toast.error("Fehler beim Versenden der Einladungen");
      console.error("Error sending invitations:", error);
      return;
    }

    toast.success(`${selectedMembers.size} Mitglied${selectedMembers.size > 1 ? 'er' : ''} eingeladen`);
    onOpenChange(false);
  };

  const filterMembers = (memberList: Member[]) => {
    if (!searchQuery) return memberList;
    const query = searchQuery.toLowerCase();
    return memberList.filter(m => {
      const name = (m.nickname || m.display_name || "").toLowerCase();
      return name.includes(query);
    });
  };

  const favoriteMembers = members.filter(m => favorites.has(m.user_id));
  const filteredFavorites = filterMembers(favoriteMembers);
  const filteredAllMembers = filterMembers(members);

  const renderMember = (member: Member) => {
    const displayName = member.nickname || member.display_name || "Unbekannt";
    const initials = displayName.split(" ").map(n => n[0]).join("").toUpperCase();
    const isSelected = selectedMembers.has(member.user_id);
    const isFavorite = favorites.has(member.user_id);

    return (
      <div
        key={member.user_id}
        className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => toggleMember(member.user_id)}
        />
        <Avatar className="h-10 w-10">
          <AvatarImage src={member.avatar_url || undefined} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <span className="flex-1 font-medium">{displayName}</span>
        <button
          onClick={() => toggleFavorite(member.user_id)}
          className="p-2 hover:bg-accent rounded-md transition-colors"
        >
          {isFavorite ? (
            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
          ) : (
            <StarOff className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <div className="flex flex-col h-[85vh]">
          <div className="px-6 pt-6 pb-4 border-b bg-background">
            <DialogHeader>
              <DialogTitle>Mitglieder einladen</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {courseName} · {courseDate} · {courseTime}
              </p>
            </DialogHeader>

            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Mitglieder suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex-1 overflow-hidden px-6">
            <Tabs defaultValue="all" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2 mt-4">
                <TabsTrigger value="favorites" className="gap-2">
                  <Star className="h-4 w-4" />
                  Favoriten {favorites.size > 0 && `(${favorites.size})`}
                </TabsTrigger>
                <TabsTrigger value="all">
                  Alle
                </TabsTrigger>
              </TabsList>

              <TabsContent value="favorites" className="flex-1 min-h-0 mt-4">
                <ScrollArea className="h-[400px] pr-4">
                  {filteredFavorites.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      {searchQuery ? "Keine Favoriten gefunden" : "Noch keine Favoriten"}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredFavorites.map(renderMember)}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="all" className="flex-1 min-h-0 mt-4">
                <ScrollArea className="h-[400px] pr-4">
                  {filteredAllMembers.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      Keine Mitglieder gefunden
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredAllMembers.map(renderMember)}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          <div className="px-6 py-4 border-t bg-background z-10 pointer-events-auto">
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Button clicked! Selected:', selectedMembers.size, 'Loading:', loading);
                sendInvitations();
              }}
              disabled={selectedMembers.size === 0 || loading}
              className="w-full relative z-20"
            >
              {loading 
                ? "Wird gesendet..." 
                : `${selectedMembers.size} Mitglied${selectedMembers.size !== 1 ? 'er' : ''} einladen`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
