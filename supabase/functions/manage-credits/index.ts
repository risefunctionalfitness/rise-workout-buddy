import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ManageCreditsRequest {
  user_id: string;
  credits_to_add: number;
  description?: string;
  // Card type for recharges: 'year' = 1 Jahr gültig, 'ten_weeks' = 10 Wochen gültig.
  // The validity period starts with the member's first booking after the recharge.
  card_type?: 'year' | 'ten_weeks';
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

    const { user_id, credits_to_add, description, card_type }: ManageCreditsRequest = await req.json();

    if (!user_id || typeof credits_to_add !== 'number' || credits_to_add === 0) {
      return new Response(JSON.stringify({ error: 'Invalid parameters' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    if (card_type && !['year', 'ten_weeks'].includes(card_type)) {
      return new Response(JSON.stringify({ error: 'Invalid card_type' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Check if user has 10er Karte membership
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('membership_type, display_name')
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
      .select('credits_remaining, credits_total, valid_until')
      .eq('user_id', user_id)
      .single();

    let newCreditsRemaining: number;
    let newCreditsTotal: number;

    if (existingCredits) {
      // Leftover credits on an EXPIRED card are forfeited - they must not
      // come back to life through a recharge. (The expiry wipe normally
      // happens lazily on a booking attempt, so it may not have run yet.)
      const cardExpired = !!existingCredits.valid_until &&
        new Date(existingCredits.valid_until) < new Date();
      const effectiveRemaining = cardExpired ? 0 : existingCredits.credits_remaining;

      if (cardExpired && existingCredits.credits_remaining > 0) {
        await supabase.from('credit_transactions').insert({
          user_id,
          amount: -existingCredits.credits_remaining,
          transaction_type: 'expired',
          description: '10er Karte abgelaufen - Restcredits verfallen',
          balance_after: 0,
          created_by: user.id,
        });
      }

      // Check if deducting credits would result in negative balance
      if (credits_to_add < 0 && effectiveRemaining + credits_to_add < 0) {
        return new Response(JSON.stringify({
          error: `Nicht genügend Credits vorhanden. Aktuell: ${effectiveRemaining}, versucht abzuziehen: ${Math.abs(credits_to_add)}`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      // Calculate new credits
      newCreditsRemaining = effectiveRemaining + credits_to_add;
      newCreditsTotal = credits_to_add > 0 ? existingCredits.credits_total + credits_to_add : existingCredits.credits_total;

      // Update existing credits.
      // A recharge (positive amount) starts a fresh card: card type is set
      // and the validity window is reset -- it will start again with the
      // member's next booking.
      const updatePayload: Record<string, unknown> = {
        credits_remaining: newCreditsRemaining,
        credits_total: newCreditsTotal,
        last_recharged_at: new Date().toISOString(),
      };
      if (credits_to_add > 0) {
        updatePayload.card_type = card_type || 'year';
        updatePayload.validity_start = null;
        updatePayload.valid_until = null;
      }

      const { error } = await supabase
        .from('membership_credits')
        .update(updatePayload)
        .eq('user_id', user_id);

      if (error) throw error;
    } else {
      // Can't deduct from non-existing credits
      if (credits_to_add < 0) {
        return new Response(JSON.stringify({ 
          error: 'Benutzer hat noch keine Credits. Kann nicht von 0 abziehen.' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      newCreditsRemaining = credits_to_add;
      newCreditsTotal = credits_to_add;

      // Create new credits record (only for positive values)
      const { error } = await supabase
        .from('membership_credits')
        .insert({
          user_id,
          credits_remaining: credits_to_add,
          credits_total: credits_to_add,
          last_recharged_at: new Date().toISOString(),
          card_type: card_type || 'year',
          validity_start: null,
          valid_until: null,
        });

      if (error) throw error;
    }

    // Log the transaction
    const transactionType = credits_to_add > 0 ? 'admin_recharge' : 'admin_deduction';
    const cardTypeLabel = card_type === 'ten_weeks' ? '10 Wochen' : '1 Jahr';
    const transactionDescription = description ||
      (credits_to_add > 0
        ? `Admin-Aufladung: ${credits_to_add} Credits (${cardTypeLabel} gültig ab erster Buchung)`
        : `Admin-Abzug: ${Math.abs(credits_to_add)} Credits`);

    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id,
        amount: credits_to_add,
        transaction_type: transactionType,
        description: transactionDescription,
        balance_after: newCreditsRemaining,
        created_by: user.id,
      });

    if (transactionError) {
      console.error('Error logging transaction:', transactionError);
      // Don't fail the request, just log the error
    }

    const action = credits_to_add > 0 ? 'hinzugefügt' : 'abgezogen';
    const amount = Math.abs(credits_to_add);

    return new Response(JSON.stringify({ 
      success: true, 
      credits: {
        credits_remaining: newCreditsRemaining,
        credits_total: newCreditsTotal,
      },
      message: `${amount} Credits erfolgreich ${action}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

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