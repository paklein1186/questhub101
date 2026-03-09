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
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Ensure commons wallet exists
    const { data: cw } = await supabase.from("ctg_commons_wallet").select("id").limit(1);
    if (!cw || cw.length === 0) {
      await supabase.from("ctg_commons_wallet").insert({ balance: 0, lifetime_received: 0 });
    }

    const results: { action: string; count: number; emitted: number }[] = [];

    // 1. Comments → comment_given (1 CTG)
    const { data: comments } = await supabase
      .from("comments")
      .select("author_id, id")
      .eq("is_deleted", false);
    let emitted = 0;
    for (const c of comments ?? []) {
      await supabase.rpc("emit_ctg_for_contribution", {
        p_user_id: c.author_id,
        p_contribution_type: "comment_given",
        p_related_entity_id: c.id,
        p_related_entity_type: "comment",
        p_note: "Retroactive: comment",
      });
      emitted++;
    }
    results.push({ action: "comment_given", count: (comments ?? []).length, emitted });

    // 2. Trust attestations → trust_given (2 CTG)
    const { data: edges } = await supabase
      .from("trust_edges")
      .select("from_node_id, id, from_node_type")
      .eq("status", "active");
    emitted = 0;
    for (const e of edges ?? []) {
      if (e.from_node_type !== "profile") continue;
      await supabase.rpc("emit_ctg_for_contribution", {
        p_user_id: e.from_node_id,
        p_contribution_type: "trust_given",
        p_related_entity_id: e.id,
        p_related_entity_type: "trust_edge",
        p_note: "Retroactive: trust attestation",
      });
      emitted++;
    }
    results.push({ action: "trust_given", count: emitted, emitted });

    // 3. Quests created → quest_created (10 CTG)
    const { data: quests } = await supabase
      .from("quests")
      .select("id, created_by_user_id")
      .eq("is_deleted", false);
    emitted = 0;
    for (const q of quests ?? []) {
      if (!q.created_by_user_id) continue;
      await supabase.rpc("emit_ctg_for_contribution", {
        p_user_id: q.created_by_user_id,
        p_contribution_type: "quest_created",
        p_related_entity_id: q.id,
        p_related_entity_type: "quest",
        p_note: "Retroactive: quest created",
      });
      emitted++;
    }
    results.push({ action: "quest_created", count: (quests ?? []).length, emitted });

    // 4. Quests completed → quest_completed (25 CTG)
    const { data: completedQuests } = await supabase
      .from("quests")
      .select("id, created_by_user_id")
      .eq("status", "COMPLETED")
      .eq("is_deleted", false);
    emitted = 0;
    for (const q of completedQuests ?? []) {
      if (!q.created_by_user_id) continue;
      await supabase.rpc("emit_ctg_for_contribution", {
        p_user_id: q.created_by_user_id,
        p_contribution_type: "quest_completed",
        p_related_entity_id: q.id,
        p_related_entity_type: "quest",
        p_note: "Retroactive: quest completed",
      });
      emitted++;
    }
    results.push({ action: "quest_completed", count: (completedQuests ?? []).length, emitted });

    // 5. Guilds created → guild_created (15 CTG)
    const { data: guilds } = await supabase
      .from("guilds")
      .select("id, created_by_user_id")
      .eq("is_deleted", false);
    emitted = 0;
    for (const g of guilds ?? []) {
      if (!g.created_by_user_id) continue;
      await supabase.rpc("emit_ctg_for_contribution", {
        p_user_id: g.created_by_user_id,
        p_contribution_type: "guild_created",
        p_related_entity_id: g.id,
        p_related_entity_type: "guild",
        p_note: "Retroactive: guild created",
      });
      emitted++;
    }
    results.push({ action: "guild_created", count: (guilds ?? []).length, emitted });

    // 6. Subtasks done → subtask_completed (5 CTG)
    const { data: subtasks } = await supabase
      .from("quest_subtasks")
      .select("id, assigned_to_user_id")
      .eq("status", "DONE");
    emitted = 0;
    for (const s of subtasks ?? []) {
      if (!s.assigned_to_user_id) continue;
      await supabase.rpc("emit_ctg_for_contribution", {
        p_user_id: s.assigned_to_user_id,
        p_contribution_type: "subtask_completed",
        p_related_entity_id: s.id,
        p_related_entity_type: "quest_subtask",
        p_note: "Retroactive: subtask completed",
      });
      emitted++;
    }
    results.push({ action: "subtask_completed", count: (subtasks ?? []).length, emitted });

    // 7. Verified contributions → contribution_verified (5 CTG)
    const { data: contribs } = await supabase
      .from("contribution_logs")
      .select("id, user_id")
      .eq("status", "verified");
    emitted = 0;
    for (const c of contribs ?? []) {
      await supabase.rpc("emit_ctg_for_contribution", {
        p_user_id: c.user_id,
        p_contribution_type: "contribution_verified",
        p_related_entity_id: c.id,
        p_related_entity_type: "contribution_log",
        p_note: "Retroactive: contribution verified",
      });
      emitted++;
    }
    results.push({ action: "contribution_verified", count: (contribs ?? []).length, emitted });

    // 8. Profile completed → profile_completed (10 CTG)
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id")
      .not("name", "is", null)
      .not("bio", "is", null)
      .not("avatar_url", "is", null);
    emitted = 0;
    for (const p of profiles ?? []) {
      await supabase.rpc("emit_ctg_for_contribution", {
        p_user_id: p.user_id,
        p_contribution_type: "profile_completed",
        p_related_entity_id: p.user_id,
        p_related_entity_type: "profile",
        p_note: "Retroactive: profile completed",
      });
      emitted++;
    }
    results.push({ action: "profile_completed", count: (profiles ?? []).length, emitted });

    // 9. Natural systems documented → natural_system_documented (10 CTG)
    const { data: natSys } = await supabase
      .from("natural_systems")
      .select("id, created_by_user_id");
    emitted = 0;
    for (const n of natSys ?? []) {
      if (!n.created_by_user_id) continue;
      await supabase.rpc("emit_ctg_for_contribution", {
        p_user_id: n.created_by_user_id,
        p_contribution_type: "natural_system_documented",
        p_related_entity_id: n.id,
        p_related_entity_type: "natural_system",
        p_note: "Retroactive: natural system documented",
      });
      emitted++;
    }
    results.push({ action: "natural_system_documented", count: (natSys ?? []).length, emitted });

    // Summary
    const totalEmitted = results.reduce((sum, r) => sum + r.emitted, 0);

    return new Response(
      JSON.stringify({ success: true, total_emissions: totalEmitted, details: results }),
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
