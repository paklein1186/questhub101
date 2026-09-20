import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation, Trans } from "react-i18next";
import { AlertTriangle, Eye, EyeOff, CircleDollarSign, Gift, Plus, Trash2, Copy, Check, Download, Loader2 } from "lucide-react";
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
import { WebhookSecretPanel } from "@/components/agent/WebhookSecretPanel";
import { toast } from "sonner";

type AgentSource = "platform" | "custom_llm" | "webhook";
type OwnerType = "user" | "guild" | "company";
type FreeFor = "nobody" | "admins" | "members";
type FreeScope = "nobody" | "owner_admins" | "owner_members";

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

const SOURCE_MODES: { value: AgentSource; emoji: string; key: string }[] = [
  { value: "platform", emoji: "🤖", key: "sourcePlatform" },
  { value: "custom_llm", emoji: "🔑", key: "sourceOwn" },
  { value: "webhook", emoji: "🔗", key: "sourceExternal" },
];

// Only external agents can be registered for now; platform / own-key agents that already
// exist stay editable (edit mode loads their source), but are no longer offered.
const CREATABLE_SOURCES: AgentSource[] = ["webhook"];

function generateSecret(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return "whsec_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

const isHttpsUrl = (u: string) => /^https:\/\/[^\s/]+\.[^\s/]+/.test(u);

type AgentVariable = { name: string; description: string; kind?: "input" | "data"; columns?: string[] };

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  /** Pre-selects the entity the agent is registered on behalf of. */
  defaultOwner?: AgentOwner;
  /** Also attaches the new agent to this unit once created. */
  attachTo?: { unitType: "guild" | "pod" | "quest"; unitId: string };
  onCreated?: (agentId: string) => void;
  /** Edit an existing agent instead of registering a new one. */
  editAgent?: any;
  onDeleted?: () => void;
}

