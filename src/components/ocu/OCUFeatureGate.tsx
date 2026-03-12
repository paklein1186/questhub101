import { ReactNode } from "react";
import { OCUUpgradePrompt } from "./OCUUpgradePrompt";

interface OCUFeatureGateProps {
  quest: any;
  isAdmin?: boolean;
  onEnable?: () => void;
  children: ReactNode;
  /** If true, skip the gate and render children directly (e.g. when contributions already exist) */
  bypassWhenActive?: boolean;
}

export function OCUFeatureGate({ quest, isAdmin = false, onEnable, children, bypassWhenActive = false }: OCUFeatureGateProps) {
  const ocuEnabled = quest?.ocu_enabled ?? false;

  if (!ocuEnabled && !bypassWhenActive) {
    return <OCUUpgradePrompt canEnable={isAdmin} onEnable={onEnable} />;
  }

  return <>{children}</>;
}
