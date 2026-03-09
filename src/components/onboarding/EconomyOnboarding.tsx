/**
 * Economy Onboarding — Option C
 *
 * Two components:
 *
 * 1. <EconomyModal>
 *    Full-screen dialog explaining the 5-value-layer system.
 *    Trigger: first visit to /me?tab=wallet, or manually via <EconomyModal open>.
 *    Also acts as "What's new in v2" for existing users when the $CTG layer is new to them.
 *    Ends with a persona-adaptive first-step CTA.
 *
 * 2. <PathwayCards>
 *    A persistent 3-card strip on the Home page.
 *    Shows the 3 most relevant next actions for this user, reading from useOnboardingProgress.
 *    Updates as the user completes steps. Never intrusive — lives below the prompt bar.
 *
 * Usage — WalletTab.tsx:
 *   import { useEconomyModal } from "@/components/onboarding/EconomyOnboarding";
 *   const { open, close, mode, openIfNeeded } = useEconomyModal();
 *   useEffect(() => { openIfNeeded(); }, []);
 *   <EconomyModal open={open} onClose={close} mode={mode} />
 *
 * Usage — HomeFeed.tsx:
 *   import { PathwayCards } from "@/components/onboarding/EconomyOnboarding";
 *   <PathwayCards persona={persona} progress={progress} steps={steps} />
 */

import { useState, useEffect, useCallback } from "react";
import { useIsDismissed } from "@/components/onboarding/ContextualHint";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, X, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { PersonaType } from "@/lib/personaLabels";
import type { OnboardingProgress } from "@/types/models";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EconomyLayer {
  key: string;
  emoji: string;
  label: string;
  color: string;
  textColor: string;
  borderColor: string;
  badge: string;
  howEarned: string;
  howSpent: string;
  decays: boolean;
  withdrawable: boolean;
  tagline: string;
}

// ─── Economy layer definitions ────────────────────────────────────────────────

const ECONOMY_LAYERS: EconomyLayer[] = [
  {
    key: "xp",
    emoji: "⭐",
    label: "XP — Reputation",
    color: "bg-violet-100 dark:bg-violet-950/40",
    textColor: "text-violet-700 dark:text-violet-300",
    borderColor: "border-violet-200 dark:border-violet-800",
    badge: "Permanent",
    tagline: "Your contribution history, immutable.",
    howEarned: "Joining quests, completing subtasks, being recognised by peers",
    howSpent: "Unlocks governance rights and stewardship eligibility",
    decays: false,
    withdrawable: false,
  },
  {
    key: "ctg",
    emoji: "🌱",
    label: "$CTG — Contribution Token",
    color: "bg-emerald-100 dark:bg-emerald-950/40",
    textColor: "text-emerald-700 dark:text-emerald-300",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    badge: "New in v2",
    tagline: "Earned by doing, not by buying.",
    howEarned: "Completing quests, subtasks, governance votes, rituals, mentorship",
    howSpent: "Transfer to collaborators, exchange for Credits, tracked in your OVN",
    decays: false,
    withdrawable: false,
  },
  {
    key: "coins",
    emoji: "🟩",
    label: "Coins — Mission Value",
    color: "bg-teal-100 dark:bg-teal-950/40",
    textColor: "text-teal-700 dark:text-teal-300",
    borderColor: "border-teal-200 dark:border-teal-800",
    badge: "Fiat-backed",
    tagline: "Real money inside the network.",
    howEarned: "Funded quests distribute Coins to contributors on completion",
    howSpent: "Redistributed to team members, withdrawn to your bank via Stripe",
    decays: false,
    withdrawable: true,
  },
  {
    key: "credits",
    emoji: "🔷",
    label: "Platform Credits",
    color: "bg-cyan-100 dark:bg-cyan-950/40",
    textColor: "text-cyan-700 dark:text-cyan-300",
    borderColor: "border-cyan-200 dark:border-cyan-800",
    badge: "Fades 1%/mo",
    tagline: "Use it or lose it — by design.",
    howEarned: "Platform plans, onboarding bonuses, $CTG exchange",
    howSpent: "Unlock features, create guilds & quests beyond your plan quota",
    decays: true,
    withdrawable: false,
  },
  {
    key: "fiat",
    emoji: "€",
    label: "Fiat — Real Income",
    color: "bg-amber-100 dark:bg-amber-950/40",
    textColor: "text-amber-700 dark:text-amber-300",
    borderColor: "border-amber-200 dark:border-amber-800",
    badge: "External",
    tagline: "Real-world income from funded work.",
    howEarned: "Funded quests, paid service bookings via Stripe",
    howSpent: "Withdrawn to your bank account",
    decays: false,
    withdrawable: true,
  },
];

