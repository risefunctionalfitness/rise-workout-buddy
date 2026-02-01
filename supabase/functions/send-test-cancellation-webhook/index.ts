import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const webhookUrl = Deno.env.get('MAKE_COURSE_CANCELLATION_WEBHOOK_URL')

    if (!webhookUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'Webhook URL not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Test payload mit der gleichen Struktur wie die echte Edge Function
    const testPayload = {
      event_type: 'course_cancelled_low_attendance',
      course: {
        id: 'test-course-id-12345',
        title: 'Test Functional Fitness',
        date: '2025-12-13',
        start_time: '18:00:00',
        end_time: '19:00:00',
        trainer: 'Flo'
      },
      registered_count: 2,
      minimum_required: 3,
      participants: [
        { email: 'test1@example.com', first_name: 'Max', display_name: 'Max Mustermann', phone: '4915730440756', notification_method: 'both' },
        { email: 'test2@example.com', first_name: 'Anna', display_name: 'Anna Musterfrau', phone: '4917612345678', notification_method: 'email' }
      ],
      cancelled_at: new Date().toISOString()
    }

    console.log('Sending test webhook payload:', JSON.stringify(testPayload, null, 2))

    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    })

    const responseText = await webhookResponse.text()
    console.log(`Webhook response status: ${webhookResponse.status}`)
    console.log(`Webhook response body: ${responseText}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test webhook sent successfully',
        webhook_status: webhookResponse.status,
        payload_sent: testPayload
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error sending test webhook:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
