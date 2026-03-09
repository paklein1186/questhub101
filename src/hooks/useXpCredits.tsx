import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import {
  XP_REWARDS,
  XP_EVENT_TYPES,
  COMMENT_UPVOTE_DAILY_XP_CAP,
  computeLevelFromXp,
  CREDIT_TX_TYPES,
  type XpEventType,
  type CreditTxType,
} from "@/lib/xpCreditsConfig";

// ─── Grant XP ────────────────────────────────────────────────

interface GrantXpParams {
  type: XpEventType;
  amount?: number;
  topicId?: string;
  territoryId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

interface CreditParams {
  type: CreditTxType;
  amount: number;
  source?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export function useXpCredits() {
  const { toast } = useToast();
  const { session } = useAuth();
  const { notifyXpGained } = useNotifications();

  // ── Grant XP (via secure RPC) ─────────────────────────────
  const grantXp = useCallback(
    async (userId: string, params: GrantXpParams, silent = false) => {
      const amount = params.amount ?? XP_REWARDS[params.type] ?? 0;
      if (amount <= 0) return;

      const { error } = await supabase.rpc("grant_user_xp" as any, {
        _target_user_id: userId,
        _type: params.type,
        _amount: amount,
        _topic_id: params.topicId ?? null,
        _territory_id: params.territoryId ?? null,
        _related_entity_type: params.relatedEntityType ?? null,
        _related_entity_id: params.relatedEntityId ?? null,
      });

      if (error) {
        console.error("grant_user_xp error:", error.message);
        return;
      }

      notifyXpGained({ userId, amount, reason: formatXpType(params.type) });

      if (!silent) {
        toast({ title: `+${amount} XP`, description: formatXpType(params.type) });
      }
    },
    [toast, notifyXpGained]
  );

  // ── Grant Credits (via secure RPC) ────────────────────────
  const grantCredits = useCallback(
    async (userId: string, params: CreditParams, silent = false) => {
      if (params.amount <= 0) return;

      const { error } = await supabase.rpc("grant_user_credits" as any, {
        _target_user_id: userId,
        _amount: params.amount,
        _type: params.type,
        _source: params.source ?? null,
        _related_entity_type: params.relatedEntityType ?? null,
        _related_entity_id: params.relatedEntityId ?? null,
      });

      if (error) {
        console.error("grant_user_credits error:", error.message);
        return;
      }

      await supabase.from("notifications").insert({
        user_id: userId,
        type: "CREDIT_RECEIVED",
        title: `+${params.amount} credits received`,
        body: `You received ${params.amount} platform credits`,
        deep_link_url: "/me?tab=wallet",
      });

      if (!silent) {
        toast({ title: `+${params.amount} Credits`, description: params.source ?? "Credits earned" });
      }
    },
    [toast]
  );

  // ── Spend Credits (via secure RPC) ────────────────────────
  const spendCredits = useCallback(
    async (userId: string, params: CreditParams): Promise<boolean> => {
      const cost = Math.abs(params.amount);

      const { error } = await supabase.rpc("spend_user_credits" as any, {
        _amount: cost,
        _type: params.type,
        _source: params.source ?? null,
        _related_entity_type: params.relatedEntityType ?? null,
        _related_entity_id: params.relatedEntityId ?? null,
      });

      if (error) {
        if (error.message?.includes("Insufficient credits")) {
          toast({
            title: "Not enough Credits",
            description: `You don't have enough credits for this action.`,
            variant: "destructive",
          });
        } else {
          console.error("spend_user_credits error:", error.message);
        }
        return false;
      }

      toast({ title: `−${cost} Credits`, description: params.source ?? "Credits spent" });
      return true;
    },
    [toast]
  );

  return { grantXp, grantCredits, spendCredits };
}

// ─── Helpers ────────────────────────────────────────────────
function formatXpType(type: string): string {
  const map: Record<string, string> = {
    QUEST_CREATED: "Quest created",
    QUEST_PUBLISHED: "Quest published",
    QUEST_COMPLETED_USER: "Quest completed",
    QUEST_COMPLETED_CREATOR: "Quest fully completed (creator)",
    POD_HOSTED: "Pod session hosted",
    POD_PARTICIPATED: "Pod session attended",
    SERVICE_DELIVERED: "Service delivered",
    SERVICE_RATED_5: "5-star rating received",
    COURSE_COMPLETED_LEARNER: "Course completed",
    COURSE_TEACHER_COMPLETED: "Course cohort completed (teacher)",
    ENDORSEMENT_RECEIVED: "Endorsement received",
    COMMENT_UPVOTED: "Comment upvoted",
    STEWARDSHIP_HOUSE_MONTH: "House stewardship (monthly)",
    STEWARDSHIP_TERRITORY_MONTH: "Territory curation (monthly)",
    MODERATION_RESOLVED: "Moderation report resolved",
    QUEST_UPDATE_CREATED: "Quest update posted",
    ACHIEVEMENT_RECEIVED: "Achievement earned",
    BOOKING_COMPLETED_PAID: "Paid booking completed",
    BOOKING_COMPLETED_FREE: "Free booking completed",
    BOOKING_ATTENDED: "Session attended",
    REFERRAL_REWARD: "Referral bonus",
    PROPOSAL_SUBMITTED: "Proposal submitted",
    PROPOSAL_ACCEPTED: "Proposal accepted",
    TERRITORY_MEMORY_CONTRIBUTED: "Territory knowledge contributed",
    POST_CREATED: "Post published",
    SERVICE_CREATED: "Service created",
    COURSE_CREATED: "Course created",
    EVENT_CREATED: "Event created",
    GUILD_JOINED: "Guild joined",
    COMPANY_JOINED: "Organization joined",
    POD_JOINED: "Pod joined",
    EVENT_REGISTERED: "Event registration",
    COURSE_ENROLLED: "Course enrollment",
    GOVERNANCE_VOTE_CAST: "Governance vote cast",
    REVIEW_GIVEN: "Review given",
    DOCUMENTATION_WRITTEN: "Documentation contributed",
    ECOLOGICAL_ANNOTATION: "Ecological annotation",
  };
  return map[type] ?? type.replace(/_/g, " ").toLowerCase();
}
