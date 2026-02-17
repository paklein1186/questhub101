// ─── Ritual Session Type Configuration ────────────────────────
// Cultural grammar for Guild collective synchronization.

export const RITUAL_SESSION_TYPES = {
  INFORMAL_HANGING: {
    label: "Commons Café",
    subtitle: "Informal Hanging",
    icon: "Coffee",
    description: "Build trust, reduce friction, strengthen weak ties.",
    bestFor: "Early-stage guilds, post-conflict cooling, onboarding waves.",
    defaultDuration: 75,
    defaultXp: 3,
    facilitatorBonus: 0,
    governanceImpact: "low",
    defaultProgram: [
      { title: "Open arrival", minutes: 10, role: null },
      { title: "2-min personal check-in", minutes: 15, role: null },
      { title: "Free conversation", minutes: 30, role: null },
      { title: "Emergent topic clusters", minutes: 15, role: null },
      { title: "Light closing round", minutes: 5, role: null },
    ],
  },
  EMOTIONAL_CHECKIN: {
    label: "Pulse Circle",
    subtitle: "Emotional Check-In",
    icon: "Heart",
    description: "Surface tensions before they become structural.",
    bestFor: "High-growth phases, conflict periods, collective transitions.",
    defaultDuration: 60,
    defaultXp: 5,
    facilitatorBonus: 5,
    governanceImpact: "indirect",
    defaultProgram: [
      { title: "Silence arrival", minutes: 2, role: null },
      { title: "1-word emotional state", minutes: 5, role: null },
      { title: "Structured round (3 min/person)", minutes: 40, role: "facilitator" },
      { title: "Reflection synthesis", minutes: 8, role: "facilitator" },
      { title: "Closing breath", minutes: 5, role: null },
    ],
  },
  GUILD_ASSEMBLY: {
    label: "Open Council",
    subtitle: "Guild Assembly",
    icon: "Landmark",
    description: "Collective governance and decision-making.",
    bestFor: "Monthly or quarterly governance cycles.",
    defaultDuration: 105,
    defaultXp: 10,
    facilitatorBonus: 10,
    governanceImpact: "high",
    defaultProgram: [
      { title: "Metrics review", minutes: 15, role: "admin" },
      { title: "Quest updates", minutes: 20, role: null },
      { title: "Proposal presentations", minutes: 25, role: null },
      { title: "Decision block", minutes: 25, role: "admin" },
      { title: "Assignment of responsibilities", minutes: 15, role: "admin" },
      { title: "Closing alignment", minutes: 5, role: null },
    ],
  },
  MASTERMIND: {
    label: "Strategic Deep Dive",
    subtitle: "Mastermind Session",
    icon: "Brain",
    description: "Support a member or project through collective intelligence.",
    bestFor: "Entrepreneurs, territory leads, complex dilemmas.",
    defaultDuration: 90,
    defaultXp: 8,
    facilitatorBonus: 8,
    governanceImpact: "medium",
    defaultProgram: [
      { title: "Presenter framing", minutes: 10, role: "presenter" },
      { title: "Clarifying questions", minutes: 15, role: null },
      { title: "Silent reflection", minutes: 5, role: null },
      { title: "Feedback round", minutes: 30, role: null },
      { title: "Integration plan", minutes: 15, role: "presenter" },
      { title: "Closing reflection", minutes: 5, role: null },
    ],
  },
  LEARNING_LAB: {
    label: "Skill Transmission",
    subtitle: "Learning Lab",
    icon: "GraduationCap",
    description: "Collective upskilling.",
    bestFor: "Topic-based guilds, technical cohorts, governance training.",
    defaultDuration: 75,
    defaultXp: 7,
    facilitatorBonus: 12,
    governanceImpact: "low",
    defaultProgram: [
      { title: "Input presentation", minutes: 30, role: "teacher" },
      { title: "Application breakout", minutes: 20, role: null },
      { title: "Collective reflection", minutes: 15, role: null },
      { title: "Next-step commitments", minutes: 10, role: null },
    ],
  },
  SPRINT_ALIGNMENT: {
    label: "Mission Sync",
    subtitle: "Sprint Alignment",
    icon: "Zap",
    description: "Short-term operational alignment.",
    bestFor: "Active projects, campaign phases.",
    defaultDuration: 50,
    defaultXp: 4,
    facilitatorBonus: 3,
    governanceImpact: "operational",
    defaultProgram: [
      { title: "Objective reminder", minutes: 5, role: "admin" },
      { title: "Quick updates (2 min/person)", minutes: 25, role: null },
      { title: "Blockers surfaced", minutes: 10, role: null },
      { title: "Next week commitments", minutes: 10, role: null },
    ],
  },
  CONFLICT_RESOLUTION: {
    label: "Restorative Circle",
    subtitle: "Conflict Resolution",
    icon: "Scale",
    description: "Repair relational rupture.",
    bestFor: "Interpersonal or strategic tensions.",
    defaultDuration: 75,
    defaultXp: 0,
    facilitatorBonus: 10,
    governanceImpact: "restorative",
    defaultProgram: [
      { title: "Mediator introduction", minutes: 5, role: "facilitator" },
      { title: "Structured speaking turns", minutes: 30, role: "facilitator" },
      { title: "Acknowledgment phase", minutes: 15, role: null },
      { title: "Commitment phase", minutes: 15, role: null },
      { title: "Follow-up date", minutes: 10, role: "facilitator" },
    ],
  },
  VISIONARY_SESSION: {
    label: "Future Imagination",
    subtitle: "Visionary Session",
    icon: "Telescope",
    description: "Strategic long-term orientation.",
    bestFor: "Territory guilds, regenerative ecosystems.",
    defaultDuration: 90,
    defaultXp: 8,
    facilitatorBonus: 8,
    governanceImpact: "strategic",
    defaultProgram: [
      { title: "Future scenario framing", minutes: 15, role: "facilitator" },
      { title: "Silent writing", minutes: 15, role: null },
      { title: "Collective synthesis", minutes: 30, role: null },
      { title: "Roadmap extraction", minutes: 25, role: "admin" },
      { title: "Closing alignment", minutes: 5, role: null },
    ],
  },
  CROSS_GUILD_FEDERATION: {
    label: "Bridge Assembly",
    subtitle: "Cross-Guild Federation",
    icon: "Network",
    description: "Align multiple guilds.",
    bestFor: "Territorial scaling, multi-guild coordination.",
    defaultDuration: 90,
    defaultXp: 12,
    facilitatorBonus: 10,
    governanceImpact: "high",
    defaultProgram: [
      { title: "Shared metrics", minutes: 15, role: "admin" },
      { title: "Cross-quest mapping", minutes: 20, role: null },
      { title: "Federation decisions", minutes: 30, role: null },
      { title: "Resource pooling discussion", minutes: 20, role: null },
      { title: "Closing", minutes: 5, role: null },
    ],
  },
  CELEBRATION: {
    label: "Harvest Gathering",
    subtitle: "Celebration Ritual",
    icon: "PartyPopper",
    description: "Mark milestones.",
    bestFor: "End of cycle, major delivery, funding success.",
    defaultDuration: 60,
    defaultXp: 5,
    facilitatorBonus: 3,
    governanceImpact: "cultural",
    defaultProgram: [
      { title: "Storytelling", minutes: 15, role: null },
      { title: "Acknowledgments", minutes: 15, role: "admin" },
      { title: "Highlight quests", minutes: 15, role: null },
      { title: "Gratitude round", minutes: 15, role: null },
    ],
  },
} as const;

