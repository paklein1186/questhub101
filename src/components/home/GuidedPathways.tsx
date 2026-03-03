import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlusCircle, Wrench, Users, Compass, MapPin, Lightbulb,
  Sparkles, X, Send, Loader2, ArrowLeft,
  Briefcase, Calendar, Shield, CircleDot, BookOpen, Brain,
  Eye, User, Heart, Zap, Globe, MessageSquare,
  Building2, Handshake, FileText, Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { buildRoute } from "@/lib/routeHelpers";
import type { PersonaType } from "@/lib/personaLabels";
import { ACTION_PATHS } from "@/components/assistant/PiActionPaths";

/* ────────── Types ────────── */

interface SubAction {
  id: string;
  label: Record<string, string>; // keyed by persona
  icon: any;
  behavior: "navigate" | "ai-prompt" | "create";
  route?: string;
  prefill_params?: Record<string, string>;
  promptText?: Record<string, string>;
  aiCode?: string;
}

interface Pathway {
  id: string;
  icon: any;
  title: Record<string, string>;
  subtitle: Record<string, string>;
  subActions: SubAction[];
}

/* ────────── Persona helper ────────── */

function p(map: Record<string, string>, persona: PersonaType): string {
  return map[persona] || map.HYBRID || map.DEFAULT || "";
}

/* ────────── Pathway definitions ────────── */

