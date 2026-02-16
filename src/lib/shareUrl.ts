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
  profile: "/users",
  territory: "/territories",
  pod: "/pods",
};

/**
 * Returns a URL suitable for sharing on social media.
 * Uses the OG-share backend function so crawlers get proper meta tags
 * (title, description, image), while real browsers are redirected to the app.
 *
 * NOTE: These URLs go through the backend because static SPAs cannot
 * serve dynamic OG meta tags — crawlers don't execute JavaScript.
 */
export function getShareUrl(type: ShareEntityType, id: string): string {
  const route = ROUTE_MAP[type] || "/" + type + "s";
  return `${PRODUCTION_DOMAIN}${route}/${encodeURIComponent(id)}`;
}

/**
 * Returns an invite link through the OG-share function.
 */
export function getInviteUrl(type: ShareEntityType, id: string): string {
  const route = ROUTE_MAP[type] || "/" + type + "s";
  return `${PRODUCTION_DOMAIN}${route}/${encodeURIComponent(id)}?ref=invite`;
}
