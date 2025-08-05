import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ManageCreditsRequest {
  user_id: string;
  credits_to_add: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase URL and anon key from environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Initialize Supabase client with service role key for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is authenticated and has admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header missing' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Check if user is admin
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (roleError || !userRoles?.some(role => role.role === 'admin')) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    const { user_id, credits_to_add }: ManageCreditsRequest = await req.json();

    if (!user_id || typeof credits_to_add !== 'number' || credits_to_add <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid parameters' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Check if user has 10er Karte membership
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('membership_type')
      .eq('user_id', user_id)
      .single();

    if (profileError || profile?.membership_type !== '10er Karte') {
      return new Response(JSON.stringify({ error: 'User must have 10er Karte membership' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Update or insert credits
    const { data: existingCredits } = await supabase
      .from('membership_credits')
      .select('credits_remaining, credits_total')
      .eq('user_id', user_id)
      .single();

    if (existingCredits) {
      // Update existing credits
      const { data, error } = await supabase
        .from('membership_credits')
        .update({
          credits_remaining: existingCredits.credits_remaining + credits_to_add,
          credits_total: existingCredits.credits_total + credits_to_add,
          last_recharged_at: new Date().toISOString(),
        })
        .eq('user_id', user_id)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ 
        success: true, 
        credits: data,
        message: `${credits_to_add} Credits erfolgreich hinzugefügt`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } else {
      // Create new credits record
      const { data, error } = await supabase
        .from('membership_credits')
        .insert({
          user_id,
          credits_remaining: credits_to_add,
          credits_total: credits_to_add,
          last_recharged_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ 
        success: true, 
        credits: data,
        message: `${credits_to_add} Credits erfolgreich hinzugefügt`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

  } catch (error: any) {
    console.error('Error in manage-credits function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An error occurred while managing credits' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});