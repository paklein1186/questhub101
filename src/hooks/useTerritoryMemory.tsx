import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

export function useAddTerritoryMemory() {
  const qc = useQueryClient();
  const { toast } = useToast();

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
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["territory-memory", vars.territory_id] });
      toast({ title: "Memory entry added" });
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
      toast({ title: "Memory entry deleted" });
    },
    onError: (e: any) => {
      toast({ title: "Failed to delete", description: e.message, variant: "destructive" });
    },
  });
}
