import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface CTGBalanceBadgeProps {
  balance: number;
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

export function CTGBalanceBadge({ balance, size = "md", showLabel = true, onClick }: CTGBalanceBadgeProps) {
  const [glowing, setGlowing] = useState(false);
  const prevBalance = useRef(balance);

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
      <span className={iconSize[size]}>🌱</span>
      {isEmpty ? (
        <span className="whitespace-nowrap">
          {size === "sm" ? "0" : "Gagnez vos premiers $CTG"}
        </span>
      ) : (
        <span className="whitespace-nowrap font-semibold">
          {formatBalance(balance)}
          {showLabel && size !== "sm" && <span className="ml-1 font-normal opacity-75">$CTG</span>}
        </span>
      )}
    </button>
  );
}
