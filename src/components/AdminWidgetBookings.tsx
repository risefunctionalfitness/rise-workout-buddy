import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Calendar, Trash2, RefreshCw, Users, ChevronDown, Mail } from "lucide-react";
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

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

const ITEMS_PER_PAGE = 10;

export function AdminWidgetBookings() {
  const [bookings, setBookings] = useState<UnifiedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<BookingType | 'all'>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<UnifiedBooking | null>(null);
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  const loadBookings = async () => {
    setLoading(true);
    try {
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();

      const { data: guestData, error: guestError } = await supabase
        .from('guest_registrations')
        .select(`
          id, guest_name, guest_email, booking_type, created_at, status,
          courses(id, title, course_date, start_time)
        `)
        .eq('status', 'registered')
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false });

      if (guestError) console.error('Error loading guest bookings:', guestError);

      const { data: wellpassData, error: wellpassError } = await supabase
        .from('wellpass_registrations')
        .select('id, first_name, last_name, email, created_at, status')
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false });

      if (wellpassError) console.error('Error loading wellpass bookings:', wellpassError);

      const unified: UnifiedBooking[] = [];

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

      unified.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setBookings(unified);
      setCurrentPage(1);
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

      toast({ title: "Gelöscht", description: "Buchung wurde erfolgreich gelöscht" });
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
        return <Badge className="bg-green-500 hover:bg-green-600 text-white text-xs">Probe</Badge>;
      case 'drop_in':
        return <Badge className="bg-[#d6242b] hover:bg-[#b91c22] text-white text-xs">Drop-In</Badge>;
      case 'wellpass':
        return <Badge className="bg-[#12a6b0] hover:bg-[#0e8a92] text-white text-xs">Wellpass</Badge>;
    }
  };

  const toggleItem = (id: string) => {
    setOpenItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const filteredBookings = filter === 'all' ? bookings : bookings.filter(b => b.type === filter);
  
  // Pagination
  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedBookings = filteredBookings.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const stats = {
    probetraining: bookings.filter(b => b.type === 'probetraining').length,
    drop_in: bookings.filter(b => b.type === 'drop_in').length,
    wellpass: bookings.filter(b => b.type === 'wellpass').length,
  };

  if (bookings.length === 0 && !loading) return null;

  return (
    <>
      <Card>
        <CardHeader className="pb-3 px-3 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <CardTitle className="text-base sm:text-lg">Widget-Buchungen</CardTitle>
              {bookings.length > 0 && (
                <Badge variant="secondary" className="text-xs">{bookings.length}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Select value={filter} onValueChange={(v) => { setFilter(v as BookingType | 'all'); setCurrentPage(1); }}>
                <SelectTrigger className="w-[110px] sm:w-[130px] h-8 text-xs sm:text-sm">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="probetraining">Probe</SelectItem>
                  <SelectItem value="drop_in">Drop-In</SelectItem>
                  <SelectItem value="wellpass">Wellpass</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadBookings} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mt-2">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Letzte 7 Tage:</span>
            </span>
            <span className="text-green-600 font-medium">{stats.probetraining} Probe</span>
            <span className="text-[#d6242b] font-medium">{stats.drop_in} Drop-In</span>
            <span className="text-[#12a6b0] font-medium">{stats.wellpass} Wellpass</span>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-1 px-3 sm:px-6 pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : paginatedBookings.length === 0 ? (
            <p className="text-center text-muted-foreground py-4 text-sm">
              Keine Buchungen im ausgewählten Filter
            </p>
          ) : (
            <>
              {paginatedBookings.map((booking) => (
                <Collapsible
                  key={`${booking.source}-${booking.id}`}
                  open={openItems.has(booking.id)}
                  onOpenChange={() => toggleItem(booking.id)}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-2 sm:p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        {getTypeBadge(booking.type)}
                        <span className="font-medium text-sm truncate">{booking.name}</span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {formatDistanceToNow(new Date(booking.created_at), { addSuffix: true, locale: de })}
                        </span>
                        <span className="text-xs text-muted-foreground sm:hidden">
                          {formatDistanceToNow(new Date(booking.created_at), { locale: de })}
                        </span>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openItems.has(booking.id) ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="px-2 sm:px-3 py-2 ml-2 sm:ml-4 border-l-2 border-muted space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{booking.email}</span>
                      </div>
                      
                      {booking.courseInfo && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {booking.courseInfo.title} • {format(new Date(booking.courseInfo.date), 'dd.MM.yyyy', { locale: de })} • {booking.courseInfo.time.slice(0, 5)}
                          </span>
                        </div>
                      )}
                      
                      {booking.type === 'wellpass' && (
                        <p className="text-sm text-muted-foreground">Neue Mitgliedschaft</p>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBookingToDelete(booking);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Löschen
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
              
              {totalPages > 1 && (
                <Pagination className="mt-4">
                  <PaginationContent className="gap-1">
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={`h-8 text-xs ${currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <PaginationItem key={page} className="hidden sm:block">
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={currentPage === page}
                          className="h-8 w-8 text-xs cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    
                    <span className="sm:hidden text-xs text-muted-foreground px-2">
                      {currentPage} / {totalPages}
                    </span>
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className={`h-8 text-xs ${currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Buchung löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du die Buchung von <strong>{bookingToDelete?.name}</strong> wirklich löschen?
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