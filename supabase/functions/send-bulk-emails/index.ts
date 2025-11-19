import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  statusFilter: 'all' | 'active' | 'inactive'
  membershipTypes: string[]
  subject: string
  body: string
}

interface Profile {
  id: string
  user_id: string
  first_name: string | null
  last_name: string | null
  display_name: string | null
  membership_type: string | null
  status: string | null
}

interface EmailRecipient {
  email: string
  first_name: string
  last_name: string
  full_name: string
  display_name: string
  membership_type: string
  subject: string
  body: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Admin API client for fetching emails
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if user is admin
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !user) {
      console.error('Auth error:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: roles, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)

    if (roleError || !roles || !roles.some(r => r.role === 'admin')) {
      console.error('Role check failed:', roleError)
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { statusFilter, membershipTypes, subject, body }: EmailRequest = await req.json()

    console.log('Sending bulk emails with filters:', { statusFilter, membershipTypes })

    // Build query for profiles
    let query = supabaseClient
      .from('profiles')
      .select('id, user_id, first_name, last_name, display_name, membership_type, status')
      .not('user_id', 'is', null)

    // Apply status filter
    if (statusFilter === 'active') {
      query = query.eq('status', 'active')
    } else if (statusFilter === 'inactive') {
      query = query.eq('status', 'inactive')
    }

    // Apply membership type filter
    if (membershipTypes && membershipTypes.length > 0) {
      query = query.in('membership_type', membershipTypes)
    }

    const { data: profiles, error: profilesError } = await query

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      throw profilesError
    }

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No recipients found', sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${profiles.length} profiles`)

    // Fetch emails from auth.users
    const userIds = profiles.map(p => p.user_id)
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()

    if (authError) {
      console.error('Error fetching auth users:', authError)
      throw authError
    }

    // Create email map
    const emailMap = new Map(authUsers.users.map(u => [u.id, u.email]))

    // Prepare email recipients with replaced variables
    const recipients: EmailRecipient[] = profiles
      .filter(p => emailMap.has(p.user_id))
      .map(p => {
        const email = emailMap.get(p.user_id)!
        const firstName = p.first_name || ''
        const lastName = p.last_name || ''
        const fullName = `${firstName} ${lastName}`.trim() || 'Mitglied'
        const displayName = p.display_name || fullName
        const membershipType = p.membership_type || ''

        // Replace variables in subject and body
        const personalizedSubject = subject
          .replace(/\{\{first_name\}\}/g, firstName)
          .replace(/\{\{last_name\}\}/g, lastName)
          .replace(/\{\{full_name\}\}/g, fullName)
          .replace(/\{\{display_name\}\}/g, displayName)
          .replace(/\{\{membership_type\}\}/g, membershipType)

        const personalizedBody = body
          .replace(/\{\{first_name\}\}/g, firstName)
          .replace(/\{\{last_name\}\}/g, lastName)
          .replace(/\{\{full_name\}\}/g, fullName)
          .replace(/\{\{display_name\}\}/g, displayName)
          .replace(/\{\{membership_type\}\}/g, membershipType)

        return {
          email,
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          display_name: displayName,
          membership_type: membershipType,
          subject: personalizedSubject,
          body: personalizedBody
        }
      })

    console.log(`Prepared ${recipients.length} email recipients`)

    // Send emails in batches
    const batchSize = 50
    const batches: EmailRecipient[][] = []
    for (let i = 0; i < recipients.length; i += batchSize) {
      batches.push(recipients.slice(i, i + batchSize))
    }

    const webhookUrl = Deno.env.get('MAKE_EMAIL_WEBHOOK_URL')
    
    if (!webhookUrl) {
      console.error('MAKE_EMAIL_WEBHOOK_URL not configured')
      return new Response(
        JSON.stringify({ error: 'Webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Sending ${batches.length} batches to webhook`)

    // Send batches sequentially with delay
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      const payload = {
        event_type: 'bulk_email',
        batch_number: i + 1,
        total_batches: batches.length,
        total_recipients: recipients.length,
        timestamp: new Date().toISOString(),
        emails: batch
      }

      console.log(`Sending batch ${i + 1}/${batches.length} with ${batch.length} emails`)

      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          console.error(`Webhook error for batch ${i + 1}:`, await response.text())
        } else {
          console.log(`Batch ${i + 1} sent successfully`)
        }
      } catch (error) {
        console.error(`Error sending batch ${i + 1}:`, error)
      }

      // Wait 1 second before next batch (except for last batch)
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Emails sent successfully',
        sent: recipients.length,
        batches: batches.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error in send-bulk-emails function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
