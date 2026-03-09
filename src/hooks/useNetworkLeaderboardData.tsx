import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TerritoryLeaderboardItem {
  id: string;
  name: string;
  level: string | null;
  parent_name: string | null;
  quests: number;
  entities: number;
  memoryContributions: number;
  topTopics: string[];
  synthesis: string;
  cover_url: string | null;
  logo_url: string | null;
}

export interface TopicLeaderboardItem {
  id: string;
  name: string;
  slug: string;
  quests: number;
  entities: number;
  territories: number;
  topTerritories: string[];
  synthesis: string;
}

function generateTerritorySynthesis(t: Omit<TerritoryLeaderboardItem, "synthesis">): string {
  const parts: string[] = [];
  if (t.quests > 3) parts.push(`High activity: ${t.quests} active quests`);
  else if (t.quests > 0) parts.push(`${t.quests} active quest${t.quests > 1 ? "s" : ""}`);
  else parts.push("No active quests yet");

  if (t.entities > 0) parts.push(`${t.entities} entit${t.entities > 1 ? "ies" : "y"} collaborating`);
  if (t.memoryContributions > 0) parts.push(`${t.memoryContributions} memory entr${t.memoryContributions > 1 ? "ies" : "y"}`);
  if (t.topTopics.length > 0) parts.push(`focus on ${t.topTopics.slice(0, 2).join(" & ")}`);

  const text = parts.join(", ");
  return text.length > 120 ? text.slice(0, 117) + "…" : text;
}

function generateTopicSynthesis(t: Omit<TopicLeaderboardItem, "synthesis">): string {
  const parts: string[] = [];
  if (t.quests > 3) parts.push(`Strong momentum: ${t.quests} active quests`);
  else if (t.quests > 0) parts.push(`${t.quests} active quest${t.quests > 1 ? "s" : ""}`);
  else parts.push("Emerging topic");

  if (t.entities > 0) parts.push(`${t.entities} entit${t.entities > 1 ? "ies" : "y"}`);
  if (t.territories > 0) parts.push(`across ${t.territories} territor${t.territories > 1 ? "ies" : "y"}`);
  if (t.topTerritories.length > 0) parts.push(`most active in ${t.topTerritories.slice(0, 2).join(" & ")}`);

  const text = parts.join(", ");
  return text.length > 120 ? text.slice(0, 117) + "…" : text;
}

export function useTerritoryLeaderboard() {
  return useQuery<TerritoryLeaderboardItem[]>({
    queryKey: ["territory-leaderboard"],
    staleTime: 120_000,
    queryFn: async () => {
      // Fetch all territories
      const { data: territories, error } = await supabase
        .from("territories")
        .select("id, name, level, parent_id, stats");
      if (error) throw error;
      if (!territories || territories.length === 0) return [];

      const tIds = territories.map((t) => t.id);
      const tMap = new Map(territories.map((t) => [t.id, t]));

      // Fetch activity counts in parallel
      const [questLinks, guildLinks, companyLinks, podLinks, memoryEntries, topicLinks] =
        await Promise.all([
          supabase.from("quest_territories").select("territory_id, quest_id").in("territory_id", tIds),
          supabase.from("guild_territories").select("territory_id").in("territory_id", tIds),
          supabase.from("company_territories").select("territory_id").in("territory_id", tIds),
          supabase.from("pod_territories").select("territory_id").in("territory_id", tIds),
          supabase.from("territory_memory").select("territory_id").in("territory_id", tIds),
          supabase.from("quest_territories").select("territory_id, quests!inner(id, quest_topics(topic_id, topics(name)))").in("territory_id", tIds),
        ]);

      // Count per territory
      const questCount: Record<string, number> = {};
      const entityCount: Record<string, number> = {};
      const memoryCount: Record<string, number> = {};
      const topicsByTerritory: Record<string, Map<string, number>> = {};

      tIds.forEach((id) => {
        questCount[id] = 0;
        entityCount[id] = 0;
        memoryCount[id] = 0;
        topicsByTerritory[id] = new Map();
      });

      (questLinks.data ?? []).forEach((r: any) => {
        if (questCount[r.territory_id] !== undefined) questCount[r.territory_id]++;
      });
      (guildLinks.data ?? []).forEach((r: any) => {
        if (entityCount[r.territory_id] !== undefined) entityCount[r.territory_id]++;
      });
      (companyLinks.data ?? []).forEach((r: any) => {
        if (entityCount[r.territory_id] !== undefined) entityCount[r.territory_id]++;
      });
      (podLinks.data ?? []).forEach((r: any) => {
        if (entityCount[r.territory_id] !== undefined) entityCount[r.territory_id]++;
      });
      (memoryEntries.data ?? []).forEach((r: any) => {
        if (memoryCount[r.territory_id] !== undefined) memoryCount[r.territory_id]++;
      });

      // Extract top topics per territory
      (topicLinks.data ?? []).forEach((r: any) => {
        const tId = r.territory_id;
        const topics = r.quests?.quest_topics ?? [];
        topics.forEach((qt: any) => {
          const name = qt.topics?.name;
          if (name && topicsByTerritory[tId]) {
            topicsByTerritory[tId].set(name, (topicsByTerritory[tId].get(name) ?? 0) + 1);
          }
        });
      });

      // Build parent name map
      const parentNames: Record<string, string | null> = {};
      territories.forEach((t) => {
        parentNames[t.id] = t.parent_id ? tMap.get(t.parent_id)?.name ?? null : null;
      });

      // Build items
      const items: TerritoryLeaderboardItem[] = territories.map((t) => {
        const topTopicsMap = topicsByTerritory[t.id] ?? new Map();
        const topTopics = [...topTopicsMap.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name]) => name);

        const base = {
          id: t.id,
          name: t.name,
          level: t.level,
          parent_name: parentNames[t.id],
          quests: questCount[t.id] ?? 0,
          entities: entityCount[t.id] ?? 0,
          memoryContributions: memoryCount[t.id] ?? 0,
          topTopics,
          cover_url: ((t as any).stats as any)?.cover_url ?? null,
        };

        return { ...base, synthesis: generateTerritorySynthesis(base) };
      });

      // Sort by activity score
      items.sort((a, b) => {
        const scoreA = a.quests * 3 + a.entities * 2 + a.memoryContributions;
        const scoreB = b.quests * 3 + b.entities * 2 + b.memoryContributions;
        return scoreB - scoreA;
      });

      return items;
    },
  });
}

