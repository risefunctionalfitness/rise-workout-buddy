import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Format phone number: remove + and spaces
const formatPhoneNumber = (countryCode: string, number: string): string => {
  const cleanCountryCode = countryCode.replace(/^\+/, '').replace(/\s/g, '');
  const cleanNumber = number.replace(/\s/g, '');
  return `${cleanCountryCode}${cleanNumber}`;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookUrl = Deno.env.get('MAKE_COURSE_INVITATION_WEBHOOK_URL');

    if (!webhookUrl) {
      console.warn('MAKE_COURSE_INVITATION_WEBHOOK_URL not configured - skipping webhook notification');
      return new Response(
        JSON.stringify({ success: true, message: 'Webhook URL not configured' }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { invitation_id } = await req.json();

    if (!invitation_id) {
      throw new Error('invitation_id is required');
    }

    console.log(`Processing invitation notification for invitation_id: ${invitation_id}`);

    // Fetch invitation details
    const { data: invitation, error: invitationError } = await supabase
      .from('course_invitations')
      .select(`
        id,
        course_id,
        sender_id,
        recipient_id,
        message,
        status,
        created_at
      `)
      .eq('id', invitation_id)
      .single();

    if (invitationError || !invitation) {
      throw new Error(`Failed to fetch invitation: ${invitationError?.message || 'Not found'}`);
    }

    // Fetch course details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, course_date, start_time, end_time, trainer')
      .eq('id', invitation.course_id)
      .single();

    if (courseError || !course) {
      throw new Error(`Failed to fetch course: ${courseError?.message || 'Not found'}`);
    }

    // Fetch sender profile
    const { data: senderProfile, error: senderError } = await supabase
      .from('profiles')
      .select('user_id, display_name, first_name, last_name, nickname, avatar_url')
      .eq('user_id', invitation.sender_id)
      .single();

    if (senderError) {
      console.warn(`Failed to fetch sender profile: ${senderError.message}`);
    }

    // Fetch recipient profile with notification preferences
    const { data: recipientProfile, error: recipientError } = await supabase
      .from('profiles')
      .select('user_id, display_name, first_name, last_name, nickname, phone_country_code, phone_number, notify_email_enabled, notify_whatsapp_enabled')
      .eq('user_id', invitation.recipient_id)
      .single();

    if (recipientError) {
      console.warn(`Failed to fetch recipient profile: ${recipientError.message}`);
    }

    // Get recipient email from auth.users
    const { data: recipientUser, error: recipientUserError } = await supabase.auth.admin.getUserById(
      invitation.recipient_id
    );

    if (recipientUserError) {
      console.warn(`Failed to fetch recipient email: ${recipientUserError.message}`);
    }

    // Determine notification method
    const wantsEmail = recipientProfile?.notify_email_enabled !== false; // Default true
    const wantsWhatsApp = recipientProfile?.notify_whatsapp_enabled && recipientProfile?.phone_number;

    let notification_method: string;
    if (wantsEmail && wantsWhatsApp) {
      notification_method = 'both';
    } else if (wantsEmail) {
      notification_method = 'email';
    } else if (wantsWhatsApp) {
      notification_method = 'whatsapp';
    } else {
      notification_method = 'none';
    }

    // Skip if no notifications wanted
    if (notification_method === 'none') {
      console.log('User has disabled all notifications for this event');
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'User has disabled all notifications' }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Format phone number if available
    const formattedPhone = (recipientProfile?.phone_number && recipientProfile?.notify_whatsapp_enabled)
      ? formatPhoneNumber(recipientProfile.phone_country_code || '+49', recipientProfile.phone_number)
      : null;

    // Format sender name - prioritize nickname
    const senderName = senderProfile?.nickname ||
                      senderProfile?.display_name || 
                      `${senderProfile?.first_name || ''} ${senderProfile?.last_name || ''}`.trim() ||
                      'Ein Mitglied';

    // Format recipient name - prioritize nickname
    const recipientName = recipientProfile?.nickname ||
                         recipientProfile?.display_name ||
                         `${recipientProfile?.first_name || ''} ${recipientProfile?.last_name || ''}`.trim() ||
                         'Mitglied';

    // Format course time
    const courseTime = `${course.start_time.slice(0, 5)} - ${course.end_time.slice(0, 5)}`;

    // Get the app URL - redirect to /pro with invitations panel open
    const appUrl = 'https://rise-ff.lovable.app/pro?invitations=open';

    // Construct webhook payload
    const webhookData = {
      event_type: 'course_invitation',
      notification_method,
      invitation_id: invitation.id,
      sender: {
        user_id: invitation.sender_id,
        name: senderName,
        avatar_url: senderProfile?.avatar_url || null,
      },
      recipient: {
        user_id: invitation.recipient_id,
        name: recipientName,
        email: recipientUser?.user?.email || null,
      },
      phone: formattedPhone,
      course: {
        id: course.id,
        title: course.title,
        date: course.course_date,
        time: courseTime,
        trainer: course.trainer,
      },
      invitation_link: appUrl,
      message: invitation.message,
      created_at: invitation.created_at,
    };

    console.log('Sending webhook to:', webhookUrl);

    // Send webhook to Make.com
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookData),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('Webhook failed:', webhookResponse.status, errorText);
      
      // Return success even if webhook fails - invitation was already created
      return new Response(
        JSON.stringify({ 
          success: true, 
          invitation_id,
          webhook_status: 'failed',
          webhook_error: `${webhookResponse.status}: ${errorText}`
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log('Webhook sent successfully for invitation:', invitation_id);

    return new Response(
      JSON.stringify({ success: true, invitation_id, webhook_status: 'sent' }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('Error in notify-course-invitation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