const PATHWAYS: Pathway[] = [
  {
    id: "create",
    icon: PlusCircle,
    title: { IMPACT: "Create", CREATIVE: "Create", HYBRID: "Create", DEFAULT: "Create" },
    subtitle: { IMPACT: "Launch something new", CREATIVE: "Bring something to life", HYBRID: "Start something fresh", DEFAULT: "Start something new" },
    subActions: [
      { id: "quest", label: { IMPACT: "Start a Mission", CREATIVE: "Start a Creation", HYBRID: "Start a Quest", DEFAULT: "Create a Quest" }, icon: Compass, behavior: "navigate", route: "/quests/new" },
      { id: "service", label: { IMPACT: "Create a Service", CREATIVE: "Offer a Skill Session", HYBRID: "Create a Service", DEFAULT: "Create a Service" }, icon: Briefcase, behavior: "navigate", route: "/services/new" },
      { id: "event", label: { IMPACT: "Create an Event", CREATIVE: "Create a Gathering", HYBRID: "Create an Event", DEFAULT: "Create an Event" }, icon: Calendar, behavior: "navigate", route: "/explore?tab=guilds" },
      { id: "guild", label: { IMPACT: "Create a Guild", CREATIVE: "Create a Circle / Studio", HYBRID: "Create a Guild", DEFAULT: "Create a Guild" }, icon: Shield, behavior: "navigate", route: "/explore?tab=entities&create=guild" },
      { id: "pod", label: { IMPACT: "Create a Pod", CREATIVE: "Create an Ensemble", HYBRID: "Create a Team", DEFAULT: "Create a Pod" }, icon: CircleDot, behavior: "navigate", route: "/explore?tab=entities&create=pod" },
      { id: "course", label: { IMPACT: "Create a Course", CREATIVE: "Create a Course", HYBRID: "Create a Course", DEFAULT: "Create a Course" }, icon: BookOpen, behavior: "navigate", route: "/courses/new" },
      { id: "territory-mem", label: { IMPACT: "Add Knowledge to my Territory", CREATIVE: "Enrich my Place of Resonance", HYBRID: "Add Knowledge to my Territory", DEFAULT: "Add Knowledge to my Territory" }, icon: Brain, behavior: "ai-prompt", promptText: { DEFAULT: "What knowledge or insight would you like to contribute to your territory?" }, aiCode: "CREATE_TERRITORY_MEMORY" },
    ],
  },
  {
    id: "develop",
    icon: Wrench,
    title: { IMPACT: "Develop", CREATIVE: "Develop", HYBRID: "Develop", DEFAULT: "Develop" },
    subtitle: { IMPACT: "Advance your work", CREATIVE: "Deepen your practice", HYBRID: "Progress your projects", DEFAULT: "Continue your work" },
    subActions: [
      { id: "active-quests", label: { IMPACT: "Continue an active Mission", CREATIVE: "Continue an active Creation", HYBRID: "Continue an active Quest", DEFAULT: "Continue an active Quest" }, icon: Compass, behavior: "navigate", route: "/work" },
      { id: "recent", label: { IMPACT: "Finish something I started", CREATIVE: "Finish something I started", HYBRID: "Finish something I started", DEFAULT: "Finish something I started" }, icon: Zap, behavior: "navigate", route: "/work" },
      { id: "manage-entities", label: { IMPACT: "Manage my Guilds / Pods / Orgs", CREATIVE: "Manage my Circles / Ensembles", HYBRID: "Manage my Guilds / Pods / Orgs", DEFAULT: "Manage my Entities" }, icon: Shield, behavior: "navigate", route: "/me/guilds" },
      { id: "update-services", label: { IMPACT: "Update my Services", CREATIVE: "Update my Skill Sessions", HYBRID: "Update my Services", DEFAULT: "Update my Services" }, icon: Briefcase, behavior: "navigate", route: "/me/services" },
      { id: "review-bookings", label: { IMPACT: "Review my Events & Bookings", CREATIVE: "Review my Events & Bookings", HYBRID: "Review my Events & Bookings", DEFAULT: "Review my Events & Bookings" }, icon: Calendar, behavior: "navigate", route: "/me/bookings" },
      { id: "update-profile", label: { IMPACT: "Update my Profile", CREATIVE: "Update my Portfolio", HYBRID: "Update my Profile", DEFAULT: "Update my Profile" }, icon: User, behavior: "navigate", route: "/profile/edit" },
    ],
  },
  {
    id: "find-people",
    icon: Users,
    title: { IMPACT: "Find People", CREATIVE: "Find People", HYBRID: "Find People", DEFAULT: "Find People" },
    subtitle: { IMPACT: "Connect with allies", CREATIVE: "Meet fellow creators", HYBRID: "Discover collaborators", DEFAULT: "Find the right people" },
    subActions: [
      { id: "collaborators", label: { IMPACT: "Find collaborators", CREATIVE: "Find collaborators", HYBRID: "Find collaborators", DEFAULT: "Find collaborators" }, icon: Users, behavior: "ai-prompt", promptText: { DEFAULT: "What kind of collaborator are you looking for?" }, aiCode: "FIND_COLLABORATORS" },
      { id: "mentors", label: { IMPACT: "Find mentors", CREATIVE: "Find mentors", HYBRID: "Find mentors", DEFAULT: "Find mentors" }, icon: Lightbulb, behavior: "ai-prompt", promptText: { DEFAULT: "What kind of mentor are you looking for?" }, aiCode: "FIND_MENTORS" },
      { id: "peers", label: { IMPACT: "Find impact professionals", CREATIVE: "Find creative peers", HYBRID: "Find peers", DEFAULT: "Find peers" }, icon: Heart, behavior: "ai-prompt", promptText: { DEFAULT: "What kind of person are you looking for?" }, aiCode: "FIND_PEERS" },
      { id: "local", label: { IMPACT: "Find people near me", CREATIVE: "Find people near me", HYBRID: "Find people near me", DEFAULT: "Find people near me" }, icon: MapPin, behavior: "ai-prompt", promptText: { DEFAULT: "What are you looking for locally?" }, aiCode: "FIND_LOCAL_PEOPLE" },
      { id: "by-topic", label: { IMPACT: "Find entities active in my Topics", CREATIVE: "Find entities in my Topics", HYBRID: "Find entities in my Topics", DEFAULT: "Find entities by Topic" }, icon: Globe, behavior: "navigate", route: "/explore?tab=users" },
    ],
  },
  {
    id: "explore",
    icon: Compass,
    title: { IMPACT: "Explore", CREATIVE: "Explore", HYBRID: "Explore", DEFAULT: "Explore" },
    subtitle: { IMPACT: "Discover opportunities", CREATIVE: "Wander and discover", HYBRID: "Browse opportunities", DEFAULT: "See what's out there" },
    subActions: [
      { id: "quests", label: { IMPACT: "Missions looking for collaborators", CREATIVE: "Creations looking for collaborators", HYBRID: "Quests looking for collaborators", DEFAULT: "Quests looking for collaborators" }, icon: Compass, behavior: "navigate", route: "/explore?tab=quests" },
      { id: "recruiting", label: { IMPACT: "Guilds / Pods recruiting", CREATIVE: "Circles / Ensembles recruiting", HYBRID: "Groups recruiting", DEFAULT: "Guilds recruiting" }, icon: Shield, behavior: "navigate", route: "/explore?tab=guilds" },
      { id: "events", label: { IMPACT: "Events happening soon", CREATIVE: "Gatherings happening soon", HYBRID: "Events happening soon", DEFAULT: "Events happening soon" }, icon: Calendar, behavior: "navigate", route: "/calendar" },
      { id: "territories", label: { IMPACT: "Territories with emerging activity", CREATIVE: "Places with emerging energy", HYBRID: "Territories with activity", DEFAULT: "Territories with activity" }, icon: MapPin, behavior: "navigate", route: "/explore?tab=territories" },
      { id: "courses", label: { IMPACT: "Courses I can take", CREATIVE: "Courses I can take", HYBRID: "Courses I can take", DEFAULT: "Courses I can take" }, icon: BookOpen, behavior: "navigate", route: "/explore?tab=courses" },
      { id: "services", label: { IMPACT: "Services available", CREATIVE: "Skill Sessions available", HYBRID: "Services available", DEFAULT: "Services available" }, icon: Briefcase, behavior: "navigate", route: "/explore?tab=services" },
    ],
  },
  {
    id: "territories",
    icon: MapPin,
    title: { IMPACT: "Territories", CREATIVE: "Places", HYBRID: "Territories", DEFAULT: "Territories" },
    subtitle: { IMPACT: "Your local ecosystem", CREATIVE: "Your places of resonance", HYBRID: "Your local scene", DEFAULT: "Local ecosystems" },
    subActions: [
      { id: "whats-happening", label: { IMPACT: "What's happening in my territory?", CREATIVE: "What's happening in my place?", HYBRID: "What's happening in my territory?", DEFAULT: "What's happening?" }, icon: Eye, behavior: "ai-prompt", promptText: { DEFAULT: "Which territory are you curious about?" }, aiCode: "TERRITORY_WHATS_HAPPENING" },
      { id: "who-active", label: { IMPACT: "Who is active here?", CREATIVE: "Who is creating here?", HYBRID: "Who is active here?", DEFAULT: "Who is active here?" }, icon: Users, behavior: "navigate", route: "/explore?tab=users" },
      { id: "memory", label: { IMPACT: "Open the territory memory", CREATIVE: "Open the territory memory", HYBRID: "Open the territory memory", DEFAULT: "Open the territory memory" }, icon: Brain, behavior: "navigate", route: "/network" },
      { id: "add-knowledge", label: { IMPACT: "Add knowledge (earn XP)", CREATIVE: "Add knowledge (earn Resonance)", HYBRID: "Add knowledge (earn XP)", DEFAULT: "Add knowledge (earn XP)" }, icon: Sparkles, behavior: "ai-prompt", promptText: { DEFAULT: "What insight would you like to contribute?" }, aiCode: "TERRITORY_ADD_KNOWLEDGE" },
      { id: "start-quest", label: { IMPACT: "Start a mission in my territory", CREATIVE: "Start a creation in my place", HYBRID: "Start a quest in my territory", DEFAULT: "Start a quest in my territory" }, icon: PlusCircle, behavior: "navigate", route: "/quests/new" },
      { id: "compare", label: { IMPACT: "Compare territories", CREATIVE: "Compare places", HYBRID: "Compare territories", DEFAULT: "Compare territories" }, icon: Globe, behavior: "navigate", route: "/explore?tab=territories" },
    ],
  },
  {
    id: "guidance",
    icon: Lightbulb,
    title: { IMPACT: "Guidance", CREATIVE: "Guidance", HYBRID: "Guidance", DEFAULT: "Guidance" },
    subtitle: { IMPACT: "AI-assisted reflection", CREATIVE: "Creative coaching", HYBRID: "Smart suggestions", DEFAULT: "Get help & ideas" },
    subActions: [
      { id: "focus", label: { IMPACT: "What should I focus on today?", CREATIVE: "What should I focus on today?", HYBRID: "What should I focus on today?", DEFAULT: "What should I focus on today?" }, icon: Sparkles, behavior: "ai-prompt", promptText: { DEFAULT: "Tell me what's on your plate" }, aiCode: "GUIDANCE_FOCUS" },
      { id: "quest-progress", label: { IMPACT: "Help me progress my mission", CREATIVE: "Help me progress my creation", HYBRID: "Help me progress my quest", DEFAULT: "Help me progress my quest" }, icon: Compass, behavior: "ai-prompt", promptText: { DEFAULT: "Tell me about your current challenge" }, aiCode: "GUIDANCE_QUEST_PROGRESSION" },
      { id: "momentum", label: { IMPACT: "Help me build momentum", CREATIVE: "Help me build momentum", HYBRID: "Help me build momentum", DEFAULT: "Help me build momentum" }, icon: Zap, behavior: "ai-prompt", promptText: { DEFAULT: "What's slowing you down?" }, aiCode: "GUIDANCE_MOMENTUM" },
      { id: "creative-inspo", label: { IMPACT: "Give me impact inspiration", CREATIVE: "Give me creative inspiration", HYBRID: "Give me inspiration", DEFAULT: "Give me inspiration" }, icon: Heart, behavior: "ai-prompt", promptText: { DEFAULT: "What domain or topic inspires you right now?" }, aiCode: "GUIDANCE_CREATIVE" },
      { id: "connections", label: { IMPACT: "Suggest connections I should make", CREATIVE: "Suggest connections I should make", HYBRID: "Suggest connections I should make", DEFAULT: "Suggest connections I should make" }, icon: Users, behavior: "ai-prompt", promptText: { DEFAULT: "What are you working on that needs new connections?" }, aiCode: "GUIDANCE_CONNECTIONS" },
    ],
  },
];

