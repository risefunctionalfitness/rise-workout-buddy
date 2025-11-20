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

    // Get webhook settings
    const { data: webhookSettings, error: webhookError } = await supabaseAdmin
      .from('webhook_settings')
      .select('webhook_url, is_active')
      .eq('webhook_type', 'member_reactivation')
      .single()

    if (webhookError || !webhookSettings?.webhook_url || !webhookSettings.is_active) {
      console.log('Reactivation webhook is not configured or not active')
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Reactivation webhook is not configured or not active' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const webhookUrl = webhookSettings.webhook_url

    // Get inactive members (21+ days without activity)
    const { data: inactiveMembers, error: membersError } = await supabaseAdmin
      .rpc('get_inactive_members', { days_threshold: 21 })

    if (membersError) {
      console.error('Error fetching inactive members:', membersError)
      throw membersError
    }

    if (!inactiveMembers || inactiveMembers.length === 0) {
      console.log('No inactive members found')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No inactive members found',
          count: 0
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Found ${inactiveMembers.length} inactive members`)

    // Send webhook for each inactive member
    const results = []
    for (const member of inactiveMembers) {
      const webhookData = {
        event_type: 'member_inactive',
        user_id: member.user_id,
        display_name: member.display_name,
        first_name: member.first_name,
        last_name: member.last_name,
        membership_type: member.membership_type,
        days_since_activity: member.days_since_activity,
        last_activity: member.last_activity,
        was_ever_active: member.was_ever_active,
        detected_at: new Date().toISOString()
      }

      try {
        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookData)
        })

        const success = webhookResponse.ok
        results.push({
          user_id: member.user_id,
          display_name: member.display_name,
          success,
          status: webhookResponse.status
        })

        console.log(`Webhook sent for ${member.display_name}: ${success ? 'success' : 'failed'}`)
      } catch (error) {
        console.error(`Error sending webhook for ${member.display_name}:`, error)
        results.push({
          user_id: member.user_id,
          display_name: member.display_name,
          success: false,
          error: error.message
        })
      }
    }

    const successCount = results.filter(r => r.success).length

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Sent ${successCount}/${inactiveMembers.length} reactivation webhooks`,
        results
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in reactivation webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})