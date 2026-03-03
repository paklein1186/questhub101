import { useEffect } from "react";
import { usePiPanel } from "@/hooks/usePiPanel";

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
  const { setContext } = usePiPanel();

  useEffect(() => {
    setContext(contextType, contextId);
    return () => {
      setContext("global", null);
    };
  }, [contextType, contextId, setContext]);

  return null;
}
