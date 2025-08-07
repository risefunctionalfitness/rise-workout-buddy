import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Get course details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title')
      .eq('id', registration.course_id)
      .single()

    if (courseError) {
      console.error('Course not found:', courseError)
    }

    // Get profile details
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, access_code, membership_type')
      .eq('user_id', registration.user_id)
      .single()

    // Get email from auth
    const { data: userData } = await supabase.auth.admin.getUserById(registration.user_id)
    const email = userData?.user?.email || null

    const webhookData = {
      event_type: 'waitlist_promoted',
      user_id: registration.user_id,
      name: profile?.display_name || 'Unbekannt',
      email,
      access_code: profile?.access_code || '',
      membership_type: profile?.membership_type || 'Member',
      course_id: course?.id,
      course_title: course?.title,
      promoted_at: new Date().toISOString(),
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