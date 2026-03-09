import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { X, Sprout } from "lucide-react";
import { cn } from "@/lib/utils";

const DISMISSED_KEY = "ctg-harvest-dismissed";

function getDismissed(): string[] {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]"); } catch { return []; }
}

export function HarvestWindowBanner() {
  const [dismissed, setDismissed] = useState<string[]>(getDismissed);

  const { data: window } = useQuery({
    queryKey: ["harvest-window-active"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("harvest_windows" as any)
        .select("*")
        .eq("is_active", true)
        .lte("starts_at", now)
        .gte("ends_at", now)
        .limit(1)
        .maybeSingle();
      return data as any | null;
    },
    refetchInterval: 60_000,
  });

  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!window?.ends_at) return;
    const update = () => {
      const diff = new Date(window.ends_at).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Ended"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${h}h ${m}m`);
    };
    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, [window?.ends_at]);

  if (!window || dismissed.includes(window.id)) return null;

  const handleDismiss = () => {
    const updated = [...dismissed, window.id];
    setDismissed(updated);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(updated));
  };

  return (
    <div className={cn(
      "relative w-full px-4 py-2.5 text-sm font-medium text-center",
      "bg-gradient-to-r from-amber-100 via-amber-50 to-emerald-100",
      "dark:from-amber-900/30 dark:via-amber-950/20 dark:to-emerald-900/30",
      "text-amber-900 dark:text-amber-200",
      "border-b border-amber-200/60 dark:border-amber-800/40",
      "animate-fade-in"
    )}>
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <Sprout className="h-4 w-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
        <span>
          🌾 <strong>Harvest Window:</strong> {window.label} — All $CTG contributions earn{" "}
          <strong className="text-emerald-700 dark:text-emerald-300">{window.multiplier}×</strong>
        </span>
        <span className="inline-flex items-center gap-1 bg-amber-200/60 dark:bg-amber-800/40 rounded-full px-2 py-0.5 text-xs font-mono">
          ⏱ {timeLeft}
        </span>
      </div>
      <button
        onClick={handleDismiss}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-amber-200/50 dark:hover:bg-amber-800/30 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
