// ─── XP Event Types & Rewards ────────────────────────────────
// All XP amounts are centralized here for easy tuning.

export const XP_EVENT_TYPES = {
  // Quests
  QUEST_CREATED: "QUEST_CREATED",
  QUEST_PUBLISHED: "QUEST_PUBLISHED",
  QUEST_COMPLETED_USER: "QUEST_COMPLETED_USER",
  QUEST_COMPLETED_CREATOR: "QUEST_COMPLETED_CREATOR",
  // Pods
  POD_HOSTED: "POD_HOSTED",
  POD_PARTICIPATED: "POD_PARTICIPATED",
  // Services
  SERVICE_DELIVERED: "SERVICE_DELIVERED",
  SERVICE_RATED_5: "SERVICE_RATED_5",
  // Courses
  COURSE_COMPLETED_LEARNER: "COURSE_COMPLETED_LEARNER",
  COURSE_TEACHER_COMPLETED: "COURSE_TEACHER_COMPLETED",
  // Social
  ENDORSEMENT_RECEIVED: "ENDORSEMENT_RECEIVED",
  COMMENT_UPVOTED: "COMMENT_UPVOTED",
  // Stewardship
  STEWARDSHIP_HOUSE_MONTH: "STEWARDSHIP_HOUSE_MONTH",
  STEWARDSHIP_TERRITORY_MONTH: "STEWARDSHIP_TERRITORY_MONTH",
  MODERATION_RESOLVED: "MODERATION_RESOLVED",
  // Legacy (kept for backward compat)
  QUEST_UPDATE_CREATED: "QUEST_UPDATE_CREATED",
  ACHIEVEMENT_RECEIVED: "ACHIEVEMENT_RECEIVED",
  BOOKING_COMPLETED_PAID: "BOOKING_COMPLETED_PAID",
  BOOKING_COMPLETED_FREE: "BOOKING_COMPLETED_FREE",
  BOOKING_ATTENDED: "BOOKING_ATTENDED",
  REFERRAL_REWARD: "REFERRAL_REWARD",
  // Proposals
  PROPOSAL_SUBMITTED: "PROPOSAL_SUBMITTED",
  PROPOSAL_ACCEPTED: "PROPOSAL_ACCEPTED",
  // Territory Memory
  TERRITORY_MEMORY_CONTRIBUTED: "TERRITORY_MEMORY_CONTRIBUTED",
  TERRITORY_EXCERPT_UPVOTE_AUTHOR: "TERRITORY_EXCERPT_UPVOTE_AUTHOR",
  TERRITORY_EXCERPT_UPVOTE_CURATOR: "TERRITORY_EXCERPT_UPVOTE_CURATOR",
  TERRITORY_EXCERPT_CREATED: "TERRITORY_EXCERPT_CREATED",
  TERRITORY_CHAT_KNOWLEDGE: "TERRITORY_CHAT_KNOWLEDGE",
  // Rituals
  RITUAL_ATTENDED: "RITUAL_ATTENDED",
  RITUAL_FACILITATED: "RITUAL_FACILITATED",
  // Content creation
  POST_CREATED: "POST_CREATED",
  SERVICE_CREATED: "SERVICE_CREATED",
  COURSE_CREATED: "COURSE_CREATED",
  EVENT_CREATED: "EVENT_CREATED",
  // Joining units
  GUILD_JOINED: "GUILD_JOINED",
  COMPANY_JOINED: "COMPANY_JOINED",
  POD_JOINED: "POD_JOINED",
  // Enrollment / registration
  EVENT_REGISTERED: "EVENT_REGISTERED",
  COURSE_ENROLLED: "COURSE_ENROLLED",
  // Subtask / contribution
  SUBTASK_COMPLETED: "SUBTASK_COMPLETED",
  CONTRIBUTION_LOGGED: "CONTRIBUTION_LOGGED",
  // Governance & review
  GOVERNANCE_VOTE_CAST: "GOVERNANCE_VOTE_CAST",
  REVIEW_GIVEN: "REVIEW_GIVEN",
  DOCUMENTATION_WRITTEN: "DOCUMENTATION_WRITTEN",
  ECOLOGICAL_ANNOTATION: "ECOLOGICAL_ANNOTATION",
  // Admin
  ADJUSTMENT: "ADJUSTMENT",
} as const;

