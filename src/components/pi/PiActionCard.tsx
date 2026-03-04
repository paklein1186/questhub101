import { useState } from "react";
import { Lock, Check, Loader2, Clock, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export interface ActionCardProps {
  title: string;
  subtitle?: string;
  description?: string;
  effortMinutes?: number;
  xpReward?: number;
  trustReward?: number;
  buttonLabel: string;
  status: "ready" | "locked" | "in_progress" | "completed";
  unlockCondition?: string;
  priority: "primary" | "secondary" | "optional";
  onExecute: () => void;
}

const borderColors: Record<string, string> = {
  primary: "border-l-primary",
  secondary: "border-l-muted-foreground/40",
  optional: "border-l-muted-foreground/20",
  completed: "border-l-accent",
};

export function PiActionCard({
  title,
  subtitle,
  description,
  effortMinutes,
  xpReward,
  trustReward,
  buttonLabel,
  status,
  unlockCondition,
  priority,
  onExecute,
}: ActionCardProps) {
  const isLocked = status === "locked";
  const isCompleted = status === "completed";
  const isInProgress = status === "in_progress";
  const isReady = status === "ready";

  const borderColor = isCompleted
    ? borderColors.completed
    : borderColors[priority] || borderColors.secondary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "rounded-xl border-l-[3px] bg-card/40 backdrop-blur-sm p-3 transition-all duration-300",
        borderColor,
        isLocked && "opacity-50",
        isReady && "hover:bg-card/60 cursor-pointer",
        isCompleted && "ring-1 ring-accent/30"
      )}
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm font-medium leading-tight",
              isCompleted && "line-through text-muted-foreground"
            )}
          >
            {isLocked && <Lock className="inline h-3 w-3 mr-1 -mt-0.5 text-muted-foreground" />}
            {isCompleted && <Check className="inline h-3 w-3 mr-1 -mt-0.5 text-accent" />}
            {title}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{subtitle}</p>
          )}
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 shrink-0">
          {effortMinutes != null && (
            <span className="flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
              <Clock className="h-2.5 w-2.5" />
              {effortMinutes}m
            </span>
          )}
          {xpReward != null && xpReward > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-accent/10 text-accent">
              <Sparkles className="h-2.5 w-2.5" />
              +{xpReward}
            </span>
          )}
          {trustReward != null && trustReward > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">
              <Zap className="h-2.5 w-2.5" />
              +{trustReward}
            </span>
          )}
        </div>
      </div>

      {description && (
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{description}</p>
      )}

      {/* Unlock condition */}
      {isLocked && unlockCondition && (
        <p className="text-[10px] text-warning mt-2 flex items-center gap-1">
          <Lock className="h-2.5 w-2.5" />
          {unlockCondition}
        </p>
      )}

      {/* Action button */}
      <Button
        size="sm"
        variant={isCompleted ? "outline" : priority === "primary" ? "default" : "secondary"}
        className={cn(
          "w-full mt-2.5 h-8 text-xs font-medium transition-all duration-300",
          isCompleted && "border-accent/30 text-accent pointer-events-none"
        )}
        disabled={isLocked || isInProgress || isCompleted}
        onClick={onExecute}
      >
        {isInProgress ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
            Processing…
          </>
        ) : isCompleted ? (
          <>
            <Check className="h-3 w-3 mr-1" />
            Done
          </>
        ) : (
          buttonLabel
        )}
      </Button>
    </motion.div>
  );
}

/**
 * XP Toast — slides in from the top when XP is awarded.
 */
export function XpToast({ amount, onDone }: { amount: number; onDone: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        onAnimationComplete={() => {
          setTimeout(onDone, 3000);
        }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-2 rounded-full bg-accent/15 border border-accent/30 text-accent text-sm font-semibold shadow-lg backdrop-blur-md"
      >
        <Sparkles className="h-4 w-4" />
        +{amount} XP
      </motion.div>
    </AnimatePresence>
  );
}
