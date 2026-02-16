import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface EntityRole {
  id: string;
  entity_type: string;
  entity_id: string;
  name: string;
  color: string;
  is_default: boolean;
  sort_order: number;
  created_at: string;
}

export interface EntityMemberRole {
  id: string;
  entity_role_id: string;
  user_id: string;
  created_at: string;
}

export function useEntityRoles(entityType: string, entityId: string | undefined) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const rolesQuery = useQuery({
    queryKey: ["entity-roles", entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entity_roles")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId!)
        .order("sort_order");
      if (error) throw error;
      return data as EntityRole[];
    },
    enabled: !!entityId,
  });

  const memberRolesQuery = useQuery({
    queryKey: ["entity-member-roles", entityType, entityId],
    queryFn: async () => {
      const roleIds = rolesQuery.data?.map((r) => r.id) || [];
      if (roleIds.length === 0) return [] as EntityMemberRole[];
      const { data, error } = await supabase
        .from("entity_member_roles")
        .select("*")
        .in("entity_role_id", roleIds);
      if (error) throw error;
      return data as EntityMemberRole[];
    },
    enabled: !!entityId && !!rolesQuery.data && rolesQuery.data.length > 0,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["entity-roles", entityType, entityId] });
    qc.invalidateQueries({ queryKey: ["entity-member-roles", entityType, entityId] });
  };

  const ensureSourceRole = async () => {
    if (!entityId) return;
    const roles = rolesQuery.data || [];
    const hasSource = roles.some((r) => r.is_default && r.name === "Source");
    if (!hasSource) {
      await supabase.from("entity_roles").insert({
        entity_type: entityType,
        entity_id: entityId,
        name: "Source",
        color: "#6366f1",
        is_default: true,
        sort_order: 0,
      } as any);
      invalidate();
    }
  };

  const addRole = async (name: string, color: string) => {
    if (!entityId) return;
    const maxSort = Math.max(0, ...(rolesQuery.data || []).map((r) => r.sort_order));
    const { error } = await supabase.from("entity_roles").insert({
      entity_type: entityType,
      entity_id: entityId,
      name: name.trim(),
      color,
      is_default: false,
      sort_order: maxSort + 1,
    } as any);
    if (error) { toast({ title: "Failed to add role", variant: "destructive" }); return; }
    invalidate();
    toast({ title: "Role added!" });
  };

  const updateRole = async (roleId: string, name: string, color: string) => {
    const { error } = await supabase.from("entity_roles").update({ name: name.trim(), color } as any).eq("id", roleId);
    if (error) { toast({ title: "Failed to update role", variant: "destructive" }); return; }
    invalidate();
  };

  const deleteRole = async (roleId: string) => {
    const role = rolesQuery.data?.find((r) => r.id === roleId);
    if (role?.is_default) { toast({ title: "Cannot delete the Source role", variant: "destructive" }); return; }
    const { error } = await supabase.from("entity_roles").delete().eq("id", roleId);
    if (error) { toast({ title: "Failed to delete role", variant: "destructive" }); return; }
    invalidate();
    toast({ title: "Role deleted" });
  };

  const assignRole = async (roleId: string, userId: string) => {
    const { error } = await supabase.from("entity_member_roles").insert({
      entity_role_id: roleId,
      user_id: userId,
    } as any);
    if (error && error.code !== "23505") { toast({ title: "Failed to assign role", variant: "destructive" }); return; }
    invalidate();
  };

  const removeRoleAssignment = async (roleId: string, userId: string) => {
    const { error } = await supabase
      .from("entity_member_roles")
      .delete()
      .eq("entity_role_id", roleId)
      .eq("user_id", userId);
    if (error) { toast({ title: "Failed to remove role", variant: "destructive" }); return; }
    invalidate();
  };

  const getRolesForUser = (userId: string): EntityRole[] => {
    const assignments = memberRolesQuery.data || [];
    const roleIds = assignments.filter((a) => a.user_id === userId).map((a) => a.entity_role_id);
    return (rolesQuery.data || []).filter((r) => roleIds.includes(r.id));
  };

  return {
    roles: rolesQuery.data || [],
    memberRoles: memberRolesQuery.data || [],
    isLoading: rolesQuery.isLoading,
    ensureSourceRole,
    addRole,
    updateRole,
    deleteRole,
    assignRole,
    removeRoleAssignment,
    getRolesForUser,
    invalidate,
  };
}
