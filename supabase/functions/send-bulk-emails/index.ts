import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  subject: string
  body: string
  selectedUserIds: string[]
  statusFilter?: 'all' | 'active' | 'inactive'
  membershipTypes?: string[]
}

interface Profile {
  id: string
  user_id: string
  first_name: string | null
  last_name: string | null
  display_name: string | null
  membership_type: string | null
  status: string | null
  email: string | null
  access_code: string | null
}

interface EmailRecipient {
  email: string
  first_name: string
  last_name: string
  membership_type: string
  email_and_code: string
  subject: string
  body: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get Authorization header
    const authHeader = req.headers.get('Authorization')
    console.log('Authorization header present:', !!authHeader)
    
    if (!authHeader) {
      console.error('No Authorization header found')
      return new Response(
        JSON.stringify({ error: 'No Authorization header - please login again' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract token from Bearer header
    const token = authHeader.replace('Bearer ', '')
    console.log('Token extracted, length:', token.length)

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Admin API client for fetching emails and validating JWT
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Use supabaseAdmin to validate JWT token directly
    // This avoids session-related auth errors by using SERVICE_ROLE_KEY
    console.log('Validating token with admin client...')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      console.error('Auth error:', userError?.message || 'Unknown error')
      console.error('Full auth error:', JSON.stringify(userError))
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User authenticated successfully:', user.id, 'Email:', user.email)

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
    const { selectedUserIds, subject, body }: EmailRequest = await req.json()

    console.log('Sending bulk emails to selected users:', { count: selectedUserIds?.length || 0 })

    // Build query for profiles
    let query = supabaseClient
      .from('profiles')
      .select('id, user_id, first_name, last_name, display_name, membership_type, status, email, access_code')
      .not('user_id', 'is', null)

    // Filter by selected user IDs
    if (selectedUserIds && selectedUserIds.length > 0) {
      query = query.in('user_id', selectedUserIds)
    } else {
      // If no users selected, return empty result
      return new Response(
        JSON.stringify({ error: 'No recipients selected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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
        const membershipType = p.membership_type || ''
        const accessCode = p.access_code || 'Kein Code'
        const emailAndCode = `Email: ${email}\nZugangscode: ${accessCode}`

        // Replace variables in subject and body
        const personalizedSubject = subject
          .replace(/\{\{first_name\}\}/g, firstName)
          .replace(/\{\{last_name\}\}/g, lastName)
          .replace(/\{\{membership_type\}\}/g, membershipType)
          .replace(/\{\{email_and_code\}\}/g, emailAndCode)

        const personalizedBody = body
          .replace(/\{\{first_name\}\}/g, firstName)
          .replace(/\{\{last_name\}\}/g, lastName)
          .replace(/\{\{membership_type\}\}/g, membershipType)
          .replace(/\{\{email_and_code\}\}/g, emailAndCode)

        return {
          email,
          first_name: firstName,
          last_name: lastName,
          membership_type: membershipType,
          email_and_code: emailAndCode,
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