export type XpEventType = (typeof XP_EVENT_TYPES)[keyof typeof XP_EVENT_TYPES];

export const XP_REWARDS: Record<string, number> = {
  [XP_EVENT_TYPES.QUEST_CREATED]: 5,
  [XP_EVENT_TYPES.QUEST_PUBLISHED]: 5,
  [XP_EVENT_TYPES.QUEST_COMPLETED_USER]: 30,
  [XP_EVENT_TYPES.QUEST_COMPLETED_CREATOR]: 40,
  [XP_EVENT_TYPES.POD_HOSTED]: 20,
  [XP_EVENT_TYPES.POD_PARTICIPATED]: 10,
  [XP_EVENT_TYPES.SERVICE_DELIVERED]: 15,
  [XP_EVENT_TYPES.SERVICE_RATED_5]: 5,
  [XP_EVENT_TYPES.COURSE_COMPLETED_LEARNER]: 10,
  [XP_EVENT_TYPES.COURSE_TEACHER_COMPLETED]: 25,
  [XP_EVENT_TYPES.ENDORSEMENT_RECEIVED]: 3,
  [XP_EVENT_TYPES.COMMENT_UPVOTED]: 1,
  [XP_EVENT_TYPES.STEWARDSHIP_HOUSE_MONTH]: 25,
  [XP_EVENT_TYPES.STEWARDSHIP_TERRITORY_MONTH]: 15,
  [XP_EVENT_TYPES.MODERATION_RESOLVED]: 10,
  [XP_EVENT_TYPES.QUEST_UPDATE_CREATED]: 5,
  [XP_EVENT_TYPES.ACHIEVEMENT_RECEIVED]: 20,
  [XP_EVENT_TYPES.BOOKING_COMPLETED_PAID]: 15,
  [XP_EVENT_TYPES.BOOKING_COMPLETED_FREE]: 10,
  [XP_EVENT_TYPES.BOOKING_ATTENDED]: 2,
  [XP_EVENT_TYPES.REFERRAL_REWARD]: 50,
  [XP_EVENT_TYPES.PROPOSAL_SUBMITTED]: 3,
  [XP_EVENT_TYPES.PROPOSAL_ACCEPTED]: 20,
  [XP_EVENT_TYPES.TERRITORY_MEMORY_CONTRIBUTED]: 3,
  [XP_EVENT_TYPES.TERRITORY_EXCERPT_UPVOTE_AUTHOR]: 5,
  [XP_EVENT_TYPES.TERRITORY_EXCERPT_UPVOTE_CURATOR]: 1,
  [XP_EVENT_TYPES.TERRITORY_EXCERPT_CREATED]: 3,
  [XP_EVENT_TYPES.TERRITORY_CHAT_KNOWLEDGE]: 10,
  [XP_EVENT_TYPES.RITUAL_ATTENDED]: 5,
  [XP_EVENT_TYPES.RITUAL_FACILITATED]: 15,
  // Content creation
  [XP_EVENT_TYPES.POST_CREATED]: 2,
  [XP_EVENT_TYPES.SERVICE_CREATED]: 5,
  [XP_EVENT_TYPES.COURSE_CREATED]: 8,
  [XP_EVENT_TYPES.EVENT_CREATED]: 5,
  // Joining units
  [XP_EVENT_TYPES.GUILD_JOINED]: 2,
  [XP_EVENT_TYPES.COMPANY_JOINED]: 2,
  [XP_EVENT_TYPES.POD_JOINED]: 2,
  // Enrollment / registration
  [XP_EVENT_TYPES.EVENT_REGISTERED]: 1,
  [XP_EVENT_TYPES.COURSE_ENROLLED]: 2,
  // Subtask / contribution
  [XP_EVENT_TYPES.SUBTASK_COMPLETED]: 5,
  [XP_EVENT_TYPES.CONTRIBUTION_LOGGED]: 2,
  // Governance & review
  [XP_EVENT_TYPES.GOVERNANCE_VOTE_CAST]: 3,
  [XP_EVENT_TYPES.REVIEW_GIVEN]: 3,
  [XP_EVENT_TYPES.DOCUMENTATION_WRITTEN]: 5,
  [XP_EVENT_TYPES.ECOLOGICAL_ANNOTATION]: 3,
};

