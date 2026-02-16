import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find users registered 48h+ ago with low profile completeness who haven't been nudged yet
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    
    const { data: eligibleUsers, error: fetchError } = await supabase
      .from("profiles")
      .select("user_id, name, email, bio, headline, avatar_url")
      .lt("created_at", cutoff)
      .eq("pulse_nudge_sent", false);

    if (fetchError) {
      console.error("Error fetching eligible users:", fetchError);
      throw fetchError;
    }

    if (!eligibleUsers || eligibleUsers.length === 0) {
      return new Response(JSON.stringify({ message: "No users to nudge", count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let nudgedCount = 0;

    for (const user of eligibleUsers) {
      // Calculate simple completeness score
      let completeness = 0;
      if (user.name) completeness += 20;
      if (user.bio) completeness += 25;
      if (user.headline) completeness += 15;
      if (user.avatar_url) completeness += 20;
      // Check topics and territories
      const { count: topicCount } = await supabase
        .from("user_topics")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.user_id);
      if ((topicCount || 0) > 0) completeness += 10;

      const { count: territoryCount } = await supabase
        .from("user_territories")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.user_id);
      if ((territoryCount || 0) > 0) completeness += 10;

      // Only nudge if below 60% completeness
      if (completeness >= 60) {
        // Mark as sent anyway to avoid re-checking
        await supabase
          .from("profiles")
          .update({ pulse_nudge_sent: true })
          .eq("user_id", user.user_id);
        continue;
      }

      // Create internal notification
      await supabase.from("notifications").insert({
        user_id: user.user_id,
        type: "AI_PROFILE_ENRICHMENT",
        title: "Let's build your showcase 🌱",
        message: `Hi ${user.name || "there"}, would you like help building your public profile? Upload a resume, share your LinkedIn, or paste a description — Pulse will structure your vitrine while you stay in control.`,
        action_url: "/profile/enrich",
        actor_name: "Pulse",
      });

      // Mark user as nudged
      await supabase
        .from("profiles")
        .update({ pulse_nudge_sent: true })
        .eq("user_id", user.user_id);

      nudgedCount++;
    }

    return new Response(JSON.stringify({ message: "Nudge cycle complete", nudgedCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("pulse-nudge error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
