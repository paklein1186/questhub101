import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Sparkles, Send, Lightbulb, MessageCircle, Users, Briefcase, Heart } from "lucide-react";
import { MilestonePopup } from "@/components/MilestonePopup";
import { useMilestoneChecker } from "@/hooks/useMilestones";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAuth } from "@/hooks/useAuth";
import { usePersona } from "@/hooks/usePersona";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { PersonaType } from "@/lib/personaLabels";

/* ───────── Persona-specific config ───────── */

const PERSONA_VERBS: Record<string, string[]> = {
  IMPACT: ["do", "achieve", "contribute", "repair", "organize", "collaborate", "support", "activate", "explore"],
  CREATIVE: ["create", "imagine", "express", "make more beautiful", "share", "explore", "experiment", "collaborate"],
  HYBRID: ["do", "create", "achieve", "imagine", "contribute", "explore", "experiment", "collaborate", "support", "express"],
  UNSET: ["do", "create", "explore", "collaborate", "share", "achieve"],
};

const PERSONA_GREETING: Record<string, string> = {
  IMPACT: "Ready to move something forward today?",
  CREATIVE: "What do you feel like creating today?",
  HYBRID: "What do you want to weave today?",
  UNSET: "What would you like to accomplish today?",
};

const PERSONA_DESCRIPTION: Record<string, string> = {
  IMPACT: "Use changethegame to advance your projects, connect allies, and take action for your territory and community.",
  CREATIVE: "Use changethegame to express, explore, and co-create with other artists and dreamers.",
  HYBRID: "Use changethegame to mix art, impact, ideas and people into something new.",
  UNSET: "Use changethegame to discover quests, connect with people, and build something meaningful.",
};

/* ───────── Guided mode tiles ───────── */

const GUIDED_TILES = [
  { id: "share", icon: MessageCircle, title: "Share what's on my mind", prompt: "What would you like to share or express?", color: "text-amber-500" },
  { id: "help", icon: Users, title: "Find people that can help me", prompt: "What do you need help with?", color: "text-emerald-500" },
  { id: "work", icon: Briefcase, title: "See my current work & quests", route: "/work", color: "text-blue-500" },
  { id: "likeminded", icon: Heart, title: "Find like-minded people", prompt: "What makes someone 'like-minded' for you right now?", color: "text-rose-500" },
];

/* ───────── Verb rotator hook ───────── */

