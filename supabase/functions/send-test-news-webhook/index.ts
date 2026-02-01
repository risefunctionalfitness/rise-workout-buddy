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
    const webhookUrl = Deno.env.get('MAKE_NEWS_EMAIL_WEBHOOK_URL')
    
    if (!webhookUrl) {
      return new Response(
        JSON.stringify({ error: 'MAKE_NEWS_EMAIL_WEBHOOK_URL is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send the same batch structure as the production send-news-email function
    // This ensures Make.com learns the correct schema for the iterator
    const webhookData = {
      event_type: 'news_email',
      batch_number: 1,
      total_batches: 1,
      total_recipients: 2,
      timestamp: new Date().toISOString(),
      news: {
        id: 'test-news-id-12345',
        title: 'Test News Titel',
        content: '<p>Dies ist ein <strong>Test</strong> News-Inhalt mit HTML-Formatierung.</p>'
      },
      // emails[] array - this is what Make.com's iterator should process
      // Each item contains all recipient-specific fields including phone and notification_method
      emails: [
        {
          email: 'max@example.com',
          first_name: 'Max',
          last_name: 'Mustermann',
          membership_type: 'Premium Member',
          subject: 'Test News Titel',
          body: '<p>Dies ist ein <strong>Test</strong> News-Inhalt mit HTML-Formatierung.</p>',
          notification_method: 'both',
          phone: '4915730440756'
        },
        {
          email: 'anna@example.com',
          first_name: 'Anna',
          last_name: 'Schmidt',
          membership_type: 'Basic Member',
          subject: 'Test News Titel',
          body: '<p>Dies ist ein <strong>Test</strong> News-Inhalt mit HTML-Formatierung.</p>',
          notification_method: 'email',
          phone: null
        }
      ]
    }
    
    console.log('Sending test news webhook with batch structure:', JSON.stringify(webhookData, null, 2))
    
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookData)
    })
    
    const responseText = await webhookResponse.text()
    
    return new Response(
      JSON.stringify({ 
        success: webhookResponse.ok, 
        message: 'Test news webhook sent with batch structure (2 test recipients)',
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
