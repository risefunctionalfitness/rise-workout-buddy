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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const waitlistWebhookUrl = Deno.env.get('MAKE_WAITLIST_WEBHOOK_URL')

    if (!waitlistWebhookUrl) {
      console.warn('MAKE_WAITLIST_WEBHOOK_URL is not set')
      return new Response(
        JSON.stringify({ error: 'MAKE_WAITLIST_WEBHOOK_URL not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔄 Dispatching pending waitlist webhooks...')

    // Get all pending events (webhook_sent_at is NULL)
    const { data: pendingEvents, error: fetchError } = await supabase
      .from('waitlist_promotion_events')
      .select('id, user_id, course_id, registration_id, created_at')
      .is('webhook_sent_at', null)
      .order('created_at', { ascending: true })
      .limit(50) // Process max 50 per run to avoid timeout

    if (fetchError) {
      console.error('❌ Error fetching pending events:', fetchError)
      throw fetchError
    }

    if (!pendingEvents || pendingEvents.length === 0) {
      console.log('✅ No pending webhooks to dispatch')
      return new Response(
        JSON.stringify({ message: 'No pending webhooks', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📋 Found ${pendingEvents.length} pending webhooks`)

    const results: { eventId: string; success: boolean; error?: string }[] = []

    for (const event of pendingEvents) {
      try {
        // Get course details
        const { data: course, error: courseError } = await supabase
          .from('courses')
          .select('id, title, course_date, start_time, trainer')
          .eq('id', event.course_id)
          .single()

        if (courseError) {
          console.error(`❌ Course not found for event ${event.id}:`, courseError)
          results.push({ eventId: event.id, success: false, error: 'Course not found' })
          continue
        }

        // Get profile with notification preferences
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, first_name, phone_country_code, phone_number, notify_email_enabled, notify_whatsapp_enabled')
          .eq('user_id', event.user_id)
          .single()

        // Get email from auth
        const { data: userData } = await supabase.auth.admin.getUserById(event.user_id)
        const email = userData?.user?.email || null

        // Determine notification method based on CURRENT preferences
        const wantsEmail = profile?.notify_email_enabled !== false
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
          console.log(`⏭️ User ${event.user_id} has disabled all notifications, marking as sent`)
          await supabase
            .from('waitlist_promotion_events')
            .update({ webhook_sent_at: new Date().toISOString() })
            .eq('id', event.id)
          results.push({ eventId: event.id, success: true })
          continue
        }

        // Format phone number if available
        const formattedPhone = (profile?.phone_number && profile?.notify_whatsapp_enabled)
          ? formatPhoneNumber(profile.phone_country_code || '+49', profile.phone_number)
          : null

        // Build standardized payload (matches AdminWebhookTester format)
        const webhookData = {
          event_type: 'waitlist_promotion',
          notification_method,
          phone: formattedPhone,
          user_id: event.user_id,
          display_name: profile?.display_name || 'Unbekannt',
          first_name: profile?.first_name || '',
          email,
          course_title: course.title,
          course_date: course.course_date,
          course_time: course.start_time?.substring(0, 5) || '',
          trainer: course.trainer || ''
        }

        console.log(`📤 Sending webhook for event ${event.id}:`, webhookData)

        // Send webhook to Make.com
        const webhookResponse = await fetch(waitlistWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookData),
        })

        if (webhookResponse.ok) {
          // Mark as successfully sent
          await supabase
            .from('waitlist_promotion_events')
            .update({ 
              webhook_sent_at: new Date().toISOString(),
              notified_at: new Date().toISOString() 
            })
            .eq('id', event.id)

          console.log(`✅ Webhook sent successfully for event ${event.id}`)
          results.push({ eventId: event.id, success: true })
        } else {
          const errorText = await webhookResponse.text()
          console.error(`❌ Webhook failed for event ${event.id}: ${webhookResponse.status} - ${errorText}`)
          results.push({ eventId: event.id, success: false, error: `HTTP ${webhookResponse.status}` })
        }

      } catch (eventError) {
        console.error(`❌ Error processing event ${event.id}:`, eventError)
        results.push({ eventId: event.id, success: false, error: eventError.message })
      }
    }

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    console.log(`🎉 Dispatch completed: ${successful} successful, ${failed} failed`)

    return new Response(
      JSON.stringify({
        message: 'Webhook dispatch completed',
        processed: results.length,
        successful,
        failed,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Fatal error in dispatch-waitlist-webhooks:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
