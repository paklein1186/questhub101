/**
 * ContextualHint System — Option A
 *
 * Three components to drop anywhere in the app:
 *  • <SectionBanner>  — dismissable callout at the top of a page/section
 *  • <HintTooltip>    — (?) icon beside any label that opens a popover on hover/click
 *  • <EmptyHint>      — persona-aware zero-state card when a section has no content
 *
 * Dismissal is stored in localStorage under "ctg-dismissed-hints".
 * Reset by calling clearAllHints() or via Settings.
 *
 * Usage:
 *   import { SectionBanner, HintTooltip, EmptyHint } from "@/components/onboarding/ContextualHint";
 *
 *   <SectionBanner id="explore-intro" title="Discover the network" body="..." />
 *   <HintTooltip id="explore-ovn" content="Open Value Network: tracks contributions..." />
 *   <EmptyHint id="work-quests-empty" persona={persona} messages={PERSONA_MESSAGES} cta="Browse missions" to="/explore?tab=quests" />
 */

import { useState, useCallback } from "react";
import { X, Info, Lightbulb, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import type { PersonaType } from "@/lib/personaLabels";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// ── Storage helpers (Supabase-backed) ──────────────────────────

const LS_KEY = "ctg-dismissed-hints";

function getLSSet(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function addToLS(id: string) {
  const s = getLSSet(); s.add(id);
  localStorage.setItem(LS_KEY, JSON.stringify([...s]));
}

/** Reset both localStorage and Supabase dismissed_hints for the current user */
export async function clearAllHints(userId?: string) {
  localStorage.removeItem(LS_KEY);
  if (userId) {
    await supabase
      .from("profiles")
      .update({ dismissed_hints: [] } as any)
      .eq("user_id", userId);
  }
}

function useDismissedHints() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();

  const { data: remoteHints } = useQuery({
    queryKey: ["dismissed-hints", userId],
    enabled: !!userId,
    staleTime: Infinity,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("dismissed_hints")
        .eq("user_id", userId!)
        .maybeSingle();
      const remote = (data?.dismissed_hints as string[]) ?? [];
      const merged = new Set([...getLSSet(), ...remote]);
      localStorage.setItem(LS_KEY, JSON.stringify([...merged]));
      return remote;
    },
  });

  const { mutate: persistRemote } = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) return;
      const current = (remoteHints ?? []) as string[];
      if (current.includes(id)) return;
      await supabase
        .from("profiles")
        .update({ dismissed_hints: [...current, id] } as any)
        .eq("user_id", userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dismissed-hints", userId] });
    },
  });

  return { remoteHints, persistRemote };
}

export function useIsDismissed(id: string) {
  const [lsDismissed, setLsDismissed] = useState(() => getLSSet().has(id));
  const { remoteHints, persistRemote } = useDismissedHints();

  const remoteDismissed = (remoteHints ?? []).includes(id);
  const dismissed = lsDismissed || remoteDismissed;

  const dismiss = useCallback(() => {
    addToLS(id);
    setLsDismissed(true);
    persistRemote(id);
  }, [id, persistRemote]);

  return { dismissed, dismiss };
}

// ── End of storage helpers ──────────────────────────────────────

// ─── SectionBanner ───────────────────────────────────────────────────────────

interface SectionBannerProps {
  id: string;
  title: string;
  body: string;
  cta?: { label: string; to: string };
  variant?: "info" | "tip" | "economy";
  className?: string;
}

