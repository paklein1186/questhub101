import {
  users, guilds, quests, pods, services, companies,
  userTopics, guildTopics, questTopics, serviceTopics, companyTopics,
  userTerritories, guildTerritories, questTerritories, serviceTerritories, companyTerritories,
  userBlocks,
} from "@/data/mock";
import { filterActive } from "@/lib/softDelete";
import type { User, Guild, Quest, Pod, Service, Company } from "@/types";

export type SearchResultType = "USER" | "GUILD" | "QUEST" | "POD" | "SERVICE" | "COMPANY";

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle?: string;
  url: string;
}

function matchesQuery(query: string, ...fields: (string | undefined)[]): boolean {
  const q = query.toLowerCase();
  return fields.some((f) => f?.toLowerCase().includes(q));
}

function hasTopicId(type: SearchResultType, entityId: string, topicId: string): boolean {
  switch (type) {
    case "USER": return userTopics.some((ut) => ut.userId === entityId && ut.topicId === topicId);
    case "GUILD": return guildTopics.some((gt) => gt.guildId === entityId && gt.topicId === topicId);
    case "QUEST": return questTopics.some((qt) => qt.questId === entityId && qt.topicId === topicId);
    case "SERVICE": return serviceTopics.some((st) => st.serviceId === entityId && st.topicId === topicId);
    case "COMPANY": return companyTopics.some((ct) => ct.companyId === entityId && ct.topicId === topicId);
    default: return false;
  }
}

function hasTerritoryId(type: SearchResultType, entityId: string, territoryId: string): boolean {
  switch (type) {
    case "USER": return userTerritories.some((ut) => ut.userId === entityId && ut.territoryId === territoryId);
    case "GUILD": return guildTerritories.some((gt) => gt.guildId === entityId && gt.territoryId === territoryId);
    case "QUEST": return questTerritories.some((qt) => qt.questId === entityId && qt.territoryId === territoryId);
    case "SERVICE": return serviceTerritories.some((st) => st.serviceId === entityId && st.territoryId === territoryId);
    case "COMPANY": return companyTerritories.some((ct) => ct.companyId === entityId && ct.territoryId === territoryId);
    default: return false;
  }
}

export interface SearchFilters {
  topicId?: string;
  territoryId?: string;
  priceMin?: number;
  priceMax?: number;
}

export function globalSearch(
  query: string,
  currentUserId: string,
  filters?: SearchFilters,
): SearchResult[] {
  const results: SearchResult[] = [];

  const blockedIds = new Set(
    userBlocks
      .filter((b) => b.blockerId === currentUserId || b.blockedId === currentUserId)
      .map((b) => (b.blockerId === currentUserId ? b.blockedId : b.blockerId))
  );

  // Users
  for (const u of filterActive(users)) {
    if (u.id === currentUserId) continue;
    if (blockedIds.has(u.id)) continue;
    if (!matchesQuery(query, u.name, u.headline)) continue;
    if (filters?.topicId && !hasTopicId("USER", u.id, filters.topicId)) continue;
    if (filters?.territoryId && !hasTerritoryId("USER", u.id, filters.territoryId)) continue;
    results.push({ type: "USER", id: u.id, title: u.name, subtitle: u.headline, url: `/users/${u.id}` });
  }

  // Guilds
  for (const g of filterActive(guilds)) {
    if (g.isDraft) continue;
    if (!matchesQuery(query, g.name, g.description)) continue;
    if (filters?.topicId && !hasTopicId("GUILD", g.id, filters.topicId)) continue;
    if (filters?.territoryId && !hasTerritoryId("GUILD", g.id, filters.territoryId)) continue;
    results.push({ type: "GUILD", id: g.id, title: g.name, subtitle: g.description, url: `/guilds/${g.id}` });
  }

  // Quests
  for (const q of filterActive(quests)) {
    if (!matchesQuery(query, q.title, q.description)) continue;
    if (filters?.topicId && !hasTopicId("QUEST", q.id, filters.topicId)) continue;
    if (filters?.territoryId && !hasTerritoryId("QUEST", q.id, filters.territoryId)) continue;
    results.push({ type: "QUEST", id: q.id, title: q.title, subtitle: q.description, url: `/quests/${q.id}` });
  }

  // Pods
  for (const p of filterActive(pods)) {
    if (!matchesQuery(query, p.name, p.description)) continue;
    results.push({ type: "POD", id: p.id, title: p.name, subtitle: p.description, url: `/pods/${p.id}` });
  }

  // Services
  for (const s of filterActive(services)) {
    if (!matchesQuery(query, s.title, s.description)) continue;
    if (filters?.topicId && !hasTopicId("SERVICE", s.id, filters.topicId)) continue;
    if (filters?.territoryId && !hasTerritoryId("SERVICE", s.id, filters.territoryId)) continue;
    if (filters?.priceMin !== undefined && (s.priceAmount ?? 0) < filters.priceMin) continue;
    if (filters?.priceMax !== undefined && (s.priceAmount ?? 0) > filters.priceMax) continue;
    results.push({ type: "SERVICE", id: s.id, title: s.title, subtitle: `€${s.priceAmount ?? 0}`, url: `/services/${s.id}` });
  }

  // Companies
  for (const c of filterActive(companies)) {
    if (!matchesQuery(query, c.name, c.description)) continue;
    if (filters?.topicId && !hasTopicId("COMPANY", c.id, filters.topicId)) continue;
    if (filters?.territoryId && !hasTerritoryId("COMPANY", c.id, filters.territoryId)) continue;
    results.push({ type: "COMPANY", id: c.id, title: c.name, subtitle: c.description, url: `/companies/${c.id}` });
  }

  return results;
}
