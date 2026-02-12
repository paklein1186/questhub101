import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Send, Sparkles, Compass, Shield, CircleDot, BookOpen, Briefcase,
  Hash, User, Loader2, MapPin, Heart, Calendar, Coins, PlusCircle,
  FileText, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePersona } from "@/hooks/usePersona";
import { getHeroPrompts } from "@/lib/personaLabels";

interface AIAction {
  type: string;
  label: string;
  description: string;
}

interface AIRecommended {
  quests?: string[];
  guilds?: string[];
  territories?: string[];
  collaborators?: string[];
}

interface AIResponse {
  message: string;
  microcopy?: string;
  actions: AIAction[];
  recommended?: AIRecommended;
}

const ACTION_ICONS: Record<string, any> = {
  create_quest: PlusCircle,
  create_guild: Shield,
  create_pod: CircleDot,
  create_company: Briefcase,
  create_course: BookOpen,
  join_quest: Compass,
  submit_proposal: FileText,
  find_guild: Shield,
  join_pod: CircleDot,
  start_course: BookOpen,
  find_service: Briefcase,
  create_service: Briefcase,
  explore_houses: Hash,
  explore_territories: MapPin,
  view_profile: User,
  browse_quests: Compass,
  fund_quest: Coins,
  attend_event: Calendar,
};

const ACTION_ROUTES: Record<string, string> = {
  create_quest: "/quests/create",
  create_guild: "/guilds/new",
  create_pod: "/pods/new",
  create_company: "/companies/info",
  create_course: "/courses/new",
  join_quest: "/explore?tab=quests",
  submit_proposal: "/explore?tab=quests",
  find_guild: "/explore?tab=entities",
  join_pod: "/explore?tab=pods",
  start_course: "/explore?tab=courses",
  find_service: "/explore?tab=services",
  create_service: "/services/new",
  explore_houses: "/explore?tab=houses",
  explore_territories: "/explore?tab=territories",
  view_profile: "/me",
  browse_quests: "/explore?tab=quests",
  fund_quest: "/explore?tab=quests",
  attend_event: "/explore?tab=guilds",
};

interface HeroAIProps {
  userName: string;
  userContext?: {
    name: string;
    role: string;
    xpLevel: number;
    topics: string[];
    territories: string[];
    recentQuests?: string[];
    recentGuilds?: string[];
    recentServices?: string[];
    recentPods?: string[];
  };
}

export function HeroAI({ userName, userContext }: HeroAIProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { persona, label } = usePersona();

  const PROMPTS = getHeroPrompts(persona);

  const handleSubmit = async (text?: string) => {
    const message = text || query;
    if (!message.trim()) return;
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("home-assistant", {
        body: { message, userContext: { ...userContext, personaType: persona } },
      });
      if (fnError) throw fnError;
      if (data?.error) {
        setError(data.error);
      } else {
        setResponse(data as AIResponse);
      }
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action: AIAction) => {
    const route = ACTION_ROUTES[action.type];
    if (route) navigate(route);
  };

  const rec = response?.recommended;
  const hasRecommended = rec && (rec.quests?.length || rec.guilds?.length || rec.territories?.length || rec.collaborators?.length);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-accent/5 p-4 sm:p-6 md:p-10">
      <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative z-10 max-w-2xl mx-auto text-center space-y-5">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-3">
            <Bot className="h-3.5 w-3.5" /> AI Assistant
          </div>
          <p className="text-sm text-muted-foreground">{label("hero.tagline")}</p>
        </motion.div>

        {/* Input */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Ask me anything..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="h-12 text-base bg-background/80 backdrop-blur-sm"
            disabled={loading}
          />
          <Button size="lg" onClick={() => handleSubmit()} disabled={loading || !query.trim()} className="h-12 px-5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </motion.div>

        {/* Prompt suggestions */}
        {!response && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-2">
            {PROMPTS.map((prompt) => (
              <button key={prompt}
                onClick={() => { setQuery(prompt); handleSubmit(prompt); }}
                className="rounded-full border border-border bg-card/80 px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/30 hover:text-primary transition-all"
              >
                <Sparkles className="inline h-3 w-3 mr-1" />{prompt}
              </button>
            ))}
          </motion.div>
        )}

        {/* Loading */}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Thinking...
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-sm text-destructive">{error}</motion.p>
        )}

        {/* Response */}
        <AnimatePresence>
          {response && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-left space-y-4">
              <p className="text-sm leading-relaxed">{response.message}</p>

              {/* Microcopy */}
              {response.microcopy && (
                <p className="text-xs italic text-muted-foreground flex items-center gap-1">
                  <Heart className="h-3 w-3 text-primary" /> {response.microcopy}
                </p>
              )}

              {/* Action cards */}
              <div className="grid gap-2 sm:grid-cols-2">
                {response.actions.map((action, i) => {
                  const Icon = ACTION_ICONS[action.type] || Compass;
                  return (
                    <motion.button key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      onClick={() => handleAction(action)}
                      className="flex items-start gap-3 rounded-xl border border-border bg-card/80 p-3 text-left hover:border-primary/30 hover:shadow-sm transition-all group"
                    >
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{action.label}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{action.description}</p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Recommended items */}
              {hasRecommended && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                  className="space-y-2 pt-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Suggestions for you</p>
                  <div className="flex flex-wrap gap-1.5">
                    {rec.quests?.map((q, i) => (
                      <Badge key={`q-${i}`} variant="secondary" className="text-xs cursor-pointer hover:bg-primary/10"
                        onClick={() => navigate("/explore?tab=quests")}>
                        <Compass className="h-3 w-3 mr-1" />{q}
                      </Badge>
                    ))}
                    {rec.guilds?.map((g, i) => (
                      <Badge key={`g-${i}`} variant="secondary" className="text-xs cursor-pointer hover:bg-primary/10"
                        onClick={() => navigate("/explore?tab=guilds")}>
                        <Shield className="h-3 w-3 mr-1" />{g}
                      </Badge>
                    ))}
                    {rec.territories?.map((t, i) => (
                      <Badge key={`t-${i}`} variant="secondary" className="text-xs cursor-pointer hover:bg-primary/10"
                        onClick={() => navigate("/explore?tab=territories")}>
                        <MapPin className="h-3 w-3 mr-1" />{t}
                      </Badge>
                    ))}
                    {rec.collaborators?.map((c, i) => (
                      <Badge key={`c-${i}`} variant="secondary" className="text-xs cursor-pointer hover:bg-primary/10"
                        onClick={() => navigate("/explore?tab=users")}>
                        <Users className="h-3 w-3 mr-1" />{c}
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              )}

              <Button variant="ghost" size="sm" onClick={() => { setResponse(null); setQuery(""); inputRef.current?.focus(); }}>
                Ask something else
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
