import { GOVERNANCE_XP_TIERS } from "@/lib/xpCreditsConfig";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";

type Persona = "impact" | "creative" | "hybrid" | "browse";

const VOCAB: Record<Persona, { action: string; unit: string }> = {
  impact: { action: "Complete missions", unit: "missions" },
  creative: { action: "Publish creations", unit: "creations" },
  hybrid: { action: "Contribute quests & sessions", unit: "contributions" },
  browse: { action: "Contribute to quests", unit: "contributions" },
};

export function LandingProgressionSection({ persona }: { persona: Persona }) {
  const { t } = useTranslation();
  const vocab = VOCAB[persona];

  return (
    <section className="py-16 sm:py-24 bg-muted/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-2xl sm:text-3xl font-display font-bold text-center mb-3"
        >
          {t("landing.progression.title")}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-center text-muted-foreground mb-12 max-w-xl mx-auto"
        >
          {t("landing.progression.sub", { unit: vocab.unit })}
        </motion.p>

        <div className="relative">
          {/* Connecting line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border hidden sm:block" />

          <div className="space-y-6 sm:space-y-8">
            {GOVERNANCE_XP_TIERS.map((tier, i) => (
              <motion.div
                key={tier.label}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-4 sm:gap-6"
              >
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold shrink-0 relative z-10">
                  {i + 1}
                </div>

                <div className="pt-1">
                  <p className="text-xs text-muted-foreground mb-0.5">
                    {t("landing.progression.levels", { levels: tier.levels })}
                  </p>
                  <h3 className="font-semibold text-foreground text-lg flex items-center gap-2">
                    {tier.label}
                    {i < GOVERNANCE_XP_TIERS.length - 1 && (
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground">{tier.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
