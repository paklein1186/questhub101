import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";

type EntityType = "GUILD" | "COMPANY";

export interface QuestHost {
  id: string;
  quest_id: string;
  entity_type: EntityType;
  entity_id: string;
  role: "PRIMARY" | "CO_HOST";
  created_at: string;
  created_by_user_id: string;
}

export interface ResolvedHost extends QuestHost {
  name: string;
  logo_url: string | null;
}

/** Fetch all hosts for a quest */
export function useQuestHosts(questId: string | undefined) {
  return useQuery({
    queryKey: ["quest-hosts", questId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quest_hosts")
        .select("*")
        .eq("quest_id", questId!)
        .order("role"); // PRIMARY first
      if (error) throw error;
      return (data ?? []) as QuestHost[];
    },
    enabled: !!questId,
  });
}

/** Resolve host entity names and logos */
export function useResolvedQuestHosts(questId: string | undefined) {
  const { data: hosts, isLoading } = useQuestHosts(questId);

  return useQuery({
    queryKey: ["quest-hosts-resolved", questId, hosts?.map(h => h.id).join(",")],
    queryFn: async () => {
      if (!hosts || hosts.length === 0) return [];

      const guildIds = hosts.filter(h => h.entity_type === "GUILD").map(h => h.entity_id);
      const companyIds = hosts.filter(h => h.entity_type === "COMPANY").map(h => h.entity_id);

      const nameMap: Record<string, { name: string; logo_url: string | null }> = {};

      if (guildIds.length > 0) {
        const { data } = await supabase.from("guilds").select("id, name, logo_url").in("id", guildIds);
        (data ?? []).forEach(g => { nameMap[`GUILD:${g.id}`] = { name: g.name, logo_url: g.logo_url }; });
      }
      if (companyIds.length > 0) {
        const { data } = await supabase.from("companies").select("id, name, logo_url").in("id", companyIds);
        (data ?? []).forEach(c => { nameMap[`COMPANY:${c.id}`] = { name: c.name, logo_url: c.logo_url }; });
      }

      return hosts.map(h => ({
        ...h,
        name: nameMap[`${h.entity_type}:${h.entity_id}`]?.name ?? "Unknown",
        logo_url: nameMap[`${h.entity_type}:${h.entity_id}`]?.logo_url ?? null,
      })) as ResolvedHost[];
    },
    enabled: !!hosts && hosts.length > 0,
  });
}

/** Get accepted partners of a given entity for co-host selection */
export function useAcceptedPartners(entityType: EntityType | undefined, entityId: string | undefined) {
  return useQuery({
    queryKey: ["accepted-partners-for-cohost", entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partnerships")
        .select("*")
        .eq("status", "ACCEPTED")
        .or(
          `and(from_entity_type.eq.${entityType},from_entity_id.eq.${entityId}),and(to_entity_type.eq.${entityType},to_entity_id.eq.${entityId})`
        );
      if (error) throw error;

      // Extract partner entities (the other side)
      const partners: { entityType: EntityType; entityId: string }[] = [];
      (data ?? []).forEach((p: any) => {
        if (p.from_entity_type === entityType && p.from_entity_id === entityId) {
          partners.push({ entityType: p.to_entity_type as EntityType, entityId: p.to_entity_id });
        } else {
          partners.push({ entityType: p.from_entity_type as EntityType, entityId: p.from_entity_id });
        }
      });

      // Resolve names
      const guildIds = partners.filter(p => p.entityType === "GUILD").map(p => p.entityId);
      const companyIds = partners.filter(p => p.entityType === "COMPANY").map(p => p.entityId);

      const resolved: { entityType: EntityType; entityId: string; name: string; logo_url: string | null }[] = [];

      if (guildIds.length > 0) {
        const { data: guilds } = await supabase.from("guilds").select("id, name, logo_url").in("id", guildIds).eq("is_deleted", false);
        (guilds ?? []).forEach(g => {
          resolved.push({ entityType: "GUILD", entityId: g.id, name: g.name, logo_url: g.logo_url });
        });
      }
      if (companyIds.length > 0) {
        const { data: companies } = await supabase.from("companies").select("id, name, logo_url").in("id", companyIds).eq("is_deleted", false);
        (companies ?? []).forEach(c => {
          resolved.push({ entityType: "COMPANY", entityId: c.id, name: c.name, logo_url: c.logo_url });
        });
      }

      return resolved;
    },
    enabled: !!entityType && !!entityId,
  });
}

/** Add a co-host to a quest */
export function useAddQuestCoHost() {
  const qc = useQueryClient();
  const currentUser = useCurrentUser();

  return useMutation({
    mutationFn: async (params: { questId: string; entityType: EntityType; entityId: string }) => {
      const { error } = await supabase.from("quest_hosts").insert({
        quest_id: params.questId,
        entity_type: params.entityType,
        entity_id: params.entityId,
        role: "CO_HOST",
        created_by_user_id: currentUser.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["quest-hosts", vars.questId] });
    },
  });
}

/** Remove a co-host from a quest */
export function useRemoveQuestHost() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; questId: string }) => {
      const { error } = await supabase.from("quest_hosts").delete().eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["quest-hosts", vars.questId] });
    },
  });
}
