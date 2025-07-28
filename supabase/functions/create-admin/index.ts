import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Creating admin user...');

    // Create admin user with email and password
    const { data: adminUser, error: createError } = await supabase.auth.admin.createUser({
      email: 'admin@rise-fitness.com',
      password: '2019',
      email_confirm: true,
      user_metadata: {
        full_name: 'Administrator'
      }
    });

    if (createError) {
      console.error('Error creating admin user:', createError);
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Admin user created:', adminUser.user.id);

    // Create profile for admin
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: adminUser.user.id,
        display_name: 'Administrator',
        access_code: '2019'
      });

    if (profileError) {
      console.error('Error creating admin profile:', profileError);
    }

    // Assign admin role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: adminUser.user.id,
        role: 'admin'
      });

    if (roleError) {
      console.error('Error assigning admin role:', roleError);
      return new Response(JSON.stringify({ error: roleError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Admin user setup completed successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Admin user created successfully',
      adminId: adminUser.user.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in create-admin function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});