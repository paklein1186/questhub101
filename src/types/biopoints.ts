/**
 * Biopoints & Eco Quest Reward types
 */

export interface EcoRewardConfig {
  base_rewards: Record<string, { xp: number; credits: number; biopoints: number }>;
  sensitivity_range: [number, number];
  season_range: [number, number];
  collective_range: [number, number];
  collective_threshold: number;
  health_improvement_threshold: number;
  health_evaluation_months: number;
}

export interface BiopointsTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: string; // ECO_QUEST_REWARD | HEALTH_IMPROVEMENT_BONUS | ADMIN_GRANT
  source: string | null;
  natural_system_id: string | null;
  quest_id: string | null;
  created_at: string;
}

export interface BiopointsBudget {
  id: string;
  natural_system_id: string;
  allocated_by_user_id: string | null;
  territory_id: string | null;
  total_budget: number;
  remaining_budget: number;
  health_threshold: number;
  evaluation_months: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HealthSnapshot {
  id: string;
  natural_system_id: string;
  health_index: number;
  resilience_index: number;
  recorded_at: string;
}

/** Client-side reward calculator (for preview / UI display) */
export function calculateEcoQuestRewards(
  config: EcoRewardConfig,
  ecoCategory: string,
  regenerativePotential: number,
  seasonalCycle: { peak_months?: number[] } | null,
  participantCount: number
) {
  const base = config.base_rewards[ecoCategory];
  if (!base) return null;

  // Sensitivity multiplier
  const sensitivityMult = Math.max(0.8, Math.min(1.3, 0.8 + (regenerativePotential / 100) * 0.5));

  // Season multiplier
  const currentMonth = new Date().getMonth() + 1;
  let seasonMult = 1.0;
  if (seasonalCycle?.peak_months) {
    seasonMult = seasonalCycle.peak_months.includes(currentMonth) ? 1.2 : 0.9;
  }
  seasonMult = Math.max(0.8, Math.min(1.3, seasonMult));

  // Collective multiplier
  let collectiveMult = 1.0;
  if (participantCount > config.collective_threshold) {
    collectiveMult = Math.min(1.3, 1.0 + (participantCount - config.collective_threshold) * 0.05);
  }

  return {
    xp: Math.max(1, Math.round(base.xp * sensitivityMult * seasonMult * collectiveMult)),
    credits: Math.max(1, Math.round(base.credits * sensitivityMult * seasonMult)),
    biopoints: Math.max(1, Math.round(base.biopoints * sensitivityMult * seasonMult * collectiveMult)),
    multipliers: { sensitivityMult, seasonMult, collectiveMult },
  };
}
