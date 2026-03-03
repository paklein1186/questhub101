import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface UserEntities {
  guilds: Array<{ id: string; name: string }>;
  quests: Array<{ id: string; title: string; status: string }>;
}

export function useUserEntities() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery<UserEntities>({
    queryKey: ["user-entities", userId],
    queryFn: async () => {
      const [guildsRes, questsRes] = await Promise.all([
        supabase
          .from("guild_members")
          .select("guild_id, guilds(id, name)")
          .eq("user_id", userId!)
          .limit(20),
        supabase
          .from("quest_participants")
          .select("quest_id, quests(id, title, status)")
          .eq("user_id", userId!)
          .limit(20),
      ]);

      return {
        guilds: (guildsRes.data || [])
          .map((m: any) => ({ id: m.guilds?.id, name: m.guilds?.name }))
          .filter((g: any) => g.id),
        quests: (questsRes.data || [])
          .map((m: any) => ({
            id: m.quests?.id,
            title: m.quests?.title,
            status: m.quests?.status,
          }))
          .filter(
            (q: any) =>
              q.id &&
              (q.status === "ACTIVE" || q.status === "IN_PROGRESS" || q.status === "OPEN")
          ),
      };
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}
