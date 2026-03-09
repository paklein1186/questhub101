import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Ensure commons wallet exists
    const { data: cw } = await supabase.from("ctg_commons_wallet").select("id").limit(1);
    if (!cw || cw.length === 0) {
      await supabase.from("ctg_commons_wallet").insert({ balance: 0, lifetime_received: 0 });
    }

    const results: { action: string; count: number; emitted: number; errors: number }[] = [];

    async function emit(userId: string, type: string, entityId: string, entityType: string, note: string) {
      const { data, error } = await supabase.rpc("emit_ctg_for_contribution", {
        p_user_id: userId,
        p_contribution_type: type,
        p_related_entity_id: entityId,
        p_related_entity_type: entityType,
        p_note: note,
      });
      if (error) {
        console.error(`emit error for ${userId}/${type}:`, error.message);
        return false;
      }
      const result = data as any;
      if (result?.ok === false) {
        console.error(`emit rejected for ${userId}/${type}:`, result.reason);
        return false;
      }
      return true;
    }

    // 1. Comments → comment_given (1 CTG)
    const { data: comments } = await supabase
      .from("comments")
      .select("author_id, id")
      .eq("is_deleted", false);
    let emitted = 0, errors = 0;
    for (const c of comments ?? []) {
      const ok = await emit(c.author_id, "comment_given", c.id, "comment", "Retroactive: comment");
      ok ? emitted++ : errors++;
    }
    results.push({ action: "comment_given", count: (comments ?? []).length, emitted, errors });

    // 2. Trust attestations → trust_given (2 CTG)
    const { data: edges } = await supabase
      .from("trust_edges")
      .select("from_node_id, id, from_node_type")
      .eq("status", "active");
    emitted = 0; errors = 0;
    for (const e of edges ?? []) {
      if (e.from_node_type !== "profile") continue;
      const ok = await emit(e.from_node_id, "trust_given", e.id, "trust_edge", "Retroactive: trust attestation");
      ok ? emitted++ : errors++;
    }
    results.push({ action: "trust_given", count: emitted + errors, emitted, errors });

    // 3. Quests created → quest_created (10 CTG)
    const { data: quests } = await supabase
      .from("quests")
      .select("id, created_by_user_id")
      .eq("is_deleted", false);
    emitted = 0; errors = 0;
    for (const q of quests ?? []) {
      if (!q.created_by_user_id) continue;
      const ok = await emit(q.created_by_user_id, "quest_created", q.id, "quest", "Retroactive: quest created");
      ok ? emitted++ : errors++;
    }
    results.push({ action: "quest_created", count: (quests ?? []).length, emitted, errors });

    // 4. Quests completed → quest_completed (25 CTG)
    const { data: completedQuests } = await supabase
      .from("quests")
      .select("id, created_by_user_id")
      .eq("status", "COMPLETED")
      .eq("is_deleted", false);
    emitted = 0; errors = 0;
    for (const q of completedQuests ?? []) {
      if (!q.created_by_user_id) continue;
      const ok = await emit(q.created_by_user_id, "quest_completed", q.id, "quest", "Retroactive: quest completed");
      ok ? emitted++ : errors++;
    }
    results.push({ action: "quest_completed", count: (completedQuests ?? []).length, emitted, errors });

    // 5. Guilds created → guild_created (15 CTG)
    const { data: guilds } = await supabase
      .from("guilds")
      .select("id, created_by_user_id")
      .eq("is_deleted", false);
    emitted = 0; errors = 0;
    for (const g of guilds ?? []) {
      if (!g.created_by_user_id) continue;
      const ok = await emit(g.created_by_user_id, "guild_created", g.id, "guild", "Retroactive: guild created");
      ok ? emitted++ : errors++;
    }
    results.push({ action: "guild_created", count: (guilds ?? []).length, emitted, errors });

    // 6. Subtasks done → subtask_completed (5 CTG)
    const { data: subtasks } = await supabase
      .from("quest_subtasks")
      .select("id, assigned_to_user_id")
      .eq("status", "DONE");
    emitted = 0; errors = 0;
    for (const s of subtasks ?? []) {
      if (!s.assigned_to_user_id) continue;
      const ok = await emit(s.assigned_to_user_id, "subtask_completed", s.id, "quest_subtask", "Retroactive: subtask completed");
      ok ? emitted++ : errors++;
    }
    results.push({ action: "subtask_completed", count: (subtasks ?? []).length, emitted, errors });

    // 7. Verified contributions → contribution_verified (5 CTG)
    const { data: contribs } = await supabase
      .from("contribution_logs")
      .select("id, user_id")
      .eq("status", "verified");
    emitted = 0; errors = 0;
    for (const c of contribs ?? []) {
      await emit(c.user_id, "contribution_verified", c.id, "contribution_log", "Retroactive: contribution verified");
      emitted++;
    }
    results.push({ action: "contribution_verified", count: (contribs ?? []).length, emitted, errors });

    // 8. Profile completed → profile_completed (10 CTG)
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id")
      .not("name", "is", null)
      .not("bio", "is", null)
      .not("avatar_url", "is", null);
    emitted = 0; errors = 0;
    for (const p of profiles ?? []) {
      const ok = await emit(p.user_id, "profile_completed", p.user_id, "profile", "Retroactive: profile completed");
      ok ? emitted++ : errors++;
    }
    results.push({ action: "profile_completed", count: (profiles ?? []).length, emitted, errors });

    // 9. Natural systems → natural_system_documented (10 CTG)
    const { data: natSys } = await supabase
      .from("natural_systems")
      .select("id, created_by_user_id");
    emitted = 0; errors = 0;
    for (const n of natSys ?? []) {
      if (!n.created_by_user_id) continue;
      const ok = await emit(n.created_by_user_id, "natural_system_documented", n.id, "natural_system", "Retroactive: natural system documented");
      ok ? emitted++ : errors++;
    }
    results.push({ action: "natural_system_documented", count: (natSys ?? []).length, emitted, errors });

    const totalEmitted = results.reduce((sum, r) => sum + r.emitted, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);

    return new Response(
      JSON.stringify({ success: true, total_emissions: totalEmitted, total_errors: totalErrors, details: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("retroactive-ctg error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
