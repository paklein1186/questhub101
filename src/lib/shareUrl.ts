/**
 * Share & invite URL helpers.
 *
 * Social-media crawlers don't execute JS, so the SPA can't serve per-page
 * OG tags from index.html alone.
 *
 * getShareUrl / getInviteUrl route through the og-share edge function which:
 *   1. Fetches entity-specific title, description & image from the DB
 *   2. Serves HTML with proper OG meta tags for crawlers
 *   3. Meta-refreshes real browsers to changethegame.xyz instantly
 *
 * getDisplayUrl returns the clean human-readable URL for display in the UI.
 * Social media cards will show the clean og:url, not the function URL.
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
 * Returns a share URL routed through og-share for social crawler support.
 * Browsers are meta-refreshed to the clean domain instantly.
 */
export function getShareUrl(type: ShareEntityType, id: string): string {
  return `${OG_SHARE_BASE}?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`;
}

/**
 * Returns an invite link through og-share for social crawler support.
 */
export function getInviteUrl(type: ShareEntityType, id: string): string {
  return `${OG_SHARE_BASE}?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}&ref=invite`;
}

/**
 * Returns the clean, human-readable URL for display in the UI.
 */
export function getDisplayUrl(type: ShareEntityType, id: string): string {
  const route = ROUTE_MAP[type] || "/" + type + "s";
  return `${PRODUCTION_DOMAIN}${route}/${encodeURIComponent(id)}`;
}
