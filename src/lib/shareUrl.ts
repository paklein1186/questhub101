/**
 * Generate a share-friendly URL that serves proper OG meta tags
 * for social media crawlers (Facebook, Twitter, LinkedIn, Slack, etc.)
 * and redirects real browsers to the app.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

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
  profile: "/profile",
  territory: "/territories",
  pod: "/pods",
};

/**
 * Returns a URL suitable for sharing on social media.
 * Uses the OG-share edge function so crawlers get proper meta tags,
 * while real browsers are redirected to the app.
 */
export function getShareUrl(type: ShareEntityType, id: string): string {
  const route = ROUTE_MAP[type];
  return `${PRODUCTION_DOMAIN}${route}/${encodeURIComponent(id)}`;
}

/**
 * Returns an invite link using the production domain with ?ref=invite.
 */
export function getInviteUrl(type: ShareEntityType, id: string): string {
  const route = ROUTE_MAP[type];
  return `${PRODUCTION_DOMAIN}${route}/${encodeURIComponent(id)}?ref=invite`;
}
