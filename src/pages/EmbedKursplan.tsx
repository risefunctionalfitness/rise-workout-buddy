import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, startOfDay } from "date-fns";
import { de } from "date-fns/locale";
import { toast } from "sonner";
import EmbedWeekTableView from "@/components/EmbedWeekTableView";
import { countryCodes, CountryFlag } from "@/components/CountryFlags";

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
}


export default function EmbedKursplan() {
  const [searchParams] = useSearchParams();
  const viewMode = searchParams.get('view') === 'week' ? 'week' : 'list';
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bookingType, setBookingType] = useState<'drop_in' | 'probetraining' | null>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhoneCountryCode, setGuestPhoneCountryCode] = useState("+49");
  const [guestPhone, setGuestPhone] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingInfo, setBookingInfo] = useState<{ email: string; isDropIn: boolean } | null>(null);
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
          max_participants, duration_minutes, color
        `)
        .eq('is_cancelled', false)
        .gte('course_date', startDate)
        .lte('course_date', endDate)
        .order('course_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Get registration counts using the RPC function (works without auth)
      const courseIds = coursesData?.map(c => c.id) || [];
      
      // Fetch stats for each course using the existing RPC function
      const statsPromises = courseIds.map(id => 
        supabase.rpc('get_course_stats', { course_id_param: id })
      );
      const statsResults = await Promise.all(statsPromises);
      
      const courseCounts: Record<string, number> = {};
      statsResults.forEach((result, index) => {
        if (result.data && result.data[0]) {
          const courseId = courseIds[index];
          // get_course_stats now includes both members and guests in registered_count
          courseCounts[courseId] = result.data[0].registered_count || 0;
        }
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
          return {
            ...course,
            registered_count: courseCounts[course.id] || 0
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

    if (!termsAccepted) {
      toast.error('Bitte akzeptiere die AGB und Datenschutzerklärung');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('book-guest-training', {
        body: {
          courseId: selectedCourse.id,
          guestName,
          guestEmail,
          bookingType,
          phoneCountryCode: guestPhoneCountryCode,
          phoneNumber: guestPhone || null
        }
      });

      if (error) throw error;

      if (data.success) {
        setBookingInfo({ email: guestEmail, isDropIn: bookingType === 'drop_in' });
        setBookingDialogOpen(false);
        setSuccessDialogOpen(true);
        setGuestName("");
        setGuestEmail("");
        setGuestPhone("");
        setTermsAccepted(false);
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
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d6242b] mx-auto mb-2"></div>
          <p className="text-gray-400">Lade Kursplan...</p>
        </div>
      </div>
    );
  }

  // Render week table view
  if (viewMode === 'week') {
    return (
      <>
        <EmbedWeekTableView
          courses={courses}
          weekStart={weekStart}
          onPrevWeek={prevWeek}
          onNextWeek={nextWeek}
          onCourseClick={handleCourseClick}
          canGoPrev={weekStart > startOfDay(new Date())}
        />
        
        {/* Dialogs - shared with list view */}
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
                      {selectedCourse.registered_count} / {selectedCourse.max_participants}
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
                <Label htmlFor="name-week">Name *</Label>
                <Input
                  id="name-week"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Vor- und Nachname"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-week">E-Mail *</Label>
                <Input
                  id="email-week"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="deine@email.de"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Telefon (für WhatsApp-Bestätigung)</Label>
                <div className="flex gap-2">
                  <Select value={guestPhoneCountryCode} onValueChange={setGuestPhoneCountryCode}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {countryCodes.map((cc) => (
                        <SelectItem key={cc.code} value={cc.code}>
                          <div className="flex items-center gap-2">
                            <CountryFlag code={cc.code} />
                            <span>{cc.code}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    placeholder="15730440756"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value.replace(/\D/g, ''))}
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Optional</p>
              </div>

              {bookingType === 'drop_in' && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                  <p className="font-medium text-yellow-800">💰 Zahlung vor Ort: 22€</p>
                  <p className="text-yellow-700 mt-1">Die Zahlung erfolgt direkt im Gym.</p>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Checkbox 
                  id="terms-week"
                  checked={termsAccepted} 
                  onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="terms-week" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                  Ich akzeptiere die{' '}
                  <a href="https://rise-ff.lovable.app/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    AGB
                  </a>{' '}
                  und{' '}
                  <a href="https://rise-ff.lovable.app/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Datenschutzerklärung
                  </a>{' '}
                  *
                </Label>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setBookingDialogOpen(false)}
                >
                  Abbrechen
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting || !termsAccepted}>
                  {isSubmitting ? 'Wird gebucht...' : 'Jetzt buchen'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <Check className="h-6 w-6" />
                Buchung erfolgreich!
              </DialogTitle>
            </DialogHeader>
            {selectedCourse && bookingInfo && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
                  <p><strong>Kurs:</strong> {selectedCourse.title}</p>
                  <p><strong>Datum:</strong> {format(new Date(selectedCourse.course_date), 'dd.MM.yyyy', { locale: de })}</p>
                  <p><strong>Uhrzeit:</strong> {selectedCourse.start_time.substring(0, 5)} - {selectedCourse.end_time.substring(0, 5)}</p>
                  <p><strong>Trainer:</strong> {selectedCourse.trainer}</p>
                  {bookingInfo.isDropIn && (
                    <p className="text-yellow-700 font-medium">💰 Zahlung vor Ort: 22€</p>
                  )}
                </div>

                <p className="text-sm text-muted-foreground">
                  Du erhältst eine Bestätigung per E-Mail an {bookingInfo.email}
                </p>

                <Button
                  className="w-full"
                  onClick={() => setSuccessDialogOpen(false)}
                >
                  Fertig
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // List view (default)
  return (
    <div className="min-h-screen bg-[#1a1a1a] p-4 max-w-2xl mx-auto text-white">
      {/* Week Day Selector */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={prevWeek} disabled={weekStart <= startOfDay(new Date())} className="text-white hover:bg-[#333]">
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
                    ? 'bg-[#d6242b] text-white' 
                    : isTodayDate 
                      ? 'bg-[#d6242b]/20 hover:bg-[#d6242b]/30 text-white' 
                      : 'hover:bg-[#333] text-gray-300'
                }`}
              >
                <span className="text-xs font-medium">
                  {format(day, 'EEEEEE', { locale: de })}
                </span>
                <span className={`text-lg font-bold ${isSelected && isTodayDate ? 'bg-white text-[#d6242b] rounded-full w-8 h-8 flex items-center justify-center' : ''}`}>
                  {format(day, 'd')}
                </span>
              </button>
            );
          })}
        </div>
        
        <Button variant="ghost" size="icon" onClick={nextWeek} className="text-white hover:bg-[#333]">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Selected Date Header */}
      <h2 className="text-xl font-semibold mb-4 text-white">
        {format(selectedDate, 'EEEE d MMMM yyyy', { locale: de })}
      </h2>

      {/* Course List for Selected Day */}
      <div className="space-y-2">
        {coursesForSelectedDate.map((course) => {
          const totalRegistered = course.registered_count;
          const isFull = totalRegistered >= course.max_participants;

          return (
            <Card
              key={course.id}
              className={`cursor-pointer transition-all hover:shadow-md bg-[#242424] border-[#333] text-white ${isFull ? 'opacity-60' : ''}`}
              style={{ borderBottomColor: course.color || '#d6242b', borderBottomWidth: 3 }}
              onClick={() => !isFull && handleCourseClick(course)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center border rounded-lg p-2 min-w-[60px] border-[#444]" style={{ borderColor: course.color || '#d6242b' }}>
                      <span className="text-sm font-bold" style={{ color: course.color || '#d6242b' }}>
                        {course.start_time.substring(0, 5)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {course.duration_minutes || 60}m
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{course.title}</h3>
                      <p className="text-sm text-gray-400">{course.trainer}</p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    {isFull ? (
                      <Badge className="bg-[#d6242b] text-white">Voll</Badge>
                    ) : (
                      <span className="text-gray-400">
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
          <div className="text-center py-8 text-gray-400">
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
                    {selectedCourse.registered_count} / {selectedCourse.max_participants}
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

            <div className="space-y-2">
              <Label>Telefon (für WhatsApp-Bestätigung)</Label>
              <div className="flex gap-2">
                <Select value={guestPhoneCountryCode} onValueChange={setGuestPhoneCountryCode}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {countryCodes.map((cc) => (
                      <SelectItem key={cc.code} value={cc.code}>
                        <div className="flex items-center gap-2">
                          <CountryFlag code={cc.code} />
                          <span>{cc.code}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="tel"
                  inputMode="numeric"
                  placeholder="15730440756"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value.replace(/\D/g, ''))}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">Optional</p>
            </div>

            {bookingType === 'drop_in' && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                <p className="font-medium text-yellow-800">💰 Zahlung vor Ort: 22€</p>
                <p className="text-yellow-700 mt-1">Die Zahlung erfolgt direkt im Gym.</p>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Checkbox 
                id="terms-list"
                checked={termsAccepted} 
                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                className="mt-0.5"
              />
              <Label htmlFor="terms-list" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                Ich akzeptiere die{' '}
                <a href="https://rise-ff.lovable.app/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  AGB
                </a>{' '}
                und{' '}
                <a href="https://rise-ff.lovable.app/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Datenschutzerklärung
                </a>{' '}
                *
              </Label>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setBookingDialogOpen(false)}
              >
                Abbrechen
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting || !termsAccepted}>
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
          {selectedCourse && bookingInfo && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
                <p><strong>Kurs:</strong> {selectedCourse.title}</p>
                <p><strong>Datum:</strong> {format(new Date(selectedCourse.course_date), 'dd.MM.yyyy', { locale: de })}</p>
                <p><strong>Uhrzeit:</strong> {selectedCourse.start_time.substring(0, 5)} - {selectedCourse.end_time.substring(0, 5)}</p>
                <p><strong>Trainer:</strong> {selectedCourse.trainer}</p>
                {bookingInfo.isDropIn && (
                  <p className="text-yellow-700 font-medium">💰 Zahlung vor Ort: 22€</p>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                Du erhältst eine Bestätigung per E-Mail an {bookingInfo.email}
              </p>

              <Button
                className="w-full"
                onClick={() => setSuccessDialogOpen(false)}
              >
                Fertig
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
