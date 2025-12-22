import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Users, User, Check, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, startOfDay } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";
import jsPDF from 'jspdf';

interface Course {
  id: string;
  title: string;
  trainer: string;
  course_date: string;
  start_time: string;
  end_time: string;
  max_participants: number;
  duration_minutes: number;
  color?: string;
  registered_count: number;
  guest_count: number;
}

interface TicketData {
  ticketId: string;
  guestName: string;
  guestEmail: string;
  bookingType: string;
  courseTitle: string;
  courseDate: string;
  courseTime: string;
  trainer: string;
  paymentNote: string | null;
  whatsappNumber: string;
  whatsappMessage: string;
}

export default function EmbedKursplan() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bookingType, setBookingType] = useState<'drop_in' | 'probetraining' | null>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [weekStart, setWeekStart] = useState<Date>(startOfDay(new Date()));

  useEffect(() => {
    loadCourses();
  }, [weekStart]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const nowDate = now.toISOString().split('T')[0];
      const nowTime = now.toTimeString().slice(0, 5);

      // Get courses for current week view (7 days from weekStart)
      const startDate = format(weekStart, 'yyyy-MM-dd');
      const endDate = format(addDays(weekStart, 6), 'yyyy-MM-dd');

      const { data: coursesData, error } = await supabase
        .from('courses')
        .select(`
          id, title, trainer, course_date, start_time, end_time, 
          max_participants, duration_minutes, color,
          course_registrations(status)
        `)
        .eq('is_cancelled', false)
        .gte('course_date', startDate)
        .lte('course_date', endDate)
        .order('course_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Get guest registration counts
      const courseIds = coursesData?.map(c => c.id) || [];
      const { data: guestData } = await supabase
        .from('guest_registrations')
        .select('course_id')
        .in('course_id', courseIds)
        .eq('status', 'registered');

      const guestCounts: Record<string, number> = {};
      guestData?.forEach(g => {
        guestCounts[g.course_id] = (guestCounts[g.course_id] || 0) + 1;
      });

      // Filter out past courses for today
      const processedCourses = (coursesData || [])
        .filter(course => {
          // If course is today, only show if start_time is in the future
          if (course.course_date === nowDate) {
            return course.start_time.substring(0, 5) >= nowTime;
          }
          // For future dates, show all
          return course.course_date > nowDate;
        })
        .map(course => {
          const registrations = course.course_registrations || [];
          const registered_count = registrations.filter(r => r.status === 'registered').length;
          const guest_count = guestCounts[course.id] || 0;

          return {
            ...course,
            registered_count,
            guest_count
          };
        });

      setCourses(processedCourses);
    } catch (error) {
      console.error('Error loading courses:', error);
      toast.error('Fehler beim Laden der Kurse');
    } finally {
      setLoading(false);
    }
  };

  const handleCourseClick = (course: Course) => {
    setSelectedCourse(course);
    setDialogOpen(true);
  };

  const handleBookingTypeSelect = (type: 'drop_in' | 'probetraining') => {
    setBookingType(type);
    setDialogOpen(false);
    setBookingDialogOpen(true);
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !bookingType) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('book-guest-training', {
        body: {
          courseId: selectedCourse.id,
          guestName,
          guestEmail,
          bookingType
        }
      });

      if (error) throw error;

      if (data.success) {
        setTicketData(data.ticket);
        setBookingDialogOpen(false);
        setSuccessDialogOpen(true);
        setGuestName("");
        setGuestEmail("");
        loadCourses();
      } else {
        toast.error(data.error || 'Buchung fehlgeschlagen');
      }
    } catch (error: any) {
      console.error('Booking error:', error);
      toast.error(error.message || 'Fehler bei der Buchung');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateTicketPDF = () => {
    if (!ticketData) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('RISE FITNESS', pageWidth / 2, 30, { align: 'center' });
    
    doc.setFontSize(16);
    doc.text(ticketData.bookingType === 'drop_in' ? 'DROP-IN TICKET' : 'PROBETRAINING TICKET', pageWidth / 2, 42, { align: 'center' });
    
    // Ticket ID
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Ticket-ID: ${ticketData.ticketId}`, pageWidth / 2, 52, { align: 'center' });
    
    // Separator line
    doc.setLineWidth(0.5);
    doc.line(20, 60, pageWidth - 20, 60);
    
    // Course info
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Kursdetails', 20, 75);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Kurs: ${ticketData.courseTitle}`, 20, 88);
    doc.text(`Datum: ${ticketData.courseDate}`, 20, 98);
    doc.text(`Uhrzeit: ${ticketData.courseTime}`, 20, 108);
    doc.text(`Trainer: ${ticketData.trainer}`, 20, 118);
    
    // Separator line
    doc.line(20, 128, pageWidth - 20, 128);
    
    // Guest info
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Teilnehmer', 20, 143);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${ticketData.guestName}`, 20, 156);
    doc.text(`E-Mail: ${ticketData.guestEmail}`, 20, 166);
    
    // Payment note
    if (ticketData.paymentNote) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(200, 100, 0);
      doc.text(ticketData.paymentNote, 20, 183);
      doc.setTextColor(0, 0, 0);
    }
    
    // Footer
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('www.rise-gym.de', pageWidth / 2, 280, { align: 'center' });
    
    doc.save(`ticket-${ticketData.ticketId}.pdf`);
  };

  // Get the 7 days for the week selector
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Filter courses for selected date
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const coursesForSelectedDate = courses.filter(c => c.course_date === selectedDateStr);

  const prevWeek = () => {
    const today = startOfDay(new Date());
    const newStart = addDays(weekStart, -7);
    // Don't go before today
    if (newStart >= today) {
      setWeekStart(newStart);
      setSelectedDate(newStart);
    } else {
      setWeekStart(today);
      setSelectedDate(today);
    }
  };

  const nextWeek = () => {
    const newStart = addDays(weekStart, 7);
    setWeekStart(newStart);
    setSelectedDate(newStart);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Lade Kursplan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 max-w-2xl mx-auto">
      {/* Week Day Selector */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={prevWeek} disabled={weekStart <= startOfDay(new Date())}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        <div className="flex gap-1 flex-1 justify-center">
          {weekDays.map((day) => {
            const isSelected = format(day, 'yyyy-MM-dd') === selectedDateStr;
            const isTodayDate = isToday(day);
            
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`flex flex-col items-center p-2 rounded-lg min-w-[44px] transition-all ${
                  isSelected 
                    ? 'bg-primary text-primary-foreground' 
                    : isTodayDate 
                      ? 'bg-primary/20 hover:bg-primary/30' 
                      : 'hover:bg-muted'
                }`}
              >
                <span className="text-xs font-medium">
                  {format(day, 'EEEEEE', { locale: de })}
                </span>
                <span className={`text-lg font-bold ${isSelected && isTodayDate ? 'bg-primary-foreground text-primary rounded-full w-8 h-8 flex items-center justify-center' : ''}`}>
                  {format(day, 'd')}
                </span>
              </button>
            );
          })}
        </div>
        
        <Button variant="ghost" size="icon" onClick={nextWeek}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Selected Date Header */}
      <h2 className="text-xl font-semibold mb-4">
        {format(selectedDate, 'EEEE d MMMM yyyy', { locale: de })}
      </h2>

      {/* Course List for Selected Day */}
      <div className="space-y-2">
        {coursesForSelectedDate.map((course) => {
          const totalRegistered = course.registered_count + course.guest_count;
          const isFull = totalRegistered >= course.max_participants;

          return (
            <Card
              key={course.id}
              className={`cursor-pointer transition-all hover:shadow-md ${isFull ? 'opacity-60' : ''}`}
              style={{ borderBottomColor: course.color || '#22c55e', borderBottomWidth: 3 }}
              onClick={() => !isFull && handleCourseClick(course)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center border rounded-lg p-2 min-w-[60px]" style={{ borderColor: course.color || '#3b82f6' }}>
                      <span className="text-sm font-bold" style={{ color: course.color || '#3b82f6' }}>
                        {course.start_time.substring(0, 5)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {course.duration_minutes || 60}m
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold">{course.title}</h3>
                      <p className="text-sm text-muted-foreground">{course.trainer}</p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    {isFull ? (
                      <Badge variant="destructive">Voll</Badge>
                    ) : (
                      <span className="text-muted-foreground">
                        {totalRegistered}/{course.max_participants}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {coursesForSelectedDate.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Keine Kurse an diesem Tag verfügbar
          </div>
        )}
      </div>

      {/* Course Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedCourse?.title}</DialogTitle>
            <DialogDescription>
              {selectedCourse && format(new Date(selectedCourse.course_date), 'EEEE, dd.MM.yyyy', { locale: de })}
            </DialogDescription>
          </DialogHeader>
          {selectedCourse && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Uhrzeit:</span>
                  <p className="font-medium">{selectedCourse.start_time.substring(0, 5)} - {selectedCourse.end_time.substring(0, 5)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Trainer:</span>
                  <p className="font-medium">{selectedCourse.trainer}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Teilnehmer:</span>
                  <p className="font-medium">
                    {selectedCourse.registered_count + selectedCourse.guest_count} / {selectedCourse.max_participants}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col"
                  onClick={() => handleBookingTypeSelect('probetraining')}
                >
                  <span className="font-semibold">Probetraining</span>
                  <span className="text-xs text-muted-foreground">Kostenlos</span>
                </Button>
                <Button
                  className="h-auto py-4 flex flex-col bg-primary"
                  onClick={() => handleBookingTypeSelect('drop_in')}
                >
                  <span className="font-semibold">Drop-In</span>
                  <span className="text-xs">22€ vor Ort</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Booking Form Dialog */}
      <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bookingType === 'drop_in' ? 'Drop-In buchen' : 'Probetraining buchen'}
            </DialogTitle>
            <DialogDescription>
              {selectedCourse?.title} am {selectedCourse && format(new Date(selectedCourse.course_date), 'dd.MM.yyyy', { locale: de })}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBooking} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Vor- und Nachname"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail *</Label>
              <Input
                id="email"
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="deine@email.de"
                required
              />
            </div>

            {bookingType === 'drop_in' && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                <p className="font-medium text-yellow-800">💰 Zahlung vor Ort: 22€</p>
                <p className="text-yellow-700 mt-1">Die Zahlung erfolgt direkt im Gym.</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setBookingDialogOpen(false)}
              >
                Abbrechen
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? 'Wird gebucht...' : 'Jetzt buchen'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Check className="h-6 w-6" />
              Buchung erfolgreich!
            </DialogTitle>
          </DialogHeader>
          {ticketData && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
                <p><strong>Kurs:</strong> {ticketData.courseTitle}</p>
                <p><strong>Datum:</strong> {ticketData.courseDate}</p>
                <p><strong>Uhrzeit:</strong> {ticketData.courseTime}</p>
                <p><strong>Trainer:</strong> {ticketData.trainer}</p>
                {ticketData.paymentNote && (
                  <p className="text-yellow-700 font-medium">{ticketData.paymentNote}</p>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                Du erhältst eine Bestätigung per E-Mail an {ticketData.guestEmail}
              </p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={generateTicketPDF}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Ticket herunterladen
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => setSuccessDialogOpen(false)}
                >
                  Fertig
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
