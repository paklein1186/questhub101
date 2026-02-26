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
      contributorPoolTokens: number; // after guild/territory/CTG % already taken
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
          share_percent: Math.round(sharePct * 10000) / 10000, // 4 decimal places
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
        // Get current balance
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

        // Record transaction
        await supabase.from("gameb_token_transactions" as any).insert({
          user_id: entry.contributor_id,
          amount: entry.gameb_tokens_awarded,
          type: "quest_payout",
          description: `Value pie payout: ${(entry.share_percent * 100).toFixed(1)}% share`,
          related_entity_type: "quest",
          related_entity_id: params.questId,
        } as any);
      }

      // 6. Mark quest as calculated
      await supabase
        .from("quests" as any)
        .update({ value_pie_calculated: true } as any)
        .eq("id", params.questId);

      toast({ title: "🟩 Value Pie distributed!", description: `${pieEntries.length} contributors received GameB Tokens.` });
      qc.invalidateQueries({ queryKey: ["quest-value-pie"] });
      qc.invalidateQueries({ queryKey: ["contribution-logs"] });
      return pieEntries;
    },
    [session, toast, qc]
  );

  return { calculateAndDistribute };
}