export type RitualSessionTypeKey = keyof typeof RITUAL_SESSION_TYPES;

export const RITUAL_FREQUENCIES = {
  WEEKLY: { label: "Weekly", description: "Every week" },
  BIWEEKLY: { label: "Biweekly", description: "Every two weeks" },
  MONTHLY: { label: "Monthly", description: "Once a month" },
  QUARTERLY: { label: "Quarterly", description: "Every three months" },
  CUSTOM: { label: "Custom", description: "Custom recurrence" },
} as const;

export const RITUAL_ACCESS_TYPES = {
  PUBLIC: { label: "Public", description: "Visible and joinable by anyone" },
  MEMBERS: { label: "Guild Members", description: "Only guild members" },
  ROLES: { label: "Specific Roles", description: "Members with specific roles" },
  XP_THRESHOLD: { label: "XP Threshold", description: "Minimum XP level required" },
  SHARE_CLASS: { label: "Shareholding Class", description: "Specific share class required" },
  INVITE_ONLY: { label: "Invitation Only", description: "By invitation only" },
} as const;

export const GOVERNANCE_IMPACT_COLORS: Record<string, string> = {
  low: "text-emerald-600 bg-emerald-500/10",
  indirect: "text-sky-600 bg-sky-500/10",
  medium: "text-amber-600 bg-amber-500/10",
  high: "text-red-600 bg-red-500/10",
  operational: "text-blue-600 bg-blue-500/10",
  restorative: "text-purple-600 bg-purple-500/10",
  strategic: "text-indigo-600 bg-indigo-500/10",
  cultural: "text-pink-600 bg-pink-500/10",
};

export interface ProgramSegment {
  title: string;
  minutes: number;
  role: string | null;
  notes?: string;
  aiPrompt?: string;
}
