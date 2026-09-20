import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Creator, or admin of the guild that owns the agent (same rule as the database policies). */
export function useCanManageAgent(agentId: string | undefined, userId: string | undefined) {
  const { data } = useQuery({
    queryKey: ["can-manage-agent", agentId, userId],
    enabled: !!agentId && !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("can_manage_agent", { _agent_id: agentId, _user_id: userId });
      return error ? false : data === true;
    },
  });
  return data === true;
}