/* ────────── Org Rep pathways (shown when isOrgRep) ────────── */

const ORG_REP_PATHWAYS: Pathway[] = [
  {
    id: "org-manage",
    icon: Building2,
    title: { DEFAULT: "My Organization" },
    subtitle: { DEFAULT: "Manage your entity" },
    subActions: [
      { id: "my-orgs", label: { DEFAULT: "View my Organizations" }, icon: Building2, behavior: "navigate", route: "/me/companies" },
      { id: "create-org", label: { DEFAULT: "Register a new Organization" }, icon: PlusCircle, behavior: "navigate", route: "/explore?tab=entities&create=company" },
      { id: "update-profile", label: { DEFAULT: "Update Organization profile" }, icon: User, behavior: "navigate", route: "/me/companies" },
      { id: "manage-members", label: { DEFAULT: "Manage team members" }, icon: Users, behavior: "navigate", route: "/me/companies" },
    ],
  },
  {
    id: "org-services",
    icon: Briefcase,
    title: { DEFAULT: "Services & Offerings" },
    subtitle: { DEFAULT: "Promote what you offer" },
    subActions: [
      { id: "create-service", label: { DEFAULT: "Create a Service" }, icon: Briefcase, behavior: "navigate", route: "/services/new" },
      { id: "create-course", label: { DEFAULT: "Create a Training / Course" }, icon: BookOpen, behavior: "navigate", route: "/courses/new" },
      { id: "create-event", label: { DEFAULT: "Organize an Event" }, icon: Calendar, behavior: "navigate", route: "/explore?tab=guilds" },
      { id: "review-bookings", label: { DEFAULT: "Review Bookings" }, icon: Calendar, behavior: "navigate", route: "/me/bookings" },
      { id: "post-job", label: { DEFAULT: "Post a Job Position" }, icon: FileText, behavior: "navigate", route: "/jobs" },
    ],
  },
  {
    id: "org-connect",
    icon: Handshake,
    title: { DEFAULT: "Connect & Partner" },
    subtitle: { DEFAULT: "Find allies and talent" },
    subActions: [
      { id: "find-talent", label: { DEFAULT: "Find talent & collaborators" }, icon: Users, behavior: "ai-prompt", promptText: { DEFAULT: "What kind of talent or collaborator are you looking for?" }, aiCode: "FIND_COLLABORATORS" },
      { id: "find-partners", label: { DEFAULT: "Find partner organizations" }, icon: Handshake, behavior: "navigate", route: "/explore?tab=companies" },
      { id: "join-guild", label: { DEFAULT: "Join a Guild or Network" }, icon: Shield, behavior: "navigate", route: "/explore?tab=guilds" },
      { id: "explore-territories", label: { DEFAULT: "Explore Territories" }, icon: MapPin, behavior: "navigate", route: "/explore?tab=territories" },
    ],
  },
  {
    id: "org-visibility",
    icon: Megaphone,
    title: { DEFAULT: "Visibility & Growth" },
    subtitle: { DEFAULT: "Grow your presence" },
    subActions: [
      { id: "publish-post", label: { DEFAULT: "Publish a Post" }, icon: MessageSquare, behavior: "navigate", route: "/feed" },
      { id: "create-quest", label: { DEFAULT: "Launch a Quest / Project" }, icon: Compass, behavior: "navigate", route: "/quests/new" },
      { id: "explore-quests", label: { DEFAULT: "Browse open Quests to join" }, icon: Eye, behavior: "navigate", route: "/explore?tab=quests" },
      { id: "add-territory-knowledge", label: { DEFAULT: "Contribute to your Territory" }, icon: Brain, behavior: "ai-prompt", promptText: { DEFAULT: "What insight would you like to contribute?" }, aiCode: "TERRITORY_ADD_KNOWLEDGE" },
    ],
  },
  {
    id: "org-guidance",
    icon: Lightbulb,
    title: { DEFAULT: "Guidance" },
    subtitle: { DEFAULT: "AI-assisted strategy" },
    subActions: [
      { id: "strategy", label: { DEFAULT: "What should my organization focus on?" }, icon: Sparkles, behavior: "ai-prompt", promptText: { DEFAULT: "Tell me about your organization's goals" }, aiCode: "GUIDANCE_FOCUS" },
      { id: "partnerships", label: { DEFAULT: "Suggest partnerships for my org" }, icon: Handshake, behavior: "ai-prompt", promptText: { DEFAULT: "What does your organization do and what kind of partners do you need?" }, aiCode: "GUIDANCE_CONNECTIONS" },
      { id: "momentum", label: { DEFAULT: "Help me build momentum" }, icon: Zap, behavior: "ai-prompt", promptText: { DEFAULT: "What's slowing you down?" }, aiCode: "GUIDANCE_MOMENTUM" },
    ],
  },
];

