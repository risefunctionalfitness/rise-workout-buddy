import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const mainWebhookUrl = Deno.env.get('MAKE_MAIN_WEBHOOK_URL')
    
    if (!mainWebhookUrl) {
      return new Response(
        JSON.stringify({ error: 'MAKE_MAIN_WEBHOOK_URL is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const webhookData = {
      event_type: 'member_inactive',
      user_id: '00000000-0000-0000-0000-000000000000',
      display_name: 'Max Mustermann (TEST)',
      first_name: 'Max',
      last_name: 'Mustermann',
      email: 'test@example.com',
      membership_type: 'Premium Member',
      days_inactive: 14,
      last_activity_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      was_ever_active: true
    }
    
    console.log('Sending test inactivity webhook:', webhookData)
    
    const webhookResponse = await fetch(mainWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookData)
    })
    
    const responseText = await webhookResponse.text()
    
    return new Response(
      JSON.stringify({ 
        success: webhookResponse.ok, 
        message: 'Test inactivity webhook sent',
        payload: webhookData,
        response: responseText
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error sending test webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
