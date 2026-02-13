import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { BauhausShape } from "@/components/home/BauhausShape";
import { useLocation } from "react-router-dom";

/**
 * Renders the Bauhaus ambient shape for unauthenticated visitors
 * on screens wide enough to appreciate it (desktop/tablet only).
 * Only shown on guest landing routes.
 */
const GUEST_ROUTES = ["/welcome", "/landing/creative", "/landing/impact", "/landing/hybrid", "/landing/browse"];

export function GuestBauhausShape() {
  const { session, loading } = useAuth();
  const isMobile = useIsMobile();
  const { pathname } = useLocation();

  // Don't render while auth is loading (prevents flicker),
  // for logged-in users, on mobile, or on non-guest routes
  if (loading || session || isMobile) return null;
  if (!GUEST_ROUTES.some((r) => pathname.startsWith(r))) return null;

  return <BauhausShape />;
}
