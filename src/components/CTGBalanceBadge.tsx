import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { getStewardTier } from "@/lib/xpCreditsConfig";

interface CTGBalanceBadgeProps {
  balance: number;
  lifetimeEarned?: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  onClick?: () => void;
}

function formatBalance(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

const sizeClasses = {
  sm: "text-xs px-2 py-0.5 gap-1",
  md: "text-sm px-3 py-1 gap-1.5",
  lg: "text-base px-4 py-1.5 gap-2",
} as const;

const iconSize = { sm: "text-xs", md: "text-sm", lg: "text-base" } as const;

export function CTGBalanceBadge({ balance, lifetimeEarned = 0, size = "md", showLabel = true, onClick }: CTGBalanceBadgeProps) {
  const [glowing, setGlowing] = useState(false);
  const prevBalance = useRef(balance);
  const tier = getStewardTier(lifetimeEarned);

  useEffect(() => {
    if (balance > prevBalance.current) {
      setGlowing(true);
      const t = setTimeout(() => setGlowing(false), 1000);
      return () => clearTimeout(t);
    }
    prevBalance.current = balance;
  }, [balance]);

  const isEmpty = balance === 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full font-medium transition-all",
        sizeClasses[size],
        isEmpty
          ? "bg-muted text-muted-foreground"
          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
        glowing && "ring-2 ring-emerald-400/60 shadow-[0_0_12px_rgba(16,185,129,0.4)] animate-pulse",
        onClick && "cursor-pointer hover:opacity-80",
        !onClick && "cursor-default",
      )}
    >
      <span className={iconSize[size]}>{tier.icon}</span>
      {isEmpty ? (
        <span className="whitespace-nowrap">
          0 <span className="font-normal opacity-75">$CTG</span>
        </span>
      ) : (
        <span className="whitespace-nowrap font-semibold">
          {formatBalance(balance)} <span className="font-normal opacity-75">$CTG</span>
          {size === "lg" && lifetimeEarned > 0 && (
            <span className="ml-1.5 font-normal opacity-70">{tier.label} {tier.icon}</span>
          )}
        </span>
      )}
    </button>
  );
}
