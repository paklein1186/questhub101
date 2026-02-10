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
  // Admin
  ADJUSTMENT: "ADJUSTMENT",
} as const;

export type XpEventType = (typeof XP_EVENT_TYPES)[keyof typeof XP_EVENT_TYPES];

export const XP_REWARDS: Record<string, number> = {
  // Quests
  [XP_EVENT_TYPES.QUEST_CREATED]: 5,
  [XP_EVENT_TYPES.QUEST_PUBLISHED]: 10,
  [XP_EVENT_TYPES.QUEST_COMPLETED_USER]: 30,
  [XP_EVENT_TYPES.QUEST_COMPLETED_CREATOR]: 40,
  // Pods
  [XP_EVENT_TYPES.POD_HOSTED]: 20,
  [XP_EVENT_TYPES.POD_PARTICIPATED]: 10,
  // Services
  [XP_EVENT_TYPES.SERVICE_DELIVERED]: 15,
  [XP_EVENT_TYPES.SERVICE_RATED_5]: 5,
  // Courses
  [XP_EVENT_TYPES.COURSE_COMPLETED_LEARNER]: 10,
  [XP_EVENT_TYPES.COURSE_TEACHER_COMPLETED]: 25,
  // Social
  [XP_EVENT_TYPES.ENDORSEMENT_RECEIVED]: 3,
  [XP_EVENT_TYPES.COMMENT_UPVOTED]: 1,
  // Stewardship
  [XP_EVENT_TYPES.STEWARDSHIP_HOUSE_MONTH]: 25,
  [XP_EVENT_TYPES.STEWARDSHIP_TERRITORY_MONTH]: 15,
  [XP_EVENT_TYPES.MODERATION_RESOLVED]: 10,
  // Legacy
  [XP_EVENT_TYPES.QUEST_UPDATE_CREATED]: 5,
  [XP_EVENT_TYPES.ACHIEVEMENT_RECEIVED]: 20,
  [XP_EVENT_TYPES.BOOKING_COMPLETED_PAID]: 15,
  [XP_EVENT_TYPES.BOOKING_COMPLETED_FREE]: 10,
  [XP_EVENT_TYPES.BOOKING_ATTENDED]: 2,
  [XP_EVENT_TYPES.REFERRAL_REWARD]: 50,
  // Proposals
  [XP_EVENT_TYPES.PROPOSAL_SUBMITTED]: 3,
  [XP_EVENT_TYPES.PROPOSAL_ACCEPTED]: 20,
};

/** Daily cap for COMMENT_UPVOTED XP (max XP from this type per user per day) */
export const COMMENT_UPVOTE_DAILY_XP_CAP = 10;

// ─── XP Level Thresholds ────────────────────────────────────
export const XP_LEVEL_THRESHOLDS = [
  { level: 1, minXp: 0 },
  { level: 2, minXp: 50 },
  { level: 3, minXp: 150 },
  { level: 4, minXp: 500 },
  { level: 5, minXp: 1500 },
];

export function computeLevelFromXp(xpTotal: number): number {
  let level = 1;
  for (const t of XP_LEVEL_THRESHOLDS) {
    if (xpTotal >= t.minXp) level = t.level;
  }
  return level;
}

// ─── Credit Transaction Types ───────────────────────────────
export const CREDIT_TX_TYPES = {
  EARNED_ACTION: "EARNED_ACTION",
  PURCHASED: "PURCHASED",
  SPENT_FEATURE: "SPENT_FEATURE",
  ADJUSTMENT: "ADJUSTMENT",
  GIFT_RECEIVED: "GIFT_RECEIVED",
  GIFT_SENT: "GIFT_SENT",
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
  EXTRA_QUEST_CREATION: 5,
  EXTRA_POD_CREATION: 8,
  BOOST_QUEST_7D: 10,
  BOOST_GUILD_EXPLORE: 12,
  BOOST_COURSE: 8,
  BOOST_SERVICE: 5,
} as const;

// ─── Credit Bundles (purchasable via Stripe) ────────────────
export const CREDIT_BUNDLES = [
  { code: "BUNDLE_50", credits: 50, priceEur: 9, label: "Starter" },
  { code: "BUNDLE_120", credits: 120, priceEur: 19, label: "Growth" },
  { code: "BUNDLE_350", credits: 350, priceEur: 49, label: "Pro" },
  { code: "BUNDLE_800", credits: 800, priceEur: 99, label: "Enterprise" },
] as const;

export type CreditBundleCode = (typeof CREDIT_BUNDLES)[number]["code"];
