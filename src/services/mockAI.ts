import { guilds, quests, topics, territories, getTopicsForGuild, getTerritoriesForGuild, getTopicsForQuest, getTerritoriesForQuest } from "@/data/mock";
import type { Topic, Territory, Guild, Quest } from "@/types";

/**
 * Mock AI service — simulates AI-generated onboarding results.
 * Replace with real Lovable AI calls when Cloud is enabled.
 */

export interface OnboardingInput {
  role: string;
  selectedTopicIds: string[];
  selectedTerritoryIds: string[];
  bio: string;
}

export interface AIOnboardingResult {
  headline: string;
  bioSummary: string;
  suggestedGuilds: Guild[];
  suggestedQuests: Quest[];
}

const roleHeadlines: Record<string, string> = {
  GAMECHANGER: "Visionary Changemaker",
  ECOSYSTEM_BUILDER: "Community Architect",
  BOTH: "Impact Catalyst",
};

function scoreOverlap(entityTopicIds: string[], entityTerritoryIds: string[], userTopicIds: string[], userTerritoryIds: string[]): number {
  let score = 0;
  for (const id of entityTopicIds) if (userTopicIds.includes(id)) score += 2;
  for (const id of entityTerritoryIds) if (userTerritoryIds.includes(id)) score += 1;
  return score;
}

export async function generateOnboardingResults(input: OnboardingInput): Promise<AIOnboardingResult> {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 1800));

  const topicNames = input.selectedTopicIds
    .map((id) => topics.find((t) => t.id === id)?.name)
    .filter(Boolean);
  const territoryNames = input.selectedTerritoryIds
    .map((id) => territories.find((t) => t.id === id)?.name)
    .filter(Boolean);

  const headline = `${roleHeadlines[input.role] || "Impact Leader"} · ${topicNames.slice(0, 2).join(" & ")}`;

  const bioSummary = `${input.bio} Passionate about ${topicNames.join(", ").toLowerCase()}, based in ${territoryNames.join(" & ") || "the world"}. Ready to make an impact.`;

  // Score guilds by topic/territory overlap
  const scoredGuilds = guilds.map((g) => ({
    guild: g,
    score: scoreOverlap(
      getTopicsForGuild(g.id).map((t) => t.id),
      getTerritoriesForGuild(g.id).map((t) => t.id),
      input.selectedTopicIds,
      input.selectedTerritoryIds
    ),
  }));
  scoredGuilds.sort((a, b) => b.score - a.score);
  const suggestedGuilds = scoredGuilds.filter((s) => s.score > 0).slice(0, 3).map((s) => s.guild);

  // Score quests similarly
  const scoredQuests = quests.map((q) => ({
    quest: q,
    score: scoreOverlap(
      getTopicsForQuest(q.id).map((t) => t.id),
      getTerritoriesForQuest(q.id).map((t) => t.id),
      input.selectedTopicIds,
      input.selectedTerritoryIds
    ),
  }));
  scoredQuests.sort((a, b) => b.score - a.score);
  const suggestedQuests = scoredQuests.filter((s) => s.score > 0).slice(0, 3).map((s) => s.quest);

  return { headline, bioSummary, suggestedGuilds, suggestedQuests };
}