/** Daily cap for COMMENT_UPVOTED XP (max XP from this type per user per day) */
export const COMMENT_UPVOTE_DAILY_XP_CAP = 10;

// ─── XP Level Thresholds (Regenerative Collaboration Ladder) ─
export const XP_LEVEL_THRESHOLDS = [
  { level: 1,  minXp: 0 },
  { level: 2,  minXp: 25 },
  { level: 3,  minXp: 75 },
  { level: 4,  minXp: 150 },
  { level: 5,  minXp: 250 },
  { level: 6,  minXp: 400 },
  { level: 7,  minXp: 600 },
  { level: 8,  minXp: 900 },
  { level: 9,  minXp: 1_300 },
  { level: 10, minXp: 2_000 },
  { level: 11, minXp: 3_000 },
  { level: 12, minXp: 4_500 },
  { level: 13, minXp: 6_500 },
  { level: 14, minXp: 9_000 },
  { level: 15, minXp: 12_000 },
];

export const LEVEL_LABELS: Record<number, string> = {
  1: "Spore",
  2: "Seed",
  3: "Seedling",
  4: "Rooted",
  5: "Sprout",
  6: "Mycelium",
  7: "Pollinator",
  8: "Cultivator",
  9: "Harvester",
  10: "Catalyst",
  11: "Weaver",
  12: "Ecosystem Builder",
  13: "Keystone",
  14: "Steward",
  15: "Forest Guardian",
};

export const LEVEL_DESCRIPTIONS: Record<number, string> = {
  1: "Curious presence. Exploring the ecosystem.",
  2: "First interactions and contributions.",
  3: "Growing participation in quests or guilds.",
  4: "Engaged in at least one collaborative structure.",
  5: "Consistent contributor.",
  6: "Connects people and ideas.",
  7: "Enables cross-guild collaboration.",
  8: "Launches initiatives and supports growth.",
  9: "Delivers value regularly.",
  10: "Sparks multi-actor projects.",
  11: "Connects territories or ecosystems.",
  12: "Structures long-term initiatives.",
  13: "Stabilizes collaborative networks.",
  14: "Protects governance and commons.",
  15: "Embodies long-term systemic impact.",
};

export function computeLevelFromXp(xpTotal: number): number {
  let level = 1;
  for (const t of XP_LEVEL_THRESHOLDS) {
    if (xpTotal >= t.minXp) level = t.level;
  }
  return level;
}

// ─── Credit Transaction Types ───────────────────────────────
export const CREDIT_TX_TYPES = {
  INITIAL_GRANT: "INITIAL_GRANT",
  EARNED_ACTION: "EARNED_ACTION",
  PURCHASED: "PURCHASED",
  SPENT_FEATURE: "SPENT_FEATURE",
  QUEST_BUDGET_SPENT: "QUEST_BUDGET_SPENT",
  QUEST_REWARD_EARNED: "QUEST_REWARD_EARNED",
  TOP_UP_PURCHASE: "TOP_UP_PURCHASE",
  SUBSCRIPTION_MONTHLY_CREDIT: "SUBSCRIPTION_MONTHLY_CREDIT",
  ADJUSTMENT: "ADJUSTMENT",
  GIFT_RECEIVED: "GIFT_RECEIVED",
  GIFT_SENT: "GIFT_SENT",
  MONTHLY_INCLUDED: "MONTHLY_INCLUDED",
  DEMURRAGE_FADE: "DEMURRAGE_FADE",
  TREASURY_DEMURRAGE_RECEIVED: "TREASURY_DEMURRAGE_RECEIVED",
  QUEST_FUNDING_REFUND: "QUEST_FUNDING_REFUND",
  GUILD_MEMBERSHIP: "GUILD_MEMBERSHIP",
} as const;

