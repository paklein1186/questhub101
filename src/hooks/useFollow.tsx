import { useState, useCallback } from "react";
import { follows, hasBlockRelationship } from "@/data/mock";
import { FollowTargetType } from "@/types/enums";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";

export function useFollow(targetType: FollowTargetType, targetId: string) {
  const currentUser = useCurrentUser();
  const { toast } = useToast();

  const [isFollowing, setIsFollowing] = useState(() =>
    follows.some(
      (f) =>
        f.followerId === currentUser.id &&
        f.targetType === targetType &&
        f.targetId === targetId
    )
  );

  const toggle = useCallback(() => {
    // Block check for user follows
    if (targetType === FollowTargetType.USER && hasBlockRelationship(currentUser.id, targetId)) {
      toast({ title: "Cannot follow", description: "There is a block between you and this user.", variant: "destructive" });
      return;
    }

    if (isFollowing) {
      const idx = follows.findIndex(
        (f) =>
          f.followerId === currentUser.id &&
          f.targetType === targetType &&
          f.targetId === targetId
      );
      if (idx !== -1) follows.splice(idx, 1);
      setIsFollowing(false);
    } else {
      follows.push({
        id: `f-${Date.now()}`,
        followerId: currentUser.id,
        targetType,
        targetId,
        createdAt: new Date().toISOString(),
      });
      setIsFollowing(true);
    }
  }, [isFollowing, currentUser.id, targetType, targetId, toast]);

  return { isFollowing, toggle };
}
