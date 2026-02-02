import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Format phone number: remove + and spaces
const formatPhoneNumber = (countryCode: string, number: string): string => {
  const cleanCountryCode = countryCode.replace(/^\+/, '').replace(/\s/g, '')
  const cleanNumber = number.replace(/\s/g, '')
  return `${cleanCountryCode}${cleanNumber}`
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const waitlistWebhookUrl = Deno.env.get('MAKE_WAITLIST_WEBHOOK_URL')

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { registration_id } = await req.json()

    if (!registration_id) {
      return new Response(JSON.stringify({ error: 'registration_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get registration details
    const { data: registration, error: regError } = await supabase
      .from('course_registrations')
      .select('id, user_id, course_id')
      .eq('id', registration_id)
      .single()

    if (regError || !registration) {
      console.error('Registration not found:', regError)
      return new Response(JSON.stringify({ error: 'Registration not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get course details including trainer
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, course_date, start_time, trainer')
      .eq('id', registration.course_id)
      .single()

    if (courseError) {
      console.error('Course not found:', courseError)
    }

    // Get profile details including notification preferences
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, first_name, phone_country_code, phone_number, notify_email_enabled, notify_whatsapp_enabled')
      .eq('user_id', registration.user_id)
      .single()

    // Get email from auth
    const { data: userData } = await supabase.auth.admin.getUserById(registration.user_id)
    const email = userData?.user?.email || null

    // Determine notification method
    const wantsEmail = profile?.notify_email_enabled !== false // Default true
    const wantsWhatsApp = profile?.notify_whatsapp_enabled && profile?.phone_number

    let notification_method: string
    if (wantsEmail && wantsWhatsApp) {
      notification_method = 'both'
    } else if (wantsEmail) {
      notification_method = 'email'
    } else if (wantsWhatsApp) {
      notification_method = 'whatsapp'
    } else {
      notification_method = 'none'
    }

    // Skip if no notifications wanted
    if (notification_method === 'none') {
      console.log('User has disabled all notifications for this event')
      return new Response(JSON.stringify({ 
        skipped: true, 
        reason: 'User has disabled all notifications' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Format phone number if available
    const formattedPhone = (profile?.phone_number && profile?.notify_whatsapp_enabled)
      ? formatPhoneNumber(profile.phone_country_code || '+49', profile.phone_number)
      : null

    // Flat payload matching AdminWebhookTester format exactly
    const webhookData = {
      event_type: 'waitlist_promotion',
      notification_method,
      phone: formattedPhone,
      user_id: registration.user_id,
      display_name: profile?.display_name || 'Unbekannt',
      first_name: profile?.first_name || '',
      email,
      course_title: course?.title || '',
      course_date: course?.course_date || '',
      course_time: course?.start_time?.substring(0, 5) || '',
      trainer: course?.trainer || ''
    }

    console.log('Sending waitlist promotion webhook:', webhookData, '->', waitlistWebhookUrl)

    if (!waitlistWebhookUrl) {
      console.warn('MAKE_WAITLIST_WEBHOOK_URL is not set')
      return new Response(JSON.stringify({ error: 'MAKE_WAITLIST_WEBHOOK_URL not set' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const res = await fetch(waitlistWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookData),
    })

    const responseText = await res.text()

    return new Response(
      JSON.stringify({ success: res.ok, status: res.status, response: responseText }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in notify-waitlist-promotion:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
