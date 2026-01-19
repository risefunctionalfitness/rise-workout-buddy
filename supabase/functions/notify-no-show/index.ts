import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { registration_id, course_id, user_id } = await req.json()
    
    console.log('notify-no-show called with:', { registration_id, course_id, user_id })
    
    if (!registration_id || !course_id || !user_id) {
      throw new Error('Missing required fields: registration_id, course_id, user_id')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const webhookUrl = Deno.env.get('MAKE_NO_SHOW_WEBHOOK_URL')

    if (!webhookUrl) {
      console.error('MAKE_NO_SHOW_WEBHOOK_URL not configured')
      return new Response(JSON.stringify({ error: 'Webhook URL not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get course details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, course_date, start_time, end_time, trainer')
      .eq('id', course_id)
      .single()

    if (courseError) {
      console.error('Error fetching course:', courseError)
      throw courseError
    }

    // Get user profile with notification preferences
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('display_name, nickname, email, user_id, first_name, phone_country_code, phone_number, notify_email_enabled, notify_whatsapp_enabled')
      .eq('user_id', user_id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      throw profileError
    }

    // Get email from auth.users if not in profile
    let userEmail = profile.email
    if (!userEmail) {
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user_id)
      if (!authError && authUser?.user?.email) {
        userEmail = authUser.user.email
      }
    }

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
        success: true, 
        skipped: true, 
        reason: 'User has disabled all notifications' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // Format phone number if available
    const formattedPhone = (profile?.phone_number && profile?.notify_whatsapp_enabled)
      ? formatPhoneNumber(profile.phone_country_code || '+49', profile.phone_number)
      : null

    // Prepare webhook payload
    const webhookPayload = {
      event_type: 'no_show',
      notification_method,
      user_id: user_id,
      email: userEmail,
      phone: formattedPhone,
      name: profile.first_name || profile.nickname || profile.display_name || 'Mitglied',
      course_id: course.id,
      course_title: course.title,
      course_date: course.course_date,
      course_time: course.start_time,
      trainer_name: course.trainer,
      marked_at: new Date().toISOString()
    }

    console.log('Sending webhook payload:', webhookPayload)

    // Send to Make.com webhook
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload)
    })

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text()
      console.error('Webhook failed:', webhookResponse.status, errorText)
      throw new Error(`Webhook failed: ${webhookResponse.status}`)
    }

    console.log('Webhook sent successfully')

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'No-show notification sent',
      email: userEmail
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Error in notify-no-show:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
