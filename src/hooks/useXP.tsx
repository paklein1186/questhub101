import { useCallback } from "react";
import { useXpCredits } from "@/hooks/useXpCredits";
import { XP_REWARDS as XP_REWARDS_CONFIG, XP_EVENT_TYPES } from "@/lib/xpCreditsConfig";

/**
 * @deprecated Use useXpCredits() directly for new code.
 * This hook is kept for backward compatibility.
 */
export function useXP() {
  const { grantXp } = useXpCredits();

  // Legacy mapping from old reason keys to new XP event types
  const LEGACY_MAP: Record<string, string> = {
    QUEST_CREATED: XP_EVENT_TYPES.QUEST_CREATED,
    QUEST_COMPLETED: XP_EVENT_TYPES.QUEST_COMPLETED_USER,
    QUEST_UPDATE_CREATED: XP_EVENT_TYPES.QUEST_UPDATE_CREATED,
    COMMENT_UPVOTED: XP_EVENT_TYPES.COMMENT_UPVOTED,
    ACHIEVEMENT_RECEIVED: XP_EVENT_TYPES.ACHIEVEMENT_RECEIVED,
    BOOKING_COMPLETED_PAID: XP_EVENT_TYPES.BOOKING_COMPLETED_PAID,
    BOOKING_COMPLETED_FREE: XP_EVENT_TYPES.BOOKING_COMPLETED_FREE,
    BOOKING_ATTENDED: XP_EVENT_TYPES.BOOKING_ATTENDED,
    REFERRAL_REWARD: XP_EVENT_TYPES.REFERRAL_REWARD,
  };

  const XP_REWARDS = {
    QUEST_CREATED: XP_REWARDS_CONFIG[XP_EVENT_TYPES.QUEST_CREATED],
    QUEST_COMPLETED: XP_REWARDS_CONFIG[XP_EVENT_TYPES.QUEST_COMPLETED_USER],
    QUEST_UPDATE_CREATED: XP_REWARDS_CONFIG[XP_EVENT_TYPES.QUEST_UPDATE_CREATED],
    COMMENT_UPVOTED: XP_REWARDS_CONFIG[XP_EVENT_TYPES.COMMENT_UPVOTED],
    ACHIEVEMENT_RECEIVED: XP_REWARDS_CONFIG[XP_EVENT_TYPES.ACHIEVEMENT_RECEIVED],
    BOOKING_COMPLETED_PAID: XP_REWARDS_CONFIG[XP_EVENT_TYPES.BOOKING_COMPLETED_PAID],
    BOOKING_COMPLETED_FREE: XP_REWARDS_CONFIG[XP_EVENT_TYPES.BOOKING_COMPLETED_FREE],
    BOOKING_ATTENDED: XP_REWARDS_CONFIG[XP_EVENT_TYPES.BOOKING_ATTENDED],
    REFERRAL_REWARD: XP_REWARDS_CONFIG[XP_EVENT_TYPES.REFERRAL_REWARD],
  } as const;

  const awardXp = useCallback(
    async (userId: string, reason: keyof typeof XP_REWARDS, silent = false) => {
      const eventType = LEGACY_MAP[reason] ?? reason;
      await grantXp(userId, { type: eventType as any }, silent);
    },
    [grantXp]
  );

  const setXpManual = useCallback(async (_userId: string, _xp: number, _ci: number) => {
    // Kept for admin; direct DB update via admin tools
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase
      .from("profiles")
      .update({ xp: _xp, contribution_index: _ci })
      .eq("user_id", _userId);
  }, []);

  return { awardXp, setXpManual, XP_REWARDS };
}
