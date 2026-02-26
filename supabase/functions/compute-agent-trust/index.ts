import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Compute trust score for an agent using:
 * trust = 0.25 * owner_trust + 0.25 * history_score + 0.20 * guild_endorsements + 0.15 * xp_level - 0.15 * penalties
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { agent_id } = await req.json();
    if (!agent_id) throw new Error("agent_id required");

    // 1. Get agent
    const { data: agent, error: agentErr } = await supabase
      .from("agents")
      .select("id, creator_user_id, usage_count")
      .eq("id", agent_id)
      .single();
    if (agentErr || !agent) throw new Error("Agent not found");

    // 2. Owner trust — get from trust_edges or default to 50
    let ownerTrust = 50;
    const { data: ownerEdges } = await supabase
      .from("trust_edges")
      .select("weight")
      .eq("target_id", agent.creator_user_id)
      .eq("status", "active");
    if (ownerEdges && ownerEdges.length > 0) {
      const avgWeight = ownerEdges.reduce((s: number, e: any) => s + Number(e.weight), 0) / ownerEdges.length;
      ownerTrust = Math.min(100, avgWeight * 100);
    }

    // 3. History score — clean actions / total actions
    const { count: totalActions } = await supabase
      .from("agent_usage_records")
      .select("*", { count: "exact", head: true })
      .eq("agent_id", agent_id);

    // For now, all actions are "clean" — penalties would come from a violations table
    const historyScore = totalActions && totalActions > 0 ? Math.min(100, (totalActions / (totalActions + 1)) * 100) : 50;

    // 4. Guild endorsements — count guilds that allow this agent
    const { count: endorsements } = await supabase
      .from("guilds")
      .select("*", { count: "exact", head: true })
      .eq("allow_agent_subscription", true);
    const guildEndorsements = Math.min(100, (endorsements || 0) * 10);

    // 5. XP level — based on usage count
    const xpLevel = Math.min(100, Math.log2((agent.usage_count || 0) + 1) * 15);

    // 6. Penalties — placeholder, 0 for now
    const penalties = 0;

    // 7. Compute total
    const totalScore = Math.max(0, Math.min(100,
      0.25 * ownerTrust +
      0.25 * historyScore +
      0.20 * guildEndorsements +
      0.15 * xpLevel -
      0.15 * penalties
    ));

    // 8. Upsert
    const { error: upsertErr } = await supabase
      .from("agent_trust_scores")
      .upsert({
        agent_id,
        owner_trust: Math.round(ownerTrust * 100) / 100,
        history_score: Math.round(historyScore * 100) / 100,
        guild_endorsements: Math.round(guildEndorsements * 100) / 100,
        xp_level: Math.round(xpLevel * 100) / 100,
        penalties: Math.round(penalties * 100) / 100,
        total_score: Math.round(totalScore * 100) / 100,
        computed_at: new Date().toISOString(),
      }, { onConflict: "agent_id" });

    if (upsertErr) throw new Error(`Upsert failed: ${upsertErr.message}`);

    return new Response(JSON.stringify({
      agent_id,
      total_score: Math.round(totalScore * 100) / 100,
      breakdown: {
        owner_trust: ownerTrust,
        history_score: historyScore,
        guild_endorsements: guildEndorsements,
        xp_level: xpLevel,
        penalties,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
