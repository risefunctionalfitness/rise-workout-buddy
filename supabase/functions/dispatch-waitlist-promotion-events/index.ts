
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type WaitlistEvent = {
  id: string;
  registration_id: string;
  course_id: string;
  user_id: string;
  created_at: string;
  notified_at: string | null;
  payload: any | null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const webhookUrl = Deno.env.get("MAKE_WAITLIST_WEBHOOK_URL");

  if (!supabaseUrl || !serviceKey) {
    console.error("Missing Supabase env vars");
    return new Response(JSON.stringify({ error: "Missing Supabase env vars" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  if (!webhookUrl) {
    console.error("MAKE_WAITLIST_WEBHOOK_URL not configured");
    return new Response(JSON.stringify({ error: "Webhook URL missing" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body = await (async () => {
      try { return await req.json(); } catch { return {}; }
    })();

    const limit = typeof body?.limit === "number" ? Math.max(1, Math.min(100, body.limit)) : 25;

    // 1) Hole ausstehende Events
    const { data: events, error: eventsError } = await supabase
      .from("waitlist_promotion_events")
      .select("*")
      .is("notified_at", null)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (eventsError) {
      console.error("Error fetching events:", eventsError);
      return new Response(JSON.stringify({ error: "DB error fetching events" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!events || events.length === 0) {
      console.log("No pending waitlist promotion events.");
      return new Response(JSON.stringify({ processed: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Dispatching ${events.length} waitlist promotion events...`);

    let processed = 0;
    let succeeded = 0;

    for (const ev of events as WaitlistEvent[]) {
      processed++;

      // 2) Hole Kursdetails (Titel, Datum, Zeiten)
      const { data: course, error: courseErr } = await supabase
        .from("courses")
        .select("title, course_date, start_time, end_time")
        .eq("id", ev.course_id)
        .maybeSingle();

      if (courseErr) {
        console.error(`Error fetching course ${ev.course_id}:`, courseErr);
        continue;
      }

      // 3) Hole Profil (Anzeige-Name & Mitgliedschaft)
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("display_name, membership_type")
        .eq("user_id", ev.user_id)
        .maybeSingle();

      if (profileErr) {
        console.error(`Error fetching profile for user ${ev.user_id}:`, profileErr);
      }

      // 4) Hole Auth-User (E-Mail)
      const { data: authRes, error: adminErr } = await supabase.auth.admin.getUserById(ev.user_id);
      if (adminErr) {
        console.error(`Error fetching auth user ${ev.user_id}:`, adminErr);
      }

      const userEmail = authRes?.user?.email ?? "unknown";
      const userName = profile?.display_name ?? "Unbekannt";
      const membership = profile?.membership_type ?? "Member";

      const payload = {
        event_type: "waitlist_promoted",
        promotion_type: "automatic",
        promoted_at: ev.created_at,
        event_id: ev.id,
        registration_id: ev.registration_id,

        user_id: ev.user_id,
        user_email: userEmail,
        user_name: userName,
        membership,

        course_id: ev.course_id,
        course_title: course?.title ?? "Unbekannter Kurs",
        course_date: course?.course_date ?? null,
        start_time: course?.start_time ?? null,
        end_time: course?.end_time ?? null,
      };

      try {
        const resp = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!resp.ok) {
          console.error(`Webhook failed (status ${resp.status}) for event ${ev.id}`);
          continue;
        }

        // 5) Markiere Event als benachrichtigt (nur wenn noch nicht markiert)
        const { error: updateErr } = await supabase
          .from("waitlist_promotion_events")
          .update({ notified_at: new Date().toISOString(), payload })
          .eq("id", ev.id)
          .is("notified_at", null);

        if (updateErr) {
          console.error(`Error updating event ${ev.id} as notified:`, updateErr);
          continue;
        }

        succeeded++;
        console.log(`Webhook sent and event ${ev.id} marked as notified.`);
      } catch (sendErr) {
        console.error(`Error sending webhook for event ${ev.id}:`, sendErr);
      }
    }

    return new Response(JSON.stringify({ processed, succeeded }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    console.error("Fatal error in dispatch-waitlist-promotion-events:", err);
    return new Response(JSON.stringify({ error: err?.message ?? "unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
