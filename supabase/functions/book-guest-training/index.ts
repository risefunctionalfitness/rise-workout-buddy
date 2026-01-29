import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BookingRequest {
  courseId: string;
  guestName: string;
  guestEmail: string;
  bookingType: 'drop_in' | 'probetraining';
  phoneCountryCode?: string;
  phoneNumber?: string;
}

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
    const ticketId = `${bookingType.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create guest registration
    const { data: registration, error: regError } = await supabaseClient
      .from('guest_registrations')
      .insert({
        course_id: courseId,
        guest_name: guestName,
        guest_email: guestEmail,
        booking_type: bookingType,
        ticket_id: ticketId,
        payment_status: bookingType === 'drop_in' ? 'pending' : 'paid',
        phone_country_code: phoneCountryCode || '+49',
        phone_number: phoneNumber || null
      })
      .select()
      .single();

    if (regError) {
      console.error('Error creating guest registration:', regError);
      return new Response(
        JSON.stringify({ error: 'Fehler bei der Registrierung' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Guest registration created:', registration);

    // Format course date and time
    const courseDate = new Date(course.course_date);
    const formattedDate = courseDate.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    // Prepare ticket data for email
    const ticketData = {
      ticketId,
      guestName,
      guestEmail,
      bookingType,
      courseTitle: course.title,
      courseDate: formattedDate,
      courseTime: `${course.start_time.substring(0, 5)} - ${course.end_time.substring(0, 5)}`,
      trainer: course.trainer,
      paymentNote: bookingType === 'drop_in' ? 'Zahlung vor Ort: 22€' : null,
      whatsappNumber: '+49 157 30440756',
      whatsappMessage: 'Bei Absage bitte per WhatsApp melden'
    };

    // Send email via Make.com webhook
    const webhookUrl = Deno.env.get('MAKE_GUEST_TICKET_WEBHOOK_URL');
    
    if (webhookUrl) {
      try {
        const webhookPayload = {
          event_type: 'guest_ticket',
          booking_type: bookingType,
          is_drop_in: bookingType === 'drop_in',
          is_probetraining: bookingType === 'probetraining',
          ticket: ticketData,
          timestamp: new Date().toISOString(),
          notification_method: phoneNumber ? 'both' : 'email',
          phone: phoneNumber ? formatPhoneNumber(phoneCountryCode || '+49', phoneNumber) : null
        };

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
    } else {
      console.warn('MAKE_GUEST_TICKET_WEBHOOK_URL not configured');
    }

    return new Response(
      JSON.stringify({
        success: true,
        ticket: ticketData,
        message: bookingType === 'drop_in' 
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
