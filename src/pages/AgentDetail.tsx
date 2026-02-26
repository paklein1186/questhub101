import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, ArrowLeft, Zap, Send, Loader2, CheckCircle, Star, Sparkles, Users, Map, Tag, Briefcase, BookOpen, Globe, MessageSquare, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import AgentBillingTab from "@/components/agent/AgentBillingTab";

type Msg = { role: "user" | "assistant"; content: string };

const CATEGORY_PROMPTS: Record<string, string[]> = {
  strategy: [
    "Quels sont les axes stratégiques prioritaires ?",
    "Comment aligner les objectifs de l'équipe ?",
    "Propose un plan d'action sur 3 mois",
    "Analyse les forces et faiblesses actuelles",
  ],
  research: [
    "Quelles sont les tendances émergentes dans ce domaine ?",
    "Fais une synthèse des dernières avancées",
    "Compare les approches existantes",
    "Identifie les lacunes dans la recherche actuelle",
  ],
  creative: [
    "Propose des idées innovantes pour ce projet",
    "Comment stimuler la créativité de l'équipe ?",
    "Imagine un concept disruptif",
    "Aide-moi à brainstormer sur ce sujet",
  ],
  technical: [
    "Quelles technologies recommandes-tu ?",
    "Comment optimiser l'architecture actuelle ?",
    "Identifie les risques techniques",
    "Propose une solution à ce problème technique",
  ],
  community: [
    "Comment engager davantage les membres ?",
    "Propose des initiatives communautaires",
    "Quels sont les besoins de la communauté ?",
    "Comment améliorer la rétention ?",
  ],
  default: [
    "Présente-toi et explique tes compétences",
    "Comment peux-tu m'aider dans mon projet ?",
    "Quels sont les sujets que tu maîtrises le mieux ?",
    "Donne-moi un conseil pour commencer",
  ],
};

type RelatedPage = { label: string; path: string; icon: React.ReactNode };

