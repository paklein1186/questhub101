/**
 * Generate a share-friendly URL that serves proper OG meta tags
 * for social media crawlers (Facebook, Twitter, LinkedIn, Slack, etc.)
 * and redirects real browsers to the app.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

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

/**
 * Returns a URL suitable for sharing on social media.
 * When a crawler fetches this URL it gets HTML with proper OG tags
 * (title, description, image). Real browsers are instantly redirected
 * to the actual app page.
 */
export function getShareUrl(type: ShareEntityType, id: string): string {
  return `${SUPABASE_URL}/functions/v1/og-share?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`;
}
