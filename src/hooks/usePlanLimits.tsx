import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/lib/admin";
import { CREDIT_COSTS, GRACE_PERIOD_DAYS } from "@/lib/xpCreditsConfig";

// Credit costs for exceeding plan limits
export const EXTRA_QUEST_CREDIT_COST = CREDIT_COSTS.EXTRA_QUEST_CREATION;
export const EXTRA_GUILD_CREDIT_COST = 5;
export const EXTRA_POD_CREDIT_COST = CREDIT_COSTS.EXTRA_POD_CREATION;
export const EXTRA_SERVICE_CREDIT_COST = 5;
export const EXTRA_COURSE_CREDIT_COST = 8;

// Legacy aliases
export const EXTRA_QUEST_XP_COST = EXTRA_QUEST_CREDIT_COST;
export const EXTRA_GUILD_XP_COST = EXTRA_GUILD_CREDIT_COST;
export const EXTRA_POD_XP_COST = EXTRA_POD_CREDIT_COST;

interface PlanLimits {
  freeQuestsPerWeek: number;
  maxGuildMemberships: number | null;
  maxPods: number | null;
  maxServicesActive: number | null;
  maxCourses: number | null;
  xpMultiplier: number;
  planName: string;
  planCode: string;
  monthlyIncludedCredits: number;
  visibilityRanking: "standard" | "priority" | "top";
  aiMuseMode: "basic" | "advanced" | "pro";
  canCreateCompany: boolean;
  customGuildTools: boolean;
  commissionDiscountPercent: number;
  maxTerritories: number | null;
  canCreateTerritory: boolean;
  maxAttachmentSizeMb: number;
  partnershipProposalsEnabled: boolean;
  fundraisingToolsEnabled: boolean;
  aiAgentsEnabled: boolean;
  territoryIntelligenceEnabled: boolean;
  memoryEngineEnabled: boolean;
  broadcastEnabled: boolean;
}

const DEFAULT_PLAN: PlanLimits = {
  freeQuestsPerWeek: 2,
  maxGuildMemberships: 3,
  maxPods: 1,
  maxServicesActive: 1,
  maxCourses: 1,
  xpMultiplier: 1.0,
  planName: "Free",
  planCode: "FREE",
  monthlyIncludedCredits: 20,
  visibilityRanking: "standard",
  aiMuseMode: "basic",
  canCreateCompany: false,
  customGuildTools: false,
  commissionDiscountPercent: 0,
  maxTerritories: 2,
  canCreateTerritory: false,
  maxAttachmentSizeMb: 10,
  partnershipProposalsEnabled: false,
  fundraisingToolsEnabled: false,
  aiAgentsEnabled: false,
  territoryIntelligenceEnabled: false,
  memoryEngineEnabled: false,
  broadcastEnabled: false,
};

