import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WellpassRequest {
  firstName: string;
  lastName: string;
  email: string;
  accessCode: string;
  wellpassMemberId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { firstName, lastName, email, accessCode, wellpassMemberId }: WellpassRequest = await req.json();

    console.log('Processing Wellpass registration:', { firstName, lastName, email, wellpassMemberId });

    // Validate inputs
    if (!firstName || !lastName || !email || !accessCode) {
      return new Response(
        JSON.stringify({ error: 'Alle Pflichtfelder müssen ausgefüllt sein' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate access code format (6 digits)
    if (!/^\d{6}$/.test(accessCode)) {
      return new Response(
        JSON.stringify({ error: 'Der Zugangscode muss genau 6 Ziffern haben' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if email already exists in wellpass_registrations
    const { data: existingWellpass } = await supabaseClient
      .from('wellpass_registrations')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingWellpass) {
      return new Response(
        JSON.stringify({ error: 'Diese E-Mail-Adresse ist bereits registriert' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if email already exists in auth.users
    const { data: existingUsers } = await supabaseClient.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some(u => u.email === email);

    if (userExists) {
      return new Response(
        JSON.stringify({ error: 'Diese E-Mail-Adresse ist bereits registriert' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user account immediately
    const { data: newUser, error: createUserError } = await supabaseClient.auth.admin.createUser({
      email: email,
      password: accessCode,
      email_confirm: true,
      user_metadata: {
        display_name: firstName,
        first_name: firstName,
        last_name: lastName,
        access_code: accessCode,
        membership_type: 'Wellpass',
        authors: false,
        show_in_leaderboard: true
      }
    });

    if (createUserError) {
      console.error('Error creating user:', createUserError);
      return new Response(
        JSON.stringify({ error: 'Fehler beim Erstellen des Accounts' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User created:', newUser.user?.id);

    // Assign member role
    const { error: roleError } = await supabaseClient
      .from('user_roles')
      .insert({
        user_id: newUser.user!.id,
        role: 'member'
      });

    if (roleError) {
      console.error('Error assigning role:', roleError);
      // Don't fail completely, user is created
    }

    // Create wellpass registration entry for admin tracking
    const { error: wellpassError } = await supabaseClient
      .from('wellpass_registrations')
      .insert({
        first_name: firstName,
        last_name: lastName,
        email: email,
        wellpass_member_id: wellpassMemberId || null,
        user_id: newUser.user!.id,
        status: 'pending' // For admin notification badge
      });

    if (wellpassError) {
      console.error('Error creating wellpass registration:', wellpassError);
      // Don't fail completely, user is created
    }

    console.log('Wellpass registration created successfully');

    // Send welcome email via Make.com webhook (optional)
    const webhookUrl = Deno.env.get('MAKE_GUEST_TICKET_WEBHOOK_URL');
    
    if (webhookUrl) {
      try {
        const webhookPayload = {
          event_type: 'wellpass_welcome',
          user: {
            firstName,
            lastName,
            email,
            accessCode
          },
          timestamp: new Date().toISOString()
        };

        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload)
        });

        console.log('Welcome email webhook sent');
      } catch (webhookError) {
        console.error('Error sending welcome webhook:', webhookError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Willkommen bei Rise! Du kannst dich jetzt mit deiner E-Mail und deinem Zugangscode in der App anmelden.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in register-wellpass:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Ein unerwarteter Fehler ist aufgetreten' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
