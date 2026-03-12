import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Trophy, CheckCircle, Circle, ArrowRight,
  Sparkles, Lock,
} from "lucide-react";
import { CurrencyIcon } from "@/components/CurrencyIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { PageShell } from "@/components/PageShell";
import { useMilestones, type MilestoneWithProgress } from "@/hooks/useMilestones";
import { usePersona } from "@/hooks/usePersona";

// ─── Suggested actions for common milestones ────────────────
const SUGGESTED_ACTIONS: Record<string, { label: string; to: string }> = {
  complete_profile: { label: "Edit your profile", to: "/profile/edit" },
  add_spoken_languages: { label: "Go to language settings", to: "/me?tab=language" },
  join_first_guild: { label: "Browse guilds", to: "/explore?tab=guilds" },
  create_first_quest: { label: "Create a quest", to: "/quests/new" },
  publish_service: { label: "Create a service", to: "/services/new" },
  collaborate_pod: { label: "Explore pods", to: "/explore?tab=pods" },
  contribute_territory: { label: "Explore territories", to: "/explore/houses" },
  attend_event: { label: "Find events", to: "/calendar" },
  publish_course: { label: "Create a course", to: "/courses/new" },
  join_creative_circle: { label: "Browse circles", to: "/explore?tab=guilds" },
  creative_artwork_quest: { label: "Start a creative quest", to: "/quests/new" },
  creative_class: { label: "Publish a course", to: "/courses/new" },
  impact_territory_memory: { label: "Explore territories", to: "/explore/houses" },
  impact_quest: { label: "Create an impact quest", to: "/quests/new" },
  impact_guild: { label: "Join an impact guild", to: "/explore?tab=guilds" },
  host_workshop: { label: "Create an event", to: "/calendar" },
};

function MilestoneCard({ m }: { m: MilestoneWithProgress }) {
  const action = SUGGESTED_ACTIONS[m.code];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 transition-all ${
        m.isCompleted
          ? "border-primary/20 bg-primary/5"
          : "border-border bg-card hover:border-primary/20"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{m.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-semibold text-sm">{m.title}</h3>
            {m.isCompleted ? (
              <CheckCircle className="h-4 w-4 text-primary shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground/30 shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {m.reward_type === "XP" && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Zap className="h-3 w-3 text-amber-500" /> +{m.reward_amount} XP
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
            {m.persona_visibility !== "ALL" && (
              <Badge variant="outline" className="text-[10px] capitalize">
                {m.persona_visibility.toLowerCase()}
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
  const { milestones, completedCount, totalCount } = useMilestones();
  const { persona } = usePersona();

  const completed = milestones.filter((m) => m.isCompleted);
  const upcoming = milestones.filter((m) => !m.isCompleted);

  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Compute total rewards earned
  const xpEarned = completed.reduce(
    (s, m) => s + (m.reward_type === "XP" ? m.reward_amount : 0),
    0
  );
  const creditsEarned = completed.reduce(
    (s, m) => s + (m.reward_type === "CREDITS" ? m.reward_amount : 0),
    0
  );

  const getPersonaTitle = () => {
    if (persona === "CREATIVE") return "Your Creative Journey";
    if (persona === "IMPACT") return "Your Impact Journey";
    return "Your Journey";
  };

  return (
    <PageShell>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <Trophy className="h-8 w-8 text-primary" />
            {getPersonaTitle()}
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
                  <Zap className="h-4 w-4 text-amber-500" />
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

        {/* Upcoming milestones */}
        {upcoming.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Next steps
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {upcoming.map((m) => (
                <MilestoneCard key={m.id} m={m} />
              ))}
            </div>
          </section>
        )}

        <Separator />

        {/* Completed milestones */}
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" /> Completed ({completed.length})
          </h2>
          {completed.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No milestones completed yet. Start exploring!
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {completed.map((m) => (
                <MilestoneCard key={m.id} m={m} />
              ))}
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}
