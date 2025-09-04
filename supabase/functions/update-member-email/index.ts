import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateEmailRequest {
  userId: string;
  newEmail: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the user from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Invalid or expired token');
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    const isSpecialAdmin = user.email === 'admin@rise-fitness.com';

    if (!isSpecialAdmin && (roleError || !roleData)) {
      throw new Error('User is not authorized as admin');
    }

    const { userId, newEmail }: UpdateEmailRequest = await req.json();

    if (!userId || !newEmail) {
      throw new Error('Missing userId or newEmail');
    }

    // Update email in auth.users using admin client
    const { error: updateAuthError } = await supabaseClient.auth.admin.updateUserById(
      userId,
      { email: newEmail }
    );

    if (updateAuthError) {
      console.error('Error updating email in auth.users:', updateAuthError);
      throw new Error(`Failed to update auth email: ${updateAuthError.message}`);
    }

    // Update email in profiles table
    const { error: updateProfileError } = await supabaseClient
      .from('profiles')
      .update({ email: newEmail })
      .eq('user_id', userId);

    if (updateProfileError) {
      console.error('Error updating email in profiles:', updateProfileError);
      // Try to rollback the auth email change
      // This is best effort - if this fails, the emails will be out of sync
      await supabaseClient.auth.admin.updateUserById(userId, { email: null });
      throw new Error(`Failed to update profile email: ${updateProfileError.message}`);
    }

    console.log(`Successfully updated email for user ${userId} to ${newEmail}`);

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error in update-member-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});