import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, Plus, Trash2, Send, Loader2, Sparkles, Search, Zap, ArrowLeft, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AgentSourceBadge } from "@/components/agent/AgentSourceBadge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { useAgentQuota } from "@/hooks/useAgentQuota";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreateAgentDialog } from "@/components/agent/CreateAgentDialog";

type Msg = { role: "user" | "assistant"; content: string };

interface UnitAgentsTabProps {
  unitType: "guild" | "pod" | "quest";
  unitId: string;
  unitName: string;
  isAdmin: boolean;
  /** When set (a quest belonging to a guild), agents attached to that parent
   * guild are also shown here, read-only — bilateral activation: a guild
   * admits an agent once and it becomes usable in every quest of the guild,
   * without needing separate per-quest attachment. */
  parentGuildId?: string;
}

export function UnitAgentsTab({ unitType, unitId, unitName, isAdmin, parentGuildId }: UnitAgentsTabProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [activeChatAgentId, setActiveChatAgentId] = useState<string | null>(null);

  // Fetch admitted agents for this unit
  const { data: ownUnitAgents, isLoading } = useQuery({
    queryKey: ["unit-agents", unitType, unitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unit_agents" as any)
        .select("*, agents(*)")
        .eq("unit_type", unitType)
        .eq("unit_id", unitId)
        .eq("is_active", true);
      if (error) throw error;
      return data as any[];
    },
  });

  // Agents inherited from the parent guild (quest pages only)
  const { data: inheritedAgents } = useQuery({
    queryKey: ["unit-agents", "guild", parentGuildId],
    enabled: !!parentGuildId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unit_agents" as any)
        .select("*, agents(*)")
        .eq("unit_type", "guild")
        .eq("unit_id", parentGuildId!)
        .eq("is_active", true);
      if (error) throw error;
      return (data as any[]).map((ua) => ({ ...ua, inherited: true }));
    },
  });

  const unitAgents = [
    ...(ownUnitAgents ?? []),
    ...((inheritedAgents ?? []).filter((ia) => !(ownUnitAgents ?? []).some((ua) => ua.agent_id === ia.agent_id))),
  ];

  const removeAgent = useMutation({
    mutationFn: async (unitAgentId: string) => {
      const { error } = await supabase
        .from("unit_agents" as any)
        .update({ is_active: false } as any)
        .eq("id", unitAgentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("agentsUi.removed"));
      qc.invalidateQueries({ queryKey: ["unit-agents", unitType, unitId] });
    },
    onError: () => toast.error(t("agentsUi.removeFailed")),
  });

  const runSync = async (agentId: string, dryRun: boolean) => {
    const { data, error } = await supabase.functions.invoke("agent-sync", { body: { agent_id: agentId, dry_run: dryRun } });
    if (error) { toast.error(t("agentsUi.syncFailed")); return; }
    const r = data?.results?.[0];
    toast.message(dryRun ? t("agentsUi.syncSimulation") : t("agentsUi.syncDone"), {
      description: r
        ? t("agentsUi.syncSummary", { fetched: r.fetched ?? 0, created: r.created ?? 0, updated: r.updated ?? 0, events: r.events_sent ?? 0, errors: r.errors?.length ?? 0 })
        : JSON.stringify(data),
    });
  };

  // Whether the viewer uses this agent for free here. "maybe": granted through a parent
  // guild the client can't verify — the server decides and never charges twice.
  const freeForMe = (ua: any): boolean | "maybe" => {
    const owned =
      ua.admitted_by_user_id === ua.agents?.creator_user_id ||
      (ua.agents?.owner_type === ua.unit_type && ua.agents?.owner_id === ua.unit_id);
    if (!owned || !ua.free_for || ua.free_for === "nobody") return false;
    if (ua.inherited) return "maybe";
    return ua.free_for === "members" ? true : ua.free_for === "admins" ? isAdmin : false;
  };

  const setFreeFor = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: string }) => {
      const { error } = await supabase.from("unit_agents" as any).update({ free_for: value } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("agentsUi.freeForSaved"));
      qc.invalidateQueries({ queryKey: ["unit-agents", unitType, unitId] });
    },
    onError: () => toast.error(t("agentsUi.freeForFailed")),
  });

  const activeChatAgent = unitAgents?.find((ua: any) => ua.agent_id === activeChatAgentId);

  if (activeChatAgentId && activeChatAgent) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setActiveChatAgentId(null)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> {t("agentsUi.back")}
        </Button>
        <UnitAgentChat
          agent={activeChatAgent.agents}
          unitType={unitType}
          unitId={unitId}
          unitName={unitName}
          freeForMe={freeForMe(activeChatAgent)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" /> {t("agentsUi.title")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("agentsUi.attachedTo", { unit: t(`agentForm.unit.${unitType}`) })}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setRegisterOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> {t("agentsUi.register")}
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> {t("agentsUi.attach")}
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : !unitAgents?.length ? (
        <Card className="p-8 text-center">
          <Bot className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">{t("agentsUi.none")}</p>
          {isAdmin && (
            <p className="text-xs text-muted-foreground mt-1">
              {t("agentsUi.noneHint")}
            </p>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {unitAgents.map((ua: any) => (
            <Card
              key={ua.id}
              className="p-4 hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => setActiveChatAgentId(ua.agent_id)}
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm group-hover:text-primary transition-colors">
                    {ua.agents?.name}
                  </h4>
                  <Badge variant="outline" className="text-[10px] mt-0.5">
                    {ua.agents?.category}
                  </Badge>
                  {ua.inherited && (
                    <Badge variant="secondary" className="text-[10px] mt-0.5 ml-1">{t("agentsUi.fromGuild")}</Badge>
                  )}
                  {freeForMe(ua) === true && (
                    <Badge className="text-[10px] mt-0.5 ml-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" variant="outline">{t("agentsUi.freeForYou")}</Badge>
                  )}
                  <AgentSourceBadge agentSource={ua.agents?.agent_source} healthStatus={ua.agents?.health_status} />
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {ua.agents?.description}
                  </p>
                </div>
                {isAdmin && !ua.inherited && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAgent.mutate(ua.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              {ua.agents?.sync_enabled && ua.agents?.creator_user_id === user?.id && (
                <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => runSync(ua.agent_id, true)}>{t("agentsUi.simulateSync")}</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => runSync(ua.agent_id, false)}>{t("agentsUi.syncNow")}</Button>
                </div>
              )}
              {ua.agents?.creator_user_id === user?.id && !ua.inherited && ua.agents?.billing_currency !== "free" && (
                <div className="flex items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                  <span className="text-xs text-muted-foreground">{t("agentsUi.freeForLabel")}</span>
                  <Select value={ua.free_for ?? "nobody"} onValueChange={(v) => setFreeFor.mutate({ id: ua.id, value: v })}>
                    <SelectTrigger className="h-7 w-auto text-xs gap-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nobody">{t("agentForm.freeForNobody")}</SelectItem>
                      <SelectItem value="admins">{t("agentForm.freeForAdmins", { unit: t(`agentForm.unit.${unitType}`) })}</SelectItem>
                      <SelectItem value="members">{t("agentForm.freeForMembers", { unit: t(`agentForm.unit.${unitType}`) })}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Zap className="h-3 w-3" /> {t("agentsUi.creditsPerMsg", { count: ua.agents?.cost_per_use })}
                <span className="ml-auto">{t("agentsUi.chat")}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {isAdmin && user && (
        <CreateAgentDialog
          open={registerOpen}
          onOpenChange={setRegisterOpen}
          userId={user.id}
          defaultOwner={unitType === "guild" ? { type: "guild", id: unitId, name: unitName } : undefined}
          attachTo={{ unitType, unitId }}
          onCreated={() => qc.invalidateQueries({ queryKey: ["unit-agents", unitType, unitId] })}
        />
      )}

      {isAdmin && user && (
        <AdmitAgentDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          unitType={unitType}
          unitId={unitId}
          userId={user.id}
          existingAgentIds={(unitAgents || []).map((ua: any) => ua.agent_id)}
        />
      )}
    </div>
  );
}

function AdmitAgentDialog({ open, onOpenChange, unitType, unitId, userId, existingAgentIds }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  unitType: string; unitId: string; userId: string; existingAgentIds: string[];
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  // Browse every published agent — including ones another guild admitted
  // first — rather than only agents this user personally hired, so agents
  // can circulate across guilds instead of staying siloed to their creator.
  const { data: hiredAgents, isLoading } = useQuery({
    queryKey: ["published-agents-for-admit", search],
    enabled: open,
    queryFn: async () => {
      let q = supabase
        .from("agents" as any)
        .select("*")
        .eq("is_published", true)
        .order("usage_count", { ascending: false })
        .limit(50);
      if (search.trim()) q = q.ilike("name", `%${search.trim()}%`);
      const { data: agents, error } = await q;
      if (error) throw error;

      const agentIds = (agents ?? []).map((a: any) => a.id);
      if (agentIds.length === 0) return [];

      const { data: attachments } = await supabase
        .from("unit_agents" as any)
        .select("agent_id, unit_type, unit_id")
        .eq("unit_type", "guild")
        .eq("is_active", true)
        .in("agent_id", agentIds);

      const guildCountByAgent = new Map<string, Set<string>>();
      for (const a of (attachments ?? []) as any[]) {
        if (a.unit_id === unitId) continue; // don't count this guild itself
        const set = guildCountByAgent.get(a.agent_id) ?? new Set();
        set.add(a.unit_id);
        guildCountByAgent.set(a.agent_id, set);
      }

      return (agents ?? []).map((a: any) => ({
        ...a,
        guildCount: guildCountByAgent.get(a.id)?.size ?? 0,
      }));
    },
  });

  const admit = async (agentId: string) => {
    const { error } = await supabase.from("unit_agents" as any).insert({
      agent_id: agentId,
      unit_type: unitType,
      unit_id: unitId,
      admitted_by_user_id: userId,
    } as any);
    if (error) {
      toast.error(error.message.includes("duplicate") ? t("agentsUi.alreadyAttached") : t("agentsUi.attachFailed"));
      return;
    }
    toast.success(t("agentsUi.attached"));
    qc.invalidateQueries({ queryKey: ["unit-agents", unitType, unitId] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t("agentsUi.attachTitle")}</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">
          {t("agentsUi.attachNote")}
        </p>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("agentsUi.searchPublished")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <Skeleton className="h-16" />
          ) : !hiredAgents?.length ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">{t("agentsUi.noPublished")}</p>
              <p className="text-xs text-muted-foreground mt-1">
                <a href="/agents" className="text-primary hover:underline">{t("agentsUi.browseMarketplace")}</a> {t("agentsUi.toCreateOne")}
              </p>
            </div>
          ) : (
            hiredAgents
              .filter((a: any) => !existingAgentIds.includes(a.id))
              .map((agent: any) => (
                <div
                  key={agent.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => admit(agent.id)}
                >
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{agent.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{agent.description}</p>
                    {agent.guildCount > 0 && (
                      <p className="text-[10px] text-primary mt-0.5">
                        {t("agentsUi.usedByGuilds", { count: agent.guildCount })}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {t("agentsUi.crShort", { count: agent.cost_per_use })}
                  </Badge>
                </div>
              ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
function UnitAgentChat({ agent, unitType, unitId, unitName, freeForMe }: {
  agent: any; unitType: string; unitId: string; unitName: string; freeForMe: boolean | "maybe";
}) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [needsTopUp, setNeedsTopUp] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const agentQuota = useAgentQuota();
  const usagePrice = freeForMe ? 0 : Number(agent.usage_price ?? agent.cost_per_use ?? 0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    // Process usage payment if needed
    if (usagePrice > 0 && user) {
      const { processAgentPayment } = await import("@/lib/agentPayment");
      const result = await processAgentPayment(user.id, usagePrice, agent.id, "usage");
      if (!result.success) {
        setNeedsTopUp(true);
        toast.error(result.error || t("agentsUi.insufficient"));
        return;
      }
    }

    setNeedsTopUp(false);
    setInput("");
    const userMsg: Msg = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setStreaming(true);

    let assistantSoFar = "";
    const allMessages = [...messages, userMsg];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error(t("agentsUi.notAuthenticated"));

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/unit-agent-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          agentId: agent.id,
          unitType,
          unitId,
          messages: allMessages,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        if (resp.status === 402) setNeedsTopUp(true);
        throw new Error(err.error || t("agentsUi.chatFailed"));
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
      toast.error(e.message || t("agentsUi.chatError"));
      setMessages(prev => prev.filter(m => m !== userMsg));
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, messages, agent.id, unitType, unitId, usagePrice, user, t]);

  return (
    <Card className="flex flex-col h-[500px]">
      <div className="p-3 border-b border-border flex items-center gap-2">
        <Bot className="h-5 w-5 text-primary" />
        <span className="font-semibold text-sm">{agent.name}</span>
        <Badge variant="secondary" className="text-[10px] ml-auto">
          {t("agentsUi.contextBadge", { name: unitName })}
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Cost banner */}
        {usagePrice > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 shrink-0" />
            {agentQuota.remaining > 0 ? (
              <span>{t("agentsUi.quotaLeft", { count: agentQuota.remaining })}</span>
            ) : (
              <span>{t("agentsUi.costPerMessage", { price: usagePrice })}</span>
            )}
          </div>
        )}
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            <Sparkles className="h-6 w-6 mx-auto mb-2 opacity-40" />
            {t("agentsUi.chatWith", { agent: agent.name, name: unitName })}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
              m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
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
            <div className="bg-muted rounded-2xl px-4 py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-border">
        {needsTopUp && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700/50 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
            <span>{t("agentsUi.needsTopUp")}</span>
            <Button size="sm" className="h-7 text-xs" asChild><Link to="/me/credit-shop">{t("agentsUi.topUp")}</Link></Button>
          </div>
        )}
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={t("agentsUi.askPlaceholder")}
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