export function CreateAgentDialog({ open, onOpenChange, userId, defaultOwner, attachTo, onCreated, editAgent, onDeleted }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const isEdit = !!editAgent;
  const { data: topics } = useTopics();
  const { data: territories } = useTerritories();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [purpose, setPurpose] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [variables, setVariables] = useState<AgentVariable[]>([]);
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [territoryIds, setTerritoryIds] = useState<string[]>([]);
  const [isListed, setIsListed] = useState(true);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [skills, setSkills] = useState("");
  const [category, setCategory] = useState("general");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [ownerKey, setOwnerKey] = useState(defaultOwner ? `${defaultOwner.type}:${defaultOwner.id}` : "user");

  const [pricingMode, setPricingMode] = useState<"free" | "paid">("free");
  const [hirePrice, setHirePrice] = useState("0");
  const [usagePrice, setUsagePrice] = useState("5");
  const [freeCallsLimit, setFreeCallsLimit] = useState("");
  const [freeFor, setFreeFor] = useState<FreeFor>("nobody");
  const [freeScope, setFreeScope] = useState<FreeScope>("nobody");
  const [deepEnabled, setDeepEnabled] = useState(false);
  const [deepPrice, setDeepPrice] = useState("6");

  const [agentSource, setAgentSource] = useState<AgentSource>(CREATABLE_SOURCES[0]);
  const [llmProvider, setLlmProvider] = useState("");
  const [llmModel, setLlmModel] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [customSecret, setCustomSecret] = useState("");
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ kind: "ok" | "none" | "error"; text: string } | null>(null);
  const lastImported = useRef("");
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncBaseUrl, setSyncBaseUrl] = useState("");

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

  // Edit mode: load the agent and its scope into the form each time the dialog opens.
  useEffect(() => {
    if (!open || !editAgent) return;
    const a = editAgent;
    setName(a.name ?? ""); setDescription(a.description ?? ""); setPurpose(a.purpose ?? ""); setLongDescription(a.long_description ?? "");
    setVariables(Array.isArray(a.variables) ? a.variables.map((v: any) => ({
      name: v.name ?? "", description: v.description ?? "", ...(v.kind ? { kind: v.kind } : {}), ...(Array.isArray(v.columns) ? { columns: v.columns } : {}),
    })) : []);
    setIsListed(a.is_published ?? true); setSystemPrompt(a.system_prompt ?? ""); setSkills((a.skills ?? []).join(", "));
    setCategory(a.category ?? "general");
    setAgentSource((a.agent_source ?? "platform") as AgentSource);
    setLlmProvider(a.external_llm_config?.provider ?? ""); setLlmModel(a.external_llm_config?.model ?? ""); setLlmApiKey("");
    setWebhookUrl(a.external_webhook_url ?? ""); setSyncEnabled(!!a.sync_enabled); setSyncBaseUrl(a.sync_base_url ?? "");
    setPricingMode((a.pricing_mode ?? (a.billing_currency === "free" ? "free" : "paid")) === "free" ? "free" : "paid");
    setHirePrice(String(a.hire_price ?? 0)); setUsagePrice(String(a.usage_price ?? a.cost_per_use ?? 5));
    setFreeCallsLimit(a.free_calls_limit != null ? String(a.free_calls_limit) : "");
    setFreeScope((a.free_scope ?? "nobody") as FreeScope);
    setDeepEnabled(Number(a.deep_price ?? 0) > 0); setDeepPrice(String(a.deep_price ?? 6));
    setImportStatus(null); lastImported.current = a.external_webhook_url ?? "";
    (async () => {
      const [tp, tr] = await Promise.all([
        supabase.from("agent_topics" as any).select("topic_id").eq("agent_id", a.id),
        supabase.from("agent_territories" as any).select("territory_id").eq("agent_id", a.id),
      ]);
      setTopicIds(((tp.data ?? []) as any[]).map((r) => r.topic_id));
      setTerritoryIds(((tr.data ?? []) as any[]).map((r) => r.territory_id));
    })();
  }, [open, editAgent?.id]);

  const resetForm = () => {
    setName(""); setDescription(""); setPurpose(""); setLongDescription(""); setVariables([]);
    setTopicIds([]); setTerritoryIds([]); setIsListed(true); setSystemPrompt(""); setSkills("");
    setAgentSource(CREATABLE_SOURCES[0]); setLlmProvider(""); setLlmModel("");
    setLlmApiKey(""); setWebhookUrl(""); setShowApiKey(false); setSyncEnabled(false); setSyncBaseUrl(""); setCustomSecret("");
    setPricingMode("free"); setHirePrice("0"); setUsagePrice("5"); setFreeCallsLimit(""); setFreeFor("nobody"); setFreeScope("nobody"); setDeepEnabled(false); setDeepPrice("6");
    setOwnerKey(defaultOwner ? `${defaultOwner.type}:${defaultOwner.id}` : "user");
    setImportStatus(null); lastImported.current = "";
  };

  // Reads the agent's own GET /manifest. Automatic runs only fill empty fields;
  // the explicit button replaces what is there.
  const importManifest = async (overwrite: boolean, urlOverride?: string) => {
    const target = (urlOverride ?? (syncBaseUrl.trim() || webhookUrl.trim())).trim();
    if (!target) return;
    lastImported.current = target;
    setImporting(true);
    setImportStatus(null);
    const { data, error } = await supabase.functions.invoke("agent-manifest", { body: { url: target } });
    setImporting(false);
    if (error) { setImportStatus({ kind: "error", text: t("agentForm.importFailed") }); return; }
    if (data?.error) { setImportStatus({ kind: "none", text: t("agentForm.importNoManifest") }); return; }
    const m = data?.manifest;
    if (!m) { setImportStatus({ kind: "error", text: t("agentForm.importFailed") }); return; }

    // Le chat appelle l'adresse de conversation de l'agent (ex. …/ask), pas la racine du site.
    if (m.ask_url && m.ask_url !== webhookUrl.trim()) {
      const typed = webhookUrl.trim();
      let bare = false;
      try { bare = new URL(typed).pathname.replace(/\/+$/, "") === ""; } catch { /* keep as typed */ }
      if (bare || overwrite) { setWebhookUrl(m.ask_url); lastImported.current = m.ask_url; }
    }
    if (m.name && (overwrite || !name.trim())) setName(m.name);
    if (m.description && (overwrite || !description.trim())) setDescription(m.description);
    if (m.purpose && (overwrite || !purpose.trim())) setPurpose(m.purpose);
    if (m.readme && (overwrite || !longDescription.trim())) setLongDescription(m.readme);
    if (m.category && CATEGORIES.some((c) => c.value === m.category) && (overwrite || category === "general")) setCategory(m.category);
    if (Array.isArray(m.variables) && m.variables.length && (overwrite || variables.length === 0)) setVariables(m.variables);
    if ((m.topic_ids ?? []).length && (overwrite || topicIds.length === 0)) setTopicIds(m.topic_ids);
    if ((m.territory_ids ?? []).length && (overwrite || territoryIds.length === 0)) setTerritoryIds(m.territory_ids);

    const unmatched = m.unmatched?.length ? ` ${t("agentForm.importUnmatched", { list: m.unmatched.join(", ") })}` : "";
    const bridged = (m.matches ?? []).filter((x: any) => x.wanted.trim().toLowerCase() !== x.name.trim().toLowerCase());
    const bridge = bridged.length ? ` ${t("agentForm.importBridged", { list: bridged.map((x: any) => `${x.wanted} → ${x.name}`).join(", ") })}` : "";
    setImportStatus({ kind: "ok", text: t("agentForm.imported", { count: (m.variables ?? []).length }) + bridge + unmatched });
  };

  // "URL first": as soon as a valid https URL is entered, the agent's details are pulled.
  useEffect(() => {
    if (!open || isEdit || agentSource !== "webhook") return;
    const u = webhookUrl.trim();
    if (!isHttpsUrl(u) || u === lastImported.current) return;
    const handle = setTimeout(() => importManifest(false, u), 800);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webhookUrl, agentSource, open]);

  const cleanVariables = () =>
    variables.filter((v) => v.name.trim()).map((v) => ({
      name: v.name.trim(),
      description: v.description.trim(),
      ...(v.kind ? { kind: v.kind } : {}),
      ...(v.columns?.length ? { columns: v.columns } : {}),
    }));

  const handleSave = async () => {
    if (!name.trim()) { toast.error(t("agents.nameRequired")); return; }
    if (agentSource === "platform" && !systemPrompt.trim()) { toast.error(t("agents.nameRequired")); return; }
    if (agentSource === "webhook" && !webhookUrl.trim()) { toast.error(t("agentForm.webhookUrlRequired")); return; }
    if (agentSource === "webhook" && syncEnabled && !syncBaseUrl.trim()) { toast.error(t("agentForm.syncBaseUrlRequired")); return; }
    if (agentSource === "custom_llm" && (!llmProvider || !llmModel)) { toast.error(t("agentForm.llmRequired")); return; }

    setSaving(true);
    const isFree = pricingMode === "free";
    const patch: any = {
      name: name.trim(),
      description: description.trim() || null,
      purpose: purpose.trim() || null,
      long_description: longDescription.trim() || null,
      variables: cleanVariables(),
      skills: skills.split(",").map((x) => x.trim()).filter(Boolean),
      cost_per_use: isFree ? 0 : (parseInt(usagePrice) || 0),
      category,
      is_published: isListed,
      billing_currency: isFree ? "free" : "credits",
      pricing_mode: pricingMode,
      hire_price: isFree ? 0 : (parseInt(hirePrice) || 0),
      usage_price: isFree ? 0 : (parseInt(usagePrice) || 0),
      free_calls_limit: freeCallsLimit ? parseInt(freeCallsLimit) : null,
      free_scope: isFree ? "nobody" : freeScope,
      deep_price: agentSource === "webhook" && deepEnabled ? Math.max(1, parseInt(deepPrice) || 6) : null,
    };
    if (agentSource === "platform") patch.system_prompt = systemPrompt.trim();
    if (agentSource === "webhook") {
      patch.external_webhook_url = webhookUrl.trim();
      patch.sync_enabled = syncEnabled;
      patch.sync_base_url = syncEnabled ? syncBaseUrl.trim() : null;
    }
    if (agentSource === "custom_llm") patch.external_llm_config = { ...(editAgent.external_llm_config ?? {}), provider: llmProvider, model: llmModel };

    const { error } = await supabase.from("agents").update(patch).eq("id", editAgent.id);
    if (error) { setSaving(false); toast.error(t("agentForm.saveFailed")); return; }

    await supabase.from("agent_topics" as any).delete().eq("agent_id", editAgent.id);
    await supabase.from("agent_territories" as any).delete().eq("agent_id", editAgent.id);
    if (topicIds.length) await supabase.from("agent_topics" as any).insert(topicIds.map((topic_id) => ({ agent_id: editAgent.id, topic_id })) as any);
    if (territoryIds.length) await supabase.from("agent_territories" as any).insert(territoryIds.map((territory_id) => ({ agent_id: editAgent.id, territory_id })) as any);
    if (agentSource === "custom_llm" && llmApiKey.trim()) {
      await supabase.from("agent_secrets" as any).upsert({ agent_id: editAgent.id, llm_api_key: llmApiKey.trim() } as any, { onConflict: "agent_id" });
    }

    setSaving(false);
    toast.success(t("agentForm.saved"));
    for (const key of [["agent", editAgent.id], ["agent-scope", editAgent.id], ["unit-agents"], ["agents"]]) qc.invalidateQueries({ queryKey: key });
    onOpenChange(false);
    onCreated?.(editAgent.id);
  };

  const handleDelete = async () => {
    setSaving(true);
    // A blocked delete returns no error, only no rows: check what was actually removed.
    const { data: removed, error } = await supabase.from("agents").delete().eq("id", editAgent.id).select("id");
    let outcome: "deleted" | "unpublished" | "failed" = "deleted";
    if (error || !removed?.length) {
      // Still referenced (usage history…): withdraw it from the catalogue and from every space instead.
      const { error: e2 } = await supabase.from("agents").update({ is_published: false }).eq("id", editAgent.id);
      if (e2) outcome = "failed";
      else {
        outcome = "unpublished";
        await supabase.from("unit_agents" as any).update({ is_active: false } as any).eq("agent_id", editAgent.id);
      }
    }
    setSaving(false);
    setConfirmDelete(false);
    if (outcome === "failed") { toast.error(t("agentForm.deleteFailed")); return; }
    toast.success(t(outcome === "deleted" ? "agentForm.deleted" : "agentForm.deletedUnpublished"));
    for (const key of [["agent", editAgent.id], ["agents"], ["unit-agents"]]) qc.invalidateQueries({ queryKey: key });
    onOpenChange(false);
    onDeleted?.();
  };

  const handleCreate = async () => {
    if (isEdit) { await handleSave(); return; }
    if (!name.trim()) { toast.error(t("agents.nameRequired")); return; }
    if (agentSource === "platform" && !systemPrompt.trim()) { toast.error(t("agents.nameRequired")); return; }
    if (agentSource === "webhook" && !webhookUrl.trim()) { toast.error(t("agentForm.webhookUrlRequired")); return; }
    if (agentSource === "webhook" && customSecret.trim() && customSecret.trim().length < 16) { toast.error(t("agentForm.secretTooShort")); return; }
    if (agentSource === "webhook" && syncEnabled && !syncBaseUrl.trim()) { toast.error(t("agentForm.syncBaseUrlRequired")); return; }
    if (agentSource === "custom_llm" && (!llmProvider || !llmModel || !llmApiKey.trim())) {
      toast.error(t("agentForm.llmRequired")); return;
    }

    const [ownerType, ownerId] = ownerKey === "user" ? ["user" as OwnerType, userId] : (ownerKey.split(":") as [OwnerType, string]);

    setSaving(true);
    const isFree = pricingMode === "free";
    const insertPayload: any = {
      name: name.trim(),
      description: description.trim() || null,
      purpose: purpose.trim() || null,
      long_description: longDescription.trim() || null,
      variables: cleanVariables(),
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
      free_scope: isFree || ownerType === "user" ? "nobody" : freeScope,
      deep_price: agentSource === "webhook" && deepEnabled ? Math.max(1, parseInt(deepPrice) || 6) : null,
    };

    if (agentSource === "webhook") insertPayload.external_webhook_url = webhookUrl.trim();
    if (agentSource === "webhook" && syncEnabled) {
      insertPayload.sync_enabled = true;
      insertPayload.sync_base_url = syncBaseUrl.trim();
    }
    if (agentSource === "custom_llm") insertPayload.external_llm_config = { provider: llmProvider, model: llmModel };

    const { data: agent, error } = await supabase.from("agents").insert(insertPayload as any).select("id").single();
    if (error || !agent) { setSaving(false); toast.error(t("agents.failedToCreate")); return; }

    // Secrets go to a creator-only table, never on the publicly readable agents row.
    let secret: string | null = null;
    let generatedSecret = false;
    if (agentSource !== "platform") {
      generatedSecret = agentSource === "webhook" && !customSecret.trim();
      secret = agentSource === "webhook" ? (customSecret.trim() || generateSecret()) : null;
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
        free_for: isFree ? "nobody" : freeFor,
      } as any);
    }

    setSaving(false);
    toast.success(t("agents.agentCreated"));
    onOpenChange(false);
    resetForm();
    onCreated?.(agent.id);
    if (secret && generatedSecret) setCreatedSecret(secret);
  };

  const effectiveOwner = isEdit
    ? { type: editAgent.owner_type as string, id: editAgent.owner_id as string | null }
    : ownerKey === "user" ? { type: "user", id: null } : { type: ownerKey.split(":")[0], id: ownerKey.split(":")[1] };
  const ownerHasMembers = effectiveOwner.type === "guild" || effectiveOwner.type === "company";
  const { data: ownerName } = useQuery({
    queryKey: ["owner-name", effectiveOwner.type, effectiveOwner.id],
    enabled: open && ownerHasMembers && !!effectiveOwner.id,
    queryFn: async () => {
      const { data } = await supabase.from((effectiveOwner.type === "guild" ? "guilds" : "companies") as any).select("name").eq("id", effectiveOwner.id!).maybeSingle();
      return (data as any)?.name as string | undefined;
    },
  });

  const isExternal = agentSource !== "platform";
  const unitLabel = attachTo ? t(`agentForm.unit.${attachTo.unitType}`) : "";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isEdit ? t("agentForm.editTitle") : t("agents.createAgent")}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {!isEdit && CREATABLE_SOURCES.length > 1 && <div className="grid grid-cols-3 gap-2">
              {SOURCE_MODES.filter((m) => CREATABLE_SOURCES.includes(m.value)).map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => { setAgentSource(m.value); setLlmProvider(""); setLlmModel(""); }}
                  className={`rounded-lg border-2 p-3 text-left transition-all text-sm ${
                    agentSource === m.value ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-muted-foreground/40"
                  }`}
                >
                  <span className="text-lg">{m.emoji}</span>
                  <p className="font-medium text-foreground mt-1 leading-tight">{t(`agentForm.${m.key}Label`)}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{t(`agentForm.${m.key}Desc`)}</p>
                </button>
              ))}
            </div>}

            {isExternal && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700/50 p-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  <Trans i18nKey="agentForm.trustWarning" components={{ b: <strong /> }} />
                </p>
              </div>
            )}

            {/* Connection first: the URL is pulled before anything else is typed. */}
            {agentSource === "webhook" && (
              <div className="space-y-3 rounded-lg border border-border p-3">
                <div>
                  <Label>{t("agentForm.webhookUrl")} *</Label>
                  <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://your-server.com/ask" autoFocus />
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Button type="button" variant="outline" size="sm" onClick={() => importManifest(true)} disabled={importing || !(webhookUrl.trim() || syncBaseUrl.trim())}>
                      {importing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
                      {t("agentForm.importFromAgent")}
                    </Button>
                    {importing && <span className="text-xs text-muted-foreground">{t("agentForm.importing")}</span>}
                    {!importing && importStatus && (
                      <span className={`text-xs ${importStatus.kind === "ok" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>{importStatus.text}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{t("agentForm.urlFirstNote")}</p>
                </div>
                {!isEdit && <div>
                  <Label>{t("agentForm.secretField")}</Label>
                  <Input value={customSecret} onChange={(e) => setCustomSecret(e.target.value)} placeholder={t("agentForm.secretFieldPlaceholder")} className="font-mono text-xs" autoComplete="off" />
                </div>}
              </div>
            )}

            {isEdit && agentSource === "webhook" && <WebhookSecretPanel agentId={editAgent.id} />}

            {!isEdit && ownerOptions.length > 0 && (
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
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("agentForm.namePlaceholder")} />
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
              <Textarea value={longDescription} onChange={(e) => setLongDescription(e.target.value)} placeholder={t("agentForm.longDescriptionPlaceholder")} rows={10} className="font-mono text-xs leading-relaxed" />
              <p className="text-[11px] text-muted-foreground mt-1">{t("agentForm.markdownHint")}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label>{t("agentForm.variables")}</Label>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setVariables([...variables, { name: "", description: "", kind: "input" }])}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> {t("agentForm.addVariable")}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setVariables([...variables, { name: "", description: "", kind: "data", columns: [] }])}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> {t("agentForm.addDataset")}
                  </Button>
                </div>
              </div>
              {variables.map((v, i) => {
                const patch = (p: Partial<AgentVariable>) => setVariables(variables.map((x, j) => (j === i ? { ...x, ...p } : x)));
                return (
                  <div key={i} className="rounded-lg border border-border p-2.5 space-y-2">
                    <div className="flex gap-2 items-center">
                      <Badge variant={v.kind === "data" ? "secondary" : "outline"} className="text-[10px] shrink-0">
                        {v.kind === "data" ? t("agentForm.kindData") : t("agentForm.kindInput")}
                      </Badge>
                      <Input value={v.name} onChange={(e) => patch({ name: e.target.value })} placeholder={t("agentForm.variableName")} className="font-mono text-xs" />
                      <Button type="button" variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => setVariables(variables.filter((_, j) => j !== i))}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Textarea value={v.description} onChange={(e) => patch({ description: e.target.value })} placeholder={t("agentForm.variableDescription")} rows={2} className="text-xs" />
                    {v.kind === "data" && (
                      <div>
                        <Input
                          value={(v.columns ?? []).join(", ")}
                          onChange={(e) => patch({ columns: e.target.value.split(",").map((c) => c.trim()).filter(Boolean) })}
                          placeholder={t("agentForm.columnsPlaceholder")}
                          className="font-mono text-xs"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
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
                <Textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} placeholder={t("agentForm.systemPromptPlaceholder")} rows={4} />
              </div>
            )}

            {agentSource === "custom_llm" && (
              <>
                <div>
                  <Label>{t("agentForm.provider")} *</Label>
                  <Select value={llmProvider} onValueChange={(v) => { setLlmProvider(v); setLlmModel(""); }}>
                    <SelectTrigger><SelectValue placeholder={t("agentForm.selectProvider")} /></SelectTrigger>
                    <SelectContent>
                      {LLM_PROVIDERS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {llmProvider && (
                  <div>
                    <Label>{t("agentForm.model")} *</Label>
                    <Select value={llmModel} onValueChange={setLlmModel}>
                      <SelectTrigger><SelectValue placeholder={t("agentForm.selectModel")} /></SelectTrigger>
                      <SelectContent>
                        {filteredModels.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>{t("agentForm.apiKey")} *</Label>
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
// ${t("agentForm.orSse")} (text/event-stream)`}</pre>
                  <p>{t("agentForm.secretNote")}</p>
                </div>

                <div className="space-y-2 rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{t("agentForm.syncTitle")}</p>
                      <p className="text-[11px] text-muted-foreground">{t("agentForm.syncNote")}</p>
                    </div>
                    <Switch
                      checked={syncEnabled}
                      onCheckedChange={(v) => {
                        setSyncEnabled(v);
                        if (v && !syncBaseUrl.trim() && isHttpsUrl(webhookUrl.trim())) setSyncBaseUrl(new URL(webhookUrl.trim()).origin);
                      }}
                    />
                  </div>
                  {syncEnabled && (
                    <Input value={syncBaseUrl} onChange={(e) => setSyncBaseUrl(e.target.value)} placeholder="https://your-server.com" />
                  )}
                </div>
              </>
            )}

            <div>
              <Label className="mb-2 block">{t("agentForm.monetization")}</Label>
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
                    <p className="font-medium text-sm text-foreground">{t("agentForm.free")}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">{t("agentForm.freeDesc")}</p>
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
                    <p className="font-medium text-sm text-foreground">{t("agentForm.paid")}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">{t("agentForm.paidDesc")}</p>
                  </div>
                </button>
              </div>
            </div>

            {pricingMode === "paid" && (
              <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/30">
                <div>
                  <Label>{t("agentForm.hirePrice")}</Label>
                  <Input type="number" value={hirePrice} onChange={(e) => setHirePrice(e.target.value)} min="0" placeholder={t("agentForm.hirePriceHint")} />
                  {parseInt(hirePrice) > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ≈ <span className="font-medium text-foreground">€{((parseInt(hirePrice) || 0) * 0.04).toFixed(2)}</span>
                    </p>
                  )}
                </div>
                <div>
                  <Label>{t("agentForm.usagePrice")}</Label>
                  <Input type="number" value={usagePrice} onChange={(e) => setUsagePrice(e.target.value)} min="0" />
                  {parseInt(usagePrice) > 0 && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {t("agentForm.usageEarn", {
                        eur: ((parseInt(usagePrice) || 0) * 0.04).toFixed(2),
                        net: ((parseInt(usagePrice) || 0) * 0.04 * 0.8).toFixed(2),
                      })}
                    </p>
                  )}
                </div>
                <div>
                  <Label>{t("agentForm.freeCalls")}</Label>
                  <Input type="number" value={freeCallsLimit} onChange={(e) => setFreeCallsLimit(e.target.value)} min="0" placeholder={t("agentForm.freeCallsHint")} />
                  <p className="text-[11px] text-muted-foreground mt-1">{t("agentForm.freeCallsNote")}</p>
                </div>
                {ownerHasMembers && (
                  <div>
                    <Label>{t("agentForm.freeScopeLabel")}</Label>
                    <Select value={freeScope} onValueChange={(v) => setFreeScope(v as FreeScope)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nobody">{t("agentForm.freeForNobody")}</SelectItem>
                        <SelectItem value="owner_admins">{t("agentForm.freeScopeAdmins", { owner: ownerName ?? t(`agentForm.ownerType.${effectiveOwner.type}`) })}</SelectItem>
                        <SelectItem value="owner_members">{t("agentForm.freeScopeMembers", { owner: ownerName ?? t(`agentForm.ownerType.${effectiveOwner.type}`) })}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground mt-1">{t("agentForm.freeScopeNote")}</p>
                  </div>
                )}
                {attachTo && (
                  <div>
                    <Label>{t("agentForm.freeFor", { unit: unitLabel })}</Label>
                    <Select value={freeFor} onValueChange={(v) => setFreeFor(v as FreeFor)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nobody">{t("agentForm.freeForNobody")}</SelectItem>
                        <SelectItem value="admins">{t("agentForm.freeForAdmins", { unit: unitLabel })}</SelectItem>
                        <SelectItem value="members">{t("agentForm.freeForMembers", { unit: unitLabel })}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground mt-1">{t("agentForm.freeForNote")}</p>
                  </div>
                )}
              </div>
            )}

            {agentSource === "webhook" && (
              <div className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{t("agentForm.deepTitle")}</p>
                    <p className="text-[11px] text-muted-foreground">{t("agentForm.deepNote")}</p>
                  </div>
                  <Switch checked={deepEnabled} onCheckedChange={setDeepEnabled} />
                </div>
                {deepEnabled && (
                  <div>
                    <Label>{t("agentForm.deepPrice")}</Label>
                    <Input type="number" min="1" value={deepPrice} onChange={(e) => setDeepPrice(e.target.value)} />
                    <p className="text-[11px] text-muted-foreground mt-1">{t("agentForm.deepPriceHelp")}</p>
                  </div>
                )}
              </div>
            )}

            <div>
              <Label>{t("agents.skillsCommaSeparated")}</Label>
              <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder={t("agentForm.skillsPlaceholder")} />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">{t("agentForm.listed")}</p>
                <p className="text-[11px] text-muted-foreground">{t("agentForm.listedNote")}</p>
              </div>
              <Switch checked={isListed} onCheckedChange={setIsListed} />
            </div>

            <Button onClick={handleCreate} disabled={saving} className="w-full">
              {saving ? t("agents.creating") : isEdit ? t("agentForm.saveChanges") : t("agents.createAgent")}
            </Button>

            {isEdit && (
              <div className="rounded-lg border border-destructive/30 p-3 space-y-2">
                {!confirmDelete ? (
                  <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> {t("agentForm.deleteAgent")}
                  </Button>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">{t("agentForm.deleteConfirm")}</p>
                    <div className="flex gap-2">
                      <Button type="button" variant="destructive" size="sm" disabled={saving} onClick={handleDelete}>{t("agentForm.deleteYes")}</Button>
                      <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => setConfirmDelete(false)}>{t("agentForm.deleteNo")}</Button>
                    </div>
                  </>
                )}
              </div>
            )}
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
