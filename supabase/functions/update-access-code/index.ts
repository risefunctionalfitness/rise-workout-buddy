import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create regular client to get current user
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { newAccessCode, targetUserId } = await req.json();

    // Validate access code
    if (!newAccessCode || typeof newAccessCode !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Zugangscode ist erforderlich' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate format: only numbers, at least 6 digits
    if (!/^\d{6,}$/.test(newAccessCode)) {
      return new Response(
        JSON.stringify({ error: 'Zugangscode muss mindestens 6 Zahlen enthalten' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userIdToUpdate = targetUserId || user.id;

    // Check permissions: user can update their own, or check if user is admin
    if (userIdToUpdate !== user.id) {
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (!userRole || userRole.role !== 'admin') {
        return new Response(
          JSON.stringify({ error: 'Nicht berechtigt, andere Zugangscodes zu ändern' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update profiles table
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ access_code: newAccessCode })
      .eq('user_id', userIdToUpdate);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Fehler beim Aktualisieren des Profils' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update Supabase Auth password using admin client
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userIdToUpdate,
      { password: newAccessCode }
    );

    if (authError) {
      console.error('Error updating auth password:', authError);
      // Rollback profile update if auth update failed
      await supabaseAdmin
        .from('profiles')
        .update({ access_code: null })
        .eq('user_id', userIdToUpdate);
      
      return new Response(
        JSON.stringify({ error: 'Fehler beim Aktualisieren des Anmelde-Zugangscodes' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the change for security
    console.log(`Access code updated for user ${userIdToUpdate} by ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Zugangscode erfolgreich geändert. Verwenden Sie den neuen Code für die nächste Anmeldung.' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in update-access-code function:', error);
    return new Response(
      JSON.stringify({ error: 'Interner Serverfehler' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});