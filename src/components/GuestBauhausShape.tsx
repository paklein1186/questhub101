import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { BauhausShape } from "@/components/home/BauhausShape";

/**
 * Renders the Bauhaus ambient shape for unauthenticated visitors
 * on screens wide enough to appreciate it (desktop/tablet only).
 */
export function GuestBauhausShape() {
  const { session } = useAuth();
  const isMobile = useIsMobile();

  // Don't render for logged-in users (they get it via HomeFeed)
  // or on small screens
  if (session || isMobile) return null;

  return <BauhausShape />;
}
