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
    console.log('Manually triggering inactive member webhook for Magnus...')

    const mainWebhookUrl = Deno.env.get('MAKE_MAIN_WEBHOOK_URL')
    if (!mainWebhookUrl) {
      console.warn('MAKE_MAIN_WEBHOOK_URL is not set')
      return new Response(
        JSON.stringify({ error: 'MAKE_MAIN_WEBHOOK_URL not set' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Magnus's data (from the database query)
    const magnusData = {
      event_type: 'inactive_member',
      user_id: 'a5ffd9bf-7f8a-41ea-88eb-234277a6a52b',
      name: 'Magnus',
      email: 'magnusgottinger@gmail.com',
      access_code: '2001',
      membership_type: 'Wellpass',
      last_activity: '2025-08-07T13:57:43.139324+00:00',
      marked_inactive_at: new Date().toISOString(),
      reason: 'Manual trigger for testing - No activity for 21+ days'
    }

    console.log('Sending webhook for Magnus:', magnusData, '->', mainWebhookUrl)

    try {
      const webhookResponse = await fetch(mainWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(magnusData)
      })

      const responseText = await webhookResponse.text()
      console.log('Webhook response status:', webhookResponse.status)
      console.log('Webhook response text:', responseText)

      if (webhookResponse.ok) {
        console.log('Webhook sent successfully for Magnus')
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Webhook sent successfully for Magnus',
            data: magnusData,
            webhookStatus: webhookResponse.status,
            webhookResponse: responseText
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      } else {
        console.error('Webhook failed for Magnus. Status:', webhookResponse.status, 'Response:', responseText)
        
        // Return success even if webhook fails, so we can see the data
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Test completed (webhook may have failed)',
            data: magnusData,
            webhookStatus: webhookResponse.status,
            webhookError: responseText,
            note: 'Check Make.com webhook URL - it may be inactive or incorrect'
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    } catch (webhookError) {
      console.error('Webhook request failed:', webhookError)
      
      // Return success even if webhook fails, so we can see the data
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Test completed (webhook request failed)',
          data: magnusData,
          webhookError: webhookError.message,
          note: 'Webhook URL may be incorrect or Make.com scenario inactive'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Error in manual trigger:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})