import { useMemo } from "react";
import { useEntityRoles } from "@/hooks/useEntityRoles";
import { useFollow } from "@/hooks/useFollow";
import { FollowTargetType } from "@/types/enums";
import type { PermissionContext } from "@/lib/permissions";

/**
 * Builds a PermissionContext for the current user relative to a guild.
 * For quests, pass the parent guild's ID as guildId.
 */
export function usePermissionContext(
  guildId: string | undefined,
  currentUserId: string | undefined,
  membership: { role: string } | undefined
): PermissionContext {
  const { roles, getRolesForUser } = useEntityRoles("guild", guildId);
  const { isFollowing } = useFollow(FollowTargetType.GUILD, guildId || "");

  return useMemo(() => {
    if (!currentUserId || !guildId) {
      return {
        isAdmin: false,
        isSource: false,
        isMember: false,
        isFollower: false,
        userRoleIds: [],
        userRoleNames: [],
        isAuthenticated: !!currentUserId,
      };
    }

    const userEntityRoles = getRolesForUser(currentUserId);
    const isSource = userEntityRoles.some(
      (r) => r.is_default && r.name === "Source"
    );

    return {
      isAdmin: membership?.role === "ADMIN",
      isSource,
      isMember: !!membership,
      isFollower: isFollowing,
      userRoleIds: userEntityRoles.map((r) => r.id),
      userRoleNames: userEntityRoles.map((r) => r.name),
      isAuthenticated: true,
    };
  }, [currentUserId, guildId, membership, roles, getRolesForUser, isFollowing]);
}
