import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { email, password, user_metadata } = await req.json()
    
    console.log('Received request with:', { email, user_metadata })

    // Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers()
    const userExists = existingUser.users?.find(user => user.email === email)
    
    if (userExists) {
      console.log('User already exists with email:', email)
      return new Response(
        JSON.stringify({ 
          error: `Ein Benutzer mit der E-Mail-Adresse "${email}" ist bereits registriert.`,
          code: 'USER_ALREADY_EXISTS'
        }),
        { 
          status: 409, // Conflict status code
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create user with admin privileges
    const { data, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata
    })

    if (createError) {
      console.error('Error creating user:', createError)
      
      // Handle specific error cases
      let errorMessage = createError.message
      if (createError.message.includes('email address has already been registered')) {
        errorMessage = `Ein Benutzer mit der E-Mail-Adresse "${email}" ist bereits registriert.`
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Add appropriate role based on membership type
    const membershipType = user_metadata?.membership_type
    console.log('Membership type received:', membershipType)
    
    let role = 'member' // default role
    
    if (membershipType === 'Basic Member') {
      role = 'basic_member'
    } else if (membershipType === 'Premium Member') {
      role = 'premium_member'
    } else if (membershipType === 'Trainer') {
      role = 'trainer'
    } else if (membershipType === 'Administrator') {
      role = 'admin'
    } else if (membershipType === 'Open Gym') {
      role = 'open_gym'
    }
    
    console.log('Role assigned:', role)
    
    if (data?.user) {
      console.log('Attempting to add role:', role, 'for user:', data.user.id)
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: data.user.id,
          role: role
        })

      if (roleError) {
        console.error('Error adding role:', roleError)
        return new Response(
          JSON.stringify({ error: `Failed to assign role: ${roleError.message}` }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      } else {
        console.log('Successfully added role:', role)
      }
      
      // Update profile with phone data if provided
      if (user_metadata?.phone_number) {
        const { error: phoneError } = await supabase
          .from('profiles')
          .update({
            phone_country_code: user_metadata.phone_country_code || '+49',
            phone_number: user_metadata.phone_number,
            notify_whatsapp_enabled: true
          })
          .eq('user_id', data.user.id)
        
        if (phoneError) {
          console.error('Error updating phone data:', phoneError)
        } else {
          console.log('Successfully updated phone data')
        }
      }
      
      // Initialize credits for 10er Karte members with 0 credits (admin must recharge)
      if (membershipType === '10er Karte') {
        const { error: creditsError } = await supabase
          .from('membership_credits')
          .insert({
            user_id: data.user.id,
            credits_remaining: 0,
            credits_total: 0,
            last_recharged_at: null,
          })

        if (creditsError) {
          console.error('Error initializing credits:', creditsError)
          // Don't throw error here, just log it
        }
      }
      
      // Send webhook to Make.com after successful member creation
      try {
        const mainWebhookUrl = Deno.env.get('MAKE_MAIN_WEBHOOK_URL')
        
        // Determine notification method based on phone availability
        const hasPhone = !!user_metadata?.phone_number
        const phoneCountryCode = user_metadata?.phone_country_code || '+49'
        const phoneNumber = user_metadata?.phone_number || ''
        const formattedPhone = hasPhone 
          ? `${phoneCountryCode.replace('+', '')}${phoneNumber}` 
          : null
        
        const webhookData = {
          event_type: 'registration',
          notification_method: hasPhone ? 'both' : 'email',
          phone: formattedPhone,
          name: user_metadata?.display_name || 'Unbekannt',
          first_name: user_metadata?.first_name || '',
          last_name: user_metadata?.last_name || '',
          email: email,
          access_code: user_metadata?.access_code || '',
          membership_type: membershipType || 'Member',
          created_at: new Date().toISOString(),
          user_id: data.user.id
        }
        
        console.log('Sending webhook to Make.com:', webhookData, '->', mainWebhookUrl)
        
        if (!mainWebhookUrl) {
          console.warn('MAKE_MAIN_WEBHOOK_URL is not set')
        } else {
          const webhookResponse = await fetch(mainWebhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(webhookData)
          })
          
          if (webhookResponse.ok) {
            console.log('Webhook sent successfully to Make.com')
          } else {
            console.error('Webhook failed:', await webhookResponse.text())
          }
        }
      } catch (webhookError) {
        console.error('Error sending webhook to Make.com:', webhookError)
        // Don't fail the main operation if webhook fails
      }
    }

    return new Response(
      JSON.stringify({ success: true, user: data?.user }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})