export function useTopicLeaderboard() {
  return useQuery<TopicLeaderboardItem[]>({
    queryKey: ["topic-leaderboard"],
    staleTime: 120_000,
    queryFn: async () => {
      const { data: topics, error } = await supabase
        .from("topics")
        .select("id, name, slug");
      if (error) throw error;
      if (!topics || topics.length === 0) return [];

      const topicIds = topics.map((t) => t.id);

      // Fetch counts in parallel
      const [questTopics, guildTopics, companyTopics, questTerritories] = await Promise.all([
        supabase.from("quest_topics").select("topic_id").in("topic_id", topicIds),
        supabase.from("guild_topics").select("topic_id").in("topic_id", topicIds),
        supabase.from("company_topics").select("topic_id").in("topic_id", topicIds),
        supabase
          .from("quest_topics")
          .select("topic_id, quests!inner(id, quest_territories(territory_id, territories(name)))")
          .in("topic_id", topicIds),
      ]);

      const questCount: Record<string, number> = {};
      const entityCount: Record<string, number> = {};
      const territoriesByTopic: Record<string, Map<string, number>> = {};

      topicIds.forEach((id) => {
        questCount[id] = 0;
        entityCount[id] = 0;
        territoriesByTopic[id] = new Map();
      });

      (questTopics.data ?? []).forEach((r: any) => {
        if (questCount[r.topic_id] !== undefined) questCount[r.topic_id]++;
      });
      (guildTopics.data ?? []).forEach((r: any) => {
        if (entityCount[r.topic_id] !== undefined) entityCount[r.topic_id]++;
      });
      (companyTopics.data ?? []).forEach((r: any) => {
        if (entityCount[r.topic_id] !== undefined) entityCount[r.topic_id]++;
      });

      // Extract top territories per topic
      (questTerritories.data ?? []).forEach((r: any) => {
        const tId = r.topic_id;
        const territories = r.quests?.quest_territories ?? [];
        territories.forEach((qt: any) => {
          const name = qt.territories?.name;
          if (name && territoriesByTopic[tId]) {
            territoriesByTopic[tId].set(name, (territoriesByTopic[tId].get(name) ?? 0) + 1);
          }
        });
      });

      const items: TopicLeaderboardItem[] = topics.map((t) => {
        const terrMap = territoriesByTopic[t.id] ?? new Map();
        const topTerritories = [...terrMap.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name]) => name);

        const base = {
          id: t.id,
          name: t.name,
          slug: t.slug,
          quests: questCount[t.id] ?? 0,
          entities: entityCount[t.id] ?? 0,
          territories: terrMap.size,
          topTerritories,
        };

        return { ...base, synthesis: generateTopicSynthesis(base) };
      });

      items.sort((a, b) => {
        const scoreA = a.quests * 3 + a.entities * 2 + a.territories;
        const scoreB = b.quests * 3 + b.entities * 2 + b.territories;
        return scoreB - scoreA;
      });

      return items;
    },
  });
}

// Emoji mapping for topics
export const TOPIC_EMOJI_MAP: Record<string, string> = {
  "new-agriculture": "🌾",
  "arts-culture": "🎨",
  "bioregions": "🌿",
  "carbon-capture": "🏭",
  "commons-dao": "🤝",
  "complex-systems": "🔄",
  "csr": "🏢",
  "energy": "⚡",
  "ai": "🤖",
  "new-economic-models": "💡",
  "new-gatherings": "🎪",
  "governance": "🏛️",
  "healthcare": "🏥",
  "hosting-facilitation": "🎯",
  "impact-real-estate": "🏗️",
  "investments-philanthropy": "💰",
  "land-regeneration": "🌱",
  "leadership": "🧭",
  "metrics": "📊",
  "narratives-storytelling": "📖",
  "open-data-technology": "💻",
  "education": "📚",
  "social-innovation": "🚀",
  "food": "🍽️",
  "health-wellbeing": "🌱",
};
