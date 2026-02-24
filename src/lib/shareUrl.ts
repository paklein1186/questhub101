/**
 * Share & invite URL helpers.
 *
 * Social-media crawlers don't execute JS, so the SPA can't serve per-page
 * OG tags from index.html alone.
 *
 * Share links use share.changethegame.xyz which proxies to the og-share
 * edge function. The function:
 *   1. Fetches entity-specific title, description & image from the DB
 *   2. Serves HTML with proper OG meta tags for crawlers
 *   3. Redirects real browsers to changethegame.xyz instantly
 *
 * Social media cards display the clean og:url (changethegame.xyz), not
 * the share subdomain.
 */

/** Branded share subdomain — points to og-share edge function */
const SHARE_DOMAIN = "https://share.changethegame.xyz";

/** Production domain used for display / canonical URLs */
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
  | "pod"
  | "topic";

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
  topic: "/topics",
};

/**
 * Returns a share URL on the branded share subdomain.
 * Format: share.changethegame.xyz/quest/ID
 */
export function getShareUrl(type: ShareEntityType, id: string): string {
  return `${SHARE_DOMAIN}/${encodeURIComponent(type)}/${encodeURIComponent(id)}`;
}

/**
 * Returns an invite link on the branded share subdomain.
 * Format: share.changethegame.xyz/quest/ID?ref=invite
 */
export function getInviteUrl(type: ShareEntityType, id: string): string {
  return `${SHARE_DOMAIN}/${encodeURIComponent(type)}/${encodeURIComponent(id)}?ref=invite`;
}

/**
 * Returns the clean, human-readable URL for display in the UI.
 */
export function getDisplayUrl(type: ShareEntityType, id: string): string {
  const route = ROUTE_MAP[type] || "/" + type + "s";
  return `${PRODUCTION_DOMAIN}${route}/${encodeURIComponent(id)}`;
}

/**
 * Returns the public booking URL for a service (shareable with guests).
 */
export function getBookingUrl(serviceId: string): string {
  return `${PRODUCTION_DOMAIN}/book/${encodeURIComponent(serviceId)}`;
}
