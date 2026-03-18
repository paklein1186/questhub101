import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, ChevronUp, Gift, Sparkles, ArrowRight } from "lucide-react";
import { useMilestones, type MilestoneWithProgress } from "@/hooks/useMilestones";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

export function MilestoneTracker() {
  const { t } = useTranslation();
  const { milestones: milestonesWithProgress, completedCount, totalCount } = useMilestones();
  const [expanded, setExpanded] = useState(false);

  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Sort: completed last, then by sort_order
  const sorted = useMemo(() => {
    return [...milestonesWithProgress].sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
      return a.sort_order - b.sort_order;
    });
  }, [milestonesWithProgress]);

  if (totalCount === 0) return null;

  // Show first 3 uncompleted when collapsed, all when expanded
  const visible = expanded ? sorted : sorted.filter((m) => !m.isCompleted).slice(0, 3);
  const hasHidden = sorted.length > visible.length;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="text-left min-w-0">
            <h3 className="text-sm font-semibold text-foreground leading-tight">
              {t("milestones.title", "Milestones")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {completedCount}/{totalCount} {t("milestones.completed", "completed")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2 w-32">
            <Progress value={progressPct} className="h-1.5" />
            <span className="text-xs font-medium text-muted-foreground w-8 text-right">{progressPct}%</span>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Progress bar on mobile */}
      <div className="px-4 pb-2 sm:hidden">
        <Progress value={progressPct} className="h-1.5" />
      </div>

      {/* Milestone items */}
      <AnimatePresence initial={false}>
        {(expanded || visible.length > 0) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-1">
              {visible.map((m, i) => (
                <MilestoneRow key={m.id} milestone={m} index={i} />
              ))}

              {/* Show/hide toggle */}
              {hasHidden && !expanded && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(true);
                  }}
                  className="w-full text-xs text-primary hover:text-primary/80 font-medium py-1.5 transition-colors"
                >
                  {t("milestones.showAll", "Show all milestones")} ({sorted.length - visible.length} {t("milestones.more", "more")})
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MilestoneRow({ milestone, index }: { milestone: MilestoneWithProgress; index: number }) {
  const rewardLabel = milestone.reward_type !== "NONE" && milestone.reward_amount > 0
    ? `+${milestone.reward_amount} ${milestone.reward_type}`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
        milestone.isCompleted
          ? "bg-primary/5 opacity-70"
          : "bg-accent/20 hover:bg-accent/40"
      )}
    >
      {/* Status icon */}
      <div
        className={cn(
          "flex items-center justify-center h-6 w-6 rounded-full shrink-0 text-xs",
          milestone.isCompleted
            ? "bg-primary text-primary-foreground"
            : "border-2 border-muted-foreground/30"
        )}
      >
        {milestone.isCompleted ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <span>{milestone.icon || "🎯"}</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm leading-tight",
            milestone.isCompleted
              ? "text-muted-foreground line-through"
              : "text-foreground font-medium"
          )}
        >
          {milestone.title}
        </p>
        {milestone.description && !milestone.isCompleted && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {milestone.description}
          </p>
        )}
      </div>

      {/* Reward badge */}
      {rewardLabel && !milestone.isCompleted && (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
          <Gift className="h-3 w-3" />
          {rewardLabel}
        </span>
      )}

      {milestone.isCompleted && (
        <span className="text-[10px] font-medium text-primary shrink-0">✓</span>
      )}
    </motion.div>
  );
}