const SUPERADMIN_PLAN: PlanLimits = {
  freeQuestsPerWeek: Infinity,
  maxGuildMemberships: null,
  maxPods: null,
  maxServicesActive: null,
  maxCourses: null,
  xpMultiplier: 2.0,
  planName: "Superadmin",
  planCode: "SUPERADMIN",
  monthlyIncludedCredits: Infinity,
  visibilityRanking: "top",
  aiMuseMode: "pro",
  canCreateCompany: true,
  customGuildTools: true,
  commissionDiscountPercent: 100,
  maxTerritories: null,
  canCreateTerritory: true,
  maxAttachmentSizeMb: 500,
  partnershipProposalsEnabled: true,
  fundraisingToolsEnabled: true,
  aiAgentsEnabled: true,
  territoryIntelligenceEnabled: true,
  memoryEngineEnabled: true,
  broadcastEnabled: true,
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
  const { isSuperAdmin } = useUserRoles(userId);

  const [plan, setPlan] = useState<PlanLimits>(DEFAULT_PLAN);
  const [weeklyQuestsUsed, setWeeklyQuestsUsed] = useState(0);
  const [userXp, setUserXp] = useState(0);
  const [userCredits, setUserCredits] = useState(0);
  const [userCtgBalance, setUserCtgBalance] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [guildCount, setGuildCount] = useState(0);
  const [podCount, setPodCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [inGracePeriod, setInGracePeriod] = useState(false);
  const [gracePeriodDaysLeft, setGracePeriodDaysLeft] = useState(0);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("xp, current_plan_code, xp_level, credits_balance, ctg_balance, created_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (profile) {
        setUserXp(profile.xp ?? 0);
        setUserCredits((profile as any).credits_balance ?? 0);
        setUserCtgBalance(Number((profile as any).ctg_balance ?? 0));
        setUserLevel((profile as any).xp_level ?? 1);

        // Grace period: check if account is < GRACE_PERIOD_DAYS old
        const createdAt = new Date(profile.created_at);
        const now = new Date();
        const diffMs = now.getTime() - createdAt.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        const isGrace = diffDays < GRACE_PERIOD_DAYS;
        setInGracePeriod(isGrace);
        setGracePeriodDaysLeft(isGrace ? Math.ceil(GRACE_PERIOD_DAYS - diffDays) : 0);
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
          freeQuestsPerWeek: p.free_quests_per_week ?? 2,
          maxGuildMemberships: p.max_guild_memberships,
          maxPods: p.max_pods,
          maxServicesActive: p.max_services_active ?? null,
          maxCourses: p.max_courses ?? null,
          xpMultiplier: Number(p.xp_multiplier) || 1.0,
          planName: p.name ?? "Free",
          planCode: p.code ?? "FREE",
          monthlyIncludedCredits: p.monthly_included_credits ?? 20,
          visibilityRanking: p.visibility_ranking ?? "standard",
          aiMuseMode: p.ai_muse_mode ?? "basic",
          canCreateCompany: p.can_create_company ?? false,
          customGuildTools: p.custom_guild_tools ?? false,
          commissionDiscountPercent: Number(p.commission_discount_percentage) || 0,
          maxTerritories: p.max_territories ?? null,
          canCreateTerritory: p.can_create_territory ?? false,
          maxAttachmentSizeMb: p.max_attachment_size_mb ?? 10,
          partnershipProposalsEnabled: p.partnership_proposals_enabled ?? false,
          fundraisingToolsEnabled: p.fundraising_tools_enabled ?? false,
          aiAgentsEnabled: p.ai_agents_enabled ?? false,
          territoryIntelligenceEnabled: p.territory_intelligence_enabled ?? false,
          memoryEngineEnabled: p.memory_engine_enabled ?? false,
          broadcastEnabled: p.broadcast_enabled ?? false,
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
    } catch {
      // Use defaults on error
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Superadmin override: use unlimited plan, bypass all limits
  const effectivePlan = isSuperAdmin ? SUPERADMIN_PLAN : plan;
  const bypassLimits = isSuperAdmin || inGracePeriod;

  // Derived state
  const freeQuestsRemaining = bypassLimits ? Infinity : Math.max(0, effectivePlan.freeQuestsPerWeek - weeklyQuestsUsed);
  const questLimitReached = bypassLimits ? false : freeQuestsRemaining === 0;
  const canAffordExtraQuest = bypassLimits || userCredits >= EXTRA_QUEST_CREDIT_COST;

  const guildLimitReached = bypassLimits ? false : (effectivePlan.maxGuildMemberships !== null && guildCount >= effectivePlan.maxGuildMemberships);
  const canAffordExtraGuild = bypassLimits || userCredits >= EXTRA_GUILD_CREDIT_COST;

  const podLimitReached = bypassLimits ? false : (effectivePlan.maxPods !== null && podCount >= effectivePlan.maxPods);
  const canAffordExtraPod = bypassLimits || userCredits >= EXTRA_POD_CREDIT_COST;

  // Increment weekly usage after quest creation
  const recordQuestCreation = useCallback(async () => {
    if (!userId) return;
    const weekStart = getMonday(new Date());

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

  // Spend Credits (skipped during grace period)
  const spendCredits = useCallback(async (amount: number, description: string, entityType?: string, entityId?: string) => {
    if (!userId) return false;

    // Superadmin or grace period: no credits consumed
    if (isSuperAdmin || inGracePeriod) return true;

    const { data: profile } = await supabase
      .from("profiles")
      .select("credits_balance")
      .eq("user_id", userId)
      .maybeSingle();

    const balance = (profile as any)?.credits_balance ?? 0;
    if (balance < amount) return false;

    await (supabase.from("credit_transactions" as any) as any).insert({
      user_id: userId,
      type: "SPENT_FEATURE",
      amount: -amount,
      source: description,
      related_entity_type: entityType || null,
      related_entity_id: entityId || null,
    });

    await supabase
      .from("profiles")
      .update({ credits_balance: balance - amount } as any)
      .eq("user_id", userId);

    setUserCredits(balance - amount);
    return true;
  }, [userId, inGracePeriod]);

  // Legacy alias
  const spendXp = spendCredits;

  return {
    plan,
    loading,
    userXp,
    userCredits,
    userCtgBalance,
    userLevel,
    // Grace period
    inGracePeriod,
    gracePeriodDaysLeft,
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
    spendCredits,
    spendXp, // legacy alias
    refresh: fetchData,
  };
}