function useRotatingVerb(persona: PersonaType) {
  const verbs = PERSONA_VERBS[persona] || PERSONA_VERBS.UNSET;
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * verbs.length));

  useEffect(() => {
    const interval = setInterval(() => {
      setIdx((prev) => (prev + 1) % verbs.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [verbs.length]);

  return verbs[idx];
}

/* ───────── Main Component ───────── */

export default function HomeFeed() {
  const currentUser = useCurrentUser();
  const { user: authUser } = useAuth();
  const { persona } = usePersona();
  useMilestoneChecker();

  const [mode, setMode] = useState<"free" | "guided">(() => {
    const stored = localStorage.getItem("home-mode");
    return stored === "guided" ? "guided" : "free";
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [guidedTile, setGuidedTile] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();
  const verb = useRotatingVerb(persona);

  const userName = (authUser?.name || currentUser.name).split(" ")[0];

  // Persist mode
  useEffect(() => {
    localStorage.setItem("home-mode", mode);
  }, [mode]);

  const submitIntent = useCallback(async (text: string, source = "HOME_FREE") => {
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("interpret-intent", {
        body: { intentText: text, persona, source },
      });
      if (error) throw error;
      setResult(data);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [persona]);

  const logFeatureIdea = useCallback(async () => {
    if (!input.trim()) return;
    try {
      await supabase.from("feature_suggestions").insert({
        user_id: currentUser.id,
        source: mode === "free" ? "HOME_FREE" : "HOME_GUIDED",
        persona_at_time: persona,
        original_text: input,
        user_explicit: true,
      } as any);
      toast.success("Thanks! Your idea has been saved for the team.");
      setInput("");
    } catch {
      toast.error("Could not save idea");
    }
  }, [input, currentUser.id, persona, mode]);

  const handleSuggestionClick = (route: string) => {
    navigate(route);
  };

  const handleGuidedTile = (tile: typeof GUIDED_TILES[0]) => {
    if (tile.route) {
      navigate(tile.route);
      return;
    }
    setGuidedTile(tile.id);
    setInput("");
    setResult(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const activeGuidedTile = GUIDED_TILES.find((t) => t.id === guidedTile);

  return (
    <PageShell>
      <MilestonePopup />
      <div className="max-w-2xl mx-auto flex flex-col items-center min-h-[60vh] justify-center px-4 py-12 sm:py-20">

        {/* Greeting */}
        <p className="text-sm text-muted-foreground mb-1">Welcome back, {userName}</p>
        <h1 className="text-lg sm:text-xl font-display font-semibold text-foreground text-center mb-1">
          {PERSONA_GREETING[persona] || PERSONA_GREETING.UNSET}
        </h1>
        <p className="text-xs text-muted-foreground/70 text-center max-w-md mb-6">
          {PERSONA_DESCRIPTION[persona] || PERSONA_DESCRIPTION.UNSET}
        </p>

        {/* Free / Guided toggle */}
        <div className="flex items-center gap-3 mb-8">
          <span className={cn("text-sm font-medium transition-colors", mode === "free" ? "text-foreground" : "text-muted-foreground")}>
            Free
          </span>
          <Switch
            checked={mode === "guided"}
            onCheckedChange={(checked) => {
              setMode(checked ? "guided" : "free");
              setGuidedTile(null);
              setResult(null);
              setInput("");
            }}
          />
          <span className={cn("text-sm font-medium transition-colors", mode === "guided" ? "text-foreground" : "text-muted-foreground")}>
            Guided
          </span>
        </div>

        {/* ─── Free mode ─── */}
        {mode === "free" && !result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-4"
          >
            {/* Dynamic sentence */}
            <p className="text-center text-base sm:text-lg text-foreground/80 font-medium">
              What do I want to{" "}
              <AnimatePresence mode="wait">
                <motion.span
                  key={verb}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="inline-block text-primary font-semibold"
                >
                  {verb}
                </motion.span>
              </AnimatePresence>
              {" "}now?
            </p>

            {/* Input */}
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type what you want to work on, explore, fix, create, or find…"
              className="min-h-[56px] max-h-[120px] resize-none text-base bg-card border-border focus-visible:ring-primary/30"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitIntent(input, "HOME_FREE");
                }
              }}
            />

            <div className="flex items-center justify-between">
              <button
                onClick={logFeatureIdea}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
              >
                Something else / Feature idea?
              </button>
              <Button
                onClick={() => submitIntent(input, "HOME_FREE")}
                disabled={loading || !input.trim()}
                className="gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Let's go
              </Button>
            </div>
          </motion.div>
        )}

        {/* ─── Guided mode ─── */}
        {mode === "guided" && !guidedTile && !result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {GUIDED_TILES.map((tile) => (
              <button
                key={tile.id}
                onClick={() => handleGuidedTile(tile)}
                className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-all text-left group"
              >
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center bg-muted shrink-0 group-hover:scale-105 transition-transform", tile.color)}>
                  <tile.icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-foreground">{tile.title}</span>
              </button>
            ))}
          </motion.div>
        )}

        {/* ─── Guided tile follow-up ─── */}
        {mode === "guided" && guidedTile && activeGuidedTile && !result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-4"
          >
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setGuidedTile(null); setInput(""); }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ← Back
              </button>
            </div>
            <p className="text-base font-medium text-foreground/80 text-center">
              {activeGuidedTile.prompt}
            </p>
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe what you have in mind…"
              className="min-h-[56px] max-h-[120px] resize-none text-base bg-card border-border focus-visible:ring-primary/30"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitIntent(input, "HOME_GUIDED");
                }
              }}
            />
            <div className="flex justify-end">
              <Button
                onClick={() => submitIntent(input, "HOME_GUIDED")}
                disabled={loading || !input.trim()}
                className="gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Let's go
              </Button>
            </div>
          </motion.div>
        )}

        {/* ─── AI result / suggestions ─── */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-4"
          >
            {result.summary && (
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-sm text-foreground/80 leading-relaxed">{result.summary}</p>
                {result.followUpQuestion && (
                  <p className="text-xs text-muted-foreground mt-2 italic">{result.followUpQuestion}</p>
                )}
              </div>
            )}

            {result.suggestions?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Here are some next steps:</p>
                {result.suggestions.map((s: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(s.route || "/explore")}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-all text-left"
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

            {result.actionType === "OTHER" && (
              <p className="text-xs text-muted-foreground text-center">
                We're not sure how to route this yet, but we've saved your idea for the team. 💡
              </p>
            )}

            <div className="flex justify-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setResult(null);
                  setInput("");
                  setGuidedTile(null);
                }}
              >
                Start over
              </Button>
            </div>
          </motion.div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground py-8">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Thinking…</span>
          </div>
        )}
      </div>
    </PageShell>
  );
}
