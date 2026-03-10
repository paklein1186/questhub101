import { ReactNode } from "react";
import { OCUUpgradePrompt } from "./OCUUpgradePrompt";

interface OCUFeatureGateProps {
  quest: any;
  isAdmin?: boolean;
  onEnable?: () => void;
  children: ReactNode;
}

export function OCUFeatureGate({ quest, isAdmin = false, onEnable, children }: OCUFeatureGateProps) {
  const ocuEnabled = quest?.ocu_enabled ?? false;

  if (!ocuEnabled) {
    return <OCUUpgradePrompt canEnable={isAdmin} onEnable={onEnable} />;
  }

  return <>{children}</>;
}
