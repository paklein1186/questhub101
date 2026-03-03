import { supabase } from "@/integrations/supabase/client";

export type SearchResultType = "USER" | "GUILD" | "QUEST" | "POD" | "SERVICE" | "COMPANY" | "TERRITORY";

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  imageUrl?: string;
  logoUrl?: string;
  trustScore?: number;
  trustTopTags?: string[];
  trustCount?: number;
}

export interface SearchFilters {
  topicId?: string;
  territoryId?: string;
  priceMin?: number;
  priceMax?: number;
}

export async function globalSearch(
  query: string,
  currentUserId: string,
  filters?: SearchFilters,
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const q = `%${query}%`;

  // Get blocked user IDs
  const { data: blocks } = await supabase
    .from("user_blocks")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${currentUserId},blocked_id.eq.${currentUserId}`);
  const blockedIds = new Set(
    (blocks ?? []).map((b) => b.blocker_id === currentUserId ? b.blocked_id : b.blocker_id)
  );

  // Users — search profiles_public view
  const { data: users } = await supabase
    .from("profiles_public")
    .select("user_id, name, headline, avatar_url")
    .or(`name.ilike.${q},headline.ilike.${q}`)
    .limit(20);

  for (const u of users ?? []) {
    if (!u.user_id || u.user_id === currentUserId || blockedIds.has(u.user_id)) continue;
    if (filters?.topicId) {
      const { count } = await supabase.from("user_topics").select("id", { count: "exact", head: true }).eq("user_id", u.user_id).eq("topic_id", filters.topicId);
      if (!count) continue;
    }
    if (filters?.territoryId) {
      const { count } = await supabase.from("user_territories").select("id", { count: "exact", head: true }).eq("user_id", u.user_id).eq("territory_id", filters.territoryId);
      if (!count) continue;
    }
    results.push({ type: "USER", id: u.user_id, title: u.name ?? "Unknown", subtitle: u.headline ?? undefined, url: `/users/${u.user_id}` });
  }

  // Guilds
  const { data: guildsData } = await supabase
    .from("guilds")
    .select("id, name, description")
    .eq("is_deleted", false).eq("is_draft", false)
    .or(`name.ilike.${q},description.ilike.${q}`)
    .limit(20);

  for (const g of guildsData ?? []) {
    if (filters?.topicId) {
      const { count } = await supabase.from("guild_topics").select("id", { count: "exact", head: true }).eq("guild_id", g.id).eq("topic_id", filters.topicId);
      if (!count) continue;
    }
    if (filters?.territoryId) {
      const { count } = await supabase.from("guild_territories").select("id", { count: "exact", head: true }).eq("guild_id", g.id).eq("territory_id", filters.territoryId);
      if (!count) continue;
    }
    results.push({ type: "GUILD", id: g.id, title: g.name, subtitle: g.description ?? undefined, url: `/guilds/${g.id}` });
  }

  // Quests
  const { data: questsData } = await supabase
    .from("quests")
    .select("id, title, description")
    .eq("is_deleted", false).eq("is_draft", false)
    .or(`title.ilike.${q},description.ilike.${q}`)
    .limit(20);

  for (const quest of questsData ?? []) {
    if (filters?.topicId) {
      const { count } = await supabase.from("quest_topics").select("id", { count: "exact", head: true }).eq("quest_id", quest.id).eq("topic_id", filters.topicId);
      if (!count) continue;
    }
    if (filters?.territoryId) {
      const { count } = await supabase.from("quest_territories").select("id", { count: "exact", head: true }).eq("quest_id", quest.id).eq("territory_id", filters.territoryId);
      if (!count) continue;
    }
    results.push({ type: "QUEST", id: quest.id, title: quest.title, subtitle: quest.description ?? undefined, url: `/quests/${quest.id}` });
  }

  // Pods
  const { data: podsData } = await supabase
    .from("pods")
    .select("id, name, description")
    .eq("is_deleted", false).eq("is_draft", false)
    .or(`name.ilike.${q},description.ilike.${q}`)
    .limit(20);

  for (const p of podsData ?? []) {
    results.push({ type: "POD", id: p.id, title: p.name, subtitle: p.description ?? undefined, url: `/pods/${p.id}` });
  }

  // Services
  let servicesQuery = supabase
    .from("services")
    .select("id, title, description, price_amount")
    .eq("is_deleted", false).eq("is_draft", false)
    .or(`title.ilike.${q},description.ilike.${q}`)
    .limit(20);

  const { data: servicesData } = await servicesQuery;

  for (const s of servicesData ?? []) {
    if (filters?.topicId) {
      const { count } = await supabase.from("service_topics").select("id", { count: "exact", head: true }).eq("service_id", s.id).eq("topic_id", filters.topicId);
      if (!count) continue;
    }
    if (filters?.territoryId) {
      const { count } = await supabase.from("service_territories").select("id", { count: "exact", head: true }).eq("service_id", s.id).eq("territory_id", filters.territoryId);
      if (!count) continue;
    }
    if (filters?.priceMin !== undefined && (s.price_amount ?? 0) < filters.priceMin) continue;
    if (filters?.priceMax !== undefined && (s.price_amount ?? 0) > filters.priceMax) continue;
    results.push({ type: "SERVICE", id: s.id, title: s.title, subtitle: `€${s.price_amount ?? 0}`, url: `/services/${s.id}` });
  }

  // Companies
  const { data: companiesData } = await supabase
    .from("companies")
    .select("id, name, description")
    .eq("is_deleted", false)
    .or(`name.ilike.${q},description.ilike.${q}`)
    .limit(20);

  for (const c of companiesData ?? []) {
    results.push({ type: "COMPANY", id: c.id, title: c.name, subtitle: c.description ?? undefined, url: `/companies/${c.id}` });
  }

  // Territories
  const { data: territoriesData } = await supabase
    .from("territories")
    .select("id, name, level, summary")
    .eq("is_deleted", false)
    .ilike("name", q)
    .limit(20);

  for (const t of territoriesData ?? []) {
    results.push({ type: "TERRITORY", id: t.id, title: t.name, subtitle: t.level ?? undefined, url: `/territories/${t.id}` });
  }

  return results;
}
