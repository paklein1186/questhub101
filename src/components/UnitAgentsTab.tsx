import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, Plus, Trash2, Send, Loader2, Sparkles, Search, Zap, ArrowLeft, Info, Pencil } from "lucide-react";
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
import { AgentMarkdown } from "@/components/agent/AgentMarkdown";
import { useAgentQuota } from "@/hooks/useAgentQuota";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCanManageAgent } from "@/hooks/useCanManageAgent";
import { AgentSyncStatus } from "@/components/agent/AgentSyncLog";
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
  const [registerOpen, setRegisterOpen] = useState(false);
  const [editAgent, setEditAgent] = useState<any>(null);
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
    qc.invalidateQueries({ queryKey: ["agent-sync-runs", agentId] });
    qc.invalidateQueries({ queryKey: ["agent-sync-last", agentId] });
    if (error) { toast.error(t("agentsUi.syncFailed")); return; }
    const r = data?.results?.[0];
    toast.message(dryRun ? t("agentsUi.syncSimulation") : t("agentsUi.syncDone"), {
      description: r
        ? t("agentsUi.syncSummary", { fetched: r.fetched ?? 0, created: r.created ?? 0, updated: r.updated ?? 0, events: r.events_sent ?? 0, errors: r.errors?.length ?? 0 }) +
          (r.skipped_over_limit ? ` ${t("agentsUi.syncRemaining", { count: r.skipped_over_limit })}` : "") +
          (r.new_territories?.length ? ` ${t("agentsUi.syncNewTerritories", { list: r.new_territories.join(", ") })}` : "") +
          (r.geocode_remaining ? ` ${t("agentsUi.syncRemaining", { count: r.geocode_remaining })}` : "") +
          (r.unmatched_places?.length ? ` ${t("agentsUi.syncUnmatched", { list: r.unmatched_places.join(", ") })}` : "")
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
  const ownerFree = useOwnerFree(activeChatAgent?.agents, user?.id);

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
          freeForMe={ownerFree || freeForMe(activeChatAgent)}
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
            <Button size="sm" onClick={() => setRegisterOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> {t("agentsUi.register")}
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
                  <FreeForYouBadge ua={ua} unitLevel={freeForMe(ua)} userId={user?.id} />
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
                    title={t("agentsUi.detach")}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAgent.mutate(ua.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              {user && (
                <AgentManageBar
                  ua={ua}
                  unitType={unitType}
                  userId={user.id}
                  onEdit={() => setEditAgent(ua.agents)}
                  onSync={runSync}
                  onFreeFor={(value) => setFreeFor.mutate({ id: ua.id, value })}
                />
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

      {user && editAgent && (
        <CreateAgentDialog
          open={!!editAgent}
          onOpenChange={(v) => { if (!v) setEditAgent(null); }}
          userId={user.id}
          editAgent={editAgent}
          onCreated={() => qc.invalidateQueries({ queryKey: ["unit-agents"] })}
        />
      )}

    </div>
  );
}

/** Agent-level free usage: members/admins of the guild or company that owns the agent. */
function useOwnerFree(agent: any, userId?: string): boolean {
  const rule: string = agent?.free_scope ?? "nobody";
  const ownerType: string | undefined = agent?.owner_type;
  const { data } = useQuery({
    queryKey: ["owner-free", agent?.id, userId, rule],
    enabled: !!agent && !!userId && rule !== "nobody" && !!agent.owner_id && (ownerType === "guild" || ownerType === "company"),
    queryFn: async () => {
      const isGuild = ownerType === "guild";
      const { data: m } = await supabase
        .from((isGuild ? "guild_members" : "company_members") as any)
        .select("role")
        .eq(isGuild ? "guild_id" : "company_id", agent.owner_id)
        .eq("user_id", userId!)
        .maybeSingle();
      if (!m) return false;
      if (rule === "owner_members") return true;
      const role = String((m as any).role ?? "").toUpperCase();
      return role === "ADMIN" || role === "OWNER";
    },
  });
  return data === true;
}

function FreeForYouBadge({ ua, unitLevel, userId }: { ua: any; unitLevel: boolean | "maybe"; userId?: string }) {
  const { t } = useTranslation();
  const owner = useOwnerFree(ua.agents, userId);
  if (unitLevel !== true && !owner) return null;
  return (
    <Badge className="text-[10px] mt-0.5 ml-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" variant="outline">{t("agentsUi.freeForYou")}</Badge>
  );
}

function AgentManageBar({ ua, unitType, userId, onEdit, onSync, onFreeFor }: {
  ua: any; unitType: string; userId: string;
  onEdit: () => void; onSync: (agentId: string, dryRun: boolean) => void; onFreeFor: (value: string) => void;
}) {
  const { t } = useTranslation();
  const canManage = useCanManageAgent(ua.agent_id, userId);
  if (!canManage) return null;
  const unit = t(`agentForm.unit.${unitType}`);
  return (
    <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onEdit}>
          <Pencil className="h-3 w-3 mr-1" /> {t("agentsUi.edit")}
        </Button>
        {ua.agents?.sync_enabled && (
          <>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onSync(ua.agent_id, true)}>{t("agentsUi.simulateSync")}</Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onSync(ua.agent_id, false)}>{t("agentsUi.syncNow")}</Button>
          </>
        )}
      </div>
      {ua.agents?.sync_enabled && <AgentSyncStatus agentId={ua.agent_id} />}
      {!ua.inherited && ua.agents?.billing_currency !== "free" && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{t("agentsUi.freeForLabel")}</span>
          <Select value={ua.free_for ?? "nobody"} onValueChange={onFreeFor}>
            <SelectTrigger className="h-7 w-auto text-xs gap-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nobody">{t("agentForm.freeForNobody")}</SelectItem>
              <SelectItem value="admins">{t("agentForm.freeForAdmins", { unit })}</SelectItem>
              <SelectItem value="members">{t("agentForm.freeForMembers", { unit })}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
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
  // Places the agent created on changethegame: their names in an answer become links to their guild page.
  const { data: placeLinks = [] } = useQuery({
    queryKey: ["agent-place-links", agent.id],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.from("guilds").select("id, name").eq("auto_created_by_agent_id", agent.id).eq("is_deleted", false).limit(1000);
      return ((data ?? []) as any[]).map((g) => ({ name: g.name as string, href: `/guilds/${g.id}` }));
    },
  });
  const usagePrice = freeForMe ? 0 : Number(agent.usage_price ?? agent.cost_per_use ?? 0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    // The server is the single place that bills a message (plan quota, then credits) — no charge here.
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
            <div className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm ${
              m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
            }`}>
              {m.role === "assistant" ? (
                <AgentMarkdown links={placeLinks}>{m.content}</AgentMarkdown>
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
