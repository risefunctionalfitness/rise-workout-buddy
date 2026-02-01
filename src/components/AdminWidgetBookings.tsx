import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Calendar, Trash2, RefreshCw, Users } from "lucide-react";
import { format, formatDistanceToNow, subDays } from "date-fns";
import { de } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type BookingType = 'probetraining' | 'drop_in' | 'wellpass';

interface GuestBooking {
  id: string;
  guest_name: string;
  guest_email: string;
  booking_type: 'probetraining' | 'drop_in';
  created_at: string;
  status: string;
  courses: {
    id: string;
    title: string;
    course_date: string;
    start_time: string;
  } | null;
}

interface WellpassBooking {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  status: string;
}

interface UnifiedBooking {
  id: string;
  name: string;
  email: string;
  type: BookingType;
  created_at: string;
  status: string;
  courseInfo?: {
    title: string;
    date: string;
    time: string;
  };
  source: 'guest' | 'wellpass';
}

export function AdminWidgetBookings() {
  const [bookings, setBookings] = useState<UnifiedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<BookingType | 'all'>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<UnifiedBooking | null>(null);
  const { toast } = useToast();

  const loadBookings = async () => {
    setLoading(true);
    try {
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();

      // Load guest registrations (Probetraining + Drop-In)
      const { data: guestData, error: guestError } = await supabase
        .from('guest_registrations')
        .select(`
          id, guest_name, guest_email, booking_type, created_at, status,
          courses(id, title, course_date, start_time)
        `)
        .eq('status', 'registered')
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false });

      if (guestError) {
        console.error('Error loading guest bookings:', guestError);
      }

      // Load wellpass registrations
      const { data: wellpassData, error: wellpassError } = await supabase
        .from('wellpass_registrations')
        .select('id, first_name, last_name, email, created_at, status')
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false });

      if (wellpassError) {
        console.error('Error loading wellpass bookings:', wellpassError);
      }

      // Unify bookings
      const unified: UnifiedBooking[] = [];

      // Add guest bookings
      (guestData as GuestBooking[] || []).forEach((booking) => {
        unified.push({
          id: booking.id,
          name: booking.guest_name,
          email: booking.guest_email,
          type: booking.booking_type,
          created_at: booking.created_at,
          status: booking.status,
          courseInfo: booking.courses ? {
            title: booking.courses.title,
            date: booking.courses.course_date,
            time: booking.courses.start_time,
          } : undefined,
          source: 'guest',
        });
      });

      // Add wellpass bookings
      (wellpassData as WellpassBooking[] || []).forEach((booking) => {
        unified.push({
          id: booking.id,
          name: `${booking.first_name} ${booking.last_name}`.trim(),
          email: booking.email,
          type: 'wellpass',
          created_at: booking.created_at,
          status: booking.status,
          source: 'wellpass',
        });
      });

      // Sort by created_at
      unified.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setBookings(unified);
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast({
        title: "Fehler",
        description: "Buchungen konnten nicht geladen werden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleDeleteBooking = async () => {
    if (!bookingToDelete) return;

    try {
      if (bookingToDelete.source === 'guest') {
        const { error } = await supabase
          .from('guest_registrations')
          .delete()
          .eq('id', bookingToDelete.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('wellpass_registrations')
          .delete()
          .eq('id', bookingToDelete.id);

        if (error) throw error;
      }

      toast({
        title: "Gelöscht",
        description: "Buchung wurde erfolgreich gelöscht",
      });

      loadBookings();
    } catch (error) {
      console.error('Error deleting booking:', error);
      toast({
        title: "Fehler",
        description: "Buchung konnte nicht gelöscht werden",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setBookingToDelete(null);
    }
  };

  const getTypeBadge = (type: BookingType) => {
    switch (type) {
      case 'probetraining':
        return (
          <Badge className="bg-green-500 hover:bg-green-600 text-white">
            Probetraining
          </Badge>
        );
      case 'drop_in':
        return (
          <Badge className="bg-[#d6242b] hover:bg-[#b91c22] text-white">
            Drop-In
          </Badge>
        );
      case 'wellpass':
        return (
          <Badge className="bg-[#12a6b0] hover:bg-[#0e8a92] text-white">
            Wellpass
          </Badge>
        );
    }
  };

  const filteredBookings = filter === 'all' 
    ? bookings 
    : bookings.filter(b => b.type === filter);

  // Statistics
  const stats = {
    probetraining: bookings.filter(b => b.type === 'probetraining').length,
    drop_in: bookings.filter(b => b.type === 'drop_in').length,
    wellpass: bookings.filter(b => b.type === 'wellpass').length,
  };

  if (bookings.length === 0 && !loading) {
    return null; // Don't show the card if there are no bookings
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Widget-Buchungen</CardTitle>
              {bookings.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {bookings.length}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Select value={filter} onValueChange={(v) => setFilter(v as BookingType | 'all')}>
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="probetraining">Probetraining</SelectItem>
                  <SelectItem value="drop_in">Drop-In</SelectItem>
                  <SelectItem value="wellpass">Wellpass</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={loadBookings} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          
          {/* Statistics Summary */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              Letzte 7 Tage:
            </span>
            <span className="text-green-600 font-medium">{stats.probetraining} Probetraining</span>
            <span className="text-[#d6242b] font-medium">{stats.drop_in} Drop-In</span>
            <span className="text-[#12a6b0] font-medium">{stats.wellpass} Wellpass</span>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredBookings.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Keine Buchungen im ausgewählten Filter
            </p>
          ) : (
            <>
              {filteredBookings.slice(0, 10).map((booking) => (
                <div
                  key={`${booking.source}-${booking.id}`}
                  className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      {getTypeBadge(booking.type)}
                      <span className="font-medium">{booking.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(booking.created_at), { addSuffix: true, locale: de })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{booking.email}</p>
                    {booking.courseInfo ? (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {booking.courseInfo.title} • {format(new Date(booking.courseInfo.date), 'dd.MM.yyyy', { locale: de })} • {booking.courseInfo.time.slice(0, 5)}
                        </span>
                      </div>
                    ) : booking.type === 'wellpass' && (
                      <p className="text-sm text-muted-foreground">Neue Mitgliedschaft</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      setBookingToDelete(booking);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              {filteredBookings.length > 10 && (
                <p className="text-center text-sm text-muted-foreground pt-2">
                  + {filteredBookings.length - 10} weitere Buchungen
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Buchung löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du die Buchung von <strong>{bookingToDelete?.name}</strong> wirklich löschen?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBooking} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
