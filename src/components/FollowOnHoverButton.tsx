import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useNotifications } from "@/hooks/useNotifications";

/**
 * Hook: bulk-check which user IDs the current user is already following.
 * Returns a Set of followed user IDs.
 */
export function useFollowedUserIds(userIds: string[]) {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ["bulk-follow-check", userId, userIds.sort().join(",")],
    enabled: !!userId && userIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("follows")
        .select("target_id")
        .eq("follower_id", userId!)
        .eq("target_type", "USER")
        .in("target_id", userIds);
      return new Set((data ?? []).map((f: any) => f.target_id));
    },
    staleTime: 30_000,
  });
}

/**
 * Quick-follow button that appears on hover over user cards.
 * Shows a UserPlus icon only if the current user is not already following.
 */
export function FollowOnHoverButton({
  targetUserId,
  isFollowed,
}: {
  targetUserId: string;
  isFollowed: boolean;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { notifyNewFollower } = useNotifications();
  const userId = user?.id;

  const followMut = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase.from("follows").insert({
        follower_id: userId,
        target_type: "USER",
        target_id: targetUserId,
      } as any);
      if (error && !error.message.includes("duplicate")) throw error;
    },
    onSuccess: () => {
      toast.success("Following!");
      if (userId) notifyNewFollower({ followerId: userId, targetUserId: targetUserId });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["bulk-follow-check"] });
      qc.invalidateQueries({ queryKey: ["follow"] });
      qc.invalidateQueries({ queryKey: ["my-follows"] });
      qc.invalidateQueries({ queryKey: ["following-feed"] });
    },
    onError: () => toast.error("Failed to follow"),
  });

  // Don't show for own profile or already-followed users
  if (!userId || userId === targetUserId || isFollowed || followMut.isSuccess) return null;

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        followMut.mutate();
      }}
      disabled={followMut.isPending}
      className="absolute top-2 right-2 z-10 rounded-full p-1.5 bg-primary text-primary-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:scale-110 active:scale-95"
      title="Follow"
    >
      <UserPlus className="h-3.5 w-3.5" />
    </button>
  );
}
