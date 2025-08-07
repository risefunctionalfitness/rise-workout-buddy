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

    // Magnus's data (from the database query)
    const magnusData = {
      user_id: 'a5ffd9bf-7f8a-41ea-88eb-234277a6a52b',
      name: 'Magnus',
      email: 'magnusgottinger@gmail.com',
      access_code: '2001',
      membership_type: 'Wellpass',
      last_activity: '2025-08-07T13:57:43.139324+00:00',
      marked_inactive_at: new Date().toISOString(),
      reason: 'Manual trigger for testing - No activity for 21+ days'
    }

    console.log('Sending webhook for Magnus:', magnusData)

    const webhookResponse = await fetch('https://hook.eu2.make.com/o8rpbanyrp9asga16g4isj11ufw336wb', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(magnusData)
    })

    if (webhookResponse.ok) {
      console.log('Webhook sent successfully for Magnus')
      const responseText = await webhookResponse.text()
      console.log('Webhook response:', responseText)
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Webhook sent successfully for Magnus',
          data: magnusData,
          webhookResponse: responseText
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else {
      const errorText = await webhookResponse.text()
      console.error('Webhook failed for Magnus:', errorText)
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Webhook failed',
          details: errorText
        }),
        { 
          status: 500, 
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