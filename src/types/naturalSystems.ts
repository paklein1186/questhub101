/**
 * Natural Systems – TypeScript types
 * These mirror the DB schema created via migration.
 */

export type NaturalSystemKingdom =
  | "plants"
  | "animals"
  | "fungi_lichens"
  | "microorganisms"
  | "multi_species_guild";

export type NaturalSystemTypeV2 =
  | "river_watershed"
  | "wetland_peatland"
  | "forest_woodland"
  | "soil_system_agroecosystem"
  | "grassland_meadow"
  | "urban_ecosystem"
  | "mountain_slope"
  | "coastline_estuary"
  | "aquifer_spring"
  | "climate_cell"
  | "other";

/** Legacy enum kept for backward compat */
export type NaturalSystemType =
  | "river"
  | "wetland"
  | "forest"
  | "soil_system"
  | "pollinator_network"
  | "species_guild"
  | "other";

export type NsLinkType = "user" | "entity" | "territory" | "quest";
export type NsLinkVia = "quest" | "manual";

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
  kingdom: NaturalSystemKingdom;
  system_type: NaturalSystemTypeV2;
  territory_id: string | null;
  description: string | null;
  location_text: string | null;
  picture_url: string | null;
  source_url: string | null;
  tags: string[];
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

/** Row returned by get_linked_natural_systems RPC */
export interface LinkedNaturalSystem {
  id: string;
  name: string;
  kingdom: NaturalSystemKingdom;
  system_type: NaturalSystemTypeV2;
  territory_id: string | null;
  location_text: string | null;
  description: string | null;
  picture_url: string | null;
  source_url: string | null;
  tags: string[];
  health_index: number;
  resilience_index: number;
  regenerative_potential: number;
  linked_via: NsLinkVia;
  link_created_at: string;
  created_at: string;
  updated_at: string;
}

export interface NaturalSystemLink {
  id: string;
  natural_system_id: string;
  linked_type: NsLinkType;
  linked_id: string;
  linked_via: NsLinkVia;
  created_at: string;
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

/* ── Label helpers ── */

export const KINGDOM_LABELS: Record<NaturalSystemKingdom, string> = {
  plants: "Plants",
  animals: "Animals",
  fungi_lichens: "Fungi & Lichens",
  microorganisms: "Microorganisms",
  multi_species_guild: "Multi-species Guild",
};

export const SYSTEM_TYPE_LABELS: Record<NaturalSystemTypeV2, string> = {
  river_watershed: "River / Watershed",
  wetland_peatland: "Wetland / Peatland",
  forest_woodland: "Forest / Woodland",
  soil_system_agroecosystem: "Soil System / Agroecosystem",
  grassland_meadow: "Grassland / Meadow",
  urban_ecosystem: "Urban Ecosystem",
  mountain_slope: "Mountain / Slope",
  coastline_estuary: "Coastline / Estuary",
  aquifer_spring: "Aquifer / Spring",
  climate_cell: "Climate Cell",
  other: "Other",
};
