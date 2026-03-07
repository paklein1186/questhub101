import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useCallback } from "react";

// ── Types ────────────────────────────────────────────────────
export interface GuildWeight {
  id: string;
  guild_id: string;
  task_type: string;
  weight_factor: number;
}

export interface ValuePieEntry {
  id: string;
  quest_id: string;
  contributor_id: string;
  weighted_units: number;
  share_percent: number;
  gameb_tokens_awarded: number;
  created_at: string;
  profile?: { name: string; avatar_url: string | null };
}

// ── Guild weight table ───────────────────────────────────────
export function useGuildWeights(guildId: string | undefined | null) {
  return useQuery({
    queryKey: ["guild-contribution-weights", guildId],
    enabled: !!guildId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guild_contribution_weights" as any)
        .select("*")
        .eq("guild_id", guildId!)
        .order("task_type");
      if (error) throw error;
      return (data || []) as unknown as GuildWeight[];
    },
  });
}

// ── Value pie log for a quest ────────────────────────────────
export function useQuestValuePie(questId: string | undefined) {
  return useQuery({
    queryKey: ["quest-value-pie", questId],
    enabled: !!questId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quest_value_pie_log" as any)
        .select("*")
        .eq("quest_id", questId!)
        .order("share_percent", { ascending: false });
      if (error) throw error;

      const entries = (data || []) as unknown as ValuePieEntry[];
      // Enrich with profiles
      const userIds = [...new Set(entries.map((e) => e.contributor_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles_public")
          .select("user_id, name, avatar_url")
          .in("user_id", userIds);
        const pMap = new Map((profiles || []).map((p) => [p.user_id, p]));
        entries.forEach((e) => {
          e.profile = pMap.get(e.contributor_id) ?? { name: "Unknown", avatar_url: null };
        });
      }
      return entries;
    },
  });
}

// ── DEFAULT TASK TYPES ───────────────────────────────────────
export const DEFAULT_TASK_TYPES = [
  "research",
  "facilitation",
  "coordination",
  "creative",
  "admin",
  "risk",
  "development",
  "design",
  "testing",
  "documentation",
] as const;

export type TaskType = (typeof DEFAULT_TASK_TYPES)[number] | string;

// ── Calculate & distribute the value pie ─────────────────────
export function useValuePieActions() {
  const { session } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const calculateAndDistribute = useCallback(
    async (params: {
      questId: string;
      contributorPoolTokens: number;
      guildId?: string | null;
      guildTokens?: number;
      territoryId?: string | null;
      territoryTokens?: number;
      ctgTokens?: number;
      livingSystemId?: string | null;
      livingSystemTokens?: number;
    }) => {
      const userId = session?.user?.id;
      if (!userId) return null;

      // 1. Fetch all contribution_logs for this quest with weighted_units
      const { data: contributions, error: cErr } = await supabase
        .from("contribution_logs" as any)
        .select("user_id, weighted_units")
        .eq("quest_id", params.questId);

      if (cErr) {
        toast({ title: "Failed to fetch contributions", variant: "destructive" });
        return null;
      }

      if (!contributions || contributions.length === 0) {
        toast({ title: "No contributions to distribute", variant: "destructive" });
        return null;
      }

      // 2. Aggregate by contributor
      const byContributor = new Map<string, number>();
      (contributions as any[]).forEach((c) => {
        const wu = Number(c.weighted_units) || 0;
        byContributor.set(c.user_id, (byContributor.get(c.user_id) || 0) + wu);
      });

      const totalWeighted = Array.from(byContributor.values()).reduce((s, v) => s + v, 0);
      if (totalWeighted === 0) {
        toast({ title: "Total weighted units is zero", variant: "destructive" });
        return null;
      }

      // 3. Build pie entries
      const pieEntries = Array.from(byContributor.entries()).map(([contributorId, wu]) => {
        const sharePct = wu / totalWeighted;
        const tokensAwarded = Math.round(sharePct * params.contributorPoolTokens * 100) / 100;
        return {
          quest_id: params.questId,
          contributor_id: contributorId,
          weighted_units: wu,
          share_percent: Math.round(sharePct * 10000) / 10000,
          gameb_tokens_awarded: tokensAwarded,
        };
      });

      // 4. Insert value pie log
      const { error: insertErr } = await supabase
        .from("quest_value_pie_log" as any)
        .insert(pieEntries as any);
      if (insertErr) {
        toast({ title: "Failed to save value pie", description: insertErr.message, variant: "destructive" });
        return null;
      }

      // 5. Distribute tokens to each contributor's balance
      for (const entry of pieEntries) {
        try {
          const { data: profile } = await supabase
            .from("profiles" as any)
            .select("gameb_tokens_balance")
            .eq("user_id", entry.contributor_id)
            .single();

          const currentBalance = Number((profile as any)?.gameb_tokens_balance ?? 0);
          await supabase
            .from("profiles" as any)
            .update({ gameb_tokens_balance: currentBalance + entry.gameb_tokens_awarded } as any)
            .eq("user_id", entry.contributor_id);

          await supabase.from("gameb_token_transactions" as any).insert({
            user_id: entry.contributor_id,
            amount: entry.gameb_tokens_awarded,
            type: "quest_payout",
            description: `Value pie payout: ${(entry.share_percent * 100).toFixed(1)}% share`,
            related_entity_type: "quest",
            related_entity_id: params.questId,
          } as any);
        } catch (e) {
          console.error("Contributor payout failed for", entry.contributor_id, e);
        }
      }

      // 6. GUILD POOL
      if (params.guildId && (params.guildTokens ?? 0) > 0) {
        try {
          const guildAmt = params.guildTokens!;
          // Upsert guild wallet
          const { data: existing } = await supabase
            .from("guild_wallets" as any)
            .select("gameb_balance")
            .eq("guild_id", params.guildId)
            .maybeSingle();

          if (existing) {
            const curr = Number((existing as any).gameb_balance) || 0;
            await supabase
              .from("guild_wallets" as any)
              .update({ gameb_balance: curr + guildAmt } as any)
              .eq("guild_id", params.guildId);
          } else {
            await supabase
              .from("guild_wallets" as any)
              .insert({ guild_id: params.guildId, gameb_balance: guildAmt } as any);
          }

          await supabase.from("gameb_token_transactions" as any).insert({
            user_id: null,
            entity_type: "guild",
            entity_id: params.guildId,
            amount: guildAmt,
            type: "quest_guild_share",
            description: `Guild share from quest`,
            related_entity_type: "quest",
            related_entity_id: params.questId,
          } as any);
        } catch (e) {
          console.error("Guild pool distribution failed", e);
        }
      }

      // 7. TERRITORY POOL
      if (params.territoryId && (params.territoryTokens ?? 0) > 0) {
        try {
          const tAmt = params.territoryTokens!;
          await supabase.from("territory_token_flows" as any).insert({
            territory_id: params.territoryId,
            quest_id: params.questId,
            amount: tAmt,
            type: "quest_territory_share",
          } as any);

          // Upsert territory gameb balance
          const { data: tData } = await supabase
            .from("territories")
            .select("id, gameb_balance")
            .eq("id", params.territoryId)
            .maybeSingle();

          const currBal = Number((tData as any)?.gameb_balance) || 0;
          await supabase
            .from("territories" as any)
            .update({ gameb_balance: currBal + tAmt } as any)
            .eq("id", params.territoryId);
        } catch (e) {
          console.error("Territory pool distribution failed", e);
        }
      }

      // 8. CTG PLATFORM FEE
      if ((params.ctgTokens ?? 0) > 0) {
        try {
          await supabase.from("gameb_token_transactions" as any).insert({
            user_id: null,
            entity_type: "platform",
            entity_id: "ctg",
            amount: params.ctgTokens,
            type: "platform_fee",
            description: `Platform fee from quest`,
            related_entity_type: "quest",
            related_entity_id: params.questId,
          } as any);
        } catch (e) {
          console.error("CTG platform fee recording failed", e);
        }
      }

      // 9. Mark quest as calculated
      await supabase
        .from("quests" as any)
        .update({ value_pie_calculated: true } as any)
        .eq("id", params.questId);

      const parts = [`${pieEntries.length} contributeurs`];
      if (params.guildId && (params.guildTokens ?? 0) > 0) parts.push("guilde");
      if (params.territoryId && (params.territoryTokens ?? 0) > 0) parts.push("territoire");
      if ((params.ctgTokens ?? 0) > 0) parts.push("CTG");

      toast({ title: "🟩 Value Pie distribué!", description: parts.join(" + ") });
      qc.invalidateQueries({ queryKey: ["quest-value-pie"] });
      qc.invalidateQueries({ queryKey: ["contribution-logs"] });
      qc.invalidateQueries({ queryKey: ["guild-ovn-data"] });
      return pieEntries;
    },
    [session, toast, qc]
  );

  return { calculateAndDistribute };
}
