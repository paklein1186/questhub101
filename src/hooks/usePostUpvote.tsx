import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";

export function usePostUpvotes(postIds: string[]) {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ["post-upvotes", userId, ...postIds],
    enabled: !!userId && postIds.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("post_upvotes" as any)
        .select("id, post_id")
        .eq("user_id", userId)
        .in("post_id", postIds);
      if (error) throw error;
      return (data ?? []) as unknown as { id: string; post_id: string }[];
    },
  });
}

export function useTogglePostUpvote() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { notifyPostUpvote } = useNotifications();

  return useMutation({
    mutationFn: async ({ postId, hasUpvoted, postAuthorId }: { postId: string; hasUpvoted: boolean; postAuthorId?: string }) => {
      const userId = user?.id;
      if (!userId) throw new Error("Not authenticated");

      if (hasUpvoted) {
        const { error } = await supabase
          .from("post_upvotes" as any)
          .delete()
          .eq("user_id", userId)
          .eq("post_id", postId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("post_upvotes" as any)
          .insert({ user_id: userId, post_id: postId } as any);
        if (error) throw error;

        // Notify post author
        if (postAuthorId && postAuthorId !== userId) {
          const { data: profile } = await supabase
            .from("profiles_public")
            .select("name")
            .eq("user_id", userId)
            .maybeSingle();
          notifyPostUpvote({ postId, postAuthorId, upvoterName: profile?.name || "Someone" });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["post-upvotes"] });
      qc.invalidateQueries({ queryKey: ["feed-posts"] });
      qc.invalidateQueries({ queryKey: ["following-feed"] });
    },
  });
}
