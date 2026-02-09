import { useState, useCallback } from "react";
import { follows } from "@/data/mock";
import { FollowTargetType } from "@/types/enums";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export function useFollow(targetType: FollowTargetType, targetId: string) {
  const currentUser = useCurrentUser();

  const [isFollowing, setIsFollowing] = useState(() =>
    follows.some(
      (f) =>
        f.followerId === currentUser.id &&
        f.targetType === targetType &&
        f.targetId === targetId
    )
  );

  const toggle = useCallback(() => {
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
  }, [isFollowing, currentUser.id, targetType, targetId]);

  return { isFollowing, toggle };
}
