import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves all territory IDs associated with a territory:
 * - Self
 * - Closure table descendants (admin hierarchy)
 * - Bioregion members (parallel ecological hierarchy)
 * Returns deduplicated array.
 */
export async function getAllTerritoryIds(territoryId: string): Promise<string[]> {
  const ids = new Set<string>([territoryId]);

  // 1. Closure table descendants
  const { data: closureData } = await supabase
    .from("territory_closure" as any)
    .select("descendant_id")
    .eq("ancestor_id", territoryId);
  if (closureData) {
    for (const r of closureData as any[]) ids.add(r.descendant_id);
  }

  // 2. Bioregion members
  const { data: bioMembers } = await supabase
    .from("bioregion_members" as any)
    .select("territory_id")
    .eq("bioregion_id", territoryId);
  if (bioMembers) {
    for (const r of bioMembers as any[]) ids.add(r.territory_id);
  }

  return Array.from(ids);
}
