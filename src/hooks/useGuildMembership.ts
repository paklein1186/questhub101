import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useCallback } from "react";

export type GuildMembershipRow = {
  id: string;
  user_id: string;
  guild_id: string;
  role: "guest" | "member";
  joined_at: string;
  membership_expires_at: string | null;
  status?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean | null;
  last_payment_at?: string | null;
};

type GuildLike = {
  membership_duration_months?: number | null;
  members_only_quests?: boolean;
  members_only_events?: boolean;
  members_only_voting?: boolean;
  enable_membership?: boolean;
};

export function isActiveMember(
  membership: GuildMembershipRow | null | undefined,
  guild: GuildLike | null | undefined
): boolean {
  if (!membership || membership.role !== "member") return false;
  if (membership.status && !["active", "grace"].includes(membership.status)) return false;
  const end = membership.current_period_end ?? membership.membership_expires_at;
  if (!end) return true;
  return new Date(end) > new Date();
}

export function canCreateGuildQuest(
  guild: GuildLike | null,
  membership: GuildMembershipRow | null | undefined
): boolean {
  if (!guild?.members_only_quests) return true;
  return isActiveMember(membership, guild);
}

export function canCreateGuildEvent(
  guild: GuildLike | null,
  membership: GuildMembershipRow | null | undefined
): boolean {
  if (!guild?.members_only_events) return true;
  return isActiveMember(membership, guild);
}

export function canAccessGuildVoting(
  guild: GuildLike | null,
  membership: GuildMembershipRow | null | undefined
): boolean {
  if (!guild?.members_only_voting) return true;
  return isActiveMember(membership, guild);
}

export function useGuildMembership(guildId: string | undefined) {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { toast } = useToast();
  const qc = useQueryClient();

  const queryKey = ["guild-membership", guildId, userId];

  const { data: membership = null, isLoading } = useQuery({
    queryKey,
    enabled: !!guildId && !!userId,
    queryFn: async (): Promise<GuildMembershipRow | null> => {
      const { data, error } = await supabase
        .from("user_guild_memberships" as any)
        .select("*")
        .eq("user_id", userId!)
        .eq("guild_id", guildId!)
        .maybeSingle();
      if (error) throw error;
      return (data as any) as GuildMembershipRow | null;
    },
  });

  // Latest application (used to gate paid membership behind approval)
  const { data: application = null } = useQuery({
    queryKey: ["guild-application", guildId, userId],
    enabled: !!guildId && !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("guild_applications" as any)
        .select("id, status, created_at")
        .eq("guild_id", guildId!)
        .eq("applicant_user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as any) ?? null;
    },
  });

  const isGuest = membership?.role === "guest";
  const isMember = membership?.role === "member";

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey });
    qc.invalidateQueries({ queryKey: ["guild-application", guildId, userId] });
    qc.invalidateQueries({ queryKey: ["profile"] });
    qc.invalidateQueries({ queryKey: ["xp-credits"] });
  }, [qc, queryKey, guildId, userId]);

  const joinAsGuest = useCallback(async () => {
    if (!userId || !guildId) return;
    if (membership) {
      toast({ title: "You're already part of this guild." });
      return;
    }
    const { error } = await supabase
      .from("user_guild_memberships" as any)
      .insert({ user_id: userId, guild_id: guildId, role: "guest", status: "active" });
    if (error) {
      toast({ title: "Failed to join", variant: "destructive" });
      return;
    }
    toast({ title: "You joined this guild as a guest." });
    refresh();
  }, [userId, guildId, membership, toast, refresh]);

  const becomeMember = useCallback(async () => {
    if (!userId || !guildId) return false;

    const { data, error } = await supabase.functions.invoke("guild-membership-pay", {
      body: { guild_id: guildId },
    });

    const errMsg = (data as any)?.error || (error as any)?.message;
    if (error || (data as any)?.error) {
      toast({
        title: "Payment could not be completed",
        description: errMsg ?? "Please try again.",
        variant: "destructive",
      });
      return false;
    }

    const amount = (data as any)?.amount ?? 0;
    toast({
      title: "Membership activated",
      description: `${amount} credits were transferred to the guild. Your remaining balance: ${(data as any)?.new_balance ?? "—"} credits.`,
    });
    refresh();
    return true;
  }, [userId, guildId, toast, refresh]);

  const cancelRenewal = useCallback(
    async (cancel: boolean) => {
      if (!membership) return;
      const { error } = await supabase
        .from("user_guild_memberships" as any)
        .update({ cancel_at_period_end: cancel })
        .eq("id", membership.id);
      if (error) {
        toast({ title: "Could not update renewal", variant: "destructive" });
        return;
      }
      toast({
        title: cancel ? "Renewal stopped" : "Renewal reactivated",
        description: cancel
          ? "Your membership stays active until the end of the current period."
          : "Your membership will renew automatically again.",
      });
      refresh();
    },
    [membership, toast, refresh]
  );

  return {
    membership: membership as GuildMembershipRow | null,
    application,
    isGuest,
    isMember,
    isLoading,
    refresh,
    joinAsGuest,
    becomeMember,
    cancelRenewal,
  };
}
