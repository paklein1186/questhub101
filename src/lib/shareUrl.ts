/**
 * Generate share-friendly URLs using the production domain.
 * All shared / invite links point to changethegame.xyz so they are
 * always accessible regardless of backend configuration.
 */

/** Production domain used for all shared / invite links */
const PRODUCTION_DOMAIN = "https://changethegame.xyz";

export type ShareEntityType =
  | "quest"
  | "guild"
  | "service"
  | "company"
  | "event"
  | "course"
  | "profile"
  | "territory"
  | "pod";

const ROUTE_MAP: Record<ShareEntityType, string> = {
  quest: "/quests",
  guild: "/guilds",
  service: "/services",
  company: "/companies",
  event: "/events",
  course: "/courses",
  profile: "/users",
  territory: "/territories",
  pod: "/pods",
};

/**
 * Returns the canonical share URL on changethegame.xyz.
 */
export function getShareUrl(type: ShareEntityType, id: string): string {
  const route = ROUTE_MAP[type] || "/" + type + "s";
  return `${PRODUCTION_DOMAIN}${route}/${encodeURIComponent(id)}`;
}

/**
 * Returns an invite link on changethegame.xyz with an invite ref param.
 */
export function getInviteUrl(type: ShareEntityType, id: string): string {
  const route = ROUTE_MAP[type] || "/" + type + "s";
  return `${PRODUCTION_DOMAIN}${route}/${encodeURIComponent(id)}?ref=invite`;
}

/**
 * Returns the clean, human-readable URL for display purposes.
 */
export function getDisplayUrl(type: ShareEntityType, id: string): string {
  const route = ROUTE_MAP[type] || "/" + type + "s";
  return `${PRODUCTION_DOMAIN}${route}/${encodeURIComponent(id)}`;
}
