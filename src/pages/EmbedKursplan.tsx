import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, Users, User, Check, Download } from "lucide-react";
import { format, startOfWeek, addDays } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";
import riseLogo from "@/assets/rise-logo-dark.png";

interface Course {
  id: string;
  title: string;
  trainer: string;
  course_date: string;
  start_time: string;
  end_time: string;
  max_participants: number;
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

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const nowDate = now.toISOString().split('T')[0];
      const nowTime = now.toTimeString().slice(0, 8);

      // Get courses for next 7 days
      const endDate = addDays(now, 7).toISOString().split('T')[0];

      const { data: coursesData, error } = await supabase
        .from('courses')
        .select(`
          id, title, trainer, course_date, start_time, end_time, 
          max_participants, color,
          course_registrations(status)
        `)
        .eq('is_cancelled', false)
        .gte('course_date', nowDate)
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

      const processedCourses = (coursesData || []).map(course => {
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

    // Create a simple printable ticket
    const ticketContent = `
RISE FITNESS - ${ticketData.bookingType === 'drop_in' ? 'DROP-IN' : 'PROBETRAINING'} TICKET

Ticket-ID: ${ticketData.ticketId}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

KURS: ${ticketData.courseTitle}
DATUM: ${ticketData.courseDate}
UHRZEIT: ${ticketData.courseTime}
TRAINER: ${ticketData.trainer}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NAME: ${ticketData.guestName}
E-MAIL: ${ticketData.guestEmail}

${ticketData.paymentNote ? `\n💰 ${ticketData.paymentNote}\n` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📱 ${ticketData.whatsappMessage}
WhatsApp: ${ticketData.whatsappNumber}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

www.rise-gym.de
    `;

    const blob = new Blob([ticketContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticket-${ticketData.ticketId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Group courses by date
  const groupedCourses = courses.reduce((acc, course) => {
    const date = course.course_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(course);
    return acc;
  }, {} as Record<string, Course[]>);

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
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="text-center mb-6">
        <img src={riseLogo} alt="Rise Fitness" className="h-12 mx-auto mb-2" />
        <h1 className="text-2xl font-bold">Kursplan</h1>
        <p className="text-muted-foreground">Buche dein Probetraining oder Drop-In</p>
      </div>

      {/* Course List by Day */}
      <div className="space-y-6 max-w-2xl mx-auto">
        {Object.entries(groupedCourses).map(([date, dayCourses]) => (
          <div key={date}>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {format(new Date(date), 'EEEE, dd.MM.yyyy', { locale: de })}
            </h2>
            <div className="space-y-2">
              {dayCourses.map((course) => {
                const totalRegistered = course.registered_count + course.guest_count;
                const isFull = totalRegistered >= course.max_participants;
                const spotsLeft = course.max_participants - totalRegistered;

                return (
                  <Card
                    key={course.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${isFull ? 'opacity-60' : ''}`}
                    style={{ borderLeftColor: course.color || '#e11d48', borderLeftWidth: 4 }}
                    onClick={() => !isFull && handleCourseClick(course)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{course.title}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {course.start_time.substring(0, 5)} - {course.end_time.substring(0, 5)}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {course.trainer}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          {isFull ? (
                            <Badge variant="destructive">Ausgebucht</Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              <Users className="h-3 w-3 mr-1" />
                              {spotsLeft} {spotsLeft === 1 ? 'Platz' : 'Plätze'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}

        {Object.keys(groupedCourses).length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Keine Kurse in den nächsten 7 Tagen verfügbar
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
