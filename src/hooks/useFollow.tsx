import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FollowTargetType } from "@/types/enums";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function useFollow(targetType: FollowTargetType, targetId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  const { data: followRecord } = useQuery({
    queryKey: ["follow", userId, targetType, targetId],
    enabled: !!userId && !!targetId,
    queryFn: async () => {
      const { data } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", userId!)
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .maybeSingle();
      return data;
    },
  });

  const isFollowing = !!followRecord;

  const followMut = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase.from("follows").insert({
        follower_id: userId,
        target_type: targetType,
        target_id: targetId,
      } as any);
      if (error && !error.message.includes("duplicate")) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["follow", userId, targetType, targetId] });
      qc.invalidateQueries({ queryKey: ["my-follows"] });
    },
  });

  const unfollowMut = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", userId)
        .eq("target_type", targetType)
        .eq("target_id", targetId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["follow", userId, targetType, targetId] });
      qc.invalidateQueries({ queryKey: ["my-follows"] });
    },
  });

  const toggle = useCallback(() => {
    if (!userId) {
      toast.error("Please log in to follow");
      return;
    }
    if (isFollowing) {
      unfollowMut.mutate();
    } else {
      followMut.mutate();
    }
  }, [isFollowing, userId, followMut, unfollowMut]);

  return { isFollowing, toggle, isLoading: followMut.isPending || unfollowMut.isPending };
}

/** Auto-follow an entity after creation. Fire-and-forget, won't fail the creation. */
export async function autoFollowEntity(userId: string, targetType: string, targetId: string) {
  try {
    await supabase.from("follows").insert({
      follower_id: userId,
      target_type: targetType,
      target_id: targetId,
    } as any);
  } catch {
    // Ignore — duplicate or network error shouldn't block creation
  }
}