export function SectionBanner({
  id,
  title,
  body,
  cta,
  variant = "info",
  className,
}: SectionBannerProps) {
  const { dismissed, dismiss } = useIsDismissed(id);

  if (dismissed) return null;

  const variantStyles = {
    info: {
      wrapper: "bg-primary/5 border-primary/20",
      icon: <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />,
      titleClass: "text-foreground",
    },
    tip: {
      wrapper: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50",
      icon: <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />,
      titleClass: "text-amber-900 dark:text-amber-200",
    },
    economy: {
      wrapper: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50",
      icon: <span className="text-lg shrink-0 mt-0.5">🌱</span>,
      titleClass: "text-emerald-900 dark:text-emerald-200",
    },
  }[variant];

  return (
    <div
      className={cn(
        "relative flex items-start gap-3 rounded-lg border p-4 my-4",
        variantStyles.wrapper,
        className
      )}
    >
      {variantStyles.icon}
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-semibold leading-tight", variantStyles.titleClass)}>
          {title}
        </p>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{body}</p>
        {cta && (
          <Link
            to={cta.to}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline mt-2"
          >
            {cta.label} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      <button
        onClick={dismiss}
        className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        aria-label="Dismiss hint"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── HintTooltip ─────────────────────────────────────────────────────────────

interface HintTooltipProps {
  content: string;
  learnMore?: string;
  className?: string;
}

export function HintTooltip({ content, learnMore, className }: HintTooltipProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center justify-center h-4 w-4 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors",
            className
          )}
          aria-label="More info"
        >
          <Info className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 text-sm" side="top" align="center">
        <p className="text-muted-foreground leading-relaxed">{content}</p>
        {learnMore && (
          <Link
            to={learnMore}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline mt-2"
          >
            Learn more <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ─── EmptyHint ───────────────────────────────────────────────────────────────

type PersonaMessages = Partial<Record<PersonaType | "DEFAULT", string>>;

interface EmptyHintProps {
  id: string;
  messages: PersonaMessages;
  persona: PersonaType;
  cta: string;
  to: string;
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyHint({
  id: _id,
  messages,
  persona,
  cta,
  to,
  icon,
  className,
}: EmptyHintProps) {
  const message = messages[persona] ?? messages["DEFAULT"] ?? "";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-6 rounded-xl border border-dashed border-border bg-muted/30",
        className
      )}
    >
      {icon && (
        <div className="text-3xl mb-4">{icon}</div>
      )}
      <p className="text-sm text-muted-foreground max-w-md leading-relaxed mb-4">
        {message}
      </p>
      <div>
        <Button asChild variant="outline" size="sm">
          <Link to={to}>
            {cta} <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

// ─── Pre-built hint library ───────────────────────────────────────────────────

export const HINTS = {

  // ── Section banners ──────────────────────────────────────────────────────

  banners: {

    home: {
      id: "home-intro",
      variant: "info" as const,
      title: "Your mission control",
      body: "Type anything you want to do or achieve — Pi will route you toward the right quests, guilds, and collaborators. Below you'll find your active tasks and what's moving in your network.",
    },

    explore: {
      id: "explore-intro",
      variant: "tip" as const,
      title: "The full map of the network",
      body: "Each tab below is a different type of entity. Guilds are lasting collectives, Quests are time-bounded actions, Services are bookable skills, Territories are living places. Drag tabs to reorder them.",
    },

    feed: {
      id: "feed-intro",
      variant: "info" as const,
      title: "One stream, the whole network",
      body: "Posts from guilds, territories, quests, and people you follow appear here. Filter by topic house (#) or source type to focus on what's relevant to your work.",
    },

    work: {
      id: "work-intro",
      variant: "tip" as const,
      title: "Your personal workshop",
      body: "Everything you're building lives here: active quests, your offer (services), your teams (guilds & pods), your calendar and bookings. It's not a to-do list — it's your entire contribution layer.",
    },

    network: {
      id: "network-intro",
      variant: "info" as const,
      title: "Your relational capital",
      body: "Who you follow, who follows you, your XP ranking, the territories and topics you're tracking. Use the Matchmaker tab to let the AI surface the right collaborators for what you're doing.",
    },

    guildFirst: {
      id: "guild-first-visit",
      variant: "tip" as const,
      title: "You're visiting a Guild",
      body: "Guilds are living organisations inside the network — they hold quests, knowledge, members, and their own economy. Follow to see activity in your feed, or apply to join if membership is open.",
    },

    questFirst: {
      id: "quest-first-visit",
      variant: "tip" as const,
      title: "A Quest is a bounded action",
      body: "It has a goal, a team, a timeline, and a reward. Join to contribute, complete deliverables to earn XP and $CTG tokens, and leave a traceable contribution in your personal OVN.",
    },

    territoryFirst: {
      id: "territory-first-visit",
      variant: "tip" as const,
      title: "A Territory is a living place",
      body: "This is a bioregional or geographic unit. It connects human activity (guilds, quests, events) to measurable ecological and social indicators in the Living Dashboard.",
    },

    agents: {
      id: "agents-intro",
      variant: "info" as const,
      title: "AI agents amplify your team",
      body: "Agents are AI co-pilots with specialised roles: grant writing, territory analysis, facilitation, coaching. Deploy one inside a guild or quest — they work best with a specific mandate.",
    },

    walletFirst: {
      id: "wallet-first-visit",
      variant: "economy" as const,
      title: "The platform has 5 value layers",
      body: "Fiat €, 🟩 Coins (fiat-backed), 🔷 Credits (platform utility, fades 1%/month), 🌱 $CTG (earned by contribution, transferable), and ⭐ XP (reputation, permanent). Each works differently.",
      cta: { label: "See how value flows", to: "/ecosystem?tab=ovn" },
    },

    ovnFirst: {
      id: "ovn-first-visit",
      variant: "economy" as const,
      title: "The Open Value Network is your contribution ledger",
      body: "Every subtask, proposal, review, and governance vote you complete is logged here with a weighted unit score. $CTG is distributed based on these weights. The guild can vote to adjust them.",
    },
  },

  // ── Tab & element tooltips ────────────────────────────────────────────────

  tooltips: {

    exploreEntities: {
      content: "Guilds are lasting collectives (like an NGO or studio). Pods are lighter, project-scoped teams. Companies are registered organisations.",
    },
    exploreQuests: {
      content: "Time-bounded actions with a goal, team, and reward. OPEN: anyone can join. CLOSED: apply. IDEA: not yet launched.",
    },
    exploreServices: {
      content: "Bookable 1-on-1 or group sessions with practitioners. Payable with XP, Credits, or €.",
    },
    exploreAgents: {
      content: "Specialised AI co-pilots you can deploy inside your guild or quest. They don't replace your team — they accelerate specific tasks.",
    },
    exploreHouses: {
      content: "Topic rooms (#regeneration, #agriculture…) that cut across guilds. Follow a House to surface related quests and posts everywhere.",
    },
    exploreTerritories: {
      content: "Geographic or bioregional zones with their own living dashboards, partner guilds, and community activity.",
    },
    exploreMatchmaker: {
      content: "Describe a need and the AI will suggest the most relevant guilds, quests, or people to connect with.",
    },

    workTasks: {
      content: "All your active quests distilled into a single checklist. Mark deliverables done here to trigger XP distribution.",
    },
    workIdeas: {
      content: "Quest drafts at IDEA status — in design, not yet published. Develop them before launching to contributors.",
    },
    workTeams: {
      content: "All your guilds, pods, and companies in one view. Click one to enter its workspace.",
    },
    workBookings: {
      content: "Incoming requests for your services. Accept, reschedule, or mark complete here.",
    },

    guildOVN: {
      content: "Open Value Network: tracks contributions, roles, and how value ($CTG) flows among members. The guild's cooperative ledger.",
      learnMore: "/ecosystem/ovn",
    },
    guildLiving: {
      content: "Ecological and social indicators for the territory this guild is rooted in. Human activity meets biosphere data.",
    },
    guildTrust: {
      content: "Peer trust scores given by members to each other. Trust is reputation earned through consistent, quality contributions.",
    },
    guildRituals: {
      content: "Recurring calls, ceremonies, or check-ins that sustain the guild's rhythm. Join one or schedule your own.",
    },
    guildDecisions: {
      content: "Formal proposals and votes that shape the guild's direction — including OVN weight changes.",
    },
    guildGraph: {
      content: "A visual network map of this guild: its members, quests, partners, and territorial connections.",
    },
    guildAI: {
      content: "AI Studio: Chat with the guild's context, use specialised tools (Matchmaker, Facilitator), manage the guild's Memory, or deploy Agents.",
    },
    guildPartners: {
      content: "Formal affiliations with other guilds or organisations. Partnerships unlock shared quest pools and trust bridges.",
    },

    territoryLiving: {
      content: "Ecological and social indicators updated periodically: soil, biodiversity, economic flows, community vitality.",
    },
    territoryEcosystem: {
      content: "All guilds, companies, and initiatives active in this territory. The cooperative fabric of this place.",
    },

    questXP: {
      content: "XP is earned by completing quests and recognised by peers. It accumulates into a level reflecting your contribution history. Never decays, never purchased.",
    },
    questCTG: {
      content: "$CTG tokens are earned on verified completion. They're tracked in your personal OVN and transferable to other contributors.",
    },
    questType: {
      content: "OPEN: anyone joins. CLOSED: apply, host approves. IDEA: in design, not yet active. PROJECT: multi-milestone campaign.",
    },

    creditFade: {
      content: "Credits fade by 1% per month — this is demurrage, a design to encourage circulation rather than hoarding.",
    },
    ctgToken: {
      content: "$CTG tokens are earned through contributions (quests, subtasks, governance). They can be transferred to others or exchanged for Credits. Not purchasable.",
      learnMore: "/ecosystem/ovn",
    },
    coins: {
      content: "🟩 Coins are fiat-backed mission units. Earned from funded quests, withdrawable to your bank via Stripe Connect.",
    },
    shares: {
      content: "Shares represent long-term commitment to the platform's mission. They give governance weight and dividend eligibility, but cannot be traded.",
    },

    taskBoard: {
      content: "All quests and subtasks you're involved in, distilled into a single checklist. Your contribution layer, at a glance.",
    },
    monOVN: {
      content: "Your personal contribution trace: XP per guild, weighted units logged, $CTG earned, contributions in the last 30 days.",
    },
    guidedPathways: {
      content: "Suggested next steps based on your persona and what's active in your network. Updates as you progress.",
    },
  },

  // ── Empty states ──────────────────────────────────────────────────────────

  empty: {

    workQuests: {
      id: "work-quests-empty",
      messages: {
        IMPACT: "No active missions yet. Browse open quests in Explore, or create one to mobilise others around an urgent challenge.",
        CREATIVE: "Nothing in your studio yet. Explore open creations, or launch your own project and invite co-creators.",
        HYBRID: "No active quests or projects. Browse Explore or create your first quest.",
        ORG_REP: "No active projects linked to your organisation yet. Create a quest or connect with a guild to start your ecosystem footprint.",
        DEFAULT: "No quests yet. Browse open quests in Explore or create your first one.",
      } as PersonaMessages,
      cta: "Browse quests",
      to: "/explore?tab=quests",
      icon: "🧭",
    },

    workTeams: {
      id: "work-teams-empty",
      messages: {
        IMPACT: "You haven't joined a guild yet. Guilds are where sustained action happens — find one aligned with your territory or cause.",
        CREATIVE: "No circles or studios yet. Find a collective that matches your practice, or create your own.",
        HYBRID: "No teams yet. Browse guilds, pods, or create your own collective.",
        ORG_REP: "Your organisation isn't linked to any guild yet. Create a guild under your company to start gathering contributors.",
        DEFAULT: "No teams yet. Browse guilds and pods in Explore.",
      } as PersonaMessages,
      cta: "Find a guild",
      to: "/explore?tab=entities",
      icon: "⚔️",
    },

    workServices: {
      id: "work-services-empty",
      messages: {
        IMPACT: "You haven't published any services. Offer your expertise — coaching, facilitation, analysis — and earn XP or revenue.",
        CREATIVE: "No skill sessions published yet. Share your practice with the network — a workshop, a session, a residency.",
        HYBRID: "No services yet. Publish what you offer and make it bookable.",
        ORG_REP: "No services attached to your organisation. Publish a discovery session or consulting offer to attract partners.",
        DEFAULT: "No services yet. Create your first bookable offer.",
      } as PersonaMessages,
      cta: "Publish a service",
      to: "/services/new",
      icon: "🛠️",
    },

    networkFeed: {
      id: "network-feed-empty",
      messages: {
        IMPACT: "Your following feed is empty. Follow guilds, territories, and changemakers from Explore — their activity will appear here.",
        CREATIVE: "Follow circles, studios, and practitioners you admire. Their work will surface here.",
        HYBRID: "Nothing here yet. Follow entities and people from Explore to populate your activity stream.",
        DEFAULT: "Follow some guilds, territories, or people from Explore — their activity will appear here.",
      } as PersonaMessages,
      cta: "Explore the network",
      to: "/explore",
      icon: "🌐",
    },

    guildQuests: {
      id: "guild-quests-empty",
      messages: {
        IMPACT: "This guild has no active missions yet. If you're an admin, create the first quest to mobilise members.",
        CREATIVE: "No active creations yet. Admins can launch the first project and invite contributors.",
        HYBRID: "No quests yet in this guild. Admins can create the first one.",
        DEFAULT: "No quests in this guild yet.",
      } as PersonaMessages,
      cta: "Create a quest",
      to: "/quests/new",
      icon: "⚔️",
    },

    agentsDeploy: {
      id: "agents-deploy-empty",
      messages: {
        DEFAULT: "No agents active in this guild yet. Browse the marketplace and deploy one — they work best when given a specific mandate inside a quest.",
      } as PersonaMessages,
      cta: "Browse agents",
      to: "/explore?tab=agents",
      icon: "🤖",
    },
  },
} as const;
