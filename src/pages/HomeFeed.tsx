import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Sparkles, Send, MessageCircle, Users, Briefcase, Heart, MapPin, Check, ChevronRight, Mic, MicOff } from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GuidedPathways } from "@/components/home/GuidedPathways";
import { MyTaskBoard } from "@/components/home/MyTaskBoard";
import { FollowingActivity } from "@/components/home/FollowingActivity";

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

/* ───────── Guided mode uses GuidedPathways component ───────── */

/* ───────── Guided mode now uses GuidedPathways component ───────── */
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

/* ───────── Territory Flow Component ───────── */

function TerritoryFlow({
  result,
  originalInput,
  userId,
  persona,
  onReset,
}: {
  result: any;
  originalInput: string;
  userId?: string;
  persona: string;
  onReset: () => void;
}) {
  const navigate = useNavigate();
  const [questTitle, setQuestTitle] = useState(result.questDraft?.title || "");
  const [questDesc, setQuestDesc] = useState(result.questDraft?.description || "");
  const [saving, setSaving] = useState(false);
  const [memSaved, setMemSaved] = useState(false);
  const [questSaved, setQuestSaved] = useState<string | null>(null);

  const territoryId = result.userTerritoryId;

  const saveToMemory = useCallback(async () => {
    if (!territoryId || !userId) return;
    try {
      await supabase.from("territory_memory" as any).insert({
        territory_id: territoryId,
        title: result.memorySummary || "User vision",
        content: originalInput,
        category: "OPPORTUNITIES",
        visibility: "PUBLIC",
        tags: result.memoryThemes || [],
        created_by_user_id: userId,
      } as any);
      setMemSaved(true);
    } catch {
      toast.error("Could not save to territory memory");
    }
  }, [territoryId, userId, originalInput, result]);

  const saveQuestDraft = useCallback(async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("quests")
        .insert({
          title: questTitle,
          description: questDesc,
          created_by_user_id: userId,
          is_draft: true,
          status: "DRAFT",
          owner_type: "USER",
          owner_id: userId,
        } as any)
        .select("id")
        .single();
      if (error) throw error;
      setQuestSaved((data as any).id);
      toast.success("Quest draft saved!");
    } catch (e: any) {
      toast.error(e?.message || "Could not save quest");
    } finally {
      setSaving(false);
    }
  }, [userId, questTitle, questDesc]);

  // Auto-save to memory on mount
  useEffect(() => {
    if (territoryId && userId && !memSaved) {
      saveToMemory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-6"
    >
      {/* Summary */}
      {result.summary && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-foreground/80 leading-relaxed">{result.summary}</p>
        </div>
      )}

      {/* Territory confirmation */}
      {memSaved && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Check className="h-3.5 w-3.5 text-emerald-500" />
          Your contribution has enriched the territory.
        </div>
      )}

      {/* Quest draft */}
      {result.questDraft && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Quest draft generated from your vision:</p>
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <input
              type="text"
              value={questTitle}
              onChange={(e) => setQuestTitle(e.target.value)}
              className="w-full bg-transparent text-base font-semibold text-foreground outline-none placeholder:text-muted-foreground/50"
              placeholder="Quest title…"
            />
            <Textarea
              value={questDesc}
              onChange={(e) => setQuestDesc(e.target.value)}
              className="min-h-[80px] resize-none border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
              placeholder="Quest description…"
            />
            {result.questDraft.suggestedSkills?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <span className="text-xs text-muted-foreground mr-1">Skills:</span>
                {result.questDraft.suggestedSkills.map((s: string) => (
                  <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{s}</span>
                ))}
              </div>
            )}
            {result.questDraft.suggestedTopics?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <span className="text-xs text-muted-foreground mr-1">Topics:</span>
                {result.questDraft.suggestedTopics.map((t: string) => (
                  <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{t}</span>
                ))}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              {!questSaved ? (
                <>
                  <Button size="sm" onClick={saveQuestDraft} disabled={saving || !questTitle.trim()}>
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                    Save as draft
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate("/quests/new")}>
                    Open full editor
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => navigate(`/quests/${questSaved}`)}>
                  View quest <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Local Allies */}
      {result.localAllies?.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> Local Allies Who Could Help
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {result.localAllies.map((ally: any) => (
              <button
                key={ally.id}
                onClick={() => navigate(ally.route)}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-all text-left"
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={ally.logo_url} />
                  <AvatarFallback className="text-xs">{ally.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{ally.name}</p>
                  <p className="text-xs text-muted-foreground">{ally.entityType}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Standard suggestions */}
      {result.suggestions?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Other next steps:</p>
          {result.suggestions.map((s: any, i: number) => (
            <button
              key={i}
              onClick={() => {
                let route = s.route || "/explore";
                if (!route.startsWith("/") || route.includes("://")) route = "/explore";
                // Append queryParams if present
                if (s.queryParams && Object.keys(s.queryParams).length > 0) {
                  const url = new URL(route, window.location.origin);
                  Object.entries(s.queryParams).forEach(([k, v]) => url.searchParams.set(k, v as string));
                  route = url.pathname + url.search + url.hash;
                }
                navigate(route);
              }}
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

      <div className="flex justify-center pt-2">
        <Button variant="ghost" size="sm" onClick={onReset}>Start over</Button>
      </div>
    </motion.div>
  );
}

/* ───────── Main Component ───────── */

export default function HomeFeed() {
  const currentUser = useCurrentUser();
  const { user: authUser } = useAuth();
  const { persona } = usePersona();
  useMilestoneChecker();

  const [mode, setMode] = useState<"free" | "guided">(() => {
    const stored = localStorage.getItem("home-mode");
    if (stored === "free" || stored === "guided") return stored;
    // First-time users default to guided
    return "guided";
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [guidedTile, setGuidedTile] = useState<string | null>(null);
  const [lastInput, setLastInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const navigate = useNavigate();
  const verb = useRotatingVerb(persona);

  const userName = (authUser?.name || currentUser.name).split(" ")[0];

  useEffect(() => {
    localStorage.setItem("home-mode", mode);
  }, [mode]);

  const submitIntent = useCallback(async (text: string, source = "HOME_FREE") => {
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);
    setLastInput(text);
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

  const handleSuggestionClick = (route: string, queryParams?: Record<string, string>) => {
    let target = route && route.startsWith("/") && !route.includes("://") ? route : "/explore";
    if (queryParams && Object.keys(queryParams).length > 0) {
      const url = new URL(target, window.location.origin);
      Object.entries(queryParams).forEach(([k, v]) => url.searchParams.set(k, v));
      target = url.pathname + url.search + url.hash;
    }
    navigate(target);
  };

  // handleGuidedTile removed — guided mode now uses GuidedPathways component

  const isListeningRef = useRef(false);

  const toggleVoice = async () => {
    // Stop if already listening
    if (isListeningRef.current && recognitionRef.current) {
      isListeningRef.current = false;
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Voice input is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    // CRITICAL: Request microphone permission first to ensure the browser
    // grants access before SpeechRecognition tries to use it.
    // This must happen in the same user-gesture call stack.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Release the stream immediately — we only needed the permission grant
      stream.getTracks().forEach((t) => t.stop());
    } catch (e: any) {
      console.error("[STT] Microphone permission denied:", e);
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
        toast.error("Microphone permission denied. Please allow access in your browser settings, or open the app in a new tab.");
      } else {
        toast.error("Could not access microphone. Please try again or use a different browser.");
      }
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;

    let finalTranscript = "";

    recognition.onstart = () => {
      console.log("[STT] Recognition started");
      isListeningRef.current = true;
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t + " ";
        } else {
          interim += t;
        }
      }
      setInput(finalTranscript + interim);
    };

    recognition.onend = () => {
      console.log("[STT] Recognition ended, wasListening:", isListeningRef.current);
      if (isListeningRef.current && !finalTranscript.trim()) {
        // Auto-restart if user hasn't spoken yet (browser timeout)
        try { recognition.start(); } catch (_) { /* ignore */ }
        return;
      }
      isListeningRef.current = false;
      setIsListening(false);
      recognitionRef.current = null;
      if (finalTranscript.trim()) {
        submitIntent(finalTranscript.trim(), "HOME_FREE");
      }
    };

    recognition.onerror = (event: any) => {
      console.error("[STT] Error:", event.error);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        isListeningRef.current = false;
        setIsListening(false);
        recognitionRef.current = null;
        toast.error("Microphone permission denied. Please allow access in your browser settings, or open the app in a new tab.");
      } else if (event.error === "no-speech") {
        // Normal timeout, onend will auto-restart
      } else if (event.error !== "aborted") {
        isListeningRef.current = false;
        setIsListening(false);
        recognitionRef.current = null;
        toast.error("Could not capture audio. Please try again.");
      }
    };

    try {
      recognition.start();
    } catch (e: any) {
      console.error("[STT] Start failed:", e);
      toast.error("Failed to start voice capture. Try opening the app in a new tab.");
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      recognitionRef.current?.stop();
    };
  }, []);

  const resetAll = () => {
    setResult(null);
    setInput("");
    setGuidedTile(null);
    setLastInput("");
  };

  const isTerritory = result?.actionType === "TERRITORY_INTENT";

  return (
    <PageShell>
      <MilestonePopup />
      <div className="relative max-w-2xl mx-auto flex flex-col items-center min-h-[60vh] justify-center px-4 py-12 sm:py-20">

        {/* Floating glowing orb — soft reassuring presence */}
        <motion.div
          className="pointer-events-none absolute -left-8 top-1/3 sm:-left-16 md:-left-24 z-0"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        >
          <motion.div
            animate={{
              y: [0, -14, 0, -8, 0],
              x: [0, 4, 0, -3, 0],
              scale: [1, 1.06, 1, 1.03, 1],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="relative"
          >
            {/* Outer glow */}
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl w-20 h-20 sm:w-28 sm:h-28" />
            {/* Mid glow */}
            <div className="absolute inset-2 rounded-full bg-primary/15 blur-xl w-16 h-16 sm:w-24 sm:h-24" />
            {/* Core orb */}
            <div
              className="relative w-14 h-14 sm:w-20 sm:h-20 rounded-full"
              style={{
                background: "radial-gradient(circle at 35% 35%, hsl(var(--primary) / 0.5), hsl(var(--primary) / 0.15) 60%, transparent 80%)",
                boxShadow: "0 0 40px 8px hsl(var(--primary) / 0.15), inset 0 0 20px 4px hsl(var(--primary) / 0.1)",
              }}
            />
          </motion.div>
        </motion.div>

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
              resetAll();
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

            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? "Listening…" : "Type what you want to work on, explore, fix, create, or find…"}
              className={cn(
                "min-h-[56px] max-h-[120px] resize-none text-base bg-card border-border focus-visible:ring-primary/30",
                isListening && "border-primary ring-2 ring-primary/20"
              )}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitIntent(input, "HOME_FREE");
                }
              }}
            />

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleVoice}
                disabled={loading}
                className={cn(
                  "h-10 w-10 rounded-xl transition-colors",
                  isListening
                    ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                    : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                )}
                title={isListening ? "Stop listening" : "Voice input"}
              >
                {isListening ? (
                  <MicOff className="h-4 w-4 animate-pulse" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
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
        {mode === "guided" && !result && (
          <GuidedPathways persona={persona} userName={userName} userId={currentUser.id} />
        )}

        {/* ─── Territory Intent Flow ─── */}
        {result && isTerritory && (
          <TerritoryFlow
            result={result}
            originalInput={lastInput}
            userId={currentUser.id}
            persona={persona}
            onReset={resetAll}
          />
        )}

        {/* ─── Standard AI result (non-territory) ─── */}
        {result && !isTerritory && (
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
                    onClick={() => handleSuggestionClick(s.route || "/explore", s.queryParams)}
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
              <Button variant="ghost" size="sm" onClick={resetAll}>Start over</Button>
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

      {/* Task Board — below the AI section */}
      {currentUser.id && (
        <div className="max-w-2xl mx-auto px-4 pb-12 space-y-10">
          <MyTaskBoard userId={currentUser.id} />
          <FollowingActivity />
        </div>
      )}
    </PageShell>
  );
}
