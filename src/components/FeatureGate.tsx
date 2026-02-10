import { type ReactNode } from "react";
import { useIsFeatureEnabled } from "@/hooks/useFeatureFlags";

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  /** What to show when feature is disabled. Defaults to nothing. */
  fallback?: ReactNode;
}

/** Conditionally render children based on a feature flag. */
export function FeatureGate({ feature, children, fallback = null }: FeatureGateProps) {
  const enabled = useIsFeatureEnabled(feature);
  return <>{enabled ? children : fallback}</>;
}

/** Page-level fallback when a feature is disabled */
export function FeatureDisabledPage({ feature }: { feature: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="text-2xl font-bold mb-2">Feature Unavailable</h1>
      <p className="text-muted-foreground max-w-md">
        This feature is currently disabled by the platform administrator. Please check back later.
      </p>
    </div>
  );
}
