import { useEffect } from "react";
import { usePersona } from "@/hooks/usePersona";
import type { ReactNode } from "react";

/**
 * Adds or removes the `creative-universe` CSS class on <body>
 * based on the current user's effective lexicon mode or persona type.
 */
export function PersonaThemeProvider({ children }: { children: ReactNode }) {
  const { effectiveMode } = usePersona();

  useEffect(() => {
    if (effectiveMode === "CREATIVE") {
      document.body.classList.add("creative-universe");
    } else {
      document.body.classList.remove("creative-universe");
    }
    return () => {
      document.body.classList.remove("creative-universe");
    };
  }, [effectiveMode]);

  return <>{children}</>;
}