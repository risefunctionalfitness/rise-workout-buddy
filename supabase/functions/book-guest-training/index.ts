import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { WHATSAPP_ENABLED } from "../_shared/features.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BookingRequest {
  courseId: string;
  guestName: string;
  guestEmail: string;
  bookingType: 'drop_in' | 'probetraining' | 'event';
  phoneCountryCode?: string;
  phoneNumber?: string;
}

// Format an event price like "22" or "22.5" as "22€" / "22,50€"
const formatEventPrice = (price: number): string => {
  const isWhole = Number.isInteger(price);
  return isWhole
    ? `${price}€`
    : `${price.toFixed(2).replace('.', ',')}€`;
};

// Helper function to format phone number for webhook
const formatPhoneNumber = (countryCode: string, phone: string): string => {
  // Remove + and spaces, combine country code and number
  const cleanCountryCode = countryCode.replace(/[+\s]/g, '');
  const cleanPhone = phone.replace(/\D/g, '');
  return `${cleanCountryCode}${cleanPhone}`;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { courseId, guestName, guestEmail, bookingType, phoneCountryCode, phoneNumber }: BookingRequest = await req.json();

    console.log('Processing guest booking:', { courseId, guestName, guestEmail, bookingType, hasPhone: !!phoneNumber });

    // Validate inputs
    if (!courseId || !guestName || !guestEmail || !bookingType) {
      return new Response(
        JSON.stringify({ error: 'Alle Felder sind erforderlich' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get course details
    const { data: course, error: courseError } = await supabaseClient
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      console.error('Course not found:', courseError);
      return new Response(
        JSON.stringify({ error: 'Kurs nicht gefunden' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isEventCourse = course.is_event === true;

    // Event bookings are only allowed for event courses (and vice versa:
    // event courses can only be booked by guests via the event flow)
    if (bookingType === 'event' && !isEventCourse) {
      return new Response(
        JSON.stringify({ error: 'Dieser Kurs ist kein Event' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (isEventCourse && bookingType !== 'event') {
      return new Response(
        JSON.stringify({ error: 'Für dieses Event bitte die Event-Anmeldung im Kursplan nutzen' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (bookingType === 'event') {
      // No bookings for cancelled events
      if (course.is_cancelled) {
        return new Response(
          JSON.stringify({ error: 'Dieses Event wurde leider abgesagt' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // No bookings after the event has started (Europe/Berlin)
      const berlinNow = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Europe/Berlin',
        dateStyle: 'short',
        timeStyle: 'medium'
      }).format(new Date()); // e.g. "2026-08-11 18:32:10"
      const eventStart = `${course.course_date} ${course.start_time}`;
      if (eventStart <= berlinNow) {
        return new Response(
          JSON.stringify({ error: 'Dieses Event hat bereits stattgefunden' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check if course is full (including guest registrations)
    const { count: regularCount } = await supabaseClient
      .from('course_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .eq('status', 'registered');

    const { count: guestCount } = await supabaseClient
      .from('guest_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .eq('status', 'registered');

    const totalRegistered = (regularCount || 0) + (guestCount || 0);

    if (totalRegistered >= course.max_participants) {
      return new Response(
        JSON.stringify({ error: 'Der Kurs ist leider ausgebucht' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if email is already registered for this course
    const { data: existingGuest } = await supabaseClient
      .from('guest_registrations')
      .select('id')
      .eq('course_id', courseId)
      .eq('guest_email', guestEmail)
      .eq('status', 'registered')
      .maybeSingle();

    if (existingGuest) {
      return new Response(
        JSON.stringify({ error: 'Diese E-Mail ist bereits für diesen Kurs angemeldet' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique ticket ID
    const ticketId = `RISE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create guest registration
    const { data: registration, error: regError } = await supabaseClient
      .from('guest_registrations')
      .insert({
        course_id: courseId,
        guest_name: guestName,
        guest_email: guestEmail,
        booking_type: bookingType,
        ticket_id: ticketId,
        payment_status: bookingType === 'event'
          ? (course.event_price != null ? 'pending' : 'paid')
          : (bookingType === 'drop_in' ? 'pending' : 'paid'),
        phone_country_code: phoneCountryCode || '+49',
        phone_number: phoneNumber || null
      })
      .select()
      .single();

    if (regError) {
      console.error('Error creating guest registration:', regError);
      // Capacity guard trigger fires SQLSTATE P0001 'Course capacity exceeded'
      // when the course is full at insert time (race-condition safe).
      const isCapacityError =
        regError.code === 'P0001' ||
        (typeof regError.message === 'string' &&
          regError.message.toLowerCase().includes('course capacity exceeded'));
      if (isCapacityError) {
        return new Response(
          JSON.stringify({ error: 'Der Kurs ist leider ausgebucht' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: 'Fehler bei der Registrierung' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Guest registration created:', registration);

    // Send webhook to Make.com with flat structure matching tester format
    // (skipped for event bookings: no confirmation email, success screen only)
    const webhookUrl = bookingType === 'event'
      ? null
      : Deno.env.get('MAKE_GUEST_TICKET_WEBHOOK_URL');

    if (webhookUrl) {
      try {
        // Determine notification method
        const hasPhone = WHATSAPP_ENABLED && !!phoneNumber;
        const notificationMethod = hasPhone ? 'both' : 'email';
        const formattedPhone = hasPhone 
          ? formatPhoneNumber(phoneCountryCode || '+49', phoneNumber) 
          : null;

        // Payload with nested ticket object matching Make.com structure
        const webhookPayload = {
          event_type: 'guest_ticket',
          notification_method: notificationMethod,
          phone: formattedPhone,
          guest_name: guestName,
          guest_email: guestEmail,
          booking_type: bookingType,
          ticket: {
            ticketId: ticketId,
            courseTitle: course.title,
            courseDate: course.course_date,
            courseTime: course.start_time.substring(0, 5),
            trainer: course.trainer
          }
        };

        console.log('Sending webhook payload:', webhookPayload);

        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload)
        });

        if (!webhookResponse.ok) {
          console.error('Webhook failed:', await webhookResponse.text());
        } else {
          console.log('Ticket email webhook sent successfully');
        }
      } catch (webhookError) {
        console.error('Error sending webhook:', webhookError);
        // Don't fail the whole request if webhook fails
      }
    } else if (bookingType !== 'event') {
      console.warn('MAKE_GUEST_TICKET_WEBHOOK_URL not configured');
    }

    // Prepare ticket data for response
    const courseDate = new Date(course.course_date);
    const formattedDate = courseDate.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const ticketData = {
      ticketId,
      guestName,
      guestEmail,
      bookingType,
      courseTitle: course.title,
      courseDate: formattedDate,
      courseTime: `${course.start_time.substring(0, 5)} - ${course.end_time.substring(0, 5)}`,
      trainer: course.trainer,
      paymentNote: bookingType === 'event'
        ? (course.event_price != null ? `Zahlung vor Ort: ${formatEventPrice(Number(course.event_price))}` : null)
        : (bookingType === 'drop_in' ? 'Zahlung vor Ort: 22€' : null),
      whatsappNumber: '+49 157 30440756',
      whatsappMessage: 'Bei Absage bitte per WhatsApp melden'
    };

    return new Response(
      JSON.stringify({
        success: true,
        ticket: ticketData,
        message: bookingType === 'event'
          ? 'Deine Anmeldung war erfolgreich!'
          : bookingType === 'drop_in'
            ? 'Drop-In erfolgreich gebucht! Du erhältst eine E-Mail mit deinem Ticket.'
            : 'Probetraining erfolgreich gebucht! Du erhältst eine E-Mail mit deinem Ticket.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in book-guest-training:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Ein unerwarteter Fehler ist aufgetreten' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
