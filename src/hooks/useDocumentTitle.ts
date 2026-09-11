import { useEffect } from "react";

const SITE_NAME = "changethegame";

/**
 * Sets the browser tab title for the current page, restoring the previous
 * title on unmount so navigating away (or between tabs of an SPA route)
 * never leaves a stale title behind.
 */
export function useDocumentTitle(title: string | undefined | null): void {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = `${title} · ${SITE_NAME}`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
