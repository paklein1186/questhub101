import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";

type EntityType = "GUILD" | "COMPANY";

/** Fetch all partnerships involving a specific entity */
export function usePartnershipsForEntity(entityType: EntityType, entityId: string | undefined) {
  return useQuery({
    queryKey: ["partnerships", entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partnerships")
        .select("*")
        .or(
          `and(from_entity_type.eq.${entityType},from_entity_id.eq.${entityId}),and(to_entity_type.eq.${entityType},to_entity_id.eq.${entityId})`
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!entityId,
  });
}

/** Fetch entity names for partnership display */
export function usePartnerEntities(partnerships: any[] | undefined) {
  const entityKeys = (partnerships ?? []).flatMap((p: any) => [
    `${p.from_entity_type}:${p.from_entity_id}`,
    `${p.to_entity_type}:${p.to_entity_id}`,
  ]);
  const uniqueKeys = [...new Set(entityKeys)];

  return useQuery({
    queryKey: ["partner-entities", uniqueKeys.sort().join(",")],
    queryFn: async () => {
      const map: Record<string, { name: string; logo_url: string | null; type: string }> = {};
      const guildIds = uniqueKeys.filter(k => k.startsWith("GUILD:")).map(k => k.split(":")[1]);
      const companyIds = uniqueKeys.filter(k => k.startsWith("COMPANY:")).map(k => k.split(":")[1]);

      if (guildIds.length > 0) {
        const { data } = await supabase.from("guilds").select("id, name, logo_url").in("id", guildIds);
        (data ?? []).forEach(g => { map[`GUILD:${g.id}`] = { name: g.name, logo_url: g.logo_url, type: "GUILD" }; });
      }
      if (companyIds.length > 0) {
        const { data } = await supabase.from("companies").select("id, name, logo_url").in("id", companyIds);
        (data ?? []).forEach(c => { map[`COMPANY:${c.id}`] = { name: c.name, logo_url: c.logo_url, type: "COMPANY" }; });
      }
      return map;
    },
    enabled: uniqueKeys.length > 0,
  });
}

/** Create a partnership request */
export function useCreatePartnership() {
  const qc = useQueryClient();
  const currentUser = useCurrentUser();

  return useMutation({
    mutationFn: async (params: {
      fromEntityType: EntityType;
      fromEntityId: string;
      toEntityType: EntityType;
      toEntityId: string;
      notes?: string;
      partnershipType?: string;
    }) => {
      const { data, error } = await supabase.from("partnerships").insert({
        from_entity_type: params.fromEntityType,
        from_entity_id: params.fromEntityId,
        to_entity_type: params.toEntityType,
        to_entity_id: params.toEntityId,
        notes: params.notes || null,
        partnership_type: params.partnershipType || "ALLY",
        created_by_user_id: currentUser.id,
        status: "PENDING",
      } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["partnerships", vars.fromEntityType, vars.fromEntityId] });
      qc.invalidateQueries({ queryKey: ["partnerships", vars.toEntityType, vars.toEntityId] });
    },
  });
}

/** Update partnership status (accept/decline/cancel) */
export function useUpdatePartnershipStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; status: "ACCEPTED" | "DECLINED" | "CANCELLED" }) => {
      const { data, error } = await supabase
        .from("partnerships")
        .update({ status: params.status } as any)
        .eq("id", params.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["partnerships", data.from_entity_type, data.from_entity_id] });
      qc.invalidateQueries({ queryKey: ["partnerships", data.to_entity_type, data.to_entity_id] });
    },
  });
}
