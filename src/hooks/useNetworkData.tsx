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

      // Get all entity IDs user belongs to + followed users
      const [guildMems, compMems, podMems, questParts, followedUsers] = await Promise.all([
        supabase.from("guild_members").select("guild_id").eq("user_id", userId),
        supabase.from("company_members").select("company_id").eq("user_id", userId),
        supabase.from("pod_members").select("pod_id").eq("user_id", userId),
        supabase.from("quest_participants").select("quest_id").eq("user_id", userId),
        supabase.from("follows").select("target_id").eq("follower_id", userId).eq("target_type", "USER"),
      ]);

      const guildIds = (guildMems.data ?? []).map(g => g.guild_id);
      const companyIds = (compMems.data ?? []).map(c => c.company_id);
      const podIds = (podMems.data ?? []).map(p => p.pod_id);
      const questIds = (questParts.data ?? []).map(q => q.quest_id);
      const followedUserIds = new Set((followedUsers.data ?? []).map(f => f.target_id));

      // Find co-members
      const connections = new Map<string, { sharedGuilds: number; sharedCompanies: number; sharedPods: number; sharedQuests: number; isFollowed: boolean }>();

      const ensureConnection = (uid: string) => {
        if (uid === userId) return;
        if (!connections.has(uid)) connections.set(uid, { sharedGuilds: 0, sharedCompanies: 0, sharedPods: 0, sharedQuests: 0, isFollowed: followedUserIds.has(uid) });
      };

      const addConnection = (uid: string, type: "sharedGuilds" | "sharedCompanies" | "sharedPods" | "sharedQuests") => {
        if (uid === userId) return;
        ensureConnection(uid);
        connections.get(uid)![type]++;
      };

      // Add all followed users into the connections map first
      for (const fId of followedUserIds) {
        if (fId !== userId) {
          ensureConnection(fId);
          connections.get(fId)!.isFollowed = true;
        }
      }

      const fetches = [];
      if (guildIds.length > 0) fetches.push(supabase.from("guild_members").select("user_id").in("guild_id", guildIds).then(r => (r.data ?? []).forEach(m => addConnection(m.user_id, "sharedGuilds"))));
      if (companyIds.length > 0) fetches.push(supabase.from("company_members").select("user_id").in("company_id", companyIds).then(r => (r.data ?? []).forEach(m => addConnection(m.user_id, "sharedCompanies"))));
      if (podIds.length > 0) fetches.push(supabase.from("pod_members").select("user_id").in("pod_id", podIds).then(r => (r.data ?? []).forEach(m => addConnection(m.user_id, "sharedPods"))));
      if (questIds.length > 0) fetches.push(supabase.from("quest_participants").select("user_id").in("quest_id", questIds).then(r => (r.data ?? []).forEach(m => addConnection(m.user_id, "sharedQuests"))));

      await Promise.all(fetches);

      if (connections.size === 0) return [];

      // Fetch profiles for all connections (cap at 200)
      const connUserIds = Array.from(connections.keys()).slice(0, 200);
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, name, avatar_url, headline")
        .in("user_id", connUserIds);

      return (profiles ?? []).map(p => {
        const c = connections.get(p.user_id)!;
        return {
          ...p,
          shared: c,
          isFollowed: c.isFollowed,
          totalShared: c.sharedGuilds + c.sharedCompanies + c.sharedPods + c.sharedQuests + (c.isFollowed ? 1 : 0),
        };
      }).sort((a, b) => b.totalShared - a.totalShared);
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

/** Map entries for followed users — lowest-level territory per user */
const LEVEL_PRIORITY: Record<string, number> = {
  TOWN: 0, LOCALITY: 1, PROVINCE: 2, REGION: 3, NATIONAL: 4, OTHER: 5, CONTINENT: 6, GLOBAL: 7,
};

export function useFollowedUsersMap(userId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["network-people-map", userId],
    enabled: !!userId && enabled,
    queryFn: async () => {
      if (!userId) return [];

      // Get followed user IDs
      const { data: follows } = await supabase
        .from("follows")
        .select("target_id")
        .eq("follower_id", userId)
        .eq("target_type", "USER");

      const followedIds = (follows ?? []).map(f => f.target_id);
      if (followedIds.length === 0) return [];

      // Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, name, avatar_url, headline")
        .in("user_id", followedIds);
      if (!profiles || profiles.length === 0) return [];

      const userIds = profiles.map(p => p.user_id).filter(Boolean) as string[];

      // Fetch territories with coords
      const { data: utRows } = await supabase
        .from("user_territories")
        .select("user_id, territory_id, territories(id, name, latitude, longitude, level)")
        .in("user_id", userIds);

      const userTerritories: Record<string, { name: string; lat: number; lng: number; level: string }[]> = {};
      for (const row of (utRows ?? []) as any[]) {
        const t = row.territories;
        if (!t || t.latitude == null || t.longitude == null) continue;
        const uid = row.user_id as string;
        if (!userTerritories[uid]) userTerritories[uid] = [];
        userTerritories[uid].push({ name: t.name, lat: t.latitude, lng: t.longitude, level: t.level ?? "OTHER" });
      }

      const profileMap: Record<string, typeof profiles[0]> = {};
      for (const p of profiles) if (p.user_id) profileMap[p.user_id] = p;

      const entries: { user_id: string; name: string; avatar_url: string | null; headline: string | null; territory_name: string; lat: number; lng: number }[] = [];
      for (const [uid, terrs] of Object.entries(userTerritories)) {
        const minPriority = Math.min(...terrs.map(t => LEVEL_PRIORITY[t.level] ?? 5));
        const lowest = terrs.filter(t => (LEVEL_PRIORITY[t.level] ?? 5) === minPriority);
        const profile = profileMap[uid];
        if (!profile) continue;
        for (const t of lowest) {
          entries.push({
            user_id: uid,
            name: profile.name ?? "Unknown",
            avatar_url: profile.avatar_url ?? null,
            headline: profile.headline ?? null,
            territory_name: t.name,
            lat: t.lat,
            lng: t.lng,
          });
        }
      }

      return entries;
    },
    staleTime: 120_000,
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
