import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get webhook type from request body (default to reactivation)
    const body = await req.json().catch(() => ({}))
    const webhookType = body.webhook_type || 'member_reactivation'

    // Get webhook URL from database
    const { data: webhookSettings, error: webhookError } = await supabaseAdmin
      .from('webhook_settings')
      .select('webhook_url, is_active')
      .eq('webhook_type', webhookType)
      .single()

    if (webhookError || !webhookSettings?.webhook_url) {
      return new Response(
        JSON.stringify({ error: `Webhook ${webhookType} is not configured` }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const webhookUrl = webhookSettings.webhook_url
    
    if (!mainWebhookUrl) {
      return new Response(
        JSON.stringify({ error: 'MAKE_MAIN_WEBHOOK_URL is not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Test webhook payload for member reactivation
    const webhookData = {
      event_type: 'member_reactivated',
      user_id: '00000000-0000-0000-0000-000000000000',
      display_name: 'Max Mustermann (TEST)',
      first_name: 'Max',
      last_name: 'Mustermann',
      email: 'test@example.com',
      access_code: '123456',
      membership_type: 'Premium Member',
      reactivated_at: new Date().toISOString(),
      reactivation_trigger: 'course_registration', // or 'training_session'
      days_inactive: 25
    }
    
    console.log('Sending test webhook to Make.com:', webhookData)
    
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookData)
    })
    
    const responseText = await webhookResponse.text()
    
    if (webhookResponse.ok) {
      console.log('Test webhook sent successfully')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Test reactivation webhook sent successfully',
          payload: webhookData,
          response: responseText
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } else {
      console.error('Webhook failed:', responseText)
      return new Response(
        JSON.stringify({ 
          error: 'Webhook request failed',
          status: webhookResponse.status,
          response: responseText
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.error('Error sending test webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})