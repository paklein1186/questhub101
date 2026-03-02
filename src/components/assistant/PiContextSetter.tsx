import { useEffect } from "react";
import { usePiSidePanel } from "./PiSidePanelContext";

/**
 * Invisible component that sets Pi's context when an entity page mounts.
 * Resets to "global" on unmount.
 */
export function PiContextSetter({
  contextType,
  contextId,
}: {
  contextType: "guild" | "quest" | "territory";
  contextId?: string | null;
}) {
  const { setContext } = usePiSidePanel();

  useEffect(() => {
    setContext(contextType, contextId);
    return () => {
      setContext("global", null);
    };
  }, [contextType, contextId, setContext]);

  return null;
}
