import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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

  return useMutation({
    mutationFn: async ({ postId, hasUpvoted }: { postId: string; hasUpvoted: boolean }) => {
      const userId = user?.id;
      if (!userId) throw new Error("Not authenticated");

      if (hasUpvoted) {
        // Remove upvote
        const { error } = await supabase
          .from("post_upvotes" as any)
          .delete()
          .eq("user_id", userId)
          .eq("post_id", postId);
        if (error) throw error;
      } else {
        // Add upvote
        const { error } = await supabase
          .from("post_upvotes" as any)
          .insert({ user_id: userId, post_id: postId } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["post-upvotes"] });
      qc.invalidateQueries({ queryKey: ["feed-posts"] });
      qc.invalidateQueries({ queryKey: ["following-feed"] });
    },
  });
}
