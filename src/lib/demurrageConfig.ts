// ─── Demurrage (Credit Fade) Configuration ──────────────────
// Monthly demurrage rate applied to wallet balances

/** Monthly fade rate as a decimal (1.5% = 0.015) */
export const DEMURRAGE_RATE = 0.015;

/** Monthly fade rate as a percentage string */
export const DEMURRAGE_RATE_PERCENT = "1.5%";

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
    label: "Fiat Currency",
    purpose: "Real economic exchange",
    icon: "Banknote",
    convertible: true,
    description:
      "Used for buying services, paying missions, fundraising quests, and equity investment. Processed via regulated payment providers.",
  },
  {
    key: "credits",
    label: "Credits",
    purpose: "Internal coordination",
    icon: "Coins",
    convertible: false,
    description:
      "Non-convertible internal coordination units. Circulate between members, encourage active participation, and gradually redistribute if inactive.",
  },
  {
    key: "xp",
    label: "XP (Reputation)",
    purpose: "Reputation & governance",
    icon: "Star",
    convertible: false,
    description:
      "Non-transferable, earned via contribution. Used for governance rights, status, and visibility. Does not fade.",
  },
] as const;

export type EconomyLayerKey = (typeof ECONOMY_LAYERS)[number]["key"];
