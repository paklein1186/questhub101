import { useEffect, useCallback } from "react";

const STORAGE_KEY_PREFIX = "last_tab_";

/**
 * Persists the last visited tab per entity (guild, quest, etc.) to localStorage.
 *
 * - `getLastTab(entityId)` returns the stored tab or the fallback.
 * - `saveLastTab(entityId, tab)` writes the tab to storage.
 *
 * Usage: call `saveLastTab` inside your `setActiveTab` wrapper,
 * and use `getLastTab` when computing the initial tab value.
 */
export function useLastTab(entityType: "quest" | "guild") {
  const prefix = `${STORAGE_KEY_PREFIX}${entityType}_`;

  const getLastTab = useCallback(
    (entityId: string | undefined, fallback = "overview"): string => {
      if (!entityId) return fallback;
      try {
        return localStorage.getItem(`${prefix}${entityId}`) || fallback;
      } catch {
        return fallback;
      }
    },
    [prefix],
  );

  const saveLastTab = useCallback(
    (entityId: string | undefined, tab: string) => {
      if (!entityId) return;
      try {
        if (tab === "overview") {
          localStorage.removeItem(`${prefix}${entityId}`);
        } else {
          localStorage.setItem(`${prefix}${entityId}`, tab);
        }
      } catch {
        // quota exceeded – silent
      }
    },
    [prefix],
  );

  return { getLastTab, saveLastTab };
}
