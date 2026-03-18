import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, CheckCircle, Circle, ArrowRight, Sparkles } from "lucide-react";
import { CurrencyIcon } from "@/components/CurrencyIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useMilestones, type MilestoneWithProgress } from "@/hooks/useMilestones";

const ACTIONS: Record<string, { label: string; to: string }> = {
  complete_profile: { label: "Edit profile", to: "/profile/edit" },
  add_spoken_languages: { label: "Add languages", to: "/me?tab=language" },
  join_first_guild: { label: "Browse guilds", to: "/explore?tab=guilds" },
  create_first_quest: { label: "Create a quest", to: "/quests/new" },
  publish_service: { label: "Create a service", to: "/services/new" },
  collaborate_pod: { label: "Explore pods", to: "/explore?tab=pods" },
  contribute_territory: { label: "Explore territories", to: "/explore/houses" },
  attend_event: { label: "Find events", to: "/calendar" },
  publish_course: { label: "Create a course", to: "/courses/new" },
  host_workshop: { label: "Create an event", to: "/calendar" },
};

function MiniMilestone({ m, index }: { m: MilestoneWithProgress; index: number }) {
  const action = ACTIONS[m.code];

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

  if (totalCount === 0) return null;

  const progressPct = Math.round((completedCount / totalCount) * 100);
  const upcoming = milestones.filter((m) => !m.isCompleted).slice(0, 4);
  const recentCompleted = milestones.filter((m) => m.isCompleted).slice(-2);

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
            See all <ArrowRight className="h-3 w-3 ml-1" />
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
      {upcoming.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Next steps
          </p>
          {upcoming.map((m, i) => (
            <MiniMilestone key={m.id} m={m} index={i} />
          ))}
        </div>
      )}

      {/* Recent completions */}
      {recentCompleted.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5 text-primary" /> Recently completed
          </p>
          {recentCompleted.map((m, i) => (
            <MiniMilestone key={m.id} m={m} index={i} />
          ))}
        </div>
      )}
    </motion.section>
  );
}
