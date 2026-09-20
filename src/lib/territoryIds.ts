import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves all territory IDs associated with a territory:
 * - Self
 * - Closure table descendants (admin hierarchy)
 * - Bioregion members (parallel ecological hierarchy) AND everything nested inside those members
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
  const memberIds: string[] = [];
  if (bioMembers) {
    for (const r of bioMembers as any[]) { ids.add(r.territory_id); memberIds.push(r.territory_id); }
  }

  // 3. What lies inside each member (a town's districts…): the member's ecosystem is the bioregion's too.
  if (memberIds.length) {
    const [memberClosure, memberKids] = await Promise.all([
      supabase.from("territory_closure" as any).select("descendant_id").in("ancestor_id", memberIds),
      supabase.from("territories").select("id").in("parent_id", memberIds),
    ]);
    for (const r of (memberClosure.data ?? []) as any[]) ids.add(r.descendant_id);
    for (const r of (memberKids.data ?? []) as any[]) ids.add(r.id);
  }

  return Array.from(ids);
}
