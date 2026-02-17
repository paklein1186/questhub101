import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bot, ArrowLeft, Zap, Send, Loader2, CheckCircle, Star, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

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
            <AgentChat agentId={agent.id} agentName={agent.name} costPerUse={agent.cost_per_use} userId={user!.id} />
          ) : (
            <Card className="p-12 text-center">
              <Bot className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="text-lg font-semibold mb-2">Hire to start chatting</h3>
              <p className="text-sm text-muted-foreground">Hire this agent to begin a conversation and get personalized assistance.</p>
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function AgentChat({ agentId, agentName, costPerUse, userId }: { agentId: string; agentName: string; costPerUse: number; userId: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
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
  }, [input, streaming, messages, agentId]);

  return (
    <Card className="flex flex-col h-[600px]">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <Bot className="h-5 w-5 text-primary" />
        <span className="font-semibold">{agentName}</span>
        <Badge variant="secondary" className="text-[10px] ml-auto"><Zap className="h-3 w-3 mr-0.5" />{costPerUse} credits/msg</Badge>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-12">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-40" />
            Start a conversation with {agentName}
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

      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Type your message..."
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
