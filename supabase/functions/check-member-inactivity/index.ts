import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Starting member inactivity check...');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get webhook URL from settings
    const { data: webhookSettings } = await supabaseClient
      .from('webhook_settings')
      .select('webhook_url, is_active')
      .eq('webhook_type', 'member_reactivation')
      .eq('is_active', true)
      .single();

    const webhookUrl = webhookSettings?.webhook_url || Deno.env.get('MAKE_REACTIVATION_WEBHOOK_URL');

    if (!webhookUrl) {
      console.log('⚠️ No webhook URL configured, skipping notifications');
    }

    // Find active members who haven't registered for a course in 21+ days
    const twentyOneDaysAgo = new Date();
    twentyOneDaysAgo.setDate(twentyOneDaysAgo.getDate() - 21);

    console.log(`📅 Looking for members inactive since: ${twentyOneDaysAgo.toISOString()}`);

    // Get all active members with their last course registration
    const { data: activeMembers, error: membersError } = await supabaseClient
      .from('profiles')
      .select('user_id, display_name, first_name, last_name, email, membership_type, last_inactivity_webhook_sent_at')
      .eq('status', 'active')
      .not('membership_type', 'in', '("Administrator","Admin")'); // Exclude admins

    if (membersError) {
      throw new Error(`Error fetching members: ${membersError.message}`);
    }

    console.log(`👥 Found ${activeMembers?.length || 0} active members to check`);

    const inactiveMembers: any[] = [];
    let processedCount = 0;
    let newInactiveCount = 0;

    for (const member of activeMembers || []) {
      processedCount++;

      // Get last course registration for this member
      const { data: lastRegistration, error: regError } = await supabaseClient
        .from('course_registrations')
        .select('registered_at')
        .eq('user_id', member.user_id)
        .in('status', ['registered', 'waitlisted'])
        .order('registered_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (regError) {
        console.error(`❌ Error checking registrations for user ${member.user_id}: ${regError.message}`);
        continue;
      }

      // Skip if member has never registered (new member without any registration)
      if (!lastRegistration) {
        console.log(`⏭️ Skipping user ${member.display_name || member.user_id}: never registered for a course`);
        continue;
      }

      const lastRegDate = new Date(lastRegistration.registered_at);
      const daysSinceLastReg = Math.floor((Date.now() - lastRegDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSinceLastReg >= 21) {
        console.log(`⚠️ User ${member.display_name || member.user_id} inactive for ${daysSinceLastReg} days (last: ${lastRegDate.toISOString()})`);
        
        inactiveMembers.push({
          user_id: member.user_id,
          display_name: member.display_name || 'Unknown',
          first_name: member.first_name || '',
          last_name: member.last_name || '',
          email: member.email || '',
          membership_type: member.membership_type || 'Member',
          last_activity_date: lastRegistration.registered_at.split('T')[0],
          days_inactive: daysSinceLastReg
        });

        // Update member status to inactive
        const { error: updateError } = await supabaseClient
          .from('profiles')
          .update({ 
            status: 'inactive',
            last_inactivity_webhook_sent_at: new Date().toISOString()
          })
          .eq('user_id', member.user_id);

        if (updateError) {
          console.error(`❌ Error updating status for user ${member.user_id}: ${updateError.message}`);
          continue;
        }

        newInactiveCount++;

        // Send webhook notification with flat structure matching AdminWebhookTester format
        if (webhookUrl) {
          try {
            // Flat payload matching AdminWebhookTester format exactly
            const webhookPayload = {
              event_type: 'member_inactive',
              user_id: member.user_id,
              display_name: member.display_name || 'Unknown',
              first_name: member.first_name || '',
              last_name: member.last_name || '',
              email: member.email || '',
              membership_type: member.membership_type || 'Member',
              days_inactive: daysSinceLastReg,
              last_activity_date: lastRegistration.registered_at.split('T')[0],
              was_ever_active: true
            };

            console.log(`📤 Sending webhook for user ${member.display_name || member.user_id}:`, webhookPayload);

            const webhookResponse = await fetch(webhookUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(webhookPayload),
            });

            if (webhookResponse.ok) {
              console.log(`✅ Webhook sent successfully for user ${member.user_id}`);
            } else {
              console.error(`❌ Webhook failed for user ${member.user_id}: ${webhookResponse.status} ${webhookResponse.statusText}`);
            }
          } catch (webhookError) {
            console.error(`❌ Webhook error for user ${member.user_id}:`, webhookError);
          }
        }
      }
    }

    console.log(`✅ Inactivity check completed:`);
    console.log(`   - Total members checked: ${processedCount}`);
    console.log(`   - New inactive members: ${newInactiveCount}`);
    console.log(`   - Webhooks sent: ${webhookUrl ? newInactiveCount : 0}`);

    return new Response(
      JSON.stringify({
        success: true,
        checked: processedCount,
        newly_inactive: newInactiveCount,
        inactive_members: inactiveMembers,
        webhooks_sent: webhookUrl ? newInactiveCount : 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Error in check-member-inactivity:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check function logs for more information'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
