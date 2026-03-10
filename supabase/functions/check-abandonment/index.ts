import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all OCU-enabled quests that are not frozen
    const { data: quests } = await supabase
      .from("quests")
      .select("id, guild_id, title")
      .eq("ocu_enabled", true)
      .is("pie_frozen_at", null);

    if (!quests || quests.length === 0) {
      return new Response(JSON.stringify({ flagged: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalFlagged = 0;

    for (const quest of quests) {
      // Get guild abandonment threshold
      let threshold = 60;
      if (quest.guild_id) {
        const { data: guild } = await supabase
          .from("guilds")
          .select("abandonment_threshold_days")
          .eq("id", quest.guild_id)
          .single();
        threshold = (guild as any)?.abandonment_threshold_days ?? 60;
      }

      // Find contributors with no recent verified contributions
      const cutoff = new Date(Date.now() - threshold * 24 * 60 * 60 * 1000).toISOString();

      const { data: staleContributors } = await supabase.rpc("get_abandoned_contributors" as any, {
        p_quest_id: quest.id,
        p_cutoff: cutoff,
      });

      // Fallback: manual query if RPC doesn't exist
      if (staleContributors === null || staleContributors === undefined) {
        // Use regular queries
        const { data: allLogs } = await supabase
          .from("contribution_logs")
          .select("user_id, created_at")
          .eq("quest_id", quest.id)
          .eq("status", "verified");

        if (!allLogs || allLogs.length === 0) continue;

        // Group by user, get max created_at
        const lastByUser = new Map<string, string>();
        for (const log of allLogs as any[]) {
          const existing = lastByUser.get(log.user_id);
          if (!existing || log.created_at > existing) {
            lastByUser.set(log.user_id, log.created_at);
          }
        }

        // Check for existing exits
        const { data: exits } = await supabase
          .from("contributor_exits")
          .select("user_id")
          .eq("quest_id", quest.id);
        const exitedSet = new Set((exits ?? []).map((e: any) => e.user_id));

        // Find abandoned users
        for (const [userId, lastDate] of lastByUser.entries()) {
          if (exitedSet.has(userId)) continue;
          if (lastDate < cutoff) {
            totalFlagged++;
            // We don't auto-create exits — just log for awareness
            // The UI handles the display via lastContribDates query
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ flagged: totalFlagged, quests_checked: quests.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
