import { useCallback } from "react";
import { users as allUsers } from "@/data/mock";
import { useToast } from "@/hooks/use-toast";

// XP reward values
const XP_REWARDS = {
  QUEST_CREATED: 10,
  QUEST_COMPLETED: 30,
  QUEST_UPDATE_CREATED: 5,
  COMMENT_UPVOTED: 1,
  ACHIEVEMENT_RECEIVED: 20,
  BOOKING_COMPLETED_PAID: 15,
  BOOKING_COMPLETED_FREE: 10,
  BOOKING_ATTENDED: 2,
} as const;

function recomputeContributionIndex(xp: number): number {
  return Math.floor(xp / 10);
}

/** Mutates the global users array in-place so all components see updated values. */
function awardXpToUser(userId: string, amount: number) {
  const user = allUsers.find((u) => u.id === userId);
  if (!user) return;
  user.xp += amount;
  user.contributionIndex = recomputeContributionIndex(user.xp);
}

export function useXP() {
  const { toast } = useToast();

  const awardXp = useCallback(
    (userId: string, reason: keyof typeof XP_REWARDS, silent = false) => {
      const amount = XP_REWARDS[reason];
      awardXpToUser(userId, amount);
      if (!silent) {
        toast({
          title: `+${amount} XP`,
          description: formatReason(reason),
        });
      }
    },
    [toast]
  );

  /** Admin override: set exact values */
  const setXpManual = useCallback((userId: string, xp: number, ci: number) => {
    const user = allUsers.find((u) => u.id === userId);
    if (!user) return;
    user.xp = xp;
    user.contributionIndex = ci;
  }, []);

  return { awardXp, setXpManual, XP_REWARDS };
}

function formatReason(reason: string): string {
  const map: Record<string, string> = {
    QUEST_CREATED: "Quest created",
    QUEST_COMPLETED: "Quest completed",
    QUEST_UPDATE_CREATED: "Quest update posted",
    COMMENT_UPVOTED: "Comment upvoted",
    ACHIEVEMENT_RECEIVED: "Achievement earned",
    BOOKING_COMPLETED_PAID: "Paid booking completed",
    BOOKING_COMPLETED_FREE: "Free booking completed",
    BOOKING_ATTENDED: "Session attended",
  };
  return map[reason] ?? reason;
}
