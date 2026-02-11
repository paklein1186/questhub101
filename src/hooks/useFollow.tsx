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

  const queryKey = ["follow", userId, targetType, targetId];

  const { data: followRecord } = useQuery({
    queryKey,
    enabled: !!userId && !!targetId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", userId!)
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .maybeSingle();
      if (error) throw error;
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
    onMutate: async () => {
      // Optimistic update
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData(queryKey);
      qc.setQueryData(queryKey, { id: "optimistic" });
      return { prev };
    },
    onError: (_err, _vars, context) => {
      qc.setQueryData(queryKey, context?.prev);
      toast.error("Failed to follow");
    },
    onSuccess: () => {
      toast.success("Following!");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ["my-follows"] });
      qc.invalidateQueries({ queryKey: ["following-feed"] });
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
    onMutate: async () => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData(queryKey);
      qc.setQueryData(queryKey, null);
      return { prev };
    },
    onError: (_err, _vars, context) => {
      qc.setQueryData(queryKey, context?.prev);
      toast.error("Failed to unfollow");
    },
    onSuccess: () => {
      toast.success("Unfollowed");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ["my-follows"] });
      qc.invalidateQueries({ queryKey: ["following-feed"] });
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
