import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
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
  amount?: number; // override; if omitted uses XP_REWARDS[type]
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

  // ── Grant XP ──────────────────────────────────────────────
  const grantXp = useCallback(
    async (userId: string, params: GrantXpParams, silent = false) => {
      const amount = params.amount ?? XP_REWARDS[params.type] ?? 0;
      if (amount <= 0) return;

      // Daily cap check for COMMENT_UPVOTED
      if (params.type === XP_EVENT_TYPES.COMMENT_UPVOTED) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { data: todayEvents } = await supabase
          .from("xp_events" as any)
          .select("amount")
          .eq("user_id", userId)
          .eq("type", XP_EVENT_TYPES.COMMENT_UPVOTED)
          .gte("created_at", todayStart.toISOString()) as any;

        const todayTotal = (todayEvents ?? []).reduce(
          (sum: number, e: any) => sum + (e.amount ?? 0),
          0
        );
        if (todayTotal >= COMMENT_UPVOTE_DAILY_XP_CAP) return; // cap reached
      }

      // 1. Insert XP event
      await (supabase.from("xp_events" as any) as any).insert({
        user_id: userId,
        type: params.type,
        amount,
        topic_id: params.topicId ?? null,
        territory_id: params.territoryId ?? null,
        related_entity_type: params.relatedEntityType ?? null,
        related_entity_id: params.relatedEntityId ?? null,
      });

      // 2. Update profile totals
      const { data: profile } = await supabase
        .from("profiles")
        .select("xp, xp_recent_12m")
        .eq("user_id", userId)
        .maybeSingle();

      if (profile) {
        const newXpTotal = (profile.xp ?? 0) + amount;
        const newXpRecent = ((profile as any).xp_recent_12m ?? 0) + amount;
        const newLevel = computeLevelFromXp(newXpTotal);

        await supabase
          .from("profiles")
          .update({
            xp: newXpTotal,
            xp_recent_12m: newXpRecent,
            xp_level: newLevel,
            contribution_index: Math.floor(newXpTotal / 10),
          } as any)
          .eq("user_id", userId);
      }

      // 3. Also log in legacy xp_transactions for backward compat
      await (supabase.from("xp_transactions" as any) as any).insert({
        user_id: userId,
        type: "REWARD",
        amount_xp: amount,
        description: params.type,
        related_entity_type: params.relatedEntityType ?? null,
        related_entity_id: params.relatedEntityId ?? null,
      });

      if (!silent) {
        toast({ title: `+${amount} XP`, description: formatXpType(params.type) });
      }
    },
    [toast]
  );

  // ── Grant Credits ─────────────────────────────────────────
  const grantCredits = useCallback(
    async (userId: string, params: CreditParams, silent = false) => {
      if (params.amount <= 0) return;

      await (supabase.from("credit_transactions" as any) as any).insert({
        user_id: userId,
        type: params.type,
        amount: params.amount,
        source: params.source ?? null,
        related_entity_type: params.relatedEntityType ?? null,
        related_entity_id: params.relatedEntityId ?? null,
      });

      const { data: profile } = await supabase
        .from("profiles")
        .select("credits_balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (profile) {
        await supabase
          .from("profiles")
          .update({
            credits_balance: ((profile as any).credits_balance ?? 0) + params.amount,
          } as any)
          .eq("user_id", userId);
      }

      if (!silent) {
        toast({ title: `+${params.amount} Credits`, description: params.source ?? "Credits earned" });
      }
    },
    [toast]
  );

  // ── Spend Credits ─────────────────────────────────────────
  const spendCredits = useCallback(
    async (userId: string, params: CreditParams): Promise<boolean> => {
      const cost = Math.abs(params.amount);

      // Check balance
      const { data: profile } = await supabase
        .from("profiles")
        .select("credits_balance")
        .eq("user_id", userId)
        .maybeSingle();

      const balance = (profile as any)?.credits_balance ?? 0;
      if (balance < cost) {
        toast({
          title: "Not enough Credits",
          description: `You need ${cost} Credits but only have ${balance}.`,
          variant: "destructive",
        });
        return false;
      }

      // Insert negative transaction
      await (supabase.from("credit_transactions" as any) as any).insert({
        user_id: userId,
        type: params.type,
        amount: -cost,
        source: params.source ?? null,
        related_entity_type: params.relatedEntityType ?? null,
        related_entity_id: params.relatedEntityId ?? null,
      });

      // Decrement balance
      await supabase
        .from("profiles")
        .update({
          credits_balance: balance - cost,
        } as any)
        .eq("user_id", userId);

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
  };
  return map[type] ?? type.replace(/_/g, " ").toLowerCase();
}
