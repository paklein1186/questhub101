import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, ArrowRight, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageShell } from "@/components/PageShell";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07 } }),
};

export default function OnboardingChecklist() {
  const { steps, progress, completedCount, totalSteps, percentage, isComplete } =
    useOnboardingProgress();

  return (
    <PageShell>
      <section className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
            <Rocket className="h-8 w-8 text-primary" />
            Getting Started
          </h1>
          <p className="mt-2 text-muted-foreground">
            Complete these steps to get the most out of the platform.
          </p>
        </motion.div>

        {/* Progress summary */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-border bg-card p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">
              {isComplete ? "🎉 All done!" : `${completedCount} of ${totalSteps} completed`}
            </span>
            <span className="text-sm font-semibold text-primary">{percentage}%</span>
          </div>
          <Progress value={percentage} className="h-3" />
        </motion.div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, i) => {
            const done = progress[step.key];
            return (
              <motion.div
                key={step.key}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                animate="show"
                className={`flex items-center gap-4 rounded-xl border p-4 transition-all ${
                  done
                    ? "border-primary/20 bg-primary/5"
                    : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
                }`}
              >
                {done ? (
                  <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
                ) : (
                  <Circle className="h-6 w-6 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm ${done ? "line-through text-muted-foreground" : ""}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
                {!done && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to={step.link}>
                      Go <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                )}
              </motion.div>
            );
          })}
        </div>
      </section>
    </PageShell>
  );
}
