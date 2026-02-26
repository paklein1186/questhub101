import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useCallback } from "react";

export interface ContributionLog {
  id: string;
  user_id: string;
  quest_id: string | null;
  subtask_id: string | null;
  guild_id: string | null;
  territory_id: string | null;
  contribution_type: string;
  role: string | null;
  title: string;
  description: string | null;
  deliverable_url: string | null;
  xp_earned: number;
  credits_earned: number;
  trust_signal: Record<string, number> | null;
  impact_signal: Record<string, number> | null;
  ip_licence: string;
  hours_logged: number | null;
  verified_by_user_id: string | null;
  verified_at: string | null;
  status: string;
  created_at: string;
  // Joined
  profile?: { name: string; avatar_url: string | null };
}

const CONTRIBUTION_TYPES = [
  "subtask_completed",
  "quest_completed",
  "proposal_accepted",
  "review_given",
  "ritual_participation",
  "documentation",
  "mentorship",
  "governance_vote",
  "ecological_annotation",
  "insight",
  "debugging",
  "other",
] as const;

export type ContributionType = (typeof CONTRIBUTION_TYPES)[number];

// ── Read contributions for a quest ───────────────────────────
export function useQuestContributions(questId: string | undefined) {
  return useQuery({
    queryKey: ["contribution-logs", "quest", questId],
    enabled: !!questId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contribution_logs" as any)
        .select("*")
        .eq("quest_id", questId!)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((data || []).map((d: any) => d.user_id))];
      let profileMap = new Map<string, { name: string; avatar_url: string | null }>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles_public")
          .select("user_id, name, avatar_url")
          .in("user_id", userIds);
        profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
      }

      return (data || []).map((d: any) => ({
        ...d,
        profile: profileMap.get(d.user_id) ?? { name: "Unknown", avatar_url: null },
      })) as unknown as ContributionLog[];
    },
  });
}

// ── Read contributions for a user ────────────────────────────
export function useUserContributions(userId: string | undefined) {
  return useQuery({
    queryKey: ["contribution-logs", "user", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contribution_logs" as any)
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as ContributionLog[];
    },
  });
}

// ── Manually log a contribution ──────────────────────────────
export function useLogContribution() {
  const { session } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const logContribution = useCallback(
    async (params: {
      questId?: string;
      subtaskId?: string;
      guildId?: string;
      territoryId?: string;
      contributionType: ContributionType;
      title: string;
      description?: string;
      deliverableUrl?: string;
      role?: string;
      hoursLogged?: number;
      ipLicence?: string;
    }) => {
      const userId = session?.user?.id;
      if (!userId) return null;

      const { data, error } = await supabase
        .from("contribution_logs" as any)
        .insert({
          user_id: userId,
          quest_id: params.questId ?? null,
          subtask_id: params.subtaskId ?? null,
          guild_id: params.guildId ?? null,
          territory_id: params.territoryId ?? null,
          contribution_type: params.contributionType,
          title: params.title,
          description: params.description ?? null,
          deliverable_url: params.deliverableUrl ?? null,
          role: params.role ?? null,
          hours_logged: params.hoursLogged ?? null,
          ip_licence: params.ipLicence ?? "CC-BY-SA",
        } as any)
        .select()
        .single();

      if (error) {
        toast({ title: "Failed to log contribution", variant: "destructive" });
        return null;
      }

      toast({ title: "Contribution logged" });
      qc.invalidateQueries({ queryKey: ["contribution-logs"] });
      return data;
    },
    [session, toast, qc]
  );

  // Verify a contribution (quest owner)
  const verifyContribution = useCallback(
    async (contributionId: string) => {
      const userId = session?.user?.id;
      if (!userId) return;

      const { error } = await supabase
        .from("contribution_logs" as any)
        .update({
          status: "verified",
          verified_by_user_id: userId,
          verified_at: new Date().toISOString(),
        } as any)
        .eq("id", contributionId);

      if (error) {
        toast({ title: "Failed to verify", variant: "destructive" });
        return;
      }

      toast({ title: "Contribution verified ✓" });
      qc.invalidateQueries({ queryKey: ["contribution-logs"] });
    },
    [session, toast, qc]
  );

  return { logContribution, verifyContribution };
}
