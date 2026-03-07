// ─── Demurrage (Credit Fade) Configuration ──────────────────
// Monthly demurrage rate applied to wallet balances

/** Monthly fade rate as a decimal (1% = 0.01) */
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
      "Your earnings from paid missions and services. Processed via Stripe. Real-world income.",
  },
  {
    key: "credits",
    label: "🔷 Platform Credits",
    purpose: "Feature fuel & gamification",
    icon: "Coins",
    convertible: false,
    description:
      "Non-monetary platform utility credits for quotas, boosts, and gamification. Cannot be exchanged, withdrawn, or used for quest payouts. Gently fade by 1% per month to encourage circulation.",
  },
  {
    key: "coins",
    label: "🟩 Coins",
    purpose: "Fiat-backed mission value",
    icon: "Leaf",
    convertible: true,
    description:
      "Internal accounting units backed by real fiat. Earned from funded quests, used for redistribution and contributor payouts. Withdrawable to fiat via Stripe Connect.",
  },
  {
    key: "xp",
    label: "XP (Reputation)",
    purpose: "Contribution level",
    icon: "Star",
    convertible: false,
    description:
      "Reflects your impact and participation. Never decays, cannot be purchased. Unlocks governance rights and stewardship eligibility.",
  },
  {
    key: "shares",
    label: "Shares",
    purpose: "Stewardship participation",
    icon: "Compass",
    convertible: false,
    description:
      "Long-term commitment to the platform's mission. Provide governance weight and dividend eligibility. Cannot be traded within the platform.",
  },
] as const;

export type EconomyLayerKey = (typeof ECONOMY_LAYERS)[number]["key"];
