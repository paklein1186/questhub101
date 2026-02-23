import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type TrustNodeType = Database["public"]["Enums"]["trust_node_type"];

export interface TrustSummary {
  trustScoreGlobal: number;
  topTags: string[];
  publicAttestationCount: number;
  freshPercent: number;
}

const MONTHS_24_MS = 24 * 30 * 24 * 60 * 60 * 1000;

function computeSummary(edges: { score: number; tags: string[] | null; last_confirmed_at: string | null }[]): TrustSummary {
  let score = 0;
  let freshCount = 0;
  const tagCounts: Record<string, number> = {};

  for (const e of edges) {
    const base = 1 + e.score * 0.2;
    const isStale = e.last_confirmed_at && (Date.now() - new Date(e.last_confirmed_at).getTime() > MONTHS_24_MS);
    score += isStale ? base * 0.8 : base;
    if (!isStale) freshCount++;
    for (const tag of e.tags ?? []) {
      if (tag.startsWith("__")) continue;
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    }
  }

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag);

  return {
    trustScoreGlobal: Math.round(score * 10) / 10,
    topTags,
    publicAttestationCount: edges.length,
    freshPercent: edges.length > 0 ? Math.round((freshCount / edges.length) * 100) : 0,
  };
}

export function useTrustSummary(nodeType: TrustNodeType, nodeId: string | undefined) {
  return useQuery({
    queryKey: ["trust-summary", nodeType, nodeId],
    enabled: !!nodeId,
    staleTime: 60_000,
    queryFn: async (): Promise<TrustSummary> => {
      const { data } = await supabase
        .from("trust_edges")
        .select("score, tags, last_confirmed_at")
        .eq("to_node_type", nodeType)
        .eq("to_node_id", nodeId!)
        .eq("status", "active")
        .eq("visibility", "public");
      return computeSummary((data ?? []) as any[]);
    },
  });
}

/** Batch fetch trust summaries for multiple nodes of the same type */
export function useTrustSummaryBatch(nodeType: TrustNodeType, nodeIds: string[]) {
  return useQuery({
    queryKey: ["trust-summary-batch", nodeType, nodeIds.sort().join(",")],
    enabled: nodeIds.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<Record<string, TrustSummary>> => {
      const { data } = await supabase
        .from("trust_edges")
        .select("to_node_id, score, tags, last_confirmed_at")
        .eq("to_node_type", nodeType)
        .eq("status", "active")
        .eq("visibility", "public")
        .in("to_node_id", nodeIds);

      const grouped: Record<string, any[]> = {};
      for (const row of (data ?? []) as any[]) {
        if (!grouped[row.to_node_id]) grouped[row.to_node_id] = [];
        grouped[row.to_node_id].push(row);
      }

      const result: Record<string, TrustSummary> = {};
      for (const id of nodeIds) {
        result[id] = computeSummary(grouped[id] ?? []);
      }
      return result;
    },
  });
}
