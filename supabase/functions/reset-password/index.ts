import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateAccessCode(): string {
  const chars = "0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ error: "E-Mail ist erforderlich" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Find user by email
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error listing users:", listError);
      // Return generic success to not leak info
      return new Response(
        JSON.stringify({ success: true, message: "Falls die E-Mail existiert, wurde ein neues Passwort versendet." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = usersData.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
      // Return generic success - don't reveal if email exists
      return new Response(
        JSON.stringify({ success: true, message: "Falls die E-Mail existiert, wurde ein neues Passwort versendet." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate new 6-digit access code
    const newPassword = generateAccessCode();

    // Update password in auth
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (updateError) {
      console.error("Error updating password:", updateError);
      return new Response(
        JSON.stringify({ error: "Fehler beim Zurücksetzen des Passworts" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update access_code in profiles
    await supabaseAdmin
      .from("profiles")
      .update({ access_code: newPassword })
      .eq("user_id", user.id);

    // Get user profile for name
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("first_name, last_name, display_name")
      .eq("user_id", user.id)
      .maybeSingle();

    // Get webhook URL for password_reset
    const { data: webhookData } = await supabaseAdmin
      .from("webhook_settings")
      .select("webhook_url")
      .eq("webhook_type", "password_reset")
      .eq("is_active", true)
      .maybeSingle();

    if (webhookData?.webhook_url) {
      try {
        await fetch(webhookData.webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_type: "password_reset",
            email: user.email,
            new_password: newPassword,
            first_name: profile?.first_name || "",
            last_name: profile?.last_name || "",
            display_name: profile?.display_name || "",
          }),
        });
      } catch (webhookError) {
        console.error("Error sending webhook:", webhookError);
      }
    } else {
      console.warn("No active password_reset webhook configured");
    }

    return new Response(
      JSON.stringify({ success: true, message: "Falls die E-Mail existiert, wurde ein neues Passwort versendet." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Ein unerwarteter Fehler ist aufgetreten" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
