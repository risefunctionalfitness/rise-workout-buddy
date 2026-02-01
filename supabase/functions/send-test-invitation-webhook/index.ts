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
      event_type: 'course_invitation',
      notification_method: 'both',
      sender: {
        display_name: 'Anna Musterfrau (TEST)',
        first_name: 'Anna'
      },
      recipient: {
        display_name: 'Max Mustermann (TEST)',
        first_name: 'Max',
        email: 'test@example.com',
        phone: '4915730440756'
      },
      course: {
        title: 'Functional Fitness (TEST)',
        date: new Date().toISOString().split('T')[0],
        time: '18:00',
        trainer: 'Flo'
      },
      message: 'Komm doch mit zum Training! (TEST)'
    }
    
    console.log('Sending test invitation webhook:', webhookData)
    
    const webhookResponse = await fetch(mainWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookData)
    })
    
    const responseText = await webhookResponse.text()
    
    return new Response(
      JSON.stringify({ 
        success: webhookResponse.ok, 
        message: 'Test invitation webhook sent',
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
