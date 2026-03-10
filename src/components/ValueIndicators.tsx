import { Link } from "react-router-dom";
import { Wallet, Award, Gauge, TrendingUp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ValueIndicatorsProps {
  coins: number;
  ctg: number;
  credits: number;
  xp: number;
  compact?: boolean;
  onNavigate?: () => void;
}

/** Max values for the visual meters/bars — purely cosmetic, can be tuned */
const CREDITS_VISUAL_MAX = 500;
const XP_VISUAL_MAX = 5000;

export function ValueIndicators({ coins, ctg, credits, xp, compact, onNavigate }: ValueIndicatorsProps) {
  const px = compact ? "px-2 py-0.5" : "px-2.5 py-1";
  const text = "text-xs font-medium";

  const creditsPct = Math.min((credits / CREDITS_VISUAL_MAX) * 100, 100);
  const xpPct = Math.min((xp / XP_VISUAL_MAX) * 100, 100);

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* 🟩 Coins → fiat-backed mission currency */}
      {coins > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to="/me?tab=wallet"
              onClick={onNavigate}
              className={`inline-flex items-center gap-1 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 ${px} ${text} hover:opacity-80 transition-opacity`}
            >
              <Wallet className="h-3 w-3" />
              <span className="font-semibold">{coins.toLocaleString()}</span>
              {!compact && <span className="text-[10px] opacity-70">coins</span>}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            🟩 Coins — fiat-backed mission currency (1 Coin ≈ €0.04)
          </TooltipContent>
        </Tooltip>
      )}

      {/* 🌱 $CTG — contribution token */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to="/me?tab=wallet"
            onClick={onNavigate}
            className={`inline-flex items-center gap-1 rounded-full border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 ${px} ${text} hover:opacity-80 transition-opacity`}
          >
            <Award className="h-3 w-3" />
            <span className="font-semibold">{ctg.toLocaleString()}</span>
            {!compact && <span className="text-[10px] opacity-70">$CTG</span>}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          🌱 $CTG — earned by contributing to the commons. Fades 1%/month.
        </TooltipContent>
      </Tooltip>

      {/* 🔷 Credits → platform utility */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to="/me?tab=wallet"
            onClick={onNavigate}
            className={`inline-flex items-center gap-1 rounded-md bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400 ${px} ${text} hover:opacity-80 transition-opacity relative overflow-hidden`}
          >
            <Gauge className="h-3 w-3 relative z-10" />
            <span className="font-semibold relative z-10">{credits.toLocaleString()}</span>
            {!compact && <span className="text-[10px] opacity-70 relative z-10">cr</span>}
            <span
              className="absolute inset-y-0 left-0 bg-cyan-200/40 dark:bg-cyan-700/20 transition-all duration-500"
              style={{ width: `${creditsPct}%` }}
            />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          🔷 Credits — platform utility fuel. Spend on boosts, tools & capacity.
        </TooltipContent>
      </Tooltip>

      {/* ⭐ XP — permanent reputation */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to="/me"
            onClick={onNavigate}
            className={`inline-flex items-center gap-1 rounded-md bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 ${px} ${text} hover:opacity-80 transition-opacity relative overflow-hidden`}
          >
            <TrendingUp className="h-3 w-3 relative z-10" />
            <span className="font-semibold relative z-10">{xp.toLocaleString()}</span>
            {!compact && <span className="text-[10px] opacity-70 relative z-10">XP</span>}
            <span
              className="absolute inset-y-0 left-0 bg-violet-200/40 dark:bg-violet-700/20 transition-all duration-500"
              style={{ width: `${xpPct}%` }}
            />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          ⭐ XP — your permanent reputation score. Never decays.
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
