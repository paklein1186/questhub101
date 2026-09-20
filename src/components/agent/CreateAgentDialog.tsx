import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Eye, EyeOff, CircleDollarSign, Gift, Plus, Trash2, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTopics, useTerritories } from "@/hooks/useSupabaseData";
import { toast } from "sonner";

type AgentSource = "platform" | "custom_llm" | "webhook";
type OwnerType = "user" | "guild" | "company";

export interface AgentOwner { type: Exclude<OwnerType, "user">; id: string; name: string }

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

function generateSecret(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return "whsec_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  /** Pre-selects the entity the agent is registered on behalf of. */
  defaultOwner?: AgentOwner;
  /** Also attaches the new agent to this unit once created. */
  attachTo?: { unitType: "guild" | "pod" | "quest"; unitId: string };
  onCreated?: (agentId: string) => void;
}

export function CreateAgentDialog({ open, onOpenChange, userId, defaultOwner, attachTo, onCreated }: Props) {
  const { t } = useTranslation();
  const { data: topics } = useTopics();
  const { data: territories } = useTerritories();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [purpose, setPurpose] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [variables, setVariables] = useState<{ name: string; description: string }[]>([]);
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [territoryIds, setTerritoryIds] = useState<string[]>([]);
  const [isListed, setIsListed] = useState(true);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [skills, setSkills] = useState("");
  const [category, setCategory] = useState("general");
  const [saving, setSaving] = useState(false);
  const [ownerKey, setOwnerKey] = useState(defaultOwner ? `${defaultOwner.type}:${defaultOwner.id}` : "user");

  const [pricingMode, setPricingMode] = useState<"free" | "paid">("free");
  const [hirePrice, setHirePrice] = useState("0");
  const [usagePrice, setUsagePrice] = useState("5");
  const [freeCallsLimit, setFreeCallsLimit] = useState("");

  const [agentSource, setAgentSource] = useState<AgentSource>("platform");
  const [llmProvider, setLlmProvider] = useState("");
  const [llmModel, setLlmModel] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");

  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: fetchedOwners = [] } = useQuery({
    queryKey: ["agent-owner-options", userId],
    enabled: open,
    queryFn: async () => {
      const [guilds, companies] = await Promise.all([
        supabase.from("guild_members").select("guild_id, guilds(id, name, is_deleted)").eq("user_id", userId).in("role", ["ADMIN"] as any[]),
        supabase.from("company_members").select("company_id, companies(id, name, is_deleted)").eq("user_id", userId).in("role", ["OWNER", "ADMIN"]),
      ]);
      const owners: AgentOwner[] = [];
      for (const m of (guilds.data ?? []) as any[]) {
        if (m.guilds && !m.guilds.is_deleted) owners.push({ type: "guild", id: m.guilds.id, name: m.guilds.name });
      }
      for (const m of (companies.data ?? []) as any[]) {
        if (m.companies && !m.companies.is_deleted) owners.push({ type: "company", id: m.companies.id, name: m.companies.name });
      }
      return owners;
    },
  });

  const ownerOptions = useMemo(() => {
    if (defaultOwner && !fetchedOwners.some((o) => o.type === defaultOwner.type && o.id === defaultOwner.id)) {
      return [defaultOwner, ...fetchedOwners];
    }
    return fetchedOwners;
  }, [fetchedOwners, defaultOwner]);

  const filteredModels = useMemo(() => LLM_PROVIDERS.find((p) => p.value === llmProvider)?.models || [], [llmProvider]);

  const CATEGORIES = [
    { value: "intelligence", label: t("agents.intelligence") },
    { value: "writing", label: t("agents.writing") },
    { value: "strategy", label: t("agents.strategy") },
    { value: "coaching", label: t("agents.coaching") },
    { value: "general", label: t("agents.general") },
  ];

  const toggle = (list: string[], set: (v: string[]) => void, id: string) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const resetForm = () => {
    setName(""); setDescription(""); setPurpose(""); setLongDescription(""); setVariables([]);
    setTopicIds([]); setTerritoryIds([]); setIsListed(true); setSystemPrompt(""); setSkills("");
    setAgentSource("platform"); setLlmProvider(""); setLlmModel("");
    setLlmApiKey(""); setWebhookUrl(""); setShowApiKey(false);
    setPricingMode("free"); setHirePrice("0"); setUsagePrice("5"); setFreeCallsLimit("");
    setOwnerKey(defaultOwner ? `${defaultOwner.type}:${defaultOwner.id}` : "user");
  };

  const handleCreate = async () => {
    if (!name.trim()) { toast.error(t("agents.nameRequired")); return; }
    if (agentSource === "platform" && !systemPrompt.trim()) { toast.error(t("agents.nameRequired")); return; }
    if (agentSource === "webhook" && !webhookUrl.trim()) { toast.error("Webhook URL is required"); return; }
    if (agentSource === "custom_llm" && (!llmProvider || !llmModel || !llmApiKey.trim())) {
      toast.error("Provider, model, and API key are required"); return;
    }

    const [ownerType, ownerId] = ownerKey === "user" ? ["user" as OwnerType, userId] : (ownerKey.split(":") as [OwnerType, string]);

    setSaving(true);
    const isFree = pricingMode === "free";
    const insertPayload: any = {
      name: name.trim(),
      description: description.trim() || null,
      purpose: purpose.trim() || null,
      long_description: longDescription.trim() || null,
      variables: variables.filter((v) => v.name.trim()).map((v) => ({ name: v.name.trim(), description: v.description.trim() })),
      system_prompt: agentSource === "platform" ? systemPrompt.trim() : `External agent (${agentSource})`,
      skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
      cost_per_use: isFree ? 0 : (parseInt(usagePrice) || 0),
      category,
      creator_user_id: userId,
      owner_type: ownerType,
      owner_id: ownerId,
      is_published: isListed,
      agent_source: agentSource,
      billing_currency: isFree ? "free" : "credits",
      pricing_mode: pricingMode,
      hire_price: isFree ? 0 : (parseInt(hirePrice) || 0),
      usage_price: isFree ? 0 : (parseInt(usagePrice) || 0),
      free_calls_limit: freeCallsLimit ? parseInt(freeCallsLimit) : null,
    };

    if (agentSource === "webhook") insertPayload.external_webhook_url = webhookUrl.trim();
    if (agentSource === "custom_llm") insertPayload.external_llm_config = { provider: llmProvider, model: llmModel };

    const { data: agent, error } = await supabase.from("agents").insert(insertPayload as any).select("id").single();
    if (error || !agent) { setSaving(false); toast.error(t("agents.failedToCreate")); return; }

    // Secrets go to a creator-only table, never on the publicly readable agents row.
    let secret: string | null = null;
    if (agentSource !== "platform") {
      secret = agentSource === "webhook" ? generateSecret() : null;
      const { error: secretErr } = await supabase.from("agent_secrets" as any).insert({
        agent_id: agent.id,
        webhook_secret: secret,
        llm_api_key: agentSource === "custom_llm" ? llmApiKey.trim() : null,
      } as any);
      if (secretErr) {
        await supabase.from("agents").delete().eq("id", agent.id);
        setSaving(false);
        toast.error(t("agents.failedToCreate"));
        return;
      }
    }

    if (topicIds.length) await supabase.from("agent_topics" as any).insert(topicIds.map((topic_id) => ({ agent_id: agent.id, topic_id })) as any);
    if (territoryIds.length) await supabase.from("agent_territories" as any).insert(territoryIds.map((territory_id) => ({ agent_id: agent.id, territory_id })) as any);

    if (attachTo) {
      await supabase.from("unit_agents" as any).insert({
        agent_id: agent.id,
        unit_type: attachTo.unitType,
        unit_id: attachTo.unitId,
        admitted_by_user_id: userId,
      } as any);
    }

    setSaving(false);
    toast.success(t("agents.agentCreated"));
    onOpenChange(false);
    resetForm();
    onCreated?.(agent.id);
    if (secret) setCreatedSecret(secret);
  };

  const isExternal = agentSource !== "platform";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t("agents.createAgent")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {SOURCE_MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => { setAgentSource(m.value); setLlmProvider(""); setLlmModel(""); }}
                  className={`rounded-lg border-2 p-3 text-left transition-all text-sm ${
                    agentSource === m.value ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-muted-foreground/40"
                  }`}
                >
                  <span className="text-lg">{m.emoji}</span>
                  <p className="font-medium text-foreground mt-1 leading-tight">{m.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{m.desc}</p>
                </button>
              ))}
            </div>

            {isExternal && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700/50 p-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  External agents start at <strong>Trust Level 0 (Untrusted)</strong>. Trust is earned through successful interactions and community endorsements.
                </p>
              </div>
            )}

            {ownerOptions.length > 0 && (
              <div>
                <Label>{t("agentForm.publishAs")}</Label>
                <Select value={ownerKey} onValueChange={setOwnerKey}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">{t("agentForm.asMyself")}</SelectItem>
                    {ownerOptions.map((o) => (
                      <SelectItem key={`${o.type}:${o.id}`} value={`${o.type}:${o.id}`}>
                        {o.name} · {t(`agentForm.ownerType.${o.type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>{t("common.name")} *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Marketing Strategist" />
            </div>
            <div>
              <Label>{t("common.category")}</Label>
              <div className="flex gap-2 flex-wrap mt-1">
                {CATEGORIES.map((c) => (
                  <Button key={c.value} variant={category === c.value ? "default" : "outline"} size="sm" onClick={() => setCategory(c.value)}>{c.label}</Button>
                ))}
              </div>
            </div>
            <div>
              <Label>{t("common.description")}</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("agentForm.shortDescriptionPlaceholder")} rows={2} />
            </div>
            <div>
              <Label>{t("agentForm.purpose")}</Label>
              <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder={t("agentForm.purposePlaceholder")} />
            </div>
            <div>
              <Label>{t("agentForm.longDescription")}</Label>
              <Textarea value={longDescription} onChange={(e) => setLongDescription(e.target.value)} placeholder={t("agentForm.longDescriptionPlaceholder")} rows={4} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("agentForm.variables")}</Label>
                <Button type="button" variant="ghost" size="sm" onClick={() => setVariables([...variables, { name: "", description: "" }])}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> {t("agentForm.addVariable")}
                </Button>
              </div>
              {variables.map((v, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <Input value={v.name} onChange={(e) => setVariables(variables.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder={t("agentForm.variableName")} className="w-1/3" />
                  <Input value={v.description} onChange={(e) => setVariables(variables.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} placeholder={t("agentForm.variableDescription")} />
                  <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => setVariables(variables.filter((_, j) => j !== i))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <div>
              <Label>{t("agentForm.scopeTopics")}</Label>
              <div className="flex flex-wrap gap-1.5 mt-1 max-h-28 overflow-y-auto">
                {(topics ?? []).map((tp: any) => (
                  <Badge key={tp.id} variant={topicIds.includes(tp.id) ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => toggle(topicIds, setTopicIds, tp.id)}>
                    {tp.name}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label>{t("agentForm.scopeTerritories")}</Label>
              <div className="flex flex-wrap gap-1.5 mt-1 max-h-28 overflow-y-auto">
                {(territories ?? []).map((tr: any) => (
                  <Badge key={tr.id} variant={territoryIds.includes(tr.id) ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => toggle(territoryIds, setTerritoryIds, tr.id)}>
                    {tr.name}
                  </Badge>
                ))}
              </div>
            </div>

            {agentSource === "platform" && (
              <div>
                <Label>{t("agents.systemPrompt")} *</Label>
                <Textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} placeholder="You are a..." rows={4} />
              </div>
            )}

            {agentSource === "custom_llm" && (
              <>
                <div>
                  <Label>Provider *</Label>
                  <Select value={llmProvider} onValueChange={(v) => { setLlmProvider(v); setLlmModel(""); }}>
                    <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                    <SelectContent>
                      {LLM_PROVIDERS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {llmProvider && (
                  <div>
                    <Label>Model *</Label>
                    <Select value={llmModel} onValueChange={setLlmModel}>
                      <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                      <SelectContent>
                        {filteredModels.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
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
                      onChange={(e) => setLlmApiKey(e.target.value)}
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
                  <p className="text-[11px] text-muted-foreground mt-1">{t("agentForm.apiKeyNote")}</p>
                </div>
              </>
            )}

            {agentSource === "webhook" && (
              <>
                <div>
                  <Label>Webhook URL *</Label>
                  <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://your-server.com/agent" />
                </div>
                <div className="rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground space-y-1.5">
                  <p className="font-medium text-foreground text-sm">{t("agentForm.expectedFormat")}</p>
                  <p><strong>POST</strong> · JSON</p>
                  <pre className="bg-background rounded p-2 overflow-x-auto text-[11px]">{`{
  "messages": [{ "role": "user", "content": "..." }],
  "context": {
    "unit_type": "guild",
    "unit_id": "uuid",
    "unit_context": "...",
    "agent_id": "uuid",
    "user_id": "uuid"
  }
}`}</pre>
                  <p><strong>{t("agentForm.response")}</strong></p>
                  <pre className="bg-background rounded p-2 overflow-x-auto text-[11px]">{`{ "content": "agent answer" }
// or an SSE stream (text/event-stream)`}</pre>
                  <p>{t("agentForm.secretNote")}</p>
                </div>
              </>
            )}

            <div>
              <Label className="mb-2 block">Monetization</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPricingMode("free")}
                  className={`flex items-start gap-2 rounded-lg border-2 p-3 text-left transition-all ${
                    pricingMode === "free" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"
                  }`}
                >
                  <Gift className={`h-4 w-4 mt-0.5 shrink-0 ${pricingMode === "free" ? "text-primary" : "text-muted-foreground"}`} />
                  <div>
                    <p className="font-medium text-sm text-foreground">Free</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">No charge for hire or usage</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPricingMode("paid")}
                  className={`flex items-start gap-2 rounded-lg border-2 p-3 text-left transition-all ${
                    pricingMode === "paid" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"
                  }`}
                >
                  <CircleDollarSign className={`h-4 w-4 mt-0.5 shrink-0 ${pricingMode === "paid" ? "text-primary" : "text-muted-foreground"}`} />
                  <div>
                    <p className="font-medium text-sm text-foreground">Paid</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">Set hire & usage prices</p>
                  </div>
                </button>
              </div>
            </div>

            {pricingMode === "paid" && (
              <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/30">
                <div>
                  <Label>Hire price (one-time, credits)</Label>
                  <Input type="number" value={hirePrice} onChange={(e) => setHirePrice(e.target.value)} min="0" placeholder="0 = free to hire" />
                  {parseInt(hirePrice) > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ≈ <span className="font-medium text-foreground">€{((parseInt(hirePrice) || 0) * 0.04).toFixed(2)}</span>
                    </p>
                  )}
                </div>
                <div>
                  <Label>Usage price (per message, credits)</Label>
                  <Input type="number" value={usagePrice} onChange={(e) => setUsagePrice(e.target.value)} min="0" />
                  {parseInt(usagePrice) > 0 && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      ≈ <span className="font-medium text-foreground">€{((parseInt(usagePrice) || 0) * 0.04).toFixed(2)}</span>/msg · You earn <span className="font-medium text-foreground">80%</span> = <span className="font-medium text-foreground">€{((parseInt(usagePrice) || 0) * 0.04 * 0.8).toFixed(2)}</span> per msg
                    </p>
                  )}
                </div>
                <div>
                  <Label>Free calls limit (optional)</Label>
                  <Input type="number" value={freeCallsLimit} onChange={(e) => setFreeCallsLimit(e.target.value)} min="0" placeholder="Unlimited if empty" />
                  <p className="text-[11px] text-muted-foreground mt-1">Number of free interactions before charging</p>
                </div>
              </div>
            )}

            <div>
              <Label>{t("agents.skillsCommaSeparated")}</Label>
              <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="copywriting, strategy, analysis" />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">{t("agentForm.listed")}</p>
                <p className="text-[11px] text-muted-foreground">{t("agentForm.listedNote")}</p>
              </div>
              <Switch checked={isListed} onCheckedChange={setIsListed} />
            </div>

            <Button onClick={handleCreate} disabled={saving} className="w-full">
              {saving ? t("agents.creating") : t("agents.createAgent")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!createdSecret} onOpenChange={(v) => { if (!v) { setCreatedSecret(null); setCopied(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t("agentForm.secretTitle")}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{t("agentForm.secretIntro")}</p>
          <div className="flex gap-2">
            <Input readOnly value={createdSecret ?? ""} className="font-mono text-xs" onClick={(e) => (e.target as HTMLInputElement).select()} />
            <Button
              variant="secondary"
              size="icon"
              onClick={() => { navigator.clipboard.writeText(createdSecret ?? ""); setCopied(true); }}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
