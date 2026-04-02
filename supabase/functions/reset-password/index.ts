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

const genericSuccess = () =>
  new Response(
    JSON.stringify({ success: true, message: "Falls die E-Mail existiert, wurde ein neues Passwort versendet." }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    console.log("Password reset requested for email:", email);

    if (!email || typeof email !== "string") {
      console.log("Invalid email provided");
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

    // Find user via profiles table first (avoids listUsers pagination issues)
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("user_id, first_name, last_name, display_name")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    console.log("Profile lookup result:", profileData ? "found" : "not found", profileError ? `error: ${profileError.message}` : "");

    let userId: string | null = null;
    let userEmail: string | null = null;
    let firstName = "";
    let lastName = "";
    let displayName = "";

    if (profileData?.user_id) {
      userId = profileData.user_id;
      userEmail = email.toLowerCase();
      firstName = profileData.first_name || "";
      lastName = profileData.last_name || "";
      displayName = profileData.display_name || "";
    } else {
      // Fallback: paginate through all auth users
      console.log("Profile not found, falling back to listUsers pagination");
      let page = 1;
      const perPage = 1000;
      let found = false;

      while (!found) {
        const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });

        if (listError) {
          console.error("Error listing users page", page, ":", listError);
          return genericSuccess();
        }

        const user = usersData.users.find(
          (u) => u.email?.toLowerCase() === email.toLowerCase()
        );

        if (user) {
          userId = user.id;
          userEmail = user.email || email;
          found = true;
          console.log("User found via listUsers on page", page);

          // Get profile for name
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("first_name, last_name, display_name")
            .eq("user_id", user.id)
            .maybeSingle();
          firstName = profile?.first_name || "";
          lastName = profile?.last_name || "";
          displayName = profile?.display_name || "";
        }

        if (usersData.users.length < perPage) break;
        page++;
      }
    }

    if (!userId) {
      console.log("User not found for email:", email);
      return genericSuccess();
    }

    console.log("User found, generating new password for user:", userId);

    // Generate new 6-digit access code
    const newPassword = generateAccessCode();

    // Update password in auth
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (updateError) {
      console.error("Error updating password:", updateError);
      return new Response(
        JSON.stringify({ error: "Fehler beim Zurücksetzen des Passworts" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Password updated successfully");

    // Update access_code in profiles
    await supabaseAdmin
      .from("profiles")
      .update({ access_code: newPassword })
      .eq("user_id", userId);

    // Get webhook URL from environment secret
    const webhookUrl = Deno.env.get("MAKE_PASSWORD_RESET_WEBHOOK_URL");
    console.log("Webhook URL configured:", webhookUrl ? "yes" : "NO - missing MAKE_PASSWORD_RESET_WEBHOOK_URL");

    if (webhookUrl) {
      try {
        const webhookPayload = {
          event_type: "password_reset",
          email: userEmail,
          new_password: newPassword,
          first_name: firstName,
          last_name: lastName,
          display_name: displayName,
        };
        console.log("Sending webhook with payload keys:", Object.keys(webhookPayload));

        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(webhookPayload),
        });

        const responseText = await res.text();
        console.log("Webhook response status:", res.status, "body:", responseText);
      } catch (webhookError) {
        console.error("Error sending webhook:", webhookError);
      }
    }

    return genericSuccess();
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Ein unerwarteter Fehler ist aufgetreten" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
