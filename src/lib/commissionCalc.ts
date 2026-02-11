// ─── Commission Calculation Engine ──────────────────────────
// Implements degressive commission tiers, plan-based discounts,
// and optional credit-based reductions.

export const COMMISSION_FLOOR = 1; // Minimum commission % (never goes below)
export const CREDIT_COST_PER_1_PERCENT_REDUCTION = 25;
export const MAX_CREDIT_REDUCTION_RATIO = 0.5; // Can reduce by max 50% of remaining rate

export interface CommissionRule {
  id: string;
  min_amount: number;
  max_amount: number | null;
  commission_percentage: number;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface CommissionCalcInput {
  amount: number; // mission budget in euros
  rules: CommissionRule[];
  planDiscountPercent: number; // e.g. 20 for Creator, 40 for Catalyst
  creditReductionSteps?: number; // how many 1% reductions purchased with credits
}

export interface CommissionCalcResult {
  baseRate: number; // raw tier rate (e.g. 7)
  afterPlanDiscount: number; // rate after plan discount
  creditReduction: number; // actual % reduced via credits
  finalRate: number; // final commission %
  commissionAmount: number; // € commission
  payoutAmount: number; // € payout
  creditsSpent: number; // credits consumed
  appliedRule: CommissionRule | null;
}

/**
 * Find the matching commission tier for a given amount.
 */
export function findTier(amount: number, rules: CommissionRule[]): CommissionRule | null {
  const active = rules
    .filter((r) => r.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  for (const rule of active) {
    const matchesMin = amount >= rule.min_amount;
    const matchesMax = rule.max_amount === null || amount < rule.max_amount;
    if (matchesMin && matchesMax) return rule;
  }
  // Fallback to last tier if amount exceeds all
  return active.length > 0 ? active[active.length - 1] : null;
}

/**
 * Calculate commission with all reductions applied.
 */
export function calculateCommission(input: CommissionCalcInput): CommissionCalcResult {
  const { amount, rules, planDiscountPercent, creditReductionSteps = 0 } = input;

  const tier = findTier(amount, rules);
  const baseRate = tier?.commission_percentage ?? 10;

  // Apply plan discount: e.g. 7% * (1 - 0.20) = 5.6%
  const planMultiplier = 1 - (planDiscountPercent / 100);
  const afterPlanDiscount = Math.max(COMMISSION_FLOOR, baseRate * planMultiplier);

  // Calculate max credit reduction allowed (50% of remaining rate, but never below floor)
  const maxCreditReduction = Math.max(0, (afterPlanDiscount - COMMISSION_FLOOR) * MAX_CREDIT_REDUCTION_RATIO);
  const actualCreditReduction = Math.min(creditReductionSteps, Math.floor(maxCreditReduction));

  const finalRate = Math.max(COMMISSION_FLOOR, afterPlanDiscount - actualCreditReduction);
  const commissionAmount = Math.round((amount * finalRate) / 100 * 100) / 100;
  const payoutAmount = Math.round((amount - commissionAmount) * 100) / 100;

  return {
    baseRate,
    afterPlanDiscount: Math.round(afterPlanDiscount * 100) / 100,
    creditReduction: actualCreditReduction,
    finalRate: Math.round(finalRate * 100) / 100,
    commissionAmount,
    payoutAmount,
    creditsSpent: actualCreditReduction * CREDIT_COST_PER_1_PERCENT_REDUCTION,
    appliedRule: tier,
  };
}

/**
 * Calculate commission range for min/max budgets.
 */
export function calculateCommissionRange(
  budgetMin: number,
  budgetMax: number,
  rules: CommissionRule[],
  planDiscountPercent: number,
  creditReductionSteps = 0,
) {
  const resultMin = calculateCommission({ amount: budgetMin, rules, planDiscountPercent, creditReductionSteps });
  const resultMax = calculateCommission({ amount: budgetMax, rules, planDiscountPercent, creditReductionSteps });
  return { min: resultMin, max: resultMax };
}
