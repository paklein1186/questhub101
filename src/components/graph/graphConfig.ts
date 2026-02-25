/**
 * ─── Graph Configuration ───────────────────────────────────
 * Centralised styling and mapping for the Systems Graph.
 */

export const NODE_STYLES: Record<
  string,
  {
    color: string;
    glow: string;
    size: number;
    shape: "circle" | "diamond" | "square" | "hexagon";
    label: string;
    icon: string;
  }
> = {
  user: {
    color: "hsl(220, 75%, 58%)",
    glow: "hsla(220, 75%, 58%, 0.4)",
    size: 3.5,
    shape: "circle",
    label: "User",
    icon: "👤",
  },
  guild: {
    color: "hsl(152, 60%, 42%)",
    glow: "hsla(152, 60%, 42%, 0.4)",
    size: 5,
    shape: "hexagon",
    label: "Guild",
    icon: "⚔️",
  },
  quest: {
    color: "hsl(38, 92%, 55%)",
    glow: "hsla(38, 92%, 55%, 0.4)",
    size: 4,
    shape: "diamond",
    label: "Quest",
    icon: "⚡",
  },
  territory: {
    color: "hsl(272, 55%, 55%)",
    glow: "hsla(272, 55%, 55%, 0.4)",
    size: 6,
    shape: "circle",
    label: "Territory",
    icon: "🌍",
  },
  org: {
    color: "hsl(0, 65%, 52%)",
    glow: "hsla(0, 65%, 52%, 0.4)",
    size: 5,
    shape: "square",
    label: "Organisation",
    icon: "🏢",
  },
  pod: {
    color: "hsl(185, 55%, 42%)",
    glow: "hsla(185, 55%, 42%, 0.4)",
    size: 3.5,
    shape: "circle",
    label: "Pod",
    icon: "🔮",
  },
  natural_system: {
    color: "hsl(142, 60%, 38%)",
    glow: "hsla(142, 60%, 38%, 0.4)",
    size: 4.5,
    shape: "hexagon",
    label: "Natural System",
    icon: "🌿",
  },
};

export const EDGE_STYLES: Record<
  string,
  { color: string; activeColor: string; dashArray?: string; label: string }
> = {
  follows:     { color: "hsla(210, 25%, 60%, 0.15)", activeColor: "hsl(210, 50%, 65%)", dashArray: "3,3", label: "Follows" },
  member_of:   { color: "hsla(152, 45%, 50%, 0.2)",  activeColor: "hsl(152, 60%, 50%)", label: "Member of" },
  steward_of:  { color: "hsla(38, 70%, 50%, 0.25)",  activeColor: "hsl(38, 85%, 55%)",  label: "Steward of" },
  quest_owner: { color: "hsla(38, 70%, 50%, 0.2)",   activeColor: "hsl(38, 85%, 55%)",  label: "Quest owner" },
  partner:     { color: "hsla(272, 40%, 55%, 0.2)",   activeColor: "hsl(272, 55%, 60%)", label: "Partner" },
  funds:       { color: "hsla(120, 55%, 42%, 0.2)",   activeColor: "hsl(120, 65%, 50%)", dashArray: "2,3", label: "Funds" },
  trust:       { color: "hsla(0, 45%, 55%, 0.2)",     activeColor: "hsl(0, 60%, 60%)",   label: "Trust" },
  located_in:    { color: "hsla(272, 25%, 55%, 0.12)",  activeColor: "hsl(272, 40%, 60%)", dashArray: "5,3", label: "Located in" },
  anchored_in:   { color: "hsla(142, 40%, 40%, 0.18)",  activeColor: "hsl(142, 55%, 45%)", dashArray: "4,2", label: "Anchored in" },
  steward_of_ns: { color: "hsla(142, 55%, 38%, 0.22)",  activeColor: "hsl(142, 65%, 42%)", label: "Steward of" },
  funded_by:     { color: "hsla(45, 70%, 50%, 0.18)",    activeColor: "hsl(45, 80%, 55%)",  dashArray: "2,3", label: "Funded by" },
};

const MIN_WIDTH = 0.5;
const MAX_WIDTH = 3.5;

export function weightToWidth(weight: number): number {
  const clamped = Math.max(0, Math.min(1, weight));
  return MIN_WIDTH + (MAX_WIDTH - MIN_WIDTH) * clamped;
}

export const DEFAULT_EDGE_STYLE = { color: "hsla(0, 0%, 55%, 0.12)", activeColor: "hsl(0, 0%, 65%)", label: "Connected" };
export const DEFAULT_NODE_STYLE = {
  color: "hsl(0, 0%, 50%)", glow: "hsla(0, 0%, 50%, 0.3)",
  size: 3.5, shape: "circle" as const, label: "Entity", icon: "●",
};

export function drawHexagon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const px = x + r * Math.cos(angle);
    const py = y + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, radius: number) {
  const r = Math.min(radius, size);
  ctx.beginPath();
  ctx.moveTo(x - size + r, y - size);
  ctx.lineTo(x + size - r, y - size);
  ctx.quadraticCurveTo(x + size, y - size, x + size, y - size + r);
  ctx.lineTo(x + size, y + size - r);
  ctx.quadraticCurveTo(x + size, y + size, x + size - r, y + size);
  ctx.lineTo(x - size + r, y + size);
  ctx.quadraticCurveTo(x - size, y + size, x - size, y + size - r);
  ctx.lineTo(x - size, y - size + r);
  ctx.quadraticCurveTo(x - size, y - size, x - size + r, y - size);
  ctx.closePath();
}