function getContextualPages(messages: Msg[], agentCategory: string, agentSkills: string[]): RelatedPage[] {
  const allText = messages.map(m => m.content).join(" ").toLowerCase();
  const pages: RelatedPage[] = [];

  const kw = (words: string[]) => words.some(w => allText.includes(w));

  if (kw(["territoire", "territory", "région", "zone", "géograph", "local"])) {
    pages.push({ label: "Territoires", path: "/explore?tab=territories", icon: <Map className="h-3.5 w-3.5" /> });
  }
  if (kw(["compétence", "skill", "expertise", "savoir", "talent"])) {
    pages.push({ label: "Compétences", path: "/explore?tab=users", icon: <Users className="h-3.5 w-3.5" /> });
  }
  if (kw(["topic", "sujet", "thématique", "thème", "domaine"])) {
    pages.push({ label: "Topics", path: "/explore?tab=entities", icon: <Tag className="h-3.5 w-3.5" /> });
  }
  if (kw(["utilisateur", "user", "profil", "membre", "personne", "contact"])) {
    pages.push({ label: "Utilisateurs", path: "/explore?tab=users", icon: <Users className="h-3.5 w-3.5" /> });
  }
  if (kw(["quest", "mission", "projet", "défi", "challenge"])) {
    pages.push({ label: "Quests", path: "/quests", icon: <Sparkles className="h-3.5 w-3.5" /> });
  }
  if (kw(["guild", "guilde", "équipe", "groupe", "communauté"])) {
    pages.push({ label: "Guilds", path: "/guilds", icon: <Users className="h-3.5 w-3.5" /> });
  }
  if (kw(["service", "prestation", "offre", "booking"])) {
    pages.push({ label: "Services", path: "/services", icon: <Briefcase className="h-3.5 w-3.5" /> });
  }
  if (kw(["cours", "course", "formation", "apprentissage", "learn"])) {
    pages.push({ label: "Cours", path: "/courses", icon: <BookOpen className="h-3.5 w-3.5" /> });
  }
  if (kw(["agent", "ia", "ai", "intelligence", "automatisation"])) {
    pages.push({ label: "Agents", path: "/agents", icon: <Bot className="h-3.5 w-3.5" /> });
  }
  if (kw(["réseau", "network", "connexion", "carte"])) {
    pages.push({ label: "Réseau", path: "/network", icon: <Globe className="h-3.5 w-3.5" /> });
  }

  // Deduplicate by path
  const seen = new Set<string>();
  return pages.filter(p => {
    if (seen.has(p.path)) return false;
    seen.add(p.path);
    return true;
  }).slice(0, 4);
}

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: agent, isLoading } = useQuery({
    queryKey: ["agent", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("agents").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: hire } = useQuery({
    queryKey: ["agent-hire", user?.id, id],
    enabled: !!user?.id && !!id,
    queryFn: async () => {
      const { data } = await supabase.from("agent_hires").select("*").eq("user_id", user!.id).eq("agent_id", id!).eq("status", "active").maybeSingle();
      return data;
    },
  });

  const hireMut = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("agent_hires").insert({ user_id: user.id, agent_id: id! } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agent hired! You can now chat.");
      qc.invalidateQueries({ queryKey: ["agent-hire"] });
      qc.invalidateQueries({ queryKey: ["my-agent-hires"] });
    },
    onError: () => toast.error("Failed to hire agent"),
  });

  const isHired = !!hire;

  if (isLoading) return <PageShell><Skeleton className="h-64" /></PageShell>;
  if (!agent) return <PageShell><p>Agent not found</p></PageShell>;

  return (
    <PageShell>
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-1">
            <CreditCard className="h-3.5 w-3.5" /> Billing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Agent info */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Bot className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                      {agent.name}
                      {agent.is_featured && <Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
                    </h1>
                    <Badge variant="outline" className="text-xs">{agent.category}</Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{agent.description}</p>
                <div className="flex flex-wrap gap-1 mb-4">
                  {agent.skills?.map((s: string) => (
                    <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <Zap className="h-4 w-4" /> {agent.cost_per_use} credits per message
                </div>
                <div className="text-xs text-muted-foreground">
                  {agent.usage_count} interactions
                </div>
              </Card>

              {!isHired && user && (
                <Button onClick={() => hireMut.mutate()} disabled={hireMut.isPending} className="w-full" size="lg">
                  <Sparkles className="h-4 w-4 mr-2" />
                  {hireMut.isPending ? "Hiring..." : "Hire this Agent"}
                </Button>
              )}
              {isHired && (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <CheckCircle className="h-4 w-4" /> You've hired this agent
                </div>
              )}
              {!user && (
                <Button onClick={() => navigate("/login")} className="w-full">Log in to hire</Button>
              )}
            </div>

            {/* Chat */}
            <div className="lg:col-span-2">
              {isHired ? (
                <AgentChat agentId={agent.id} agentName={agent.name} costPerUse={agent.cost_per_use} userId={user!.id} agentCategory={agent.category} agentSkills={agent.skills || []} />
              ) : (
                <Card className="p-12 text-center">
                  <Bot className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                  <h3 className="text-lg font-semibold mb-2">Hire to start chatting</h3>
                  <p className="text-sm text-muted-foreground">Hire this agent to begin a conversation and get personalized assistance.</p>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="billing">
          <AgentBillingTab agentId={agent.id} agentCreatorId={agent.creator_user_id} />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

function AgentChat({ agentId, agentName, costPerUse, userId, agentCategory, agentSkills }: { agentId: string; agentName: string; costPerUse: number; userId: string; agentCategory: string; agentSkills: string[] }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const suggestedPrompts = useMemo(() => {
    const cat = agentCategory?.toLowerCase() || "";
    return CATEGORY_PROMPTS[cat] || CATEGORY_PROMPTS.default;
  }, [agentCategory]);

  const contextualPages = useMemo(() => {
    return getContextualPages(messages, agentCategory, agentSkills);
  }, [messages, agentCategory, agentSkills]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendText = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;
    setInput("");
    const userMsg: Msg = { role: "user", content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setStreaming(true);

    let assistantSoFar = "";
    const allMessages = [...messages, userMsg];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error("Not authenticated");

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ agentId, messages: allMessages }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Failed to chat");
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Chat error");
      setMessages(prev => prev.filter(m => m !== userMsg));
    } finally {
      setStreaming(false);
    }
  }, [streaming, messages, agentId]);

  const send = useCallback(() => sendText(input), [sendText, input]);

  return (
    <Card className="flex flex-col h-[600px]">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <Bot className="h-5 w-5 text-primary" />
        <span className="font-semibold">{agentName}</span>
        <Badge variant="secondary" className="text-[10px] ml-auto"><Zap className="h-3 w-3 mr-0.5" />{costPerUse} credits/msg</Badge>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="py-8 space-y-4">
            <div className="text-center text-muted-foreground text-sm">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Commencez une conversation avec {agentName}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
              {suggestedPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => sendText(prompt)}
                  className="text-left text-xs px-3 py-2.5 rounded-xl border border-border bg-card hover:bg-muted/60 hover:border-primary/30 transition-all text-muted-foreground hover:text-foreground group"
                >
                  <MessageSquare className="h-3 w-3 inline mr-1.5 opacity-40 group-hover:opacity-70 text-primary" />
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
              m.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground"
            }`}>
              {m.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : m.content}
            </div>
          </div>
        ))}
        {streaming && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl px-4 py-2.5">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border">
        {/* Contextual related pages */}
        {contextualPages.length > 0 && (
          <div className="px-4 pt-3 flex flex-wrap gap-1.5">
            <span className="text-[10px] text-muted-foreground mr-1 self-center">Explorer :</span>
            {contextualPages.map((page) => (
              <Link
                key={page.path}
                to={page.path}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border border-border bg-card hover:bg-muted hover:border-primary/30 text-muted-foreground hover:text-foreground transition-all"
              >
                {page.icon}
                {page.label}
              </Link>
            ))}
          </div>
        )}
        <div className="p-4 flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Tapez votre message..."
            rows={1}
            className="resize-none min-h-[40px]"
          />
          <Button onClick={send} disabled={streaming || !input.trim()} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
