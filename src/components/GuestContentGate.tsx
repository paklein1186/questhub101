import { useAuth } from "@/hooks/useAuth";
import { Lock } from "lucide-react";

interface GuestContentGateProps {
  children: React.ReactNode;
  /** Fallback shown to guests instead of children */
  fallback?: React.ReactNode;
  /** If true, blur the content instead of hiding completely */
  blur?: boolean;
}

/**
 * Hides or blurs content for unauthenticated users.
 * Use on detail pages to protect descriptions, bios, and sensitive data
 * while still showing names and images.
 */
export function GuestContentGate({ children, fallback, blur }: GuestContentGateProps) {
  const { session } = useAuth();
  if (session) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  if (blur) {
    return (
      <div className="relative select-none">
        <div className="blur-sm pointer-events-none" aria-hidden="true">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm rounded-full px-3 py-1.5 border border-border shadow-sm">
            <Lock className="h-3 w-3" />
            Sign up to see more
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Hook to check if the current visitor is a guest (not logged in).
 */
export function useIsGuest() {
  const { session } = useAuth();
  return !session;
}