export type CreditTxType = (typeof CREDIT_TX_TYPES)[keyof typeof CREDIT_TX_TYPES];

// ─── Credit Earning Rules ───────────────────────────────────
export const CREDIT_EARN_RULES: Record<string, number> = {
  QUEST_APPROVED: 5,
  MONTHLY_QUEST_STREAK: 5,
  STEWARDSHIP_DUTY: 10,
  COURSE_LONG_COMPLETED: 3,
  MODERATION_RESOLVED: 2,
};

// ─── Credit Spending Costs ──────────────────────────────────
export const CREDIT_COSTS = {
  EXTRA_QUEST_CREATION: 10,
  EXTRA_POD_CREATION: 5,
  BOOST_QUEST_VISIBILITY: 15,
  BOOST_SERVICE_VISIBILITY: 15,
  FEATURE_QUEST_7D: 40,
  BOOST_GUILD_EXPLORE: 12,
  BOOST_COURSE: 8,
  ENABLE_AI_PRO_SESSION: 5,
  REDUCE_COMMISSION_BY_1_PERCENT: 25,
} as const;

// ─── Platform Credit Bundles (purchasable via Stripe) ────────────────
export const CREDIT_BUNDLES = [
  { code: "STARTER_100", credits: 100, priceEur: 4, label: "Starter", stripePriceId: "price_1SzRJsBttrYxqJqzDOZdcEfR" },
  { code: "CREATOR_300", credits: 300, priceEur: 10, label: "Creator", stripePriceId: "price_1SzRJtBttrYxqJqz6Uwn7fN8" },
  { code: "CATALYST_1000", credits: 1000, priceEur: 25, label: "Catalyst", stripePriceId: "price_1SzRJuBttrYxqJqzUnFTnprq" },
] as const;

export type CreditBundleCode = (typeof CREDIT_BUNDLES)[number]["code"];

/** Conversion rate: 1 Coin = COIN_EUR_RATE euros on withdrawal.
 *  Set by the cooperative. Update here when rate changes. */
export const COIN_EUR_RATE = 0.04;

// ─── Plan Codes ─────────────────────────────────────────────
export const PLAN_CODES = {
  FREE: "FREE",
  PRO: "PRO",
  TERRITORY_BUILDER: "TERRITORY_BUILDER",
  // Legacy (hidden, kept for existing subscribers)
  STARTER: "STARTER",
  CREATOR: "CREATOR",
  CATALYST: "CATALYST",
  VISIONARY: "VISIONARY",
} as const;

export type PlanCode = (typeof PLAN_CODES)[keyof typeof PLAN_CODES];

export const PLAN_ORDER: PlanCode[] = ["FREE", "PRO", "TERRITORY_BUILDER"];

/** Legacy plan codes — hidden from new signups, kept for auto-migration */
export const LEGACY_PLAN_CODES = ["STARTER", "CREATOR", "CATALYST", "VISIONARY"] as const;

/** Map legacy plans → new tier for auto-migration at renewal */
export const PLAN_MIGRATION_MAP: Record<string, string> = {
  STARTER: "PRO",
  CREATOR: "PRO",
  CATALYST: "PRO",
  VISIONARY: "TERRITORY_BUILDER",
};

// ─── Share Classes ──────────────────────────────────────────
export const SHARE_CLASSES = {
  A: { label: "Guardian", description: "Core builders — strategic governance" },
  B: { label: "Steward", description: "Active contributors — community governance" },
  C: { label: "Strategic Partner", description: "Strategic partners — institutional alignment" },
} as const;

export type ShareClass = keyof typeof SHARE_CLASSES;

// ─── Ecosystem Treasury Allocation Model ────────────────────
export const TREASURY_ALLOCATION = {
  REINVESTMENT: { percent: 40, label: "Reinvestment Reserve" },
  SHAREHOLDERS: { percent: 30, label: "Shareholder Distribution" },
  ECOSYSTEM: { percent: 20, label: "Ecosystem Treasury" },
  SOLIDARITY: { percent: 10, label: "Solidarity & New Territories" },
} as const;

// ─── Cross-Territory XP Bonus ───────────────────────────────
/** Flat bonus when contributing outside primary territory */
export const CROSS_TERRITORY_XP_BONUS = 0.10; // +10%

// ─── Governance XP Tiers ────────────────────────────────────
export const GOVERNANCE_XP_TIERS = [
  { levels: "1–4", label: "Participate", minLevel: 1, description: "Explore the ecosystem, join guilds, attend events." },
  { levels: "5–8", label: "Comment & Vote", minLevel: 5, description: "Engage in governance discussions and cast votes on proposals." },
  { levels: "9–12", label: "Propose", minLevel: 9, description: "Submit governance proposals and lead initiatives." },
  { levels: "13–15", label: "Steward Council", minLevel: 13, description: "Eligible for steward council roles and strategic decisions." },
] as const;

// ─── Grace Period ───────────────────────────────────────────
/** Number of days new users can play without spending Platform Credits */
export const GRACE_PERIOD_DAYS = 30;

// ─── Steward Tiers ($CTG) ───────────────────────────────────
export const STEWARD_TIERS = [
  { key: "seedling",   label: "Seedling",   minLifetime: 0,    icon: "🌱", color: "#16A34A" },
  { key: "cultivator", label: "Cultivator", minLifetime: 100,  icon: "🌿", color: "#15803D" },
  { key: "steward",    label: "Steward",    minLifetime: 500,  icon: "🌳", color: "#166534" },
  { key: "guardian",   label: "Guardian",   minLifetime: 2000, icon: "🏔", color: "#14532D" },
] as const;

export type StewardTierKey = (typeof STEWARD_TIERS)[number]["key"];

export function getStewardTier(lifetimeEarned: number) {
  return [...STEWARD_TIERS].reverse().find(t => lifetimeEarned >= t.minLifetime) ?? STEWARD_TIERS[0];
}

export function getNextStewardTier(lifetimeEarned: number) {
  const current = getStewardTier(lifetimeEarned);
  const idx = STEWARD_TIERS.findIndex(t => t.key === current.key);
  return idx < STEWARD_TIERS.length - 1 ? STEWARD_TIERS[idx + 1] : null;
}

// ─── Dual Economy Constants ─────────────────────────────────
export const ECONOMY_LABELS = {
  moneyDisclaimer: "Mission budgets are funded in fiat (€) and converted to Coins. Platform Credits are never used for compensation.",
  creditsDisclaimer: "Platform Credits are non-monetary feature-fuel. They power gamification, quotas, and platform actions. They cannot be exchanged for money or used for quest payouts.",
  coinsDisclaimer: "Coins are fiat-backed mission units. Earned from funded quests and withdrawable to fiat via Stripe Connect.",
  upgradePrompt: "Unlock more space for your creative and impact work. Upgrade your plan or use Platform Credits.",
  demurrageNotice: "Inactive Platform Credits are gradually redistributed to the ecosystem treasury (1%/month).",
  creditsNature: "🔷 Platform Credits — Feature fuel for quotas, boosts, and gamification. Non-monetary.",
  coinsNature: "🟩 Coins — Fiat-backed mission value. Earned from quests, withdrawable to fiat.",
  xpNature: "⭐ XP — your reputation level. Cumulative & permanent. Reflects who you are becoming. Never decays, never purchased.",
  ctgNature: "🌱 $CTG — your contribution to the commons. Earned by producing verifiable work. Circulates with 1%/month demurrage. Not fiat-backed.",
  sharesNature: "Stewardship participation — long-term commitment to the platform's mission.",
} as const;
