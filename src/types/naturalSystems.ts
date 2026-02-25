/**
 * Natural Systems – TypeScript types
 * These mirror the DB schema created via migration.
 */

export type NaturalSystemType =
  | "river"
  | "wetland"
  | "forest"
  | "soil_system"
  | "pollinator_network"
  | "species_guild"
  | "other";

export type EcoCategory =
  | "observation"
  | "restoration"
  | "governance"
  | "knowledge"
  | "none";

export interface NaturalSystem {
  id: string;
  name: string;
  type: NaturalSystemType;
  territory_id: string;
  description: string | null;
  geo_shape: Record<string, unknown> | null;
  health_index: number;
  resilience_index: number;
  seasonal_cycle: Record<string, unknown> | null;
  stress_signals: Record<string, unknown> | null;
  regenerative_potential: number;
  created_by_user_id: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface TerritoryNaturalSystemsSummary {
  territory_id: string;
  total_systems: number;
  avg_health_index: number;
  avg_resilience_index: number;
  avg_regenerative_potential: number;
  river_count: number;
  wetland_count: number;
  forest_count: number;
  soil_system_count: number;
  pollinator_network_count: number;
  species_guild_count: number;
  other_count: number;
  linked_quests_count: number;
}

export interface OpenTrustEdge {
  id: string;
  from_type: string;
  from_id: string;
  to_type: string;
  to_id: string;
  edge_type: string;
  weight: number;
  evidence_count: number;
  last_updated_at: string;
  status: string;
  visibility: string;
  tags: string[] | null;
  context_territory_id: string | null;
  context_guild_id: string | null;
  context_quest_id: string | null;
}
