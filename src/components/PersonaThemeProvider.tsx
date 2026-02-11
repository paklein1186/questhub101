import { useEffect } from "react";
import { usePersona } from "@/hooks/usePersona";
import type { ReactNode } from "react";

/**
 * Adds or removes the `creative-universe` CSS class on <body>
 * based on the current user's persona type.
 */
export function PersonaThemeProvider({ children }: { children: ReactNode }) {
  const { persona } = usePersona();

  useEffect(() => {
    if (persona === "CREATIVE") {
      document.body.classList.add("creative-universe");
    } else {
      document.body.classList.remove("creative-universe");
    }
    return () => {
      document.body.classList.remove("creative-universe");
    };
  }, [persona]);

  return <>{children}</>;
}
