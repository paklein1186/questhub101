import { useState, useCallback } from "react";
import { userBlocks } from "@/data/mock";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";

export function useBlock(targetUserId: string) {
  const currentUser = useCurrentUser();
  const { toast } = useToast();

  const [isBlocked, setIsBlocked] = useState(() =>
    userBlocks.some(
      (b) => b.blockerId === currentUser.id && b.blockedId === targetUserId
    )
  );

  const toggle = useCallback(() => {
    if (isBlocked) {
      const idx = userBlocks.findIndex(
        (b) => b.blockerId === currentUser.id && b.blockedId === targetUserId
      );
      if (idx !== -1) userBlocks.splice(idx, 1);
      setIsBlocked(false);
      toast({ title: "User unblocked" });
    } else {
      userBlocks.push({
        id: `ub-${Date.now()}`,
        blockerId: currentUser.id,
        blockedId: targetUserId,
        createdAt: new Date().toISOString(),
      });
      setIsBlocked(true);
      toast({ title: "User blocked", description: "They won't be able to interact with your content." });
    }
  }, [isBlocked, currentUser.id, targetUserId, toast]);

  return { isBlocked, toggle };
}
