import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bot, Plus, Sparkles, Search, Zap, Star, Globe, Key, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionBanner, HINTS } from "@/components/onboarding/ContextualHint";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentSourceBadge } from "@/components/agent/AgentSourceBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const CATEGORY_COLORS: Record<string, string> = {
  intelligence: "bg-blue-500/10 text-blue-600 border-blue-200",
  writing: "bg-purple-500/10 text-purple-600 border-purple-200",
  strategy: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  coaching: "bg-amber-500/10 text-amber-600 border-amber-200",
  general: "bg-muted text-muted-foreground border-border",
};

export default function AgentsMarketplace({ bare }: { bare?: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);

  const CATEGORIES = [
    { value: "all", label: t("common.all") },
    { value: "intelligence", label: t("agents.intelligence") },
    { value: "writing", label: t("agents.writing") },
    { value: "strategy", label: t("agents.strategy") },
    { value: "coaching", label: t("agents.coaching") },
    { value: "general", label: t("agents.general") },
  ];

  const { data: agents, isLoading } = useQuery({
    queryKey: ["agents", category, search],
    queryFn: async () => {
      let q = supabase.from("agents").select("*").eq("is_published", true).order("is_featured", { ascending: false }).order("usage_count", { ascending: false });
      if (category !== "all") q = q.eq("category", category);
      if (search.trim()) q = q.ilike("name", `%${search.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const { data: myHires } = useQuery({
    queryKey: ["my-agent-hires", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("agent_hires").select("agent_id").eq("user_id", user!.id).eq("status", "active");
      if (error) throw error;
      return new Set(data.map((h: any) => h.agent_id));
    },
  });

  const Wrapper = bare ? "div" : PageShell;

  return (
    <Wrapper>
      {!bare && <SectionBanner {...HINTS.banners.agents} />}
      {!bare && (
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Bot className="h-7 w-7 text-primary" /> {t("agents.title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("agents.subtitle")}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t("agents.searchAgents")} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(c => (
            <Button key={c.value} variant={category === c.value ? "default" : "outline"} size="sm" onClick={() => setCategory(c.value)}>{c.label}</Button>
          ))}
        </div>
        {user && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> {t("agents.createAgent")}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : !agents?.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <Bot className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>{t("agents.noAgentsFound")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent: any) => (
            <Card
              key={agent.id}
              className="p-5 hover:shadow-lg transition-shadow cursor-pointer group relative overflow-hidden"
              onClick={() => navigate(`/agents/${agent.id}`)}
            >
              {agent.is_featured && (
                <div className="absolute top-3 right-3">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                </div>
              )}
              <div className="flex items-start gap-3 mb-3">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">{agent.name}</h3>
                   <Badge variant="outline" className={`text-[10px] mt-1 ${CATEGORY_COLORS[agent.category] || ""}`}>{agent.category}</Badge>
                    <AgentSourceBadge agentSource={agent.agent_source} healthStatus={agent.health_status} />
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{agent.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex gap-1 flex-wrap">
                  {agent.skills?.slice(0, 2).map((s: string) => (
                    <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                  ))}
                  {agent.skills?.length > 2 && <Badge variant="secondary" className="text-[10px]">+{agent.skills.length - 2}</Badge>}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Zap className="h-3 w-3" /> {agent.cost_per_use} {t("common.credits")}
                </div>
              </div>
              {myHires?.has(agent.id) && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary" />
              )}
            </Card>
          ))}
        </div>
      )}

      {user && <CreateAgentDialog open={createOpen} onOpenChange={setCreateOpen} userId={user.id} />}
    </Wrapper>
  );
}

type AgentSource = "platform" | "custom_llm" | "webhook";

const LLM_PROVIDERS: { value: string; label: string; models: { value: string; label: string }[] }[] = [
  {
    value: "openai", label: "OpenAI",
    models: [
      { value: "gpt-4o", label: "GPT-4o" },
      { value: "gpt-4o-mini", label: "GPT-4o Mini" },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
      { value: "o1-mini", label: "o1-mini" },
    ],
  },
  {
    value: "anthropic", label: "Anthropic",
    models: [
      { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
      { value: "claude-haiku-4-20250414", label: "Claude Haiku 4" },
    ],
  },
  {
    value: "mistral", label: "Mistral",
    models: [
      { value: "mistral-large-latest", label: "Mistral Large" },
      { value: "mistral-small-latest", label: "Mistral Small" },
    ],
  },
  {
    value: "groq", label: "Groq",
    models: [
      { value: "llama-3.3-70b-versatile", label: "LLaMA 3.3 70B" },
      { value: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
    ],
  },
];

const SOURCE_MODES: { value: AgentSource; emoji: string; label: string; desc: string }[] = [
  { value: "platform", emoji: "🤖", label: "QuestHub AI", desc: "Powered by platform AI models" },
  { value: "custom_llm", emoji: "🔑", label: "My own model", desc: "Bring your own API key & model" },
  { value: "webhook", emoji: "🔗", label: "External bot", desc: "Connect via webhook URL" },
];

function CreateAgentDialog({ open, onOpenChange, userId }: { open: boolean; onOpenChange: (v: boolean) => void; userId: string }) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [skills, setSkills] = useState("");
  const [costPerUse, setCostPerUse] = useState("5");
  const [category, setCategory] = useState("general");
  const [saving, setSaving] = useState(false);

  // Source mode
  const [agentSource, setAgentSource] = useState<AgentSource>("platform");

  // Custom LLM fields
  const [llmProvider, setLlmProvider] = useState("");
  const [llmModel, setLlmModel] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  // Webhook fields
  const [webhookUrl, setWebhookUrl] = useState("");

  const filteredModels = useMemo(() => {
    return LLM_PROVIDERS.find(p => p.value === llmProvider)?.models || [];
  }, [llmProvider]);

  const CATEGORIES = [
    { value: "intelligence", label: t("agents.intelligence") },
    { value: "writing", label: t("agents.writing") },
    { value: "strategy", label: t("agents.strategy") },
    { value: "coaching", label: t("agents.coaching") },
    { value: "general", label: t("agents.general") },
  ];

  const resetForm = () => {
    setName(""); setDescription(""); setSystemPrompt(""); setSkills("");
    setAgentSource("platform"); setLlmProvider(""); setLlmModel("");
    setLlmApiKey(""); setWebhookUrl(""); setShowApiKey(false);
  };

  const handleCreate = async () => {
    if (!name.trim()) { toast.error(t("agents.nameRequired")); return; }
    if (agentSource === "platform" && !systemPrompt.trim()) { toast.error(t("agents.nameRequired")); return; }
    if (agentSource === "webhook" && !webhookUrl.trim()) { toast.error("Webhook URL is required"); return; }
    if (agentSource === "custom_llm" && (!llmProvider || !llmModel || !llmApiKey.trim())) {
      toast.error("Provider, model, and API key are required"); return;
    }

    setSaving(true);
    const insertPayload: any = {
      name: name.trim(),
      description: description.trim() || null,
      system_prompt: agentSource === "platform" ? systemPrompt.trim() : `External agent (${agentSource})`,
      skills: skills.split(",").map(s => s.trim()).filter(Boolean),
      cost_per_use: parseInt(costPerUse) || 5,
      category,
      creator_user_id: userId,
      is_published: true,
      agent_source: agentSource,
    };

    if (agentSource === "webhook") {
      insertPayload.external_webhook_url = webhookUrl.trim();
    }
    if (agentSource === "custom_llm") {
      insertPayload.external_llm_config = {
        provider: llmProvider,
        model: llmModel,
        api_key_ref: llmApiKey.trim(),
      };
    }

    const { error } = await supabase.from("agents").insert(insertPayload as any);
    setSaving(false);
    if (error) { toast.error(t("agents.failedToCreate")); return; }
    toast.success(t("agents.agentCreated"));
    onOpenChange(false);
    resetForm();
  };

  const isExternal = agentSource !== "platform";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{t("agents.createAgent")}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {/* Mode selector */}
          <div className="grid grid-cols-3 gap-2">
            {SOURCE_MODES.map(m => (
              <button
                key={m.value}
                type="button"
                onClick={() => { setAgentSource(m.value); setLlmProvider(""); setLlmModel(""); }}
                className={`rounded-lg border-2 p-3 text-left transition-all text-sm ${
                  agentSource === m.value
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-muted-foreground/40"
                }`}
              >
                <span className="text-lg">{m.emoji}</span>
                <p className="font-medium text-foreground mt-1 leading-tight">{m.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{m.desc}</p>
              </button>
            ))}
          </div>

          {/* Trust warning for external */}
          {isExternal && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700/50 p-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800 dark:text-amber-300">
                External agents start at <strong>Trust Level 0 (Untrusted)</strong>. Trust is earned through successful interactions and community endorsements.
              </p>
            </div>
          )}

          {/* Common fields */}
          <div>
            <Label>{t("common.name")} *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Marketing Strategist" />
          </div>
          <div>
            <Label>{t("common.category")}</Label>
            <div className="flex gap-2 flex-wrap mt-1">
              {CATEGORIES.map(c => (
                <Button key={c.value} variant={category === c.value ? "default" : "outline"} size="sm" onClick={() => setCategory(c.value)}>{c.label}</Button>
              ))}
            </div>
          </div>
          <div>
            <Label>{t("common.description")}</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={t("common.description")} rows={2} />
          </div>

          {/* Platform-only: system prompt */}
          {agentSource === "platform" && (
            <div>
              <Label>{t("agents.systemPrompt")} *</Label>
              <Textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} placeholder="You are a..." rows={4} />
            </div>
          )}

          {/* Custom LLM fields */}
          {agentSource === "custom_llm" && (
            <>
              <div>
                <Label>Provider *</Label>
                <Select value={llmProvider} onValueChange={v => { setLlmProvider(v); setLlmModel(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                  <SelectContent>
                    {LLM_PROVIDERS.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {llmProvider && (
                <div>
                  <Label>Model *</Label>
                  <Select value={llmModel} onValueChange={setLlmModel}>
                    <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                    <SelectContent>
                      {filteredModels.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>API Key *</Label>
                <div className="relative">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    value={llmApiKey}
                    onChange={e => setLlmApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Your key is stored encrypted and only used for this agent's calls.</p>
              </div>
            </>
          )}

          {/* Webhook fields */}
          {agentSource === "webhook" && (
            <>
              <div>
                <Label>Webhook URL *</Label>
                <Input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://your-server.com/agent" />
              </div>
              <div className="rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground space-y-1.5">
                <p className="font-medium text-foreground text-sm">Expected format</p>
                <p><strong>POST</strong> request with JSON body:</p>
                <pre className="bg-background rounded p-2 overflow-x-auto text-[11px]">{`{
  "message": "user input",
  "conversation_id": "uuid",
  "context": { ... }
}`}</pre>
                <p><strong>Response</strong> (JSON):</p>
                <pre className="bg-background rounded p-2 overflow-x-auto text-[11px]">{`{
  "reply": "agent response text",
  "actions": []  // optional
}`}</pre>
              </div>
            </>
          )}

          {/* Common bottom fields */}
          <div>
            <Label>{t("agents.skillsCommaSeparated")}</Label>
            <Input value={skills} onChange={e => setSkills(e.target.value)} placeholder="copywriting, strategy, analysis" />
          </div>
          <div>
            <Label>{t("agents.costPerUse")}</Label>
            <Input type="number" value={costPerUse} onChange={e => setCostPerUse(e.target.value)} min="1" />
          </div>
          <Button onClick={handleCreate} disabled={saving} className="w-full">
            {saving ? t("agents.creating") : t("agents.createAgent")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}