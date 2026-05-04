import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useUserPinnedQuests(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-pinned-quests", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_pinned_quests" as any)
        .select("quest_id, pinned_at")
        .eq("user_id", userId!);
      if (error) throw error;
      return ((data || []) as unknown) as { quest_id: string; pinned_at: string }[];
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}
