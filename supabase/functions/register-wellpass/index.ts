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
  phoneCountryCode?: string;
  phoneNumber?: string;
}

// Helper function to format phone number for webhook
const formatPhoneNumber = (countryCode: string, phone: string): string => {
  // Remove + and spaces, combine country code and number
  const cleanCountryCode = countryCode.replace(/[+\s]/g, '');
  const cleanPhone = phone.replace(/\D/g, '');
  return `${cleanCountryCode}${cleanPhone}`;
};

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

    const { firstName, lastName, email, accessCode, phoneCountryCode, phoneNumber }: WellpassRequest = await req.json();

    console.log('Processing Wellpass registration:', { firstName, lastName, email, hasPhone: !!phoneNumber });

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
        show_in_leaderboard: true,
        phone_country_code: phoneCountryCode || '+49',
        phone_number: phoneNumber || '',
        notify_whatsapp_enabled: !!phoneNumber,
        notify_email_enabled: true
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
        user_id: newUser.user!.id,
        status: 'pending', // For admin notification badge
        phone_country_code: phoneCountryCode || '+49',
        phone_number: phoneNumber || null,
        terms_accepted_at: new Date().toISOString()
      });

    if (wellpassError) {
      console.error('Error creating wellpass registration:', wellpassError);
      // Don't fail completely, user is created
    }

    console.log('Wellpass registration created successfully');

    // Send registration webhook to Make.com (same as create-member)
    const mainWebhookUrl = Deno.env.get('MAKE_MAIN_WEBHOOK_URL');

    if (mainWebhookUrl) {
      try {
        const webhookData = {
          event_type: 'registration',
          name: firstName,
          email: email,
          access_code: accessCode,
          membership_type: 'Wellpass',
          created_at: new Date().toISOString(),
          user_id: newUser.user!.id,
          notification_method: phoneNumber ? 'both' : 'email',
          phone: phoneNumber ? formatPhoneNumber(phoneCountryCode || '+49', phoneNumber) : null
        };

        console.log('Sending registration webhook to Make.com:', webhookData);

        const webhookResponse = await fetch(mainWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookData)
        });

        if (webhookResponse.ok) {
          console.log('Registration webhook sent successfully');
        } else {
          console.error('Webhook failed:', await webhookResponse.text());
        }
      } catch (webhookError) {
        console.error('Error sending registration webhook:', webhookError);
      }
    } else {
      console.log('No MAKE_MAIN_WEBHOOK_URL configured, skipping registration email');
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
