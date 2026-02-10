import { Loader2 } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";

import { HeroAI } from "@/components/home/HeroAI";
import { HomeStats } from "@/components/home/HomeStats";
import { ContinueWhereLeftOff } from "@/components/home/ContinueWhereLeftOff";
import { YourUniverse } from "@/components/home/YourUniverse";
import { ThisWeekInEcosystem } from "@/components/home/ThisWeekInEcosystem";

// Lightweight data hook for the shell (stats, topics, territories)
function useHomeShellData(userId: string) {
  return useQuery({
    queryKey: ["home-shell-data", userId],
    queryFn: async () => {
      if (!userId) return null;
      const [guildMembersRes, questParticipantsRes, topicsRes, territoriesRes, achievementsRes, profileRes, questsRes, servicesRes, podsRes, guildsRes] = await Promise.all([
        supabase.from("guild_members").select("guild_id").eq("user_id", userId),
        supabase.from("quest_participants").select("quest_id").eq("user_id", userId),
        supabase.from("user_topics").select("topic_id, topics(id, name)").eq("user_id", userId),
        supabase.from("user_territories").select("territory_id, territories(id, name)").eq("user_id", userId),
        supabase.from("achievements").select("id, title").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
        supabase.from("profiles").select("xp, xp_level, contribution_index, credits_balance").eq("user_id", userId).single(),
        supabase.from("quests").select("title").eq("created_by_user_id", userId).eq("is_deleted", false).order("created_at", { ascending: false }).limit(5),
        supabase.from("services").select("title").eq("provider_user_id", userId).eq("is_deleted", false).limit(5),
        supabase.from("pod_members").select("pods(name)").eq("user_id", userId).limit(5),
        supabase.from("guild_members").select("guilds(name)").eq("user_id", userId).limit(5),
      ]);

      const myTopics = (topicsRes.data ?? []).map((r: any) => r.topics).filter(Boolean);
      const myTerritories = (territoriesRes.data ?? []).map((r: any) => r.territories).filter(Boolean);

      return {
        guildCount: (guildMembersRes.data ?? []).length,
        questCount: (questParticipantsRes.data ?? []).length,
        myTopics,
        myTerritories,
        achievements: achievementsRes.data ?? [],
        xp: profileRes.data?.xp ?? 0,
        xpLevel: profileRes.data?.xp_level ?? 1,
        contributionIndex: profileRes.data?.contribution_index ?? 0,
      };
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export default function HomeFeed() {
  const currentUser = useCurrentUser();
  const { user: authUser } = useAuth();
  const { data, isLoading } = useHomeShellData(currentUser.id);

  if (isLoading) {
    return (
      <PageShell>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  const userName = (authUser?.name || currentUser.name).split(" ")[0];
  const userTopicIds = (data?.myTopics ?? []).map((t: any) => t.id);
  const userTerritoryIds = (data?.myTerritories ?? []).map((t: any) => t.id);

  return (
    <PageShell>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* 1. Hero AI Assistant */}
        <HeroAI
          userName={userName}
          userContext={{
            name: authUser?.name || currentUser.name,
            role: authUser?.role || currentUser.role,
            xpLevel: data?.xpLevel ?? 1,
            topics: (data?.myTopics ?? []).map((t: any) => t.name),
            territories: (data?.myTerritories ?? []).map((t: any) => t.name),
          }}
        />

        {/* 2. Stats + Onboarding */}
        <HomeStats
          xp={data?.xp ?? 0}
          contributionIndex={data?.contributionIndex ?? 0}
          guildCount={data?.guildCount ?? 0}
          questCount={data?.questCount ?? 0}
          achievements={data?.achievements ?? []}
          userId={currentUser.id}
        />

        <Separator />

        {/* 3. Continue where you left off */}
        <ContinueWhereLeftOff userId={currentUser.id} />

        <Separator />

        {/* 4. Your Universe (personalized recommendations) */}
        <YourUniverse
          userId={currentUser.id}
          userTopicIds={userTopicIds}
          userTerritoryIds={userTerritoryIds}
        />

        <Separator />

        {/* 5. This week in the ecosystem */}
        <ThisWeekInEcosystem />
      </div>
    </PageShell>
  );
}
