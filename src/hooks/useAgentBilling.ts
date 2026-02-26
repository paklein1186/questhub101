import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAgentBillingProfile(agentId: string | undefined) {
  return useQuery({
    queryKey: ["agent-billing-profile", agentId],
    enabled: !!agentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_billing_profiles" as any)
        .select("*, agent_plans(*)")
        .eq("agent_id", agentId!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
}

export function useAgentUsageRecords(agentId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: ["agent-usage-records", agentId, limit],
    enabled: !!agentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_usage_records" as any)
        .select("*, monetized_action_types(code, label)")
        .eq("agent_id", agentId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

export function useMonetizedActionTypes() {
  return useQuery({
    queryKey: ["monetized-action-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monetized_action_types" as any)
        .select("*")
        .order("base_price", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

export function useAgentPlans() {
  return useQuery({
    queryKey: ["agent-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_plans" as any)
        .select("*")
        .order("monthly_price", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

export function useEntityRevenueRecords(entityType: string, entityId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: ["entity-revenue", entityType, entityId, limit],
    enabled: !!entityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_share_records" as any)
        .select("*, agent_usage_records(agent_id, action_type_id, final_price, created_at)")
        .eq("beneficiary_type", entityType)
        .eq("beneficiary_id", entityId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

export function useAgentMonthlySpend(agentId: string | undefined) {
  return useQuery({
    queryKey: ["agent-monthly-spend", agentId],
    enabled: !!agentId,
    queryFn: async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("agent_usage_records" as any)
        .select("final_price, billed_from_plan, action_type_id, monetized_action_types(code)")
        .eq("agent_id", agentId!)
        .gte("created_at", monthStart.toISOString());
      if (error) throw error;

      const records = (data || []) as any[];
      const totalSpent = records
        .filter((r: any) => !r.billed_from_plan)
        .reduce((s: number, r: any) => s + Number(r.final_price), 0);

      const byAction: Record<string, { count: number; credits: number }> = {};
      for (const r of records) {
        const code = r.monetized_action_types?.code || "unknown";
        if (!byAction[code]) byAction[code] = { count: 0, credits: 0 };
        byAction[code].count++;
        byAction[code].credits += Number(r.final_price);
      }

      return { totalSpent, byAction, totalActions: records.length };
    },
  });
}
