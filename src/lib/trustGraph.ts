import { TrustNodeType } from "@/types/enums";
import { supabase } from "@/integrations/supabase/client";

// ─── XP Specialization categories ───────────────────────────
const SPEC_MAP: Record<string, string> = {
  governance: "stewardship", stewardship: "stewardship", facilitation: "stewardship",
  agroecology: "maker", construction: "maker", heritage: "maker", crafts: "maker",
  fundraising: "resource_catalyst", financial: "resource_catalyst",
  community: "community", hospitality: "community", mediation: "community",
  digital: "tech_commons", data: "tech_commons", ai: "tech_commons", product: "tech_commons",
};

export type XpSpecialization = "stewardship" | "maker" | "resource_catalyst" | "community" | "tech_commons";

export function classifyTagSpecialization(tag: string): XpSpecialization | null {
  return (SPEC_MAP[tag.toLowerCase()] as XpSpecialization) ?? null;
}

// ─── Types ──────────────────────────────────────────────────
export interface TrustScores {
  trustScoreGlobal: number;
  trustScoreByTag: Record<string, number>;
  trustScoreByTerritory: Record<string, number>;
}

interface RawEdge {
  score: number;
  tags: string[] | null;
  last_confirmed_at: string | null;
  context_territory_id: string | null;
}

// ─── Weight calculation ─────────────────────────────────────
const MONTHS_24_MS = 24 * 30 * 24 * 60 * 60 * 1000;

function computeWeight(edge: RawEdge): number {
  const base = 1 + edge.score * 0.2;

  // Freshness decay: if last_confirmed_at > 24 months ago → ×0.8
  if (edge.last_confirmed_at) {
    const age = Date.now() - new Date(edge.last_confirmed_at).getTime();
    if (age > MONTHS_24_MS) return base * 0.8;
  }

  return base;
}

// ─── Main helper ────────────────────────────────────────────
export async function recomputeTrustScores(
  nodeType: TrustNodeType,
  nodeId: string
): Promise<TrustScores> {
  // Fetch all active incoming edges for this node
  const { data, error } = await supabase
    .from("trust_edges")
    .select("score, tags, last_confirmed_at, context_territory_id")
    .eq("to_node_type", nodeType)
    .eq("to_node_id", nodeId)
    .eq("status", "active");

  if (error) throw error;

  const edges: RawEdge[] = (data ?? []) as RawEdge[];

  let trustScoreGlobal = 0;
  const trustScoreByTag: Record<string, number> = {};
  const trustScoreByTerritory: Record<string, number> = {};

  for (const edge of edges) {
    const w = computeWeight(edge);
    trustScoreGlobal += w;

    // Per-tag
    if (edge.tags) {
      for (const tag of edge.tags) {
        trustScoreByTag[tag] = (trustScoreByTag[tag] ?? 0) + w;
      }
    }

    // Per-territory
    if (edge.context_territory_id) {
      const tid = edge.context_territory_id;
      trustScoreByTerritory[tid] = (trustScoreByTerritory[tid] ?? 0) + w;
    }
  }

  return {
    trustScoreGlobal: Math.round(trustScoreGlobal * 100) / 100,
    trustScoreByTag: roundRecord(trustScoreByTag),
    trustScoreByTerritory: roundRecord(trustScoreByTerritory),
  };
}

function roundRecord(rec: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(rec)) {
    out[k] = Math.round(v * 100) / 100;
  }
  return out;
}

// ─── Pre-validation helpers ─────────────────────────────────

export interface TrustEdgePreCheck {
  canCreate: boolean;
  publicThisWeek: number;
  hasPairCooldown: boolean;
  isReciprocalRecent: boolean;
  warnings: string[];
}

export async function preCheckTrustEdge(
  creatorId: string,
  fromNodeType: string,
  fromNodeId: string,
  toNodeType: string,
  toNodeId: string,
  edgeType: string,
  visibility: string
): Promise<TrustEdgePreCheck> {
  const warnings: string[] = [];
  let canCreate = true;

  // 1. Public weekly limit
  let publicThisWeek = 0;
  if (visibility === "public") {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from("trust_edges")
      .select("id", { count: "exact", head: true })
      .eq("created_by", creatorId)
      .eq("visibility", "public")
      .gte("created_at", weekStart.toISOString());

    publicThisWeek = count ?? 0;
    if (publicThisWeek >= 3) {
      warnings.push("You've reached your limit of 3 public attestations this week. Switch to network or private visibility, or wait until next week.");
      canCreate = false;
    }
  }

  // 2. Pair cooldown (6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { count: pairCount } = await supabase
    .from("trust_edges")
    .select("id", { count: "exact", head: true })
    .eq("from_node_type", fromNodeType)
    .eq("from_node_id", fromNodeId)
    .eq("to_node_type", toNodeType)
    .eq("to_node_id", toNodeId)
    .eq("edge_type", edgeType)
    .eq("status", "active")
    .gte("created_at", sixMonthsAgo.toISOString());

  const hasPairCooldown = (pairCount ?? 0) > 0;
  if (hasPairCooldown) {
    warnings.push("You already have an active attestation of this type for this entity from the last 6 months.");
    canCreate = false;
  }

  // 3. Reciprocal within 48h
  let isReciprocalRecent = false;
  if (fromNodeType === "profile" && toNodeType === "profile") {
    const twoDaysAgo = new Date();
    twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);

    const { count: recipCount } = await supabase
      .from("trust_edges")
      .select("id", { count: "exact", head: true })
      .eq("from_node_type", "profile")
      .eq("from_node_id", toNodeId)
      .eq("to_node_type", "profile")
      .eq("to_node_id", fromNodeId)
      .eq("status", "active")
      .gte("created_at", twoDaysAgo.toISOString());

    isReciprocalRecent = (recipCount ?? 0) > 0;
    if (isReciprocalRecent) {
      warnings.push("This person attested trust in you within the last 48 hours. XP rewards will be halved unless you provide an evidence URL.");
    }
  }

  return { canCreate, publicThisWeek, hasPairCooldown, isReciprocalRecent, warnings };
}

// ─── Error parser for DB constraint exceptions ──────────────
export function parseTrustEdgeError(errorMessage: string): string {
  if (errorMessage.includes("TRUST_LIMIT_PUBLIC_WEEKLY:")) {
    return errorMessage.split("TRUST_LIMIT_PUBLIC_WEEKLY:")[1];
  }
  if (errorMessage.includes("TRUST_LIMIT_PAIR_COOLDOWN:")) {
    return errorMessage.split("TRUST_LIMIT_PAIR_COOLDOWN:")[1];
  }
  if (errorMessage.includes("Score must be between")) {
    return "Score must be between 1 and 5.";
  }
  if (errorMessage.includes("Note must be 300")) {
    return "Note must be 300 characters or fewer.";
  }
  return "Failed to create trust attestation. Please try again.";
}