// ─── LocalStorage helpers ─────────────────────────────────────────────────────

const SEEN_KEY = "ctg-economy-modal-seen";
const V2_KEY = "ctg-v2-whats-new-seen";

function markSeen(key: string) {
  localStorage.setItem(key, "1");
}

function hasSeen(key: string) {
  return !!localStorage.getItem(key);
}

// ─── useEconomyModal hook ─────────────────────────────────────────────────────

export function useEconomyModal() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"full" | "whats-new">("full");

  const openIfNeeded = useCallback(() => {
    if (!hasSeen(V2_KEY) && hasSeen(SEEN_KEY)) {
      setMode("whats-new");
      setOpen(true);
    } else if (!hasSeen(SEEN_KEY)) {
      setMode("full");
      setOpen(true);
    }
  }, []);

  const close = useCallback(() => {
    markSeen(SEEN_KEY);
    markSeen(V2_KEY);
    setOpen(false);
  }, []);

  return { open, setOpen, close, mode, openIfNeeded };
}

// ─── EconomyModal ────────────────────────────────────────────────────────────

interface EconomyModalProps {
  open: boolean;
  onClose: () => void;
  persona?: PersonaType;
  mode?: "full" | "whats-new";
}

const PERSONA_CTA: Record<PersonaType | "DEFAULT", { label: string; to: string; description: string }> = {
  IMPACT: {
    label: "Find an open mission",
    to: "/explore?tab=quests",
    description: "Join a quest to earn your first XP and $CTG.",
  },
  CREATIVE: {
    label: "Explore creations",
    to: "/explore?tab=quests",
    description: "Join a creation or launch your own project.",
  },
  HYBRID: {
    label: "Explore the network",
    to: "/explore",
    description: "Discover quests, guilds, and territories relevant to your work.",
  },
  UNSET: {
    label: "Explore the network",
    to: "/explore",
    description: "Discover quests, guilds, and territories to start contributing.",
  },
  DEFAULT: {
    label: "Explore the network",
    to: "/explore",
    description: "Discover quests, guilds, and territories to start contributing.",
  },
};

