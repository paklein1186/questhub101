/**
 * ─── Graph Configuration ───────────────────────────────────
 * Centralised styling and mapping for the Systems Graph.
 * Edit values here to change node/edge appearance globally.
 */

// ─── Node type → visual config ─────────────────────────────
export const NODE_STYLES: Record<
  string,
  { color: string; size: number; shape: "circle" | "diamond" | "square"; label: string }
> = {
  user:      { color: "hsl(210,70%,55%)", size: 6,  shape: "circle",  label: "User" },
  guild:     { color: "hsl(150,60%,45%)", size: 10, shape: "circle",  label: "Guild" },
  quest:     { color: "hsl(40,90%,55%)",  size: 8,  shape: "diamond", label: "Quest" },
  territory: { color: "hsl(280,50%,55%)", size: 12, shape: "circle",  label: "Territory" },
  org:       { color: "hsl(0,60%,50%)",   size: 10, shape: "square",  label: "Organisation" },
  pod:       { color: "hsl(180,55%,45%)", size: 7,  shape: "circle",  label: "Pod" },
};

// ─── Relation type → edge visual ────────────────────────────
export const EDGE_STYLES: Record<string, { color: string; dashArray?: string; label: string }> = {
  follows:     { color: "hsl(210,30%,70%)", dashArray: "4,4", label: "Follows" },
  member_of:   { color: "hsl(150,50%,55%)", label: "Member of" },
  steward_of:  { color: "hsl(40,80%,50%)",  label: "Steward of" },
  quest_owner: { color: "hsl(40,80%,50%)",  label: "Quest owner" },
  partner:     { color: "hsl(280,40%,55%)", label: "Partner" },
  funds:       { color: "hsl(120,60%,45%)", label: "Funds" },
  trust:       { color: "hsl(0,50%,55%)",   label: "Trust" },
  located_in:  { color: "hsl(280,30%,60%)", dashArray: "6,3", label: "Located in" },
};

// ─── Weight → line width mapping ────────────────────────────
const MIN_WIDTH = 1;
const MAX_WIDTH = 6;

export function weightToWidth(weight: number): number {
  const clamped = Math.max(0, Math.min(1, weight));
  return MIN_WIDTH + (MAX_WIDTH - MIN_WIDTH) * clamped;
}

// ─── Default / fallback ─────────────────────────────────────
export const DEFAULT_EDGE_STYLE = { color: "hsl(0,0%,60%)", label: "Connected" };
export const DEFAULT_NODE_STYLE = { color: "hsl(0,0%,50%)", size: 6, shape: "circle" as const, label: "Entity" };
