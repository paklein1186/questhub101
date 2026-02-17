import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, Plus, Trash2, Send, Loader2, Sparkles, Search, Zap, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

interface UnitAgentsTabProps {
  unitType: "guild" | "pod" | "quest";
  unitId: string;
  unitName: string;
  isAdmin: boolean;
}

export function UnitAgentsTab({ unitType, unitId, unitName, isAdmin }: UnitAgentsTabProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [activeChatAgentId, setActiveChatAgentId] = useState<string | null>(null);

  // Fetch admitted agents for this unit
  const { data: unitAgents, isLoading } = useQuery({
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

  const removeAgent = useMutation({
    mutationFn: async (unitAgentId: string) => {
      const { error } = await supabase
        .from("unit_agents" as any)
        .update({ is_active: false } as any)
        .eq("id", unitAgentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agent removed");
      qc.invalidateQueries({ queryKey: ["unit-agents", unitType, unitId] });
    },
    onError: () => toast.error("Failed to remove agent"),
  });

  const activeChatAgent = unitAgents?.find((ua: any) => ua.agent_id === activeChatAgentId);

  if (activeChatAgentId && activeChatAgent) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setActiveChatAgentId(null)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to agents
        </Button>
        <UnitAgentChat
          agent={activeChatAgent.agents}
          unitType={unitType}
          unitId={unitId}
          unitName={unitName}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" /> Unit Agents
          </h3>
          <p className="text-sm text-muted-foreground">
            AI agents admitted to assist this {unitType}
          </p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Admit Agent
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : !unitAgents?.length ? (
        <Card className="p-8 text-center">
          <Bot className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No agents admitted yet.</p>
          {isAdmin && (
            <p className="text-xs text-muted-foreground mt-1">
              Admit an agent from the marketplace to get started.
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
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {ua.agents?.description}
                  </p>
                </div>
                {isAdmin && (
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
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Zap className="h-3 w-3" /> {ua.agents?.cost_per_use} credits/msg
                <span className="ml-auto">Chat →</span>
              </div>
            </Card>
          ))}
        </div>
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
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const { data: agents, isLoading } = useQuery({
    queryKey: ["all-agents-for-admit", search],
    enabled: open,
    queryFn: async () => {
      let q = supabase.from("agents").select("*").eq("is_published", true).order("usage_count", { ascending: false }).limit(20);
      if (search.trim()) q = q.ilike("name", `%${search.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
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
      toast.error(error.message.includes("duplicate") ? "Agent already admitted" : "Failed to admit agent");
      return;
    }
    toast.success("Agent admitted!");
    qc.invalidateQueries({ queryKey: ["unit-agents", unitType, unitId] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Admit an Agent</DialogTitle></DialogHeader>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <Skeleton className="h-16" />
          ) : !agents?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">No agents found</p>
          ) : (
            agents
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
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {agent.cost_per_use} cr
                  </Badge>
                </div>
              ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UnitAgentChat({ agent, unitType, unitId, unitName }: {
  agent: any; unitType: string; unitId: string; unitName: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    const userMsg: Msg = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setStreaming(true);

    let assistantSoFar = "";
    const allMessages = [...messages, userMsg];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error("Not authenticated");

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
  }, [input, streaming, messages, agent.id, unitType, unitId]);

  return (
    <Card className="flex flex-col h-[500px]">
      <div className="p-3 border-b border-border flex items-center gap-2">
        <Bot className="h-5 w-5 text-primary" />
        <span className="font-semibold text-sm">{agent.name}</span>
        <Badge variant="secondary" className="text-[10px] ml-auto">
          Context: {unitName}
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            <Sparkles className="h-6 w-6 mx-auto mb-2 opacity-40" />
            Chat with {agent.name} about {unitName}
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
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask about this unit..."
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