export function EconomyModal({ open, onClose, persona = "UNSET", mode = "full" }: EconomyModalProps) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const isWhatsNew = mode === "whats-new";
  const layers = isWhatsNew
    ? ECONOMY_LAYERS.filter((l) => l.key === "ctg")
    : ECONOMY_LAYERS;

  const totalSteps = layers.length;
  const isLast = step === totalSteps - 1;
  const layer = layers[step];
  const cta = PERSONA_CTA[persona] ?? PERSONA_CTA.DEFAULT;

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 top-[10%] bottom-auto z-50 mx-auto max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header strip */}
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">💎</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {isWhatsNew ? "What's new — March 2026" : "How value works"}
                </span>
              </div>
              <h2 className="text-xl font-bold text-foreground">
                {isWhatsNew
                  ? "Meet $CTG — your contribution token"
                  : "The 5-layer value system"}
              </h2>
              {!isWhatsNew && (
                <p className="text-sm text-muted-foreground mt-1">
                  Each layer serves a different purpose. None replaces the others.
                </p>
              )}
            </div>

            {/* Layer card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={layer.key}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
                className={cn("mx-6 mb-4 rounded-xl border p-5", layer.borderColor, layer.color)}
              >
                {/* Title row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{layer.emoji}</span>
                    <span className={cn("text-base font-semibold", layer.textColor)}>
                      {layer.label}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {layer.badge}
                  </Badge>
                </div>

                {/* Tagline */}
                <p className={cn("text-sm italic mb-4", layer.textColor, "opacity-80")}>
                  "{layer.tagline}"
                </p>

                {/* Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">How you earn it</p>
                    <p className="text-sm text-foreground leading-relaxed">{layer.howEarned}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">What you do with it</p>
                    <p className="text-sm text-foreground leading-relaxed">{layer.howSpent}</p>
                  </div>
                </div>

                {/* Flags */}
                <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border/50">
                  {layer.withdrawable && (
                    <span className="text-xs text-muted-foreground">
                      💶 Withdrawable to €
                    </span>
                  )}
                  {layer.decays && (
                    <span className="text-xs text-muted-foreground">
                      ⏳ Fades 1%/month
                    </span>
                  )}
                  {!layer.withdrawable && !layer.decays && (
                    <span className="text-xs text-muted-foreground">
                      🔒 Not purchasable or traded
                    </span>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Progress dots */}
            {!isWhatsNew && (
              <div className="flex items-center justify-center gap-1.5 mb-4">
                {layers.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === step ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
                    )}
                  />
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="px-6 pb-6">
              {isLast ? (
                <div className="space-y-3">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-3">{cta.description}</p>
                    <Button
                      className="w-full"
                      onClick={() => {
                        onClose();
                        navigate(cta.to);
                      }}
                    >
                      {cta.label} <ArrowRight className="h-4 w-4 ml-1.5" />
                    </Button>
                  </div>
                  <button
                    onClick={onClose}
                    className="block w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Skip for now — I'll explore on my own
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <button
                    onClick={onClose}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Skip
                  </button>
                  <Button size="sm" onClick={() => setStep((s) => s + 1)}>
                    Next <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── PathwayCards ─────────────────────────────────────────────────────────────

interface Step {
  key: keyof OnboardingProgress;
  label: string;
  description: string;
  link: string;
}

interface PathwayCardsProps {
  persona: PersonaType;
  progress: OnboardingProgress;
  steps: Step[];
  className?: string;
}

const PERSONA_STEP_ORDER: Record<PersonaType, string[]> = {
  IMPACT: ["joinedGuild", "followedQuests", "contributedTerritory", "attendedEvent", "createdService", "joinedPod", "bookedSession", "enrichedProfile"],
  CREATIVE: ["createdService", "joinedGuild", "followedQuests", "bookedSession", "joinedPod", "attendedEvent", "contributedTerritory", "enrichedProfile"],
  HYBRID: ["joinedGuild", "followedQuests", "createdService", "joinedPod", "contributedTerritory", "attendedEvent", "bookedSession", "enrichedProfile"],
  UNSET: ["joinedGuild", "followedQuests", "createdService", "joinedPod", "bookedSession", "attendedEvent", "contributedTerritory", "enrichedProfile"],
};

const PERSONA_CARD_LABELS: Partial<Record<PersonaType, Record<string, string>>> = {
  IMPACT: {
    joinedGuild: "Join an impact guild",
    followedQuests: "Launch your first mission",
    contributedTerritory: "Anchor yourself to a territory",
  },
  CREATIVE: {
    joinedGuild: "Find your circle or studio",
    followedQuests: "Start or join a creation",
    createdService: "Offer a skill session",
  },
};

const STEP_REWARDS: Record<string, string> = {
  joinedGuild: "+30 XP",
  followedQuests: "+50 Credits",
  createdService: "+15 XP",
  joinedPod: "+20 XP",
  contributedTerritory: "+40 XP",
  attendedEvent: "+20 Credits",
  bookedSession: "Connect",
  enrichedProfile: "+25 XP",
};

const STEP_ICONS: Record<string, React.ReactNode> = {
  joinedGuild: "⚔️",
  followedQuests: "🧭",
  createdService: "🛠️",
  joinedPod: "🫧",
  contributedTerritory: "🌍",
  attendedEvent: "📅",
  bookedSession: "🤝",
  enrichedProfile: "✨",
};

export function PathwayCards({ persona, progress, steps, className }: PathwayCardsProps) {
  const { dismissed, dismiss } = useIsDismissed("pathway_cards");
  const order = PERSONA_STEP_ORDER[persona] ?? PERSONA_STEP_ORDER.UNSET;
  const personaLabels = PERSONA_CARD_LABELS[persona] ?? {};

  const pending = steps
    .filter((s) => !progress[s.key])
    .sort((a, b) => {
      const ai = order.indexOf(a.key as string);
      const bi = order.indexOf(b.key as string);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    })
    .slice(0, 3);

  const completedCount = steps.filter((s) => progress[s.key]).length;
  const allDone = completedCount === steps.length;

  if (dismissed || allDone || pending.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-lg">🗺️</span>
            <span className="text-sm font-semibold text-foreground">Your next steps</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {completedCount} of {steps.length} completed
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Progress value={(completedCount / steps.length) * 100} className="w-20 h-1.5" />
          <button
            onClick={() => setDismissed(true)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Hide pathway"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {pending.map((step, i) => {
          const label = personaLabels[step.key as string] ?? step.label;
          const reward = STEP_REWARDS[step.key as string];
          const icon = STEP_ICONS[step.key as string];

          return (
            <Link key={step.key as string} to={step.link} className="group">
              <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all h-full">
                {/* Icon + step number */}
                <div className="flex items-center justify-between">
                  <span className="text-xl">{icon}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Step {i + 1}
                  </span>
                </div>

                {/* Label */}
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground leading-tight">
                    {label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Reward + arrow */}
                <div className="flex items-center justify-between mt-1">
                  {reward && (
                    <Badge variant="outline" className="text-[10px]">
                      {reward}
                    </Badge>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors ml-auto" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* See all link */}
      <div className="text-center">
        <Link to="/me/onboarding" className="text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1">
          See all steps <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
