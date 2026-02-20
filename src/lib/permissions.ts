/**
 * Unified gradient-access permission evaluator.
 * Works identically for Guilds and Quests (fractal logic).
 */

export type AudienceType =
  | "PUBLIC"
  | "FOLLOWERS"
  | "MEMBERS"
  | "ACTIVE_ROLES"
  | "SELECTED_ROLES"
  | "OPERATIONS_TEAM"
  | "ADMINS_ONLY";

export const AUDIENCE_LABELS: Record<AudienceType, string> = {
  PUBLIC: "Public",
  FOLLOWERS: "Followers",
  MEMBERS: "Members",
  ACTIVE_ROLES: "Active roles",
  SELECTED_ROLES: "Selected roles",
  OPERATIONS_TEAM: "Operations Team",
  ADMINS_ONLY: "Admins only",
};

export const AUDIENCE_ORDER: AudienceType[] = [
  "PUBLIC",
  "FOLLOWERS",
  "MEMBERS",
  "ACTIVE_ROLES",
  "SELECTED_ROLES",
  "OPERATIONS_TEAM",
  "ADMINS_ONLY",
];

export interface PermissionContext {
  /** Is the user an admin of the guild (or quest's guild)? */
  isAdmin: boolean;
  /** Does the user hold the "Source" entity role for the guild? */
  isSource: boolean;
  /** Is the user a member? */
  isMember: boolean;
  /** Is the user a follower? */
  isFollower: boolean;
  /** The entity role IDs the user has (from entity_member_roles) */
  userRoleIds: string[];
  /** The entity role names the user has */
  userRoleNames: string[];
  /** Is the user logged in? */
  isAuthenticated: boolean;
}

/**
 * Evaluates whether a user can perform an action based on audience type.
 * Admin/Source override is always applied first.
 */
export function evaluateAudience(
  audienceType: AudienceType,
  allowedRoleIds: string[] | undefined,
  ctx: PermissionContext
): boolean {
  // Admin & Source override — always allowed
  if (ctx.isAdmin || ctx.isSource) return true;

  switch (audienceType) {
    case "PUBLIC":
      return true;
    case "FOLLOWERS":
      return ctx.isFollower || ctx.isMember;
    case "MEMBERS":
      return ctx.isMember;
    case "ACTIVE_ROLES":
      // User has at least one role assigned
      return ctx.isMember && ctx.userRoleIds.length > 0;
    case "SELECTED_ROLES":
      // User has at least one of the selected roles
      if (!allowedRoleIds?.length) return false;
      return ctx.isMember && ctx.userRoleIds.some((id) => allowedRoleIds.includes(id));
    case "OPERATIONS_TEAM":
      return ctx.isMember && ctx.userRoleNames.some((n) => n.toLowerCase() === "operations");
    case "ADMINS_ONLY":
      return false; // already handled by override
    default:
      return false;
  }
}

/** Check multiple permission dimensions at once */
export function evaluateRoomPermissions(
  room: {
    audience_type: string;
    allowed_role_ids?: string[];
    can_post_audience_type: string;
    can_reply_audience_type: string;
    can_manage_audience_type: string;
    can_manage_role_ids?: string[];
  },
  ctx: PermissionContext
) {
  return {
    canView: evaluateAudience(room.audience_type as AudienceType, room.allowed_role_ids, ctx),
    canPost: evaluateAudience(room.can_post_audience_type as AudienceType, room.allowed_role_ids, ctx),
    canReply: evaluateAudience(room.can_reply_audience_type as AudienceType, room.allowed_role_ids, ctx),
    canManage: evaluateAudience(room.can_manage_audience_type as AudienceType, room.can_manage_role_ids, ctx),
  };
}

export function evaluateDecisionPermissions(
  decision: {
    visibility_audience_type: string;
    allowed_visibility_role_ids?: string[];
    can_vote_audience_type: string;
    allowed_vote_role_ids?: string[];
    can_manage_decision_audience_type: string;
    can_manage_decision_role_ids?: string[];
  },
  ctx: PermissionContext
) {
  return {
    canView: evaluateAudience(decision.visibility_audience_type as AudienceType, decision.allowed_visibility_role_ids, ctx),
    canVote: evaluateAudience(decision.can_vote_audience_type as AudienceType, decision.allowed_vote_role_ids, ctx),
    canManage: evaluateAudience(decision.can_manage_decision_audience_type as AudienceType, decision.can_manage_decision_role_ids, ctx),
  };
}

/** Suggested default roles for new guilds */
export const SUGGESTED_DEFAULT_ROLES = [
  { name: "Source", color: "#6366f1", is_default: true, sort_order: 0 },
  { name: "Admin", color: "#ef4444", is_default: false, sort_order: 1 },
  { name: "Operations", color: "#f59e0b", is_default: false, sort_order: 2 },
  { name: "Active Member", color: "#22c55e", is_default: false, sort_order: 3 },
  { name: "Member", color: "#3b82f6", is_default: false, sort_order: 4 },
];
