import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { AudienceType } from "@/lib/permissions";

export interface DiscussionRoom {
  id: string;
  scope_type: string;
  scope_id: string;
  name: string;
  description: string | null;
  audience_type: string;
  allowed_role_ids: string[];
  can_post_audience_type: string;
  can_reply_audience_type: string;
  can_manage_audience_type: string;
  can_manage_role_ids: string[];
  created_by_user_id: string;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useDiscussionRooms(scopeType: "GUILD" | "QUEST", scopeId: string | undefined) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const roomsQuery = useQuery({
    queryKey: ["discussion-rooms", scopeType, scopeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discussion_rooms")
        .select("*")
        .eq("scope_type", scopeType)
        .eq("scope_id", scopeId!)
        .order("sort_order");
      if (error) throw error;
      return data as unknown as DiscussionRoom[];
    },
    enabled: !!scopeId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["discussion-rooms", scopeType, scopeId] });
  };

  const createRoom = async (room: {
    name: string;
    description?: string;
    audience_type: AudienceType;
    allowed_role_ids?: string[];
    can_post_audience_type: AudienceType;
    can_reply_audience_type: AudienceType;
    can_manage_audience_type: "ADMINS_ONLY" | "SELECTED_ROLES";
    can_manage_role_ids?: string[];
    created_by_user_id: string;
  }) => {
    if (!scopeId) return;
    const maxSort = Math.max(0, ...(roomsQuery.data || []).map((r) => r.sort_order));
    const { error } = await supabase.from("discussion_rooms").insert({
      scope_type: scopeType,
      scope_id: scopeId,
      name: room.name.trim(),
      description: room.description?.trim() || null,
      audience_type: room.audience_type,
      allowed_role_ids: room.allowed_role_ids || [],
      can_post_audience_type: room.can_post_audience_type,
      can_reply_audience_type: room.can_reply_audience_type,
      can_manage_audience_type: room.can_manage_audience_type,
      can_manage_role_ids: room.can_manage_role_ids || [],
      created_by_user_id: room.created_by_user_id,
      is_default: false,
      sort_order: maxSort + 1,
    } as any);
    if (error) {
      toast({ title: "Failed to create room", variant: "destructive" });
      return;
    }
    invalidate();
    toast({ title: "Room created!" });
  };

  const updateRoom = async (roomId: string, updates: Partial<DiscussionRoom>) => {
    const { error } = await supabase
      .from("discussion_rooms")
      .update(updates as any)
      .eq("id", roomId);
    if (error) {
      toast({ title: "Failed to update room", variant: "destructive" });
      return;
    }
    invalidate();
  };

  const deleteRoom = async (roomId: string) => {
    const room = roomsQuery.data?.find((r) => r.id === roomId);
    if (room?.is_default) {
      toast({ title: "Cannot delete the default room", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("discussion_rooms").delete().eq("id", roomId);
    if (error) {
      toast({ title: "Failed to delete room", variant: "destructive" });
      return;
    }
    invalidate();
    toast({ title: "Room deleted" });
  };

  const ensureDefaultRoom = async (creatorUserId: string) => {
    if (!scopeId) return;
    const rooms = roomsQuery.data || [];
    if (rooms.length === 0) {
      await supabase.from("discussion_rooms").insert({
        scope_type: scopeType,
        scope_id: scopeId,
        name: "General",
        description: "Default discussion room",
        audience_type: "MEMBERS",
        can_post_audience_type: "MEMBERS",
        can_reply_audience_type: "MEMBERS",
        can_manage_audience_type: "ADMINS_ONLY",
        created_by_user_id: creatorUserId,
        is_default: true,
        sort_order: 0,
      } as any);
      invalidate();
    }
  };

  return {
    rooms: roomsQuery.data || [],
    isLoading: roomsQuery.isLoading,
    createRoom,
    updateRoom,
    deleteRoom,
    ensureDefaultRoom,
    invalidate,
  };
}
