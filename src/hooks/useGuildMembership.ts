import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useXpCredits } from "@/hooks/useXpCredits";
import { useCallback } from "react";

export type GuildMembershipRow = {
  id: string;
  user_id: string;
  guild_id: string;
  role: "guest" | "member";
  joined_at: string;
  membership_expires_at: string | null;
};

export function isActiveMember(
  membership: GuildMembershipRow | null | undefined,
  guild: { membership_duration_months?: number | null } | null | undefined
): boolean {
  if (!membership || membership.role !== "member") return false;
  if (!membership.membership_expires_at) return true;
  return new Date(membership.membership_expires_at) > new Date();
}

export function canCreateGuildQuest(
  guild: { members_only_quests?: boolean; enable_membership?: boolean } | null,
  membership: GuildMembershipRow | null | undefined
): boolean {
  if (!guild?.members_only_quests) return true;
  return isActiveMember(membership, guild);
}

export function canCreateGuildEvent(
  guild: { members_only_events?: boolean; enable_membership?: boolean } | null,
  membership: GuildMembershipRow | null | undefined
): boolean {
  if (!guild?.members_only_events) return true;
  return isActiveMember(membership, guild);
}

export function canAccessGuildVoting(
  guild: { members_only_voting?: boolean; enable_membership?: boolean } | null,
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
  const { spendCredits } = useXpCredits();

  const queryKey = ["guild-membership", guildId, userId];

  const { data: membership = null, isLoading, refetch } = useQuery({
    queryKey,
    enabled: !!guildId && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_guild_memberships" as any)
        .select("*")
        .eq("user_id", userId!)
        .eq("guild_id", guildId!)
        .maybeSingle();
      if (error) throw error;
      return data as GuildMembershipRow | null;
    },
  });

  const isGuest = membership?.role === "guest";
  const isMember = membership?.role === "member";

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey });
  }, [qc, queryKey]);

  const joinAsGuest = useCallback(async () => {
    if (!userId || !guildId) return;
    if (membership) {
      toast({ title: "You're already part of this guild." });
      return;
    }
    const { error } = await supabase
      .from("user_guild_memberships" as any)
      .insert({ user_id: userId, guild_id: guildId, role: "guest" });
    if (error) {
      toast({ title: "Failed to join", variant: "destructive" });
      return;
    }
    toast({ title: "You joined this guild as a guest." });
    refresh();
  }, [userId, guildId, membership, toast, refresh]);

  const becomeMember = useCallback(
    async (guild: {
      enable_membership?: boolean;
      entry_fee_credits?: number | null;
      membership_duration_months?: number | null;
    }) => {
      if (!userId || !guildId) return false;

      if (!guild.enable_membership || !guild.entry_fee_credits) {
        toast({
          title: "Membership not configured",
          description: "This guild has not set up membership yet.",
          variant: "destructive",
        });
        return false;
      }

      const fee = guild.entry_fee_credits;

      // Spend credits via the secure RPC
      const ok = await spendCredits(userId, {
        amount: fee,
        type: "guild_membership",
        source: `Guild membership fee`,
        relatedEntityType: "guild",
        relatedEntityId: guildId,
      });

      if (!ok) return false; // spendCredits already shows toast

      // Calculate expiry
      let expiresAt: string | null = null;
      if (guild.membership_duration_months) {
        const d = new Date();
        d.setMonth(d.getMonth() + guild.membership_duration_months);
        expiresAt = d.toISOString();
      }

      // Upsert membership
      const { error } = await supabase
        .from("user_guild_memberships" as any)
        .upsert(
          {
            user_id: userId,
            guild_id: guildId,
            role: "member",
            joined_at: new Date().toISOString(),
            membership_expires_at: expiresAt,
          },
          { onConflict: "user_id,guild_id" }
        );

      if (error) {
        toast({ title: "Failed to activate membership", variant: "destructive" });
        return false;
      }

      toast({ title: "You are now a member of this guild." });
      refresh();
      return true;
    },
    [userId, guildId, spendCredits, toast, refresh]
  );

  return {
    membership: membership as GuildMembershipRow | null,
    isGuest,
    isMember,
    isLoading,
    refresh,
    joinAsGuest,
    becomeMember,
  };
}
