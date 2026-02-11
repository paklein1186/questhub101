import { useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePersona } from "@/hooks/usePersona";
import { useToast } from "@/hooks/use-toast";

// ─── Types ──────────────────────────────────────────────────
export interface Milestone {
  id: string;
  code: string;
  title: string;
  description: string | null;
  reward_type: "XP" | "CREDITS" | "BADGE" | "NONE";
  reward_amount: number;
  persona_visibility: "ALL" | "CREATIVE" | "IMPACT" | "HYBRID";
  trigger_type: string;
  trigger_config: Record<string, any>;
  is_enabled: boolean;
  sort_order: number;
  icon: string;
}

export interface UserMilestone {
  id: string;
  user_id: string;
  milestone_id: string;
  completed_at: string | null;
  acknowledged_at: string | null;
  reward_delivered: boolean;
}

export interface MilestoneWithProgress extends Milestone {
  userMilestone?: UserMilestone;
  isCompleted: boolean;
  isAcknowledged: boolean;
}

// ─── Hook: useMilestones ────────────────────────────────────
export function useMilestones() {
  const { user } = useAuth();
  const { persona } = usePersona();
  const qc = useQueryClient();
  const { toast } = useToast();

  // Fetch all enabled milestones
  const { data: milestones = [] } = useQuery({
    queryKey: ["milestones"],
    queryFn: async () => {
      const { data } = await supabase
        .from("milestones")
        .select("*")
        .eq("is_enabled", true)
        .order("sort_order");
      return (data ?? []) as Milestone[];
    },
    staleTime: 300_000,
  });

  // Fetch user's milestone progress
  const { data: userMilestones = [] } = useQuery({
    queryKey: ["user-milestones", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_milestones")
        .select("*")
        .eq("user_id", user!.id);
      return (data ?? []) as UserMilestone[];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  // Filter milestones by persona visibility
  const visibleMilestones = useMemo(() => {
    return milestones.filter((m) => {
      if (m.persona_visibility === "ALL") return true;
      if (persona === "HYBRID") return true;
      return m.persona_visibility === persona;
    });
  }, [milestones, persona]);

  // Merge milestones with user progress
  const milestonesWithProgress: MilestoneWithProgress[] = useMemo(() => {
    return visibleMilestones.map((m) => {
      const um = userMilestones.find((u) => u.milestone_id === m.id);
      return {
        ...m,
        userMilestone: um,
        isCompleted: !!um?.completed_at,
        isAcknowledged: !!um?.acknowledged_at,
      };
    });
  }, [visibleMilestones, userMilestones]);

  const completedCount = milestonesWithProgress.filter((m) => m.isCompleted).length;
  const totalCount = milestonesWithProgress.length;

  // Get the next unacknowledged completed milestone for popup
  const pendingPopup = useMemo(() => {
    return milestonesWithProgress.find((m) => m.isCompleted && !m.isAcknowledged);
  }, [milestonesWithProgress]);

  // Acknowledge a milestone popup
  const acknowledgeMilestone = useCallback(
    async (milestoneId: string) => {
      if (!user?.id) return;
      await supabase
        .from("user_milestones")
        .update({ acknowledged_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("milestone_id", milestoneId);

      // Update last popup time on profile
      await supabase
        .from("profiles")
        .update({ last_milestone_popup_at: new Date().toISOString() } as any)
        .eq("user_id", user.id);

      qc.invalidateQueries({ queryKey: ["user-milestones", user.id] });
    },
    [user?.id, qc]
  );

  // Complete a milestone + deliver reward
  const completeMilestone = useCallback(
    async (milestoneCode: string) => {
      if (!user?.id) return;
      const milestone = milestones.find((m) => m.code === milestoneCode);
      if (!milestone) return;

      // Check if already completed
      const existing = userMilestones.find((u) => u.milestone_id === milestone.id);
      if (existing?.completed_at) return;

      // Upsert user_milestone
      const { error } = await supabase.from("user_milestones").upsert(
        {
          user_id: user.id,
          milestone_id: milestone.id,
          completed_at: new Date().toISOString(),
          reward_delivered: milestone.reward_type !== "NONE",
        },
        { onConflict: "user_id,milestone_id" }
      );
      if (error) return;

      // Deliver reward
      if (milestone.reward_type === "XP" && milestone.reward_amount > 0) {
        // Insert XP event
        await supabase.from("xp_events").insert({
          user_id: user.id,
          event_type: "MILESTONE_REWARD",
          xp_amount: milestone.reward_amount,
          source_entity_type: "milestone",
          source_entity_id: milestone.id,
        } as any);
        // Update profile XP
        const { data: profile } = await supabase
          .from("profiles")
          .select("xp")
          .eq("user_id", user.id)
          .single();
        if (profile) {
          await supabase
            .from("profiles")
            .update({ xp: (profile.xp ?? 0) + milestone.reward_amount })
            .eq("user_id", user.id);
        }
      } else if (milestone.reward_type === "CREDITS" && milestone.reward_amount > 0) {
        // Insert credit transaction
        await supabase.from("credit_transactions").insert({
          user_id: user.id,
          type: "EARNED_ACTION",
          amount: milestone.reward_amount,
          source: `Milestone: ${milestone.title}`,
          related_entity_type: "milestone",
          related_entity_id: milestone.id,
        });
        // Update profile credits
        const { data: profile } = await supabase
          .from("profiles")
          .select("credits_balance")
          .eq("user_id", user.id)
          .single();
        if (profile) {
          await supabase
            .from("profiles")
            .update({ credits_balance: (profile.credits_balance ?? 0) + milestone.reward_amount })
            .eq("user_id", user.id);
        }
      }

      // Create notification
      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "milestone_completed",
        title: `Milestone unlocked: ${milestone.title}`,
        body:
          milestone.reward_type === "XP"
            ? `You earned +${milestone.reward_amount} XP!`
            : milestone.reward_type === "CREDITS"
            ? `You earned +${milestone.reward_amount} Credits!`
            : milestone.reward_type === "BADGE"
            ? `You earned a new badge!`
            : `Congratulations!`,
        related_entity_type: "milestone",
        related_entity_id: milestone.id,
      });

      qc.invalidateQueries({ queryKey: ["user-milestones", user.id] });
      qc.invalidateQueries({ queryKey: ["user-profile"] });
    },
    [user?.id, milestones, userMilestones, qc]
  );

  return {
    milestones: milestonesWithProgress,
    completedCount,
    totalCount,
    pendingPopup,
    acknowledgeMilestone,
    completeMilestone,
  };
}

// ─── Hook: useMilestoneChecker ──────────────────────────────
// Runs on key pages to check if any milestones should be completed
export function useMilestoneChecker() {
  const { user } = useAuth();
  const { completeMilestone } = useMilestones();

  const checkMilestones = useCallback(async () => {
    if (!user?.id) return;

    const [
      profileRes,
      spokenLangsRes,
      guildMembersRes,
      questsRes,
      servicesRes,
      podMembersRes,
      territoryMemoryRes,
      eventAttendeesRes,
      shareholdingsRes,
      coursesRes,
      eventsHostedRes,
    ] = await Promise.all([
      supabase.from("profiles").select("name, bio, avatar_url, headline").eq("user_id", user.id).single(),
      supabase.from("user_spoken_languages").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("guild_members").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("quests").select("id", { count: "exact", head: true }).eq("created_by_user_id", user.id).eq("is_deleted", false),
      supabase.from("services").select("id", { count: "exact", head: true }).eq("provider_user_id", user.id).eq("is_deleted", false),
      supabase.from("pod_members").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("territory_memories").select("id", { count: "exact", head: true }).eq("author_user_id", user.id),
      supabase.from("guild_event_attendees").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("shareholdings").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("courses").select("id", { count: "exact", head: true }).eq("owner_user_id", user.id).eq("is_published", true).eq("is_deleted", false),
      supabase.from("guild_events").select("id", { count: "exact", head: true }).eq("created_by_user_id", user.id),
    ]);

    // Profile completeness
    const profile = profileRes.data;
    if (profile) {
      const fields = [profile.name, profile.bio, profile.avatar_url, profile.headline];
      const filled = fields.filter(Boolean).length;
      const pct = (filled / fields.length) * 100;
      if (pct >= 70) completeMilestone("complete_profile");
    }

    if ((spokenLangsRes.count ?? 0) >= 1) completeMilestone("add_spoken_languages");
    if ((guildMembersRes.count ?? 0) >= 1) {
      completeMilestone("join_first_guild");
      completeMilestone("join_creative_circle");
      completeMilestone("impact_guild");
    }
    if ((questsRes.count ?? 0) >= 1) {
      completeMilestone("create_first_quest");
      completeMilestone("creative_artwork_quest");
      completeMilestone("impact_quest");
    }
    if ((servicesRes.count ?? 0) >= 1) completeMilestone("publish_service");
    if ((podMembersRes.count ?? 0) >= 1) completeMilestone("collaborate_pod");
    if ((territoryMemoryRes.count ?? 0) >= 1) {
      completeMilestone("contribute_territory");
      completeMilestone("impact_territory_memory");
    }
    if ((eventAttendeesRes.count ?? 0) >= 1) completeMilestone("attend_event");
    if ((shareholdingsRes.count ?? 0) >= 1) completeMilestone("become_shareholder");
    if ((coursesRes.count ?? 0) >= 1) {
      completeMilestone("publish_course");
      completeMilestone("creative_class");
    }
    if ((eventsHostedRes.count ?? 0) >= 1) completeMilestone("host_workshop");
  }, [user?.id, completeMilestone]);

  // Run check on mount
  useEffect(() => {
    const timer = setTimeout(checkMilestones, 2000); // delay to avoid blocking UI
    return () => clearTimeout(timer);
  }, [checkMilestones]);

  return { checkMilestones };
}