/* ────────── Component ────────── */

interface Props {
  persona: PersonaType;
  userName: string;
  userId?: string;
  isOrgRep?: boolean;
  onActionSelected?: (prompt?: string) => void;
}

export function GuidedPathways({ persona, userName, userId, isOrgRep }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [openPathway, setOpenPathway] = useState<string | null>(null);
  const [promptStep, setPromptStep] = useState<SubAction | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // i18n overrides for pathway titles/subtitles
  const i18nTitles: Record<string, string> = {
    create: t("home.create"),
    develop: t("home.develop"),
    "find-people": t("home.findPeople"),
    explore: t("home.explorePath"),
    territories: t("home.territories"),
    guidance: t("home.guidance"),
  };
  const i18nSubtitles: Record<string, string> = {
    create: t("home.createSub"),
    develop: t("home.developSub"),
    "find-people": t("home.findPeopleSub"),
    explore: t("home.explorePathSub"),
    territories: t("home.territoriesSub"),
    guidance: t("home.guidanceSub"),
  };
  const displayedPathways = isOrgRep ? ORG_REP_PATHWAYS : PATHWAYS;
  const activePathway = displayedPathways.find((pw) => pw.id === openPathway);

  const handleSubAction = (sub: SubAction) => {
    if (sub.behavior === "navigate" && sub.route) {
      setOpenPathway(null);
      navigate(buildRoute(sub));
      return;
    }
    if (sub.behavior === "ai-prompt") {
      setPromptStep(sub);
      setInput("");
      setAiResult(null);
      setTimeout(() => inputRef.current?.focus(), 150);
      return;
    }
    // create behavior — same as navigate for now
    if (sub.route) {
      setOpenPathway(null);
      navigate(buildRoute(sub));
    }
  };

  const submitAI = useCallback(async () => {
    if (!input.trim() || !promptStep) return;
    setLoading(true);
    setAiResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("interpret-intent", {
        body: {
          intentText: input,
          persona,
          source: `GUIDED_${promptStep.aiCode || "UNKNOWN"}`,
        },
      });
      if (error) throw error;
      setAiResult(data);
    } catch (e: any) {
      toast.error(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [input, promptStep, persona]);

  const handleSuggestionClick = (suggestion: { route?: string; prefill_params?: Record<string, string> }) => {
    const route = suggestion.route && suggestion.route.startsWith("/") && !suggestion.route.includes("://")
      ? suggestion.route
      : "/explore";
    const target = buildRoute({ route, prefill_params: suggestion.prefill_params });
    setOpenPathway(null);
    setPromptStep(null);
    setAiResult(null);
    navigate(target);
  };

  const closeModal = () => {
    setOpenPathway(null);
    setPromptStep(null);
    setAiResult(null);
    setInput("");
  };

  const backToSubActions = () => {
    setPromptStep(null);
    setAiResult(null);
    setInput("");
  };

  return (
    <>
      {/* 8 voies as horizontal chips */}
      <div className="w-full flex flex-wrap justify-center gap-2">
        {ACTION_PATHS.map((path, i) => (
          <motion.button
            key={path.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => { setOpenPathway(path.id); setPromptStep(null); setAiResult(null); }}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all cursor-pointer",
              "hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm",
              "border-border bg-card text-foreground"
            )}
          >
            <span className="text-base leading-none">{path.icon}</span>
            <span className="text-sm font-medium">{path.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Unified modal for voie actions */}
      <Dialog open={!!openPathway} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-lg font-display flex items-center gap-2">
              {(() => {
                const ap = ACTION_PATHS.find(p => p.id === openPathway);
                return ap ? <><span>{ap.icon}</span> {ap.label}</> : "";
              })()}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Choose an action below
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-6 space-y-2">
            <AnimatePresence mode="wait">
              {/* Action list from ACTION_PATHS */}
              {!promptStep && openPathway && (
                <motion.div
                  key="actions"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-1"
                >
                  <ScrollArea className="max-h-[50vh]">
                    {ACTION_PATHS.find(p => p.id === openPathway)?.actions.map((action, idx) => {
                      const pathIdx = ACTION_PATHS.findIndex(p => p.id === openPathway);
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            if (action.type === "navigate" && action.route) {
                              setOpenPathway(null);
                              navigate(action.route);
                            } else if (action.type === "prompt" && action.prompt) {
                              setPromptStep({
                                id: `${openPathway}-${idx}`,
                                label: { DEFAULT: action.label },
                                icon: Sparkles,
                                behavior: "ai-prompt",
                                promptText: { DEFAULT: action.prompt },
                                aiCode: `VOIE_${pathIdx + 1}_${idx + 1}`,
                              });
                              setInput("");
                              setAiResult(null);
                              setTimeout(() => inputRef.current?.focus(), 150);
                            }
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors text-left group/item"
                        >
                          <span className="text-xs text-muted-foreground font-mono w-6 shrink-0">
                            {pathIdx + 1}.{idx + 1}
                          </span>
                          <span className="text-sm font-medium text-foreground flex-1">{action.label}</span>
                          {action.type === "prompt" && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium shrink-0">Pi</span>
                          )}
                        </button>
                      );
                    })}
                  </ScrollArea>
                </motion.div>
              )}

              {/* AI prompt step */}
              {promptStep && !aiResult && (
                <motion.div
                  key="prompt"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <button onClick={backToSubActions} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="h-3 w-3" /> Back
                  </button>
                  <p className="text-sm font-medium text-foreground/80">
                    {p(promptStep.promptText || { DEFAULT: "Tell us more…" }, persona)}
                  </p>
                  <Textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Describe what you have in mind…"
                    className="min-h-[60px] max-h-[120px] resize-none text-sm bg-card border-border focus-visible:ring-primary/30"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        submitAI();
                      }
                    }}
                  />
                  <div className="flex justify-end">
                    <Button onClick={submitAI} disabled={loading || !input.trim()} size="sm" className="gap-2">
                      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Go
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* AI result */}
              {promptStep && aiResult && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <button onClick={backToSubActions} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="h-3 w-3" /> Back
                  </button>

                  {aiResult.summary && (
                    <div className="rounded-xl border border-border bg-accent/30 p-4">
                      <p className="text-sm leading-relaxed text-foreground/80">{aiResult.summary}</p>
                    </div>
                  )}

                  {aiResult.suggestions?.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground font-medium">Suggested next steps:</p>
                      {aiResult.suggestions.map((s: any, i: number) => (
                        <button
                          key={i}
                          onClick={() => handleSuggestionClick({ route: s.route, prefill_params: s.prefill_params })}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent/50 transition-all text-left"
                        >
                          <Sparkles className="h-4 w-4 text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{s.label}</p>
                            {s.description && <p className="text-xs text-muted-foreground truncate">{s.description}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-center">
                    <Button variant="ghost" size="sm" onClick={() => { setAiResult(null); setInput(""); }}>
                      Ask something else
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Loading */}
              {loading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-center gap-2 py-8 text-muted-foreground"
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Thinking…</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
