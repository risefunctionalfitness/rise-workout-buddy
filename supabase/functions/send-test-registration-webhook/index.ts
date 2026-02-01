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
      event_type: 'registration',
      notification_method: 'both',
      phone: '4915730440756',
      name: 'Max Mustermann (TEST)',
      first_name: 'Max',
      last_name: 'Mustermann',
      email: 'test@example.com',
      access_code: '123456',
      membership_type: 'Premium Member'
    }
    
    console.log('Sending test registration webhook:', webhookData)
    
    const webhookResponse = await fetch(mainWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookData)
    })
    
    const responseText = await webhookResponse.text()
    
    return new Response(
      JSON.stringify({ 
        success: webhookResponse.ok, 
        message: 'Test registration webhook sent',
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
