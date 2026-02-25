import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/* ── Ecosystem Health ── */
export interface EcoSystemHealth {
  systems: {
    id: string;
    name: string;
    type: string;
    health_index: number;
    resilience_index: number;
    regenerative_potential: number;
  }[];
  avgHealth: number;
  critical: number;
  stressed: number;
  stable: number;
  thriving: number;
}

export function useEcosystemHealth(territoryId: string | undefined) {
  return useQuery<EcoSystemHealth>({
    queryKey: ["living-dashboard-health", territoryId],
    enabled: !!territoryId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("natural_systems" as any)
        .select("id, name, type, health_index, resilience_index, regenerative_potential")
        .eq("territory_id", territoryId!)
        .eq("is_deleted", false)
        .order("health_index", { ascending: true });
      if (error) throw error;
      const systems = (data ?? []) as any[];
      const h = systems.map((s) => s.health_index as number);
      return {
        systems,
        avgHealth: h.length ? Math.round(h.reduce((a, b) => a + b, 0) / h.length) : 0,
        critical: h.filter((v) => v < 30).length,
        stressed: h.filter((v) => v >= 30 && v < 60).length,
        stable: h.filter((v) => v >= 60 && v < 80).length,
        thriving: h.filter((v) => v >= 80).length,
      };
    },
  });
}

/* ── Stewardship Activity (last 30 days) ── */
export interface StewardshipActivity {
  ecoQuestsCreated: number;
  ecoQuestsCompleted: number;
  completionRate: number;
  uniqueStewards: number;
  activeGuilds: number;
}

export function useStewardshipActivity(territoryId: string | undefined) {
  return useQuery<StewardshipActivity>({
    queryKey: ["living-dashboard-stewardship", territoryId],
    enabled: !!territoryId,
    staleTime: 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Eco quests linked to natural systems in this territory
      const { data: nsIds } = await supabase
        .from("natural_systems" as any)
        .select("id")
        .eq("territory_id", territoryId!)
        .eq("is_deleted", false);
      const systemIds = ((nsIds ?? []) as any[]).map((n) => n.id);

      if (systemIds.length === 0) {
        return { ecoQuestsCreated: 0, ecoQuestsCompleted: 0, completionRate: 0, uniqueStewards: 0, activeGuilds: 0 };
      }

      const { data: quests } = await (supabase
        .from("quests") as any)
        .select("id, status, guild_id, created_by_user_id, created_at")
        .in("natural_system_id", systemIds)
        .eq("is_deleted", false)
        .gte("created_at", since);

      const qs = (quests ?? []) as any[];
      const created = qs.length;
      const completed = qs.filter((q) => q.status === "COMPLETED").length;

      // Unique stewards = quest participants
      const questIds = qs.map((q) => q.id);
      let uniqueStewards = 0;
      if (questIds.length > 0) {
        const { data: parts } = await supabase
          .from("quest_participants" as any)
          .select("user_id")
          .in("quest_id", questIds);
        uniqueStewards = new Set(((parts ?? []) as any[]).map((p) => p.user_id)).size;
      }

      const activeGuilds = new Set(qs.map((q) => q.guild_id).filter(Boolean)).size;

      return {
        ecoQuestsCreated: created,
        ecoQuestsCompleted: completed,
        completionRate: created > 0 ? Math.round((completed / created) * 100) : 0,
        uniqueStewards,
        activeGuilds,
      };
    },
  });
}

/* ── Funding & Credits (last 90 days) ── */
export interface FundingData {
  totalBudgeted: number;
  totalPaid: number;
  bySystemType: { type: string; amount: number }[];
}

export function useFundingData(territoryId: string | undefined) {
  return useQuery<FundingData>({
    queryKey: ["living-dashboard-funding", territoryId],
    enabled: !!territoryId,
    staleTime: 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

      const { data: nsData } = await supabase
        .from("natural_systems" as any)
        .select("id, type")
        .eq("territory_id", territoryId!)
        .eq("is_deleted", false);
      const systems = (nsData ?? []) as any[];
      const systemIds = systems.map((n) => n.id);
      const systemTypeMap: Record<string, string> = {};
      systems.forEach((s) => { systemTypeMap[s.id] = s.type; });

      if (systemIds.length === 0) {
        return { totalBudgeted: 0, totalPaid: 0, bySystemType: [] };
      }

      const { data: quests } = await (supabase
        .from("quests") as any)
        .select("id, credit_budget, escrow_credits, natural_system_id, status")
        .in("natural_system_id", systemIds)
        .eq("is_deleted", false)
        .gte("created_at", since);

      const qs = (quests ?? []) as any[];
      let totalBudgeted = 0;
      let totalPaid = 0;
      const typeAmounts: Record<string, number> = {};

      for (const q of qs) {
        const budget = q.credit_budget || 0;
        totalBudgeted += budget;
        if (q.status === "COMPLETED") totalPaid += budget;
        const sType = systemTypeMap[q.natural_system_id] || "other";
        typeAmounts[sType] = (typeAmounts[sType] || 0) + budget;
      }

      return {
        totalBudgeted,
        totalPaid,
        bySystemType: Object.entries(typeAmounts)
          .map(([type, amount]) => ({ type, amount }))
          .sort((a, b) => b.amount - a.amount),
      };
    },
  });
}

/* ── Trust & Governance ── */
export interface TrustGovernanceData {
  topStewards: { from_type: string; from_id: string; weight: number; tags: string[] | null }[];
  edges: { from_type: string; from_id: string; to_type: string; to_id: string; weight: number; edge_type: string }[];
}

export function useTrustGovernance(territoryId: string | undefined) {
  return useQuery<TrustGovernanceData>({
    queryKey: ["living-dashboard-trust", territoryId],
    enabled: !!territoryId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_territory_stewards" as any,
        { p_territory_id: territoryId!, p_limit: 10 }
      );
      if (error) throw error;
      const edges = (data ?? []) as any[];

      // Rank unique from nodes by total weight
      const weightMap: Record<string, { from_type: string; from_id: string; weight: number; tags: string[] | null }> = {};
      for (const e of edges) {
        const key = `${e.from_type}:${e.from_id}`;
        if (!weightMap[key]) {
          weightMap[key] = { from_type: e.from_type, from_id: e.from_id, weight: 0, tags: e.tags };
        }
        weightMap[key].weight += e.weight;
      }
      const topStewards = Object.values(weightMap)
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 5);

      return { topStewards, edges };
    },
  });
}
