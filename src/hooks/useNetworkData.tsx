import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches all relational network data for the current user:
 * - guilds/companies/pods they belong to
 * - co-members (people in their orbit)
 * - territories & houses (topics)
 */
export function useMyGuildMemberships(userId: string) {
  return useQuery({
    queryKey: ["network-guilds", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("guild_members")
        .select("guild_id, role, guilds(id, name, logo_url, description, type, guild_territories(territory_id, territories(id, name)), guild_topics(topic_id, topics(id, name)))")
        .eq("user_id", userId);
      if (error) throw error;
      return (data ?? []).map((m: any) => ({
        guildId: m.guild_id,
        role: m.role,
        guild: m.guilds,
      })).filter((m: any) => m.guild);
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}

export function useMyCompanyMemberships(userId: string) {
  return useQuery({
    queryKey: ["network-companies", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("company_members")
        .select("company_id, role, companies(id, name, logo_url, description, sector, company_territories(territory_id, territories(id, name)))")
        .eq("user_id", userId);
      if (error) throw error;
      return (data ?? []).map((m: any) => ({
        companyId: m.company_id,
        role: m.role,
        company: m.companies,
      })).filter((m: any) => m.company);
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}

export function useMyPodMemberships(userId: string) {
  return useQuery({
    queryKey: ["network-pods", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("pod_members")
        .select("pod_id, role, pods(id, name, description, image_url)")
        .eq("user_id", userId);
      if (error) throw error;
      return (data ?? []).map((m: any) => ({
        podId: m.pod_id,
        role: m.role,
        pod: m.pods,
      })).filter((m: any) => m.pod);
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}

export function useMyQuestParticipation(userId: string) {
  return useQuery({
    queryKey: ["network-quest-participation", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("quest_participants")
        .select("quest_id, role")
        .eq("user_id", userId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}

/**
 * People in my orbit: co-members of guilds, companies, pods.
 * Deduplicates and counts shared entities.
 */
export function usePeopleInOrbit(userId: string) {
  return useQuery({
    queryKey: ["network-people", userId],
    queryFn: async () => {
      if (!userId) return [];

      // Get all entity IDs user belongs to
      const [guildMems, compMems, podMems, questParts] = await Promise.all([
        supabase.from("guild_members").select("guild_id").eq("user_id", userId),
        supabase.from("company_members").select("company_id").eq("user_id", userId),
        supabase.from("pod_members").select("pod_id").eq("user_id", userId),
        supabase.from("quest_participants").select("quest_id").eq("user_id", userId),
      ]);

      const guildIds = (guildMems.data ?? []).map(g => g.guild_id);
      const companyIds = (compMems.data ?? []).map(c => c.company_id);
      const podIds = (podMems.data ?? []).map(p => p.pod_id);
      const questIds = (questParts.data ?? []).map(q => q.quest_id);

      // Find co-members
      const connections = new Map<string, { sharedGuilds: number; sharedCompanies: number; sharedPods: number; sharedQuests: number }>();

      const addConnection = (uid: string, type: "sharedGuilds" | "sharedCompanies" | "sharedPods" | "sharedQuests") => {
        if (uid === userId) return;
        if (!connections.has(uid)) connections.set(uid, { sharedGuilds: 0, sharedCompanies: 0, sharedPods: 0, sharedQuests: 0 });
        connections.get(uid)![type]++;
      };

      const fetches = [];
      if (guildIds.length > 0) fetches.push(supabase.from("guild_members").select("user_id").in("guild_id", guildIds).then(r => (r.data ?? []).forEach(m => addConnection(m.user_id, "sharedGuilds"))));
      if (companyIds.length > 0) fetches.push(supabase.from("company_members").select("user_id").in("company_id", companyIds).then(r => (r.data ?? []).forEach(m => addConnection(m.user_id, "sharedCompanies"))));
      if (podIds.length > 0) fetches.push(supabase.from("pod_members").select("user_id").in("pod_id", podIds).then(r => (r.data ?? []).forEach(m => addConnection(m.user_id, "sharedPods"))));
      if (questIds.length > 0) fetches.push(supabase.from("quest_participants").select("user_id").in("quest_id", questIds).then(r => (r.data ?? []).forEach(m => addConnection(m.user_id, "sharedQuests"))));

      await Promise.all(fetches);

      if (connections.size === 0) return [];

      // Fetch profiles for all connections
      const connUserIds = Array.from(connections.keys()).slice(0, 50); // cap at 50
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, name, avatar_url, headline")
        .in("user_id", connUserIds);

      return (profiles ?? []).map(p => ({
        ...p,
        shared: connections.get(p.user_id)!,
        totalShared: (connections.get(p.user_id)!.sharedGuilds + connections.get(p.user_id)!.sharedCompanies + connections.get(p.user_id)!.sharedPods + connections.get(p.user_id)!.sharedQuests),
      })).sort((a, b) => b.totalShared - a.totalShared);
    },
    enabled: !!userId,
    staleTime: 120_000,
  });
}

export function useMyTerritories(userId: string) {
  return useQuery({
    queryKey: ["network-territories", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("user_territories")
        .select("territory_id, attachment_type, territories(id, name, level, parent_id)")
        .eq("user_id", userId);
      if (error) throw error;
      return (data ?? []).map((ut: any) => ({
        territoryId: ut.territory_id,
        attachmentType: ut.attachment_type,
        territory: ut.territories,
      })).filter((t: any) => t.territory);
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}

export function useMyTopics(userId: string) {
  return useQuery({
    queryKey: ["network-topics", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("user_topics")
        .select("topic_id, topics(id, name, slug)")
        .eq("user_id", userId);
      if (error) throw error;
      return (data ?? []).map((ut: any) => ut.topics).filter(Boolean);
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}

/** Territory activity counts */
export function useTerritoryActivity(territoryIds: string[]) {
  return useQuery({
    queryKey: ["territory-activity", territoryIds],
    queryFn: async () => {
      if (territoryIds.length === 0) return {};
      const [guilds, companies, quests] = await Promise.all([
        supabase.from("guild_territories").select("territory_id").in("territory_id", territoryIds),
        supabase.from("company_territories").select("territory_id").in("territory_id", territoryIds),
        supabase.from("quest_territories").select("territory_id").in("territory_id", territoryIds),
      ]);

      const counts: Record<string, { guilds: number; companies: number; quests: number }> = {};
      territoryIds.forEach(id => { counts[id] = { guilds: 0, companies: 0, quests: 0 }; });

      (guilds.data ?? []).forEach(r => { if (counts[r.territory_id]) counts[r.territory_id].guilds++; });
      (companies.data ?? []).forEach(r => { if (counts[r.territory_id]) counts[r.territory_id].companies++; });
      (quests.data ?? []).forEach(r => { if (counts[r.territory_id]) counts[r.territory_id].quests++; });

      return counts;
    },
    enabled: territoryIds.length > 0,
    staleTime: 120_000,
  });
}
