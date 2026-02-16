import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Send, Sparkles, Compass, Shield, CircleDot, BookOpen, Briefcase,
  Hash, MapPin, Loader2, Heart, Calendar, Coins, PlusCircle, FileText,
  Users, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
  browse_quests: Compass,
  fund_quest: Coins,
  attend_event: Calendar,
};

const LANDING_PROMPTS = [
  "What are you up to today?",
  "How do you want to spread hope today?",
  "Ready to collaborate or create?",
  "What do you need next on your journey?",
];

export function LandingAIGuide() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleSubmit = async (text?: string) => {
    const message = text || query;
    if (!message.trim()) return;
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("home-assistant", {
        body: { message, userContext: { personaType: "UNSET" } },
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

  const rec = response?.recommended;
  const hasRecommended = rec && (rec.quests?.length || rec.guilds?.length || rec.territories?.length || rec.collaborators?.length);

  return (
    <section className="border-t border-border">
      <div className="container py-16 md:py-24">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <motion.div initial={{ opacity: 0, y: -8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-3">
              <Bot className="h-3.5 w-3.5" /> AI Guide
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">
              Not sure where to start?
            </h2>
            <p className="text-sm text-muted-foreground">
              Tell our AI guide what you're looking for — it'll point you to the right quests, guilds, and collaborators.
            </p>
          </motion.div>

          {/* Input */}
          <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder="What are you looking for?"
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
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap justify-center gap-2">
              {LANDING_PROMPTS.map((prompt) => (
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
                className="text-left space-y-4 rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/5 via-card to-accent/5 p-6">
                <p className="text-sm leading-relaxed">{response.message}</p>

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
                      <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}>
                        <Link to="/welcome"
                          className="flex items-start gap-3 rounded-xl border border-border bg-card/80 p-3 text-left hover:border-primary/30 hover:shadow-sm transition-all group block"
                        >
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{action.label}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{action.description}</p>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Recommended items */}
                {hasRecommended && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                    className="space-y-2 pt-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Explore related</p>
                    <div className="flex flex-wrap gap-1.5">
                      {rec.quests?.map((q, i) => (
                        <Badge key={`q-${i}`} variant="secondary" className="text-xs cursor-pointer hover:bg-primary/10"
                          onClick={() => navigate("/explore")}>
                          <Compass className="h-3 w-3 mr-1" />{q}
                        </Badge>
                      ))}
                      {rec.guilds?.map((g, i) => (
                        <Badge key={`g-${i}`} variant="secondary" className="text-xs cursor-pointer hover:bg-primary/10"
                          onClick={() => navigate("/explore")}>
                          <Shield className="h-3 w-3 mr-1" />{g}
                        </Badge>
                      ))}
                      {rec.territories?.map((t, i) => (
                        <Badge key={`t-${i}`} variant="secondary" className="text-xs cursor-pointer hover:bg-primary/10"
                          onClick={() => navigate("/explore")}>
                          <MapPin className="h-3 w-3 mr-1" />{t}
                        </Badge>
                      ))}
                      {rec.collaborators?.map((c, i) => (
                        <Badge key={`c-${i}`} variant="secondary" className="text-xs cursor-pointer hover:bg-primary/10"
                          onClick={() => navigate("/explore")}>
                          <Users className="h-3 w-3 mr-1" />{c}
                        </Badge>
                      ))}
                    </div>
                  </motion.div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <Button variant="ghost" size="sm" onClick={() => { setResponse(null); setQuery(""); inputRef.current?.focus(); }}>
                    Ask something else
                  </Button>
                  <Button size="sm" asChild>
                    <Link to="/welcome">Sign up to get started <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
