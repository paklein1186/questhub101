import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, CheckCircle, Circle, ArrowRight, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { CurrencyIcon } from "@/components/CurrencyIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useMilestones, type MilestoneWithProgress } from "@/hooks/useMilestones";
import { MILESTONE_ROUTES } from "@/lib/milestoneRoutes";

function MiniMilestone({ m, index }: { m: MilestoneWithProgress; index: number }) {
  const action = MILESTONE_ROUTES[m.code];

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
        m.isCompleted
          ? "border-primary/20 bg-primary/5"
          : "border-border bg-card hover:border-primary/20"
      }`}
    >
      <span className="text-lg shrink-0">{m.icon}</span>

      {m.isCompleted ? (
        <CheckCircle className="h-4 w-4 text-primary shrink-0" />
      ) : (
        <Circle className="h-4 w-4 text-muted-foreground/30 shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{m.title}</p>
        {m.reward_type !== "NONE" && (
          <span className="text-[10px] text-muted-foreground">
            +{m.reward_amount} {m.reward_type === "XP" ? "XP" : "Credits"}
          </span>
        )}
      </div>

      {!m.isCompleted && action && (
        <Button variant="ghost" size="sm" className="text-xs h-7 px-2 shrink-0" asChild>
          <Link to={action.to}>
            Go <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      )}
    </motion.div>
  );
}

export function MilestoneJourney() {
  const { milestones, completedCount, totalCount } = useMilestones();
  const [expanded, setExpanded] = useState(false);

  if (totalCount === 0) return null;

  const progressPct = Math.round((completedCount / totalCount) * 100);
  const upcoming = milestones.filter((m) => !m.isCompleted);
  const completed = milestones.filter((m) => m.isCompleted);

  const visibleUpcoming = expanded ? upcoming : upcoming.slice(0, 4);
  const visibleCompleted = expanded ? completed : completed.slice(-2);
  const hasMore = upcoming.length > 4 || completed.length > 2;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Your Journey
        </h2>
        <Button variant="ghost" size="sm" className="text-xs h-7" asChild>
          <Link to="/me/milestones">
            Full page <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </div>

      {/* Progress bar */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {completedCount} of {totalCount} milestones
          </span>
          <span className="font-semibold text-primary">{progressPct}%</span>
        </div>
        <Progress value={progressPct} className="h-2" />
      </div>

      {/* Next milestones */}
      {visibleUpcoming.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Next steps ({upcoming.length})
          </p>
          {visibleUpcoming.map((m, i) => (
            <MiniMilestone key={m.id} m={m} index={i} />
          ))}
        </div>
      )}

      {/* Completed */}
      {visibleCompleted.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5 text-primary" /> Completed ({completed.length})
          </p>
          {visibleCompleted.map((m, i) => (
            <MiniMilestone key={m.id} m={m} index={i} />
          ))}
        </div>
      )}

      {/* Expand/Collapse toggle */}
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs h-8 gap-1.5 text-muted-foreground"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" /> Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" /> Show all milestones ({totalCount})
            </>
          )}
        </Button>
      )}
    </motion.section>
  );
}
