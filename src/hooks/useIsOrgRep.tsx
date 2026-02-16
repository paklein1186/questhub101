import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";

/**
 * Returns true if the current user is a member/admin of at least one company (Traditional Organization).
 * Used to adapt the homepage and guided pathways for organization representatives.
 */
export function useIsOrgRep() {
  const { id: userId } = useCurrentUser();

  const { data: isOrgRep = false } = useQuery({
    queryKey: ["is-org-rep", userId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("company_members")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId!);
      if (error) return false;
      return (count ?? 0) > 0;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  return isOrgRep;
}
