import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GraphNode {
  id: string;
  type: string;
  name: string;
  avatarUrl?: string;
  slug: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  sourceType: string;
  targetType: string;
  relationType: string;
  weight: number;
  visibility: string;
}

export interface GraphData {
  center: GraphNode;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function useGraphData(centerType: string, centerId: string) {
  return useQuery<GraphData>({
    queryKey: ["graph", centerType, centerId],
    enabled: !!centerId,
    queryFn: async () => {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "anzeimppqytonfxrnqxp";
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const session = (await supabase.auth.getSession()).data.session;

      const url = `https://${projectId}.supabase.co/functions/v1/graph?centerType=${encodeURIComponent(centerType)}&centerId=${encodeURIComponent(centerId)}`;
      const res = await fetch(url, {
        headers: {
          apikey: anonKey,
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch graph data");
      }

      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}
