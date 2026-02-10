import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let digestType = "daily";
    try {
      const body = await req.json();
      digestType = body?.type ?? "daily";
    } catch {
      // default to daily
    }

    // Get all profiles (users)
    const { data: profiles, error: profilesErr } = await supabase
      .from("profiles")
      .select("user_id, name, email");

    if (profilesErr) throw profilesErr;

    const results: { userId: string; email: string; type: string; status: string }[] = [];

    for (const profile of profiles || []) {
      // In a full implementation, we'd:
      // 1. Check user's notification_preferences for digest frequency
      // 2. For DAILY: aggregate new quests in user's topics, new comments, pod/guild activity
      // 3. For WEEKLY: aggregate top quests, achievements, bookings summary
      // 4. Send via Resend email provider

      // For now, log the aggregation intent
      const aggregation = digestType === "daily"
        ? {
            sections: [
              "New quests in your topics",
              "Comments on quests you follow",
              "Pod activity",
              "Guild activity",
            ],
          }
        : {
            sections: [
              "New quests in your Houses",
              "Top quests this week",
              "Achievements unlocked",
              "Bookings summary",
            ],
          };

      results.push({
        userId: profile.user_id,
        email: profile.email,
        type: digestType,
        status: "pending_email_provider",
      });

      console.log(
        `[${digestType} digest] Would send to ${profile.email}:`,
        JSON.stringify(aggregation.sections)
      );
    }

    console.log(
      `${digestType} digest completed at`,
      new Date().toISOString(),
      `— ${results.length} users`
    );

    return new Response(
      JSON.stringify({
        success: true,
        type: digestType,
        usersProcessed: results.length,
        results,
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err: any) {
    console.error("Digest failed:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
