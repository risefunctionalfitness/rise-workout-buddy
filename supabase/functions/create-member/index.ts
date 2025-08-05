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
    
    if (membershipType === 'Trainer') {
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