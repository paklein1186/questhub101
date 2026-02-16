import { LEVEL_LABELS, XP_LEVEL_THRESHOLDS } from "@/lib/xpCreditsConfig";
import type { LucideIcon } from "lucide-react";

// ─── Cross-Territory Multiplier Config ─────────────────────
export const TERRITORY_MULTIPLIERS = {
  SAME_GUILD: 1.0,
  DIFFERENT_GUILD_SAME_TERRITORY: 1.1,
  DIFFERENT_TERRITORY_SAME_REGION: 1.2,
  DIFFERENT_REGION_SAME_COUNTRY: 1.3,
  DIFFERENT_COUNTRY: 1.5,
  MULTI_COUNTRY_3_PLUS: 1.8,
} as const;

/** Bonus multiplier when user collaborates in a territory with no prior activity */
export const TERRITORY_ACTIVATION_BONUS = 0.2; // +20%

// ─── Translocal Badges ─────────────────────────────────────
export const TRANSLOCAL_BADGES = [
  { key: "translocal", label: "🌍 Translocal", minCountries: 3, minLevel: 11 },
  { key: "bioregional_architect", label: "🌐 Bioregional Architect", minCountries: 5, minLevel: 11 },
] as const;

export function getTranslocalBadge(level: number, countriesCount: number) {
  // Return highest qualifying badge
  for (let i = TRANSLOCAL_BADGES.length - 1; i >= 0; i--) {
    const b = TRANSLOCAL_BADGES[i];
    if (level >= b.minLevel && countriesCount >= b.minCountries) return b;
  }
  return null;
}

// ─── Governance Permissions by Level ────────────────────────
export interface GovernanceRight {
  label: string;
  description: string;
  minLevel: number;
  sphere: "personal" | "guild" | "territory" | "platform";
}

export const GOVERNANCE_RIGHTS: GovernanceRight[] = [
  // Level 1-3: Emergence
  { label: "Create profile", description: "Set up your identity in the ecosystem", minLevel: 1, sphere: "personal" },
  { label: "Join guilds", description: "Participate in collaborative groups", minLevel: 1, sphere: "guild" },
  { label: "Comment & upvote", description: "Engage in discussions", minLevel: 1, sphere: "personal" },
  { label: "Complete quests", description: "Take on collaborative missions", minLevel: 1, sphere: "personal" },
  // Level 4-6: Rooting
  { label: "Create Pods", description: "Organize small collaborative groups", minLevel: 4, sphere: "guild" },
  { label: "Propose public quests", description: "Submit quests for community review", minLevel: 4, sphere: "guild" },
  { label: "Create local events", description: "Organize community gatherings", minLevel: 4, sphere: "guild" },
  { label: "Participate in guild votes", description: "Vote on guild-level decisions", minLevel: 5, sphere: "guild" },
  { label: "Moderate own pods", description: "Manage your pod spaces", minLevel: 6, sphere: "guild" },
  { label: "Flag content", description: "Report inappropriate content", minLevel: 6, sphere: "guild" },
  { label: "Endorse collaborators", description: "Vouch for trusted contributors", minLevel: 6, sphere: "guild" },
  // Level 7-9: Collaboration
  { label: "Launch public quests", description: "Create quests without pre-approval", minLevel: 7, sphere: "guild" },
  { label: "Host cross-guild projects", description: "Bridge multiple guilds", minLevel: 7, sphere: "guild" },
  { label: "Create territory proposals", description: "Propose changes to territories", minLevel: 7, sphere: "territory" },
  { label: "Offer paid services", description: "Monetize your expertise", minLevel: 8, sphere: "personal" },
  { label: "Nominate pod moderators", description: "Suggest moderators for pods", minLevel: 9, sphere: "guild" },
  { label: "Propose guild partnerships", description: "Initiate inter-guild collaborations", minLevel: 9, sphere: "guild" },
  // Level 10-12: Structuring
  { label: "Create new Guilds", description: "Establish collaborative groups (with review)", minLevel: 10, sphere: "guild" },
  { label: "Create Territory Pages", description: "Set up territory presence", minLevel: 10, sphere: "territory" },
  { label: "Initiate funding pools", description: "Start collective resource pools", minLevel: 10, sphere: "guild" },
  { label: "Moderate Guilds", description: "Steward guild communities", minLevel: 11, sphere: "guild" },
  { label: "Vote in Territory governance", description: "Participate in territory decisions", minLevel: 11, sphere: "territory" },
  { label: "Validate cross-territory projects", description: "Approve multi-territory initiatives", minLevel: 11, sphere: "territory" },
  { label: "Access Governance Voting", description: "Participate in platform referendums", minLevel: 12, sphere: "platform" },
  { label: "Initiate Territory Councils", description: "Set up territorial governance bodies", minLevel: 12, sphere: "territory" },
  { label: "Launch Governance Proposals", description: "Propose rule amendments", minLevel: 12, sphere: "platform" },
  // Level 13-15: Stewardship
  { label: "Co-moderate territories", description: "Steward territorial communities", minLevel: 13, sphere: "territory" },
  { label: "Approve guild creation", description: "Review and approve new guilds", minLevel: 13, sphere: "platform" },
  { label: "Suspend malicious activity", description: "Temporary safety interventions", minLevel: 13, sphere: "platform" },
  { label: "Nominate Moderators", description: "Recommend community stewards", minLevel: 14, sphere: "platform" },
  { label: "Platform-wide governance vote", description: "Vote on platform-level decisions", minLevel: 14, sphere: "platform" },
  { label: "Initiate constitutional review", description: "Trigger governance reform processes", minLevel: 14, sphere: "platform" },
  { label: "Strategic Council eligibility", description: "Join the highest stewardship body", minLevel: 15, sphere: "platform" },
  { label: "Final arbitration role", description: "Collective dispute resolution (multi-signature)", minLevel: 15, sphere: "platform" },
  { label: "Emergency moderation override", description: "Requires quorum of 3+ stewards", minLevel: 15, sphere: "platform" },
];

/** Get all governance rights unlocked at a specific level */
export function getGovernanceRightsForLevel(level: number) {
  return GOVERNANCE_RIGHTS.filter((r) => r.minLevel <= level);
}

/** Get newly unlocked rights at this exact level */
export function getNewRightsAtLevel(level: number) {
  return GOVERNANCE_RIGHTS.filter((r) => r.minLevel === level);
}

// ─── Governance Voting Thresholds ──────────────────────────
export const VOTING_THRESHOLDS = {
  pod: 4,
  guild: 6,
  territory: 11,
  platform: 14,
} as const;

// ─── Governance Bodies ─────────────────────────────────────
export const GOVERNANCE_BODIES = [
  { name: "Pod Council", minLevel: 4, description: "Local collaborative governance" },
  { name: "Guild Council", minLevel: 6, description: "Guild-level decision making" },
  { name: "Territory Council", minLevel: 11, description: "Territorial governance and coordination" },
  { name: "Translocal Assembly", minLevel: 12, description: "Cross-territory strategic coordination", extraReq: "3+ territories" },
  { name: "Strategic Steward Council", minLevel: 15, description: "Highest stewardship body (capped membership)" },
] as const;

// ─── Level-gated feature check ─────────────────────────────
export function canAccessFeature(level: number, requiredLevel: number): boolean {
  return level >= requiredLevel;
}

// ─── XP Action Rewards (updated with cross-territory) ─────
export const XP_ACTION_REWARDS = {
  POST: 5,
  POST_UPVOTE_QUALITY: 2,
  COMPLETE_QUEST: 20,
  CO_CREATE_QUEST: 35,
  HOST_EVENT: 40,
  JOIN_GUILD: 10,
  CROSS_TERRITORY_PROJECT: 50,
  PUBLISH_RESOURCE: 30,
  MENTORSHIP_VALIDATED: 25,
} as const;
