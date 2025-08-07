import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InactiveMember {
  user_id: string
  display_name: string | null
  access_code: string | null
  membership_type: string | null
  last_activity: string | null
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting inactive members check...')

    // Find members who have been inactive for 21+ days
    const twentyOneDaysAgo = new Date()
    twentyOneDaysAgo.setDate(twentyOneDaysAgo.getDate() - 21)

    // Get all active members
    const { data: activeMembers, error: membersError } = await supabase
      .from('profiles')
      .select('user_id, display_name, access_code, membership_type, last_login_at')
      .eq('status', 'active')

    if (membersError) {
      console.error('Error fetching active members:', membersError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch members' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${activeMembers?.length || 0} active members`)

    const inactiveMembers: InactiveMember[] = []

    // Check each member's activity
    for (const member of activeMembers || []) {
      // Check for recent course registrations
      const { data: courseRegistrations } = await supabase
        .from('course_registrations')
        .select('registered_at')
        .eq('user_id', member.user_id)
        .gte('registered_at', twentyOneDaysAgo.toISOString())
        .limit(1)

      // Check for recent training sessions (open gym)
      const { data: trainingSessions } = await supabase
        .from('training_sessions')
        .select('created_at')
        .eq('user_id', member.user_id)
        .gte('created_at', twentyOneDaysAgo.toISOString())
        .limit(1)

      // If no recent activity, mark as inactive
      if ((!courseRegistrations || courseRegistrations.length === 0) && 
          (!trainingSessions || trainingSessions.length === 0)) {
        
        console.log(`Member ${member.display_name} (${member.user_id}) is inactive`)
        
        inactiveMembers.push({
          user_id: member.user_id,
          display_name: member.display_name,
          access_code: member.access_code,
          membership_type: member.membership_type,
          last_activity: member.last_login_at
        })
      }
    }

    console.log(`Found ${inactiveMembers.length} inactive members`)

    // Process each inactive member
    for (const member of inactiveMembers) {
      try {
        // Update member status to inactive
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            status: 'inactive',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', member.user_id)

        if (updateError) {
          console.error(`Error updating member ${member.user_id}:`, updateError)
          continue
        }

        console.log(`Updated member ${member.display_name} to inactive status`)

        // Send webhook to Make.com
        const webhookData = {
          user_id: member.user_id,
          name: member.display_name || 'Unbekannt',
          access_code: member.access_code || '',
          membership_type: member.membership_type || 'Member',
          last_activity: member.last_activity,
          marked_inactive_at: new Date().toISOString(),
          reason: 'No activity for 21+ days'
        }

        console.log('Sending inactive member webhook:', webhookData)

        const webhookResponse = await fetch('https://hook.eu2.make.com/o8rpbanyrp9asga16g4isj11ufw336wb', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookData)
        })

        if (webhookResponse.ok) {
          console.log(`Webhook sent successfully for member ${member.display_name}`)
        } else {
          console.error(`Webhook failed for member ${member.user_id}:`, await webhookResponse.text())
        }

      } catch (memberError) {
        console.error(`Error processing member ${member.user_id}:`, memberError)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: inactiveMembers.length,
        message: `Processed ${inactiveMembers.length} inactive members`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in process-inactive-members function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})