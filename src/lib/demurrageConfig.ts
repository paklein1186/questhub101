// ─── Demurrage (Credit Fade) Configuration ──────────────────
// Monthly demurrage rate applied to wallet balances

/** Monthly fade rate for BOTH Platform Credits and $CTG tokens (1% = 0.01) */
export const DEMURRAGE_RATE = 0.01;

/** Monthly fade rate as a percentage string */
export const DEMURRAGE_RATE_PERCENT = "1%";

/** Treasury system key in cooperative_settings */
export const TREASURY_SETTINGS_KEY = "treasury_balance";

/** Estimate next demurrage for a given balance */
export function estimateFade(balance: number): number {
  if (balance <= 0) return 0;
  return Math.max(1, Math.floor(balance * DEMURRAGE_RATE));
}

/** Simulate balance decay over N months */
export function simulateDecay(balance: number, months: number): number[] {
  const results: number[] = [balance];
  let current = balance;
  for (let i = 0; i < months; i++) {
    const fade = Math.max(1, Math.floor(current * DEMURRAGE_RATE));
    current = Math.max(0, current - fade);
    results.push(current);
  }
  return results;
}

// ─── Credit Transaction Types (extended) ────────────────────
export const DEMURRAGE_TX_TYPES = {
  DEMURRAGE_FADE: "DEMURRAGE_FADE",
  TREASURY_DEMURRAGE_RECEIVED: "TREASURY_DEMURRAGE_RECEIVED",
} as const;

// ─── Economy Layer Labels ───────────────────────────────────
export const ECONOMY_LAYERS = [
  {
    key: "fiat",
    label: "Fiat Currency (€)",
    purpose: "Real economic exchange",
    icon: "Banknote",
    convertible: true,
    description:
      "Your real-world earnings from paid missions and services. Processed via Stripe Connect. Coins are withdrawable to fiat at the current platform rate.",
  },
  {
    key: "coins",
    label: "🟩 Coins — Fiat-Backed Mission Value",
    purpose: "Quest funding, compensation, OCU distribution",
    icon: "Leaf",
    convertible: true,
    description:
      "Internal units backed 1:1 by real fiat (€). Used to fund quests, pay contributors, and run OCU pie distributions. Pre-funded by quest creators or raised through campaigns. No demurrage — Coins hold their value. Withdrawable to fiat via Stripe Connect.",
  },
  {
    key: "ctg",
    label: "🌱 $CTG — Contribution Token",
    purpose: "Commons value, quest incentive",
    icon: "Sprout",
    convertible: false,
    description:
      "Emitted when you produce verified work for the commons. Not fiat-backed, not purchasable. Fades at 1%/month to encourage active circulation — except when held in quest escrow, where demurrage is frozen until distribution. Once distributed to your wallet, normal demurrage resumes. Transferable P2P. Can also be pre-funded into quests as an additional incentive layer alongside Coins.",
  },
  {
    key: "credits",
    label: "🔷 Platform Credits",
    purpose: "Feature fuel & gamification only",
    icon: "Coins",
    convertible: false,
    description:
      "Non-monetary platform utility. Powers quotas, boosts, and gamification actions. Cannot be withdrawn, exchanged for Coins, or used for quest compensation in any form. Gently fades at 1%/month to encourage use. Obtained via subscription plans, onboarding bonuses, or top-up purchases.",
  },
  {
    key: "xp",
    label: "⭐ XP — Reputation",
    purpose: "Permanent contribution level",
    icon: "Star",
    convertible: false,
    description:
      "Reflects your cumulative impact and participation. Never decays, cannot be purchased or transferred. Unlocks governance rights and stewardship eligibility. XP is never clawed back — even on contributor exit.",
  },
  {
    key: "shares",
    label: "Shares",
    purpose: "Stewardship participation",
    icon: "Compass",
    convertible: false,
    description:
      "Long-term commitment to the platform mission. Provide governance weight and dividend eligibility. Not tradeable within the platform.",
  },
] as const;

export type EconomyLayerKey = (typeof ECONOMY_LAYERS)[number]["key"];
