import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useXpCredits } from "@/hooks/useXpCredits";
import { XP_EVENT_TYPES } from "@/lib/xpCreditsConfig";

export const MEMORY_CATEGORIES = [
  { value: "ECONOMY", label: "Economy", icon: "💰" },
  { value: "EVENTS", label: "Events", icon: "📅" },
  { value: "HISTORY", label: "History", icon: "📜" },
  { value: "SOCIOLOGY", label: "Sociology", icon: "👥" },
  { value: "BUSINESS", label: "Business", icon: "🏢" },
  { value: "CULTURE", label: "Culture", icon: "🎭" },
  { value: "INFRASTRUCTURE", label: "Infrastructure", icon: "🏗️" },
  { value: "RISKS", label: "Risks", icon: "⚠️" },
  { value: "OPPORTUNITIES", label: "Opportunities", icon: "🌱" },
  { value: "RAW_NOTES", label: "Raw Notes", icon: "📝" },
] as const;

export type MemoryCategory = typeof MEMORY_CATEGORIES[number]["value"];
export type MemoryVisibility = "PUBLIC" | "ADMINS" | "AI_ONLY";

export interface TerritoryMemoryEntry {
  id: string;
  territory_id: string;
  title: string;
  content: string;
  category: MemoryCategory;
  visibility: MemoryVisibility;
  tags: string[];
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  is_included_in_summary: boolean;
  ai_score: number;
  human_score: number | null;
  used_in_last_summary_at: string | null;
}

export interface TerritorySummary {
  id: string;
  territory_id: string;
  summary_type: string;
  content: string;
  generated_at: string;
  generated_by: string;
  based_on_memory_ids: string[];
}

export function useTerritoryMemory(territoryId: string | undefined) {
  return useQuery({
    queryKey: ["territory-memory", territoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("territory_memory" as any)
        .select("*")
        .eq("territory_id", territoryId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TerritoryMemoryEntry[];
    },
    enabled: !!territoryId,
  });
}

export function useTerritorySummary(territoryId: string | undefined) {
  return useQuery({
    queryKey: ["territory-summary", territoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("territory_summaries" as any)
        .select("*")
        .eq("territory_id", territoryId!)
        .eq("summary_type", "OVERVIEW")
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as TerritorySummary | null;
    },
    enabled: !!territoryId,
  });
}

export function useTerritoryContributors(territoryId: string | undefined) {
  return useQuery({
    queryKey: ["territory-contributors", territoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("territory_memory" as any)
        .select("created_by_user_id, ai_score")
        .eq("territory_id", territoryId!);
      if (error) throw error;

      // Group by user
      const map = new Map<string, { count: number; totalAiScore: number }>();
      for (const row of (data ?? []) as any[]) {
        const uid = row.created_by_user_id;
        const existing = map.get(uid) ?? { count: 0, totalAiScore: 0 };
        existing.count += 1;
        existing.totalAiScore += Number(row.ai_score ?? 0);
        map.set(uid, existing);
      }

      if (map.size === 0) return [];

      // Fetch profiles
      const userIds = Array.from(map.keys());
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", userIds);

      return Array.from(map.entries()).map(([userId, stats]) => {
        const profile = (profiles ?? []).find((p: any) => p.user_id === userId);
        return {
          user_id: userId,
          name: profile?.name ?? "Unknown",
          avatar_url: profile?.avatar_url ?? null,
          entry_count: stats.count,
          total_ai_score: stats.totalAiScore,
        };
      }).sort((a, b) => b.total_ai_score - a.total_ai_score || b.entry_count - a.entry_count);
    },
    enabled: !!territoryId,
  });
}

export function useAddTerritoryMemory() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { grantXp } = useXpCredits();

  return useMutation({
    mutationFn: async (entry: {
      territory_id: string;
      title: string;
      content: string;
      category: MemoryCategory;
      visibility: MemoryVisibility;
      tags: string[];
      created_by_user_id: string;
    }) => {
      const { data, error } = await supabase
        .from("territory_memory" as any)
        .insert(entry as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data, vars) => {
      qc.invalidateQueries({ queryKey: ["territory-memory", vars.territory_id] });
      qc.invalidateQueries({ queryKey: ["territory-contributors", vars.territory_id] });
      toast({ title: "Memory entry added" });

      // Grant XP for contribution
      try {
        await grantXp(vars.created_by_user_id, {
          type: XP_EVENT_TYPES.TERRITORY_MEMORY_CONTRIBUTED as any,
          relatedEntityType: "TERRITORY_MEMORY",
          relatedEntityId: (data as any)?.id,
          territoryId: vars.territory_id,
        });
      } catch {
        // Non-critical — don't block the main flow
      }
    },
    onError: (e: any) => {
      toast({ title: "Failed to add memory", description: e.message, variant: "destructive" });
    },
  });
}

export function useUpdateTerritoryMemory() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, territory_id, ...updates }: Partial<TerritoryMemoryEntry> & { id: string; territory_id: string }) => {
      const { error } = await supabase
        .from("territory_memory" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["territory-memory", vars.territory_id] });
      toast({ title: "Memory entry updated" });
    },
    onError: (e: any) => {
      toast({ title: "Failed to update", description: e.message, variant: "destructive" });
    },
  });
}

export function useDeleteTerritoryMemory() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, territory_id }: { id: string; territory_id: string }) => {
      const { error } = await supabase
        .from("territory_memory" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["territory-memory", vars.territory_id] });
      qc.invalidateQueries({ queryKey: ["territory-contributors", vars.territory_id] });
      toast({ title: "Memory entry deleted" });
    },
    onError: (e: any) => {
      toast({ title: "Failed to delete", description: e.message, variant: "destructive" });
    },
  });
}

export function useGenerateTerritorySummary() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (territoryId: string) => {
      const { data, error } = await supabase.functions.invoke("territory-intelligence", {
        body: { territoryId, action: "generate-summary" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, territoryId) => {
      qc.invalidateQueries({ queryKey: ["territory-summary", territoryId] });
      qc.invalidateQueries({ queryKey: ["territory-memory", territoryId] });
      toast({ title: "Territory synthesis generated" });
    },
    onError: (e: any) => {
      toast({ title: "Failed to generate synthesis", description: e.message, variant: "destructive" });
    },
  });
}
