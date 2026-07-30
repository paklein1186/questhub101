/**
 * Share & invite URL helpers.
 *
 * Social-media crawlers don't execute JS, so the SPA can't serve per-page
 * OG tags from index.html alone.
 *
 * Share links use the branded path https://changethegame.xyz/share which
 * proxies to the og-share edge function (see public/_redirects). The function:
 *   1. Fetches entity-specific title, description & image from the DB
 *   2. Serves HTML with proper OG meta tags for crawlers
 *   3. Redirects real browsers to changethegame.xyz instantly
 *
 * Social media cards display the clean og:url (changethegame.xyz), not
 * the internal function endpoint.
 */

/**
 * Branded share domain. The `public/_redirects` rule proxies /share/* to the
 * og-share edge function, so end users never see the raw Supabase URL.
 * Override via VITE_SHARE_DOMAIN if you want a dedicated subdomain later.
 */
const SHARE_DOMAIN = import.meta.env.VITE_SHARE_DOMAIN ?? "https://changethegame.xyz/share";

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
 * Returns a share URL on the branded path.
 * Format: https://changethegame.xyz/share/quest/ID
 */
export function getShareUrl(type: ShareEntityType, id: string): string {
  return `${SHARE_DOMAIN}/${encodeURIComponent(type)}/${encodeURIComponent(id)}`;
}

/**
 * Returns an invite link on the branded path.
 * Format: https://changethegame.xyz/share/quest/ID?ref=invite
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
