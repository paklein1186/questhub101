/**
 * Public Mode utilities for unauthenticated Explore views.
 * Redacts last names, provides helper checks, etc.
 */

/**
 * Redact a full name to "FirstName L." format.
 * If name has no space, return as-is.
 * Handles multi-part first names (e.g. "Pierre-Alexandre Kaspar" → "Pierre-Alexandre K.")
 */
export function redactName(fullName: string | null | undefined): string {
  if (!fullName) return "Unknown";
  const trimmed = fullName.trim();
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace <= 0) return trimmed;
  const firstName = trimmed.slice(0, lastSpace);
  const lastInitial = trimmed[lastSpace + 1]?.toUpperCase() ?? "";
  return `${firstName} ${lastInitial}.`;
}

/**
 * Approximate a count for public display ("~X" or "X+").
 * Small counts shown as-is; larger rounded to nearest 5/10.
 */
export function approxCount(count: number): string {
  if (count <= 5) return String(count);
  if (count <= 20) return `~${Math.round(count / 5) * 5}`;
  return `${Math.round(count / 10) * 10}+`;
}
