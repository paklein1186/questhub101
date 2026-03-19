import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useAgentQuota() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["agent-quota", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Fetch profile usage
      const { data: profile } = await supabase
        .from("profiles")
        .select("agent_interactions_this_month, agent_interactions_reset_at")
        .eq("id", user!.id)
        .single();

      // Fetch active subscription plan quota
      const { data: sub } = await supabase
        .from("user_subscriptions")
        .select("subscription_plans(monthly_agent_interactions)")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      const planQuota = (sub as any)?.subscription_plans?.monthly_agent_interactions || 0;

      // Check if counter needs reset
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const resetAt = profile?.agent_interactions_reset_at
        ? new Date(profile.agent_interactions_reset_at)
        : null;
      const needsReset = !resetAt || resetAt < monthStart;

      const used = needsReset ? 0 : (profile?.agent_interactions_this_month || 0);
      const remaining = Math.max(0, planQuota - used);

      return { used, planQuota, remaining };
    },
    staleTime: 1000 * 30,
  });

  return {
    used: data?.used ?? 0,
    planQuota: data?.planQuota ?? 0,
    remaining: data?.remaining ?? 0,
    isLoading,
  };
}
