/**
 * Share & invite URL helpers.
 *
 * Social-media crawlers (LinkedIn, Facebook, Slack…) do NOT execute JavaScript,
 * so an SPA cannot serve per-page OG tags from index.html alone.
 *
 * getShareUrl / getInviteUrl route through the og-share edge function which:
 *   1. Fetches entity-specific title, description & image from the DB
 *   2. Serves an HTML page with proper OG meta tags for crawlers
 *   3. Meta-refreshes real browsers to changethegame.xyz
 *
 * getDisplayUrl returns the clean human-readable URL for display in the UI.
 */

const OG_SHARE_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/og-share`;

/** Production domain used for display URLs */
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
 * Returns a share URL that routes through the og-share edge function
 * so social crawlers receive entity-specific OG meta tags.
 * Human visitors are automatically redirected to changethegame.xyz.
 */
export function getShareUrl(type: ShareEntityType, id: string): string {
  return `${OG_SHARE_BASE}?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`;
}

/**
 * Returns an invite link through the og-share edge function.
 */
export function getInviteUrl(type: ShareEntityType, id: string): string {
  return `${OG_SHARE_BASE}?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}&ref=invite`;
}

/**
 * Returns the clean, human-readable URL for display purposes only.
 */
export function getDisplayUrl(type: ShareEntityType, id: string): string {
  const route = ROUTE_MAP[type] || "/" + type + "s";
  return `${PRODUCTION_DOMAIN}${route}/${encodeURIComponent(id)}`;
}
