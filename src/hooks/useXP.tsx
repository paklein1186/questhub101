import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

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
  REFERRAL_REWARD: 50,
} as const;

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
    REFERRAL_REWARD: "Referral bonus",
  };
  return map[reason] ?? reason;
}

export function useXP() {
  const { toast } = useToast();
  const { session } = useAuth();

  const awardXp = useCallback(
    async (userId: string, reason: keyof typeof XP_REWARDS, silent = false) => {
      const amount = XP_REWARDS[reason];

      // Update profile XP
      const { data: profile } = await supabase
        .from("profiles")
        .select("xp")
        .eq("user_id", userId)
        .maybeSingle();

      if (profile) {
        await supabase
          .from("profiles")
          .update({ xp: (profile.xp ?? 0) + amount })
          .eq("user_id", userId);
      }

      // Log XP transaction
      await supabase.from("xp_transactions").insert({
        user_id: userId,
        type: "REWARD" as any,
        amount_xp: amount,
        description: formatReason(reason),
      });

      if (!silent) {
        toast({
          title: `+${amount} XP`,
          description: formatReason(reason),
        });
      }
    },
    [toast]
  );

  /** Admin override: set exact XP value */
  const setXpManual = useCallback(async (userId: string, xp: number, _ci: number) => {
    await supabase
      .from("profiles")
      .update({ xp, contribution_index: _ci })
      .eq("user_id", userId);
  }, []);

  return { awardXp, setXpManual, XP_REWARDS };
}
