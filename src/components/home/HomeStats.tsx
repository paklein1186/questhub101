import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Sprout, Shield, Compass, Trophy, Rocket, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";

interface Props {
  xp: number;
  ctgBalance: number;
  guildCount: number;
  questCount: number;
  achievements: { id: string; title: string }[];
  userId: string;
}

export function HomeStats({ xp, ctgBalance, guildCount, questCount, achievements, userId }: Props) {
  const { percentage, isComplete, completedCount, totalSteps } = useOnboardingProgress();

  return (
    <section className="space-y-4">
      {/* Onboarding banner */}
      {!isComplete && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Rocket className="h-6 w-6 text-primary" />
              <div>
                <h3 className="font-display font-semibold text-sm">Complete your setup</h3>
                <p className="text-xs text-muted-foreground">{completedCount} of {totalSteps} steps done</p>
              </div>
            </div>
            <Button size="sm" asChild>
              <Link to="/me/onboarding">View checklist <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </div>
          <Progress value={percentage} className="h-2" />
        </motion.div>
      )}

      {/* Stat cards + achievements */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Zap} label="⭐ XP" value={xp} accent />
        <StatCard icon={Sprout} label="🌱 $CTG" value={ctgBalance} color="emerald" />
        <StatCard icon={Shield} label="Guilds" value={guildCount} />
        <StatCard icon={Compass} label="Quests" value={questCount} />
      </div>

      {achievements.length > 0 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          <Trophy className="h-4 w-4 text-warning shrink-0" />
          {achievements.slice(0, 3).map((ach) => (
            <Link key={ach.id} to={`/achievements/${ach.id}`}>
              <Badge variant="secondary" className="text-[10px] whitespace-nowrap">{ach.title}</Badge>
            </Link>
          ))}
          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <Link to={`/users/${userId}`}>View all</Link>
          </Button>
        </div>
      )}
    </section>
  );
}

function StatCard({ icon: Icon, label, value, accent, color }: { icon: any; label: string; value: number; accent?: boolean; color?: "emerald" }) {
  const iconColor = color === "emerald"
    ? "text-emerald-600 dark:text-emerald-400"
    : accent ? "text-primary" : "text-muted-foreground";
  const bgColor = color === "emerald"
    ? "bg-emerald-100/60 dark:bg-emerald-950/40"
    : accent ? "bg-primary/10" : "bg-muted";

  return (
    <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${bgColor}`}>
        <Icon className={`h-4.5 w-4.5 ${iconColor}`} />
      </div>
      <div>
        <p className="text-lg font-bold leading-tight">{value}</p>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
