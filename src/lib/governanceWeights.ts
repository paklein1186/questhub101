import { supabase } from "@/integrations/supabase/client";

export const GOVERNANCE_MODELS = {
  "1h1v": {
    label: "1 Human, 1 Vote",
    description: "Equal — every member has one vote regardless of contribution.",
  },
  soft_log: {
    label: "Soft Logarithmic",
    description: "Logarithmic (soft) — contributions influence votes but are compressed.",
  },
  strong_log: {
    label: "Logarithmic (strong)",
    description: "Logarithmic (strong) — contributions have more influence, still capped.",
  },
  pure_pct: {
    label: "Proportional",
    description: "Proportional — voting power directly mirrors contribution percentage.",
  },
} as const;

export type GovernanceModel = keyof typeof GOVERNANCE_MODELS;

export function computeAppliedWeight(model: GovernanceModel, pctShare: number): number {
  switch (model) {
    case "1h1v":
      return 1.0;
    case "soft_log":
      return Math.log2(pctShare + 1) * 100;
    case "strong_log":
      return Math.log10(pctShare + 1) * 100;
    case "pure_pct":
      return pctShare;
    default:
      return 1.0;
  }
}

/**
 * Fetch a user's guild contribution % from verified contribution_logs.
 */
export async function fetchUserGuildPct(guildId: string, userId: string): Promise<number> {
  const { data: logs } = await supabase
    .from("contribution_logs" as any)
    .select("user_id, fmv_value")
    .eq("status", "verified");

  if (!logs || logs.length === 0) return 0;

  // Filter to quests belonging to this guild
  const { data: questIds } = await supabase
    .from("quests")
    .select("id")
    .eq("guild_id", guildId);

  const qIds = new Set((questIds ?? []).map((q) => q.id));
  const guildLogs = (logs as any[]).filter((l) => {
    // contribution_logs has quest_id — check if it belongs to guild
    return l.quest_id && qIds.has(l.quest_id);
  });

  // Wait — contribution_logs selected above doesn't include quest_id. Let me re-query properly.
  // Actually let's do this more efficiently:
  const { data: guildContribs } = await supabase.rpc("get_guild_contribution_pct" as any, {
    p_guild_id: guildId,
    p_user_id: userId,
  });

  // Fallback: manual computation if RPC doesn't exist
  if (guildContribs !== null && guildContribs !== undefined) {
    return typeof guildContribs === "number" ? guildContribs : 0;
  }

  // Manual fallback
  return await computeGuildPctManually(guildId, userId);
}

async function computeGuildPctManually(guildId: string, userId: string): Promise<number> {
  const { data: guildQuests } = await supabase
    .from("quests")
    .select("id")
    .eq("guild_id", guildId);

  if (!guildQuests || guildQuests.length === 0) return 0;
  const qIds = guildQuests.map((q) => q.id);

  const { data: allLogs } = await supabase
    .from("contribution_logs" as any)
    .select("user_id, fmv_value")
    .in("quest_id", qIds)
    .eq("status", "verified");

  if (!allLogs || allLogs.length === 0) return 0;

  let total = 0;
  let userTotal = 0;
  for (const l of allLogs as any[]) {
    const v = l.fmv_value ?? 0;
    total += v;
    if (l.user_id === userId) userTotal += v;
  }

  return total > 0 ? (userTotal / total) * 100 : 0;
}

/**
 * Compute and return {raw_weight, applied_weight} for a vote.
 */
export async function computeVoteWeights(
  guildId: string | null,
  userId: string
): Promise<{ raw_weight: number; applied_weight: number; model: GovernanceModel }> {
  if (!guildId) {
    return { raw_weight: 0, applied_weight: 1.0, model: "1h1v" };
  }

  // Fetch guild governance model
  const { data: guild } = await supabase
    .from("guilds")
    .select("governance_model")
    .eq("id", guildId)
    .single();

  const model = ((guild as any)?.governance_model ?? "1h1v") as GovernanceModel;
  const pctShare = await computeGuildPctManually(guildId, userId);
  const appliedWeight = computeAppliedWeight(model, pctShare);

  return { raw_weight: pctShare, applied_weight: appliedWeight, model };
}
