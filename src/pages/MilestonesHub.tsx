import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, CheckCircle, Circle, ArrowRight,
  Sparkles, ChevronDown, ChevronUp, Loader2,
} from "lucide-react";
import { CurrencyIcon } from "@/components/CurrencyIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { PageShell } from "@/components/PageShell";
import { useMilestones, type MilestoneWithProgress } from "@/hooks/useMilestones";
import { MILESTONE_ROUTES, PHASE_META } from "@/lib/milestoneRoutes";
import { cn } from "@/lib/utils";

function MilestoneCard({
  m,
  onComplete,
}: {
  m: MilestoneWithProgress;
  onComplete?: (code: string) => Promise<void>;
}) {
  const action = MILESTONE_ROUTES[m.code];
  const [completing, setCompleting] = useState(false);

  const handleTick = async () => {
    if (m.isCompleted || completing || !onComplete) return;
    setCompleting(true);
    await onComplete(m.code);
    setCompleting(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      className={cn(
        "rounded-xl border p-4 transition-all",
        m.isCompleted
          ? "border-primary/20 bg-primary/5"
          : "border-border bg-card hover:border-primary/20"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{m.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-semibold text-sm">{m.title}</h3>
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
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
          {m.subtitle && (
            <p className="text-[10px] text-muted-foreground/70 italic mt-0.5">
              {m.subtitle}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {m.reward_type === "XP" && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <CurrencyIcon currency="xp" className="h-3 w-3" /> +{m.reward_amount} XP
              </Badge>
            )}
            {m.reward_type === "CREDITS" && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <CurrencyIcon currency="credits" className="h-3 w-3" /> +{m.reward_amount} Credits
              </Badge>
            )}
            {m.reward_type === "BADGE" && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Trophy className="h-3 w-3 text-purple-500" /> Badge
              </Badge>
            )}
          </div>

          {!m.isCompleted && action && (
            <Button variant="link" size="sm" className="text-xs p-0 h-auto mt-2" asChild>
              <Link to={action.to}>
                {action.label} <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function MilestonesHub() {
  const { milestones, completedCount, totalCount, completeMilestone } = useMilestones();

  const phaseOrder = ["discover", "contribute", "create", "structure"];

  // Group milestones by phase
  const { phaseGroups, completed } = useMemo(() => {
    const groups: Record<string, MilestoneWithProgress[]> = {};
    const done: MilestoneWithProgress[] = [];
    for (const m of milestones) {
      if (m.isCompleted) {
        done.push(m);
      } else {
        const phase = (m as any).phase || "discover";
        if (!groups[phase]) groups[phase] = [];
        groups[phase].push(m);
      }
    }
    return { phaseGroups: groups, completed: done };
  }, [milestones]);

  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const xpEarned = completed.reduce(
    (s, m) => s + (m.reward_type === "XP" ? m.reward_amount : 0), 0
  );
  const creditsEarned = completed.reduce(
    (s, m) => s + (m.reward_type === "CREDITS" ? m.reward_amount : 0), 0
  );

  return (
    <PageShell>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <Trophy className="h-8 w-8 text-primary" />
            Your Journey
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your progress, unlock features, and earn rewards as you grow.
          </p>
        </div>

        {/* Progress overview */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Overall progress</p>
              <p className="text-2xl font-bold font-display">
                {completedCount} / {totalCount}
              </p>
            </div>
            <div className="text-right space-y-1">
              {xpEarned > 0 && (
                <div className="flex items-center gap-1.5 justify-end">
                  <CurrencyIcon currency="xp" className="h-4 w-4" />
                  <span className="text-sm font-semibold">{xpEarned} XP earned</span>
                </div>
              )}
              {creditsEarned > 0 && (
                <div className="flex items-center gap-1.5 justify-end">
                  <CurrencyIcon currency="credits" className="h-4 w-4" />
                  <span className="text-sm font-semibold">{creditsEarned} Credits earned</span>
                </div>
              )}
            </div>
          </div>
          <Progress value={progressPct} className="h-2" />
          <p className="text-xs text-muted-foreground">{progressPct}% complete</p>
        </div>

        {/* Upcoming — grouped by phase */}
        {phaseOrder.map((phase) => {
          const items = phaseGroups[phase];
          if (!items || items.length === 0) return null;
          const meta = PHASE_META[phase];
          return (
            <section key={phase} className="space-y-3">
              <h2 className={cn(
                "font-display text-lg font-semibold flex items-center gap-2",
                meta?.color
              )}>
                <span>{meta?.emoji}</span> {meta?.label}
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  ({items.length} remaining)
                </span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((m) => (
                  <MilestoneCard key={m.id} m={m} />
                ))}
              </div>
            </section>
          );
        })}

        <Separator />

        {/* Completed milestones */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" /> Completed ({completed.length})
            </h2>
            {completed.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1.5"
                onClick={() => setShowCompleted(!showCompleted)}
              >
                {showCompleted ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" /> Hide
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" /> Show
                  </>
                )}
              </Button>
            )}
          </div>
          {completed.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No milestones completed yet. Start exploring!
            </p>
          ) : showCompleted ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {completed.map((m) => (
                <MilestoneCard key={m.id} m={m} />
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </PageShell>
  );
}
