import { useState, createContext, useContext } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { BauhausShape } from "@/components/home/BauhausShape";
import { useLocation } from "react-router-dom";
import { Pause, Play } from "lucide-react";

/**
 * Renders the Bauhaus ambient shape for unauthenticated visitors
 * on screens wide enough to appreciate it (desktop/tablet only).
 * Only shown on guest landing routes.
 */
const GUEST_ROUTES = ["/welcome", "/landing/creative", "/landing/impact", "/landing/hybrid", "/landing/browse"];

export const BauhausPausedContext = createContext(false);

export function GuestBauhausShape() {
  const { session, loading } = useAuth();
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  const [paused, setPaused] = useState(false);

  // Don't render while auth is loading (prevents flicker),
  // for logged-in users, on mobile, or on non-guest routes
  if (loading || session || isMobile) return null;
  if (!GUEST_ROUTES.some((r) => pathname.startsWith(r))) return null;

  return (
    <>
      <BauhausPausedContext.Provider value={paused}>
        <BauhausShape />
      </BauhausPausedContext.Provider>

      {/* Discrete pause/play toggle — bottom-left */}
      <button
        onClick={() => setPaused((p) => !p)}
        className="fixed bottom-4 left-4 z-50 flex items-center justify-center w-8 h-8 rounded-full bg-muted/60 backdrop-blur-sm text-muted-foreground/60 hover:text-foreground hover:bg-muted/90 transition-all duration-200"
        aria-label={paused ? "Resume animation" : "Pause animation"}
        title={paused ? "Resume animation" : "Pause animation"}
      >
        {paused ? <Play size={14} /> : <Pause size={14} />}
      </button>
    </>
  );
}
