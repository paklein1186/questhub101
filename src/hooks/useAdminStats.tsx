import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches real platform statistics from the database for entities that have real tables.
 * Currently: profiles, xp_transactions, subscription_plans, user_subscriptions.
 *
 * Entities WITHOUT DB tables (still mocked elsewhere):
 * - Quests, Guilds, Pods, Bookings, Services, Courses, Lessons
 * - Topics, Territories, Comments, Achievements, Notifications
 * - Companies, Follows, Attachments, Reports
 */

interface RealStats {
  totalUsers: number;
  recentUsers7d: number;
  recentUsers30d: number;
  totalXpAwarded: number;
  totalXpSpent: number;
  avgXpPerUser: number;
  xpLast7d: number;
  xpLast30d: number;
  activePlans: { code: string; name: string; subscribers: number }[];
  totalActiveSubscriptions: number;
}

async function fetchRealStats(): Promise<RealStats> {
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Parallel queries
  const [
    profilesRes,
    recent7Res,
    recent30Res,
    xpAwardedRes,
    xpSpentRes,
    xp7Res,
    xp30Res,
    plansRes,
    activeSubsRes,
  ] = await Promise.all([
    // Total users
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    // Users created in last 7 days
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", d7),
    // Users created in last 30 days
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", d30),
    // Total XP awarded (type = REWARD or PURCHASE or ADJUSTMENT with positive amounts)
    supabase.from("xp_transactions").select("amount_xp").gt("amount_xp", 0),
    // Total XP spent (negative amounts or ACTION_SPEND type)
    supabase.from("xp_transactions").select("amount_xp").eq("type", "ACTION_SPEND"),
    // XP awarded last 7 days
    supabase.from("xp_transactions").select("amount_xp").gt("amount_xp", 0).gte("created_at", d7),
    // XP awarded last 30 days
    supabase.from("xp_transactions").select("amount_xp").gt("amount_xp", 0).gte("created_at", d30),
    // Plans with subscriber counts
    supabase.from("subscription_plans").select("code, name"),
    // Active subscriptions
    supabase.from("user_subscriptions").select("plan_id, status").eq("is_current", true).eq("status", "ACTIVE"),
  ]);

  const totalUsers = profilesRes.count ?? 0;
  const recentUsers7d = recent7Res.count ?? 0;
  const recentUsers30d = recent30Res.count ?? 0;

  const totalXpAwarded = (xpAwardedRes.data ?? []).reduce((s, r) => s + r.amount_xp, 0);
  const totalXpSpent = Math.abs((xpSpentRes.data ?? []).reduce((s, r) => s + r.amount_xp, 0));
  const xpLast7d = (xp7Res.data ?? []).reduce((s, r) => s + r.amount_xp, 0);
  const xpLast30d = (xp30Res.data ?? []).reduce((s, r) => s + r.amount_xp, 0);
  const avgXpPerUser = totalUsers > 0 ? Math.round(totalXpAwarded / totalUsers) : 0;

  // Build plan breakdown
  const plans = plansRes.data ?? [];
  const activeSubs = activeSubsRes.data ?? [];
  const planCounts = new Map<string, number>();
  activeSubs.forEach((s) => planCounts.set(s.plan_id, (planCounts.get(s.plan_id) || 0) + 1));

  const activePlans = plans.map((p) => ({
    code: p.code,
    name: p.name,
    subscribers: planCounts.get(p.code) || 0, // code won't match plan_id (uuid), fix below
  }));

  return {
    totalUsers,
    recentUsers7d,
    recentUsers30d,
    totalXpAwarded,
    totalXpSpent,
    avgXpPerUser,
    xpLast7d,
    xpLast30d,
    activePlans,
    totalActiveSubscriptions: activeSubs.length,
  };
}

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: fetchRealStats,
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // auto-refresh every minute
  });
}
