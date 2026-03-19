import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, CheckCircle, Circle, ArrowRight, Sparkles, ChevronDown, ChevronUp, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useMilestones, type MilestoneWithProgress } from "@/hooks/useMilestones";
import { MILESTONE_ROUTES } from "@/lib/milestoneRoutes";

function MiniMilestone({ m, index, onComplete }: { m: MilestoneWithProgress; index: number; onComplete: (code: string) => Promise<void> }) {
  const action = MILESTONE_ROUTES[m.code];
  const [completing, setCompleting] = useState(false);

  const handleTick = async () => {
    if (m.isCompleted || completing) return;
    setCompleting(true);
    await onComplete(m.code);
    setCompleting(false);
  };

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
        <button
          onClick={handleTick}
          disabled={completing}
          className="shrink-0 group relative"
          title="Mark as completed"
        >
          {completing ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <>
              <Circle className="h-4 w-4 text-muted-foreground/30 group-hover:hidden" />
              <CheckCircle className="h-4 w-4 text-primary/50 hidden group-hover:block" />
            </>
          )}
        </button>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{m.title}</p>
        {m.reward_type !== "NONE" && (
          <span className="text-[10px] text-muted-foreground">
            +{m.reward_amount} {m.reward_type === "XP" ? "XP" : "Credits"}
          </span>
        )}
      </div>

      {action && (
        <Button variant="ghost" size="sm" className="text-xs h-7 px-2 shrink-0" asChild>
          <Link to={action.to}>
            {m.isCompleted ? action.label : "Go"} <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      )}
    </motion.div>
  );
}

export function MilestoneJourney() {
  const { milestones, completedCount, totalCount, completeMilestone } = useMilestones();
  const [expanded, setExpanded] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  if (totalCount === 0) return null;

  const progressPct = Math.round((completedCount / totalCount) * 100);
  const upcoming = milestones.filter((m) => !m.isCompleted);
  const completed = milestones.filter((m) => m.isCompleted);

  const visibleUpcoming = expanded ? upcoming : upcoming.slice(0, 4);
  const hasMore = upcoming.length > 4;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
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

      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {completedCount} of {totalCount} milestones
          </span>
          <span className="font-semibold text-primary">{progressPct}%</span>
        </div>
        <Progress value={progressPct} className="h-2" />
      </div>

      {visibleUpcoming.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Next steps ({upcoming.length})
          </p>
          {visibleUpcoming.map((m, i) => (
            <MiniMilestone key={m.id} m={m} index={i} onComplete={completeMilestone} />
          ))}
        </div>
      )}

      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs h-8 gap-1.5 text-muted-foreground"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <><ChevronUp className="h-3.5 w-3.5" /> Show less</>
          ) : (
            <><ChevronDown className="h-3.5 w-3.5" /> Show all next steps ({upcoming.length})</>
          )}
        </Button>
      )}

      {completed.length > 0 && (
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 gap-1.5 text-muted-foreground px-0"
            onClick={() => setShowCompleted(!showCompleted)}
          >
            {showCompleted ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showCompleted ? "Hide" : "Show"} completed ({completed.length})
          </Button>
          {showCompleted && completed.map((m, i) => (
            <MiniMilestone key={m.id} m={m} index={i} onComplete={completeMilestone} />
          ))}
        </div>
      )}
    </motion.section>
  );
}
