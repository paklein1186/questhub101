import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// XP costs for exceeding plan limits
export const EXTRA_QUEST_XP_COST = 10;
export const EXTRA_GUILD_XP_COST = 5;
export const EXTRA_POD_XP_COST = 3;

interface PlanLimits {
  freeQuestsPerWeek: number;
  maxGuildMemberships: number | null;
  maxPods: number | null;
  xpMultiplier: number;
  planName: string;
  planCode: string;
}

const DEFAULT_PLAN: PlanLimits = {
  freeQuestsPerWeek: 1,
  maxGuildMemberships: 3,
  maxPods: 1,
  xpMultiplier: 1.0,
  planName: "Free",
  planCode: "FREE",
};

function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

export function usePlanLimits() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [plan, setPlan] = useState<PlanLimits>(DEFAULT_PLAN);
  const [weeklyQuestsUsed, setWeeklyQuestsUsed] = useState(0);
  const [userXp, setUserXp] = useState(0);
  const [guildCount, setGuildCount] = useState(0);
  const [podCount, setPodCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch profile XP
      const { data: profile } = await supabase
        .from("profiles")
        .select("xp, current_plan_code")
        .eq("user_id", userId)
        .maybeSingle();

      if (profile) {
        setUserXp(profile.xp ?? 0);
      }

      // Fetch current plan via user_subscriptions
      const { data: sub } = await supabase
        .from("user_subscriptions" as any)
        .select("plan_id, subscription_plans(*)")
        .eq("user_id", userId)
        .eq("is_current", true)
        .eq("status", "ACTIVE")
        .maybeSingle() as any;

      if (sub?.subscription_plans) {
        const p = sub.subscription_plans;
        setPlan({
          freeQuestsPerWeek: p.free_quests_per_week ?? 1,
          maxGuildMemberships: p.max_guild_memberships,
          maxPods: p.max_pods,
          xpMultiplier: Number(p.xp_multiplier) || 1.0,
          planName: p.name ?? "Free",
          planCode: p.code ?? "FREE",
        });
      }

      // Fetch weekly usage
      const weekStart = getMonday(new Date());
      const { data: usage } = await supabase
        .from("weekly_usage" as any)
        .select("quests_created_count")
        .eq("user_id", userId)
        .eq("week_start_date", weekStart)
        .maybeSingle() as any;

      setWeeklyQuestsUsed(usage?.quests_created_count ?? 0);

      // We don't have guild_members / pod_members in Supabase yet,
      // so these counts are provided externally via setters
    } catch {
      // Use defaults on error
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived state
  const freeQuestsRemaining = Math.max(0, plan.freeQuestsPerWeek - weeklyQuestsUsed);
  const questLimitReached = freeQuestsRemaining === 0;
  const canAffordExtraQuest = userXp >= EXTRA_QUEST_XP_COST;

  const guildLimitReached = plan.maxGuildMemberships !== null && guildCount >= plan.maxGuildMemberships;
  const canAffordExtraGuild = userXp >= EXTRA_GUILD_XP_COST;

  const podLimitReached = plan.maxPods !== null && podCount >= plan.maxPods;
  const canAffordExtraPod = userXp >= EXTRA_POD_XP_COST;

  // Increment weekly usage after quest creation
  const recordQuestCreation = useCallback(async () => {
    if (!userId) return;
    const weekStart = getMonday(new Date());

    // Upsert weekly_usage
    const { data: existing } = await supabase
      .from("weekly_usage" as any)
      .select("id, quests_created_count")
      .eq("user_id", userId)
      .eq("week_start_date", weekStart)
      .maybeSingle() as any;

    if (existing) {
      await (supabase.from("weekly_usage" as any) as any)
        .update({ quests_created_count: (existing.quests_created_count || 0) + 1 })
        .eq("id", existing.id);
    } else {
      await (supabase.from("weekly_usage" as any) as any)
        .insert({ user_id: userId, week_start_date: weekStart, quests_created_count: 1 });
    }

    setWeeklyQuestsUsed((prev) => prev + 1);
  }, [userId]);

  // Spend XP and log transaction
  const spendXp = useCallback(async (amount: number, description: string, entityType?: string, entityId?: string) => {
    if (!userId) return false;

    // Deduct XP from profile
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ xp: Math.max(0, userXp - amount) })
      .eq("user_id", userId);

    if (updateErr) return false;

    // Log transaction
    await (supabase.from("xp_transactions" as any) as any)
      .insert({
        user_id: userId,
        type: "ACTION_SPEND",
        amount_xp: -amount,
        description,
        related_entity_type: entityType || null,
        related_entity_id: entityId || null,
      });

    setUserXp((prev) => Math.max(0, prev - amount));
    return true;
  }, [userId, userXp]);

  return {
    plan,
    loading,
    userXp,
    // Quest limits
    freeQuestsRemaining,
    questLimitReached,
    canAffordExtraQuest,
    weeklyQuestsUsed,
    recordQuestCreation,
    // Guild limits
    guildCount,
    setGuildCount,
    guildLimitReached,
    canAffordExtraGuild,
    // Pod limits
    podCount,
    setPodCount,
    podLimitReached,
    canAffordExtraPod,
    // Actions
    spendXp,
    refresh: fetchData,
  };
}
