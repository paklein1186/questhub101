import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Send, Loader2, Vote, ListChecks, Lightbulb, CheckCircle,
  X, MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";

type EntityType = "GUILD" | "QUEST" | "POD" | "COMPANY" | "TERRITORY" | "COURSE" | "EVENT";

interface UnitChatProps {
  entityType: EntityType;
  entityId: string;
  entityName: string;
}

interface ChatMessage {
  id: string;
  thread_id: string;
  sender_type: "USER" | "AGENT" | "SYSTEM";
  sender_user_id: string | null;
  message_text: string;
  metadata_json: any;
  created_at: string;
  profiles?: { name: string; avatar_url: string | null } | null;
}

const AGENT_NAMES: Record<string, string> = {
  GUILD: "Guild Spirit",
  QUEST: "Quest Companion",
  POD: "Pod Facilitator",
  COMPANY: "Company Advisor",
  TERRITORY: "Territory Steward",
  COURSE: "Course Guide",
  EVENT: "Event Coordinator",
};

function useUnitChatThread(entityType: string, entityId: string) {
  return useQuery({
    queryKey: ["unit-chat-thread", entityType, entityId],
    queryFn: async () => {
      const { data } = await supabase
        .from("unit_chat_threads")
        .select("id")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .maybeSingle();
      return data;
    },
    staleTime: 60_000,
  });
}

function useUnitChatMessages(threadId: string | undefined) {
  return useQuery({
    queryKey: ["unit-chat-messages", threadId],
    queryFn: async () => {
      if (!threadId) return [];
      const { data: msgs } = await supabase
        .from("unit_chat_messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true })
        .limit(100);
      if (!msgs?.length) return [];
      // Fetch sender profiles
      const userIds = [...new Set(msgs.filter(m => m.sender_user_id).map(m => m.sender_user_id!))];
      let profileMap: Record<string, { name: string; avatar_url: string | null }> = {};
      if (userIds.length) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, name, avatar_url").in("user_id", userIds);
        for (const p of profiles ?? []) {
          profileMap[p.user_id] = { name: p.name, avatar_url: p.avatar_url };
        }
      }
      return msgs.map(m => ({
        ...m,
        sender_type: m.sender_type as "USER" | "AGENT" | "SYSTEM",
        profiles: m.sender_user_id ? profileMap[m.sender_user_id] || null : null,
      })) as ChatMessage[];
    },
    enabled: !!threadId,
    staleTime: 5_000,
  });
}

export function UnitChat({ entityType, entityId, entityName }: UnitChatProps) {
  const [input, setInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: thread } = useUnitChatThread(entityType, entityId);
  const { data: messages = [] } = useUnitChatMessages(thread?.id);

  const agentLabel = `${AGENT_NAMES[entityType] || "Agent"} of ${entityName}`;

  // Realtime subscription
  useEffect(() => {
    if (!thread?.id) return;
    const channel = supabase
      .channel(`unit-chat-${thread.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "unit_chat_messages",
        filter: `thread_id=eq.${thread.id}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ["unit-chat-messages", thread.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [thread?.id, qc]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const ensureThread = useCallback(async () => {
    if (thread?.id) return thread.id;
    const { data, error } = await supabase
      .from("unit_chat_threads")
      .upsert({ entity_type: entityType, entity_id: entityId }, { onConflict: "entity_type,entity_id" })
      .select("id")
      .single();
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["unit-chat-thread", entityType, entityId] });
    return data.id;
  }, [thread?.id, entityType, entityId, qc]);

  const sendMessage = async (text?: string) => {
    const msg = text || input;
    if (!msg.trim() || !currentUser.id) return;

    try {
      const threadId = await ensureThread();
      // Insert user message
      await supabase.from("unit_chat_messages").insert({
        thread_id: threadId,
        sender_type: "USER",
        sender_user_id: currentUser.id,
        message_text: msg.trim(),
      });
      setInput("");
      qc.invalidateQueries({ queryKey: ["unit-chat-messages", threadId] });

      // Check if this should trigger AI
      const shouldAsk = msg.includes("@agent") || msg.includes("@Agent") || msg.endsWith("?")
        || /what (next|should|can)/i.test(msg) || /help|suggest|idea/i.test(msg);

      if (shouldAsk) {
        setAiLoading(true);
        try {
          const { data, error } = await supabase.functions.invoke("unit-agent", {
            body: {
              entityType,
              entityId,
              message: msg,
              conversationHistory: messages.slice(-10).map(m => ({
                sender_type: m.sender_type,
                sender_name: m.profiles?.name || "User",
                message_text: m.message_text,
              })),
            },
          });
          if (error) throw error;
          if (data?.error) {
            toast({ title: "Agent unavailable", description: data.error, variant: "destructive" });
          }
          // Agent response is saved by the edge function, realtime will pick it up
          qc.invalidateQueries({ queryKey: ["unit-chat-messages", threadId] });
        } catch (e: any) {
          toast({ title: "Agent error", description: e.message || "Could not reach the agent", variant: "destructive" });
        } finally {
          setAiLoading(false);
        }
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const askAgent = async () => {
    const prompt = input.trim() || "What should we focus on next?";
    setInput("");
    setAiLoading(true);
    try {
      const threadId = await ensureThread();
      // Insert user message
      await supabase.from("unit_chat_messages").insert({
        thread_id: threadId,
        sender_type: "USER",
        sender_user_id: currentUser.id,
        message_text: `@Agent ${prompt}`,
      });
      qc.invalidateQueries({ queryKey: ["unit-chat-messages", threadId] });

      const { data, error } = await supabase.functions.invoke("unit-agent", {
        body: {
          entityType,
          entityId,
          message: prompt,
          conversationHistory: messages.slice(-10).map(m => ({
            sender_type: m.sender_type,
            sender_name: m.profiles?.name || "User",
            message_text: m.message_text,
          })),
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: "Agent unavailable", description: data.error, variant: "destructive" });
      }
      qc.invalidateQueries({ queryKey: ["unit-chat-messages", threadId] });
    } catch (e: any) {
      toast({ title: "Agent error", description: e.message, variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const createPoll = async (question: string, options: string[]) => {
    try {
      const threadId = await ensureThread();
      await supabase.from("decision_polls").insert({
        entity_type: entityType,
        entity_id: entityId,
        thread_id: threadId,
        question,
        options: JSON.stringify(options),
        created_by: currentUser.id,
      });
      toast({ title: "Poll created!" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-[500px] rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
        <Bot className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{agentLabel}</span>
        <Badge variant="secondary" className="text-[10px] ml-auto">AI-assisted</Badge>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && !aiLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2">
            <MessageCircle className="h-8 w-8 opacity-30" />
            <p className="text-sm">No messages yet. Start a conversation or ask the agent for suggestions.</p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} agentLabel={agentLabel} isOwn={msg.sender_user_id === currentUser.id} onCreatePoll={createPoll} />
        ))}

        {aiLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-xs text-muted-foreground pl-10">
            <Loader2 className="h-3 w-3 animate-spin" /> {AGENT_NAMES[entityType] || "Agent"} is thinking...
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 flex gap-2">
        <Input
          ref={inputRef}
          placeholder="Type a message... (use @Agent to ask AI)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          disabled={aiLoading}
          className="text-sm"
        />
        <Button size="sm" variant="outline" onClick={askAgent} disabled={aiLoading} title="Ask the agent">
          <Bot className="h-4 w-4" />
        </Button>
        <Button size="sm" onClick={() => sendMessage()} disabled={aiLoading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function MessageBubble({
  msg,
  agentLabel,
  isOwn,
  onCreatePoll,
}: {
  msg: ChatMessage;
  agentLabel: string;
  isOwn: boolean;
  onCreatePoll: (q: string, opts: string[]) => void;
}) {
  const isAgent = msg.sender_type === "AGENT";
  const senderName = isAgent ? agentLabel : (msg.profiles?.name || "User");
  const suggestions = msg.metadata_json?.suggestions || [];

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2 ${isOwn && !isAgent ? "flex-row-reverse" : ""}`}>
      <Avatar className="h-7 w-7 shrink-0 mt-0.5">
        {isAgent ? (
          <AvatarFallback className="bg-primary/10 text-primary text-xs"><Bot className="h-3.5 w-3.5" /></AvatarFallback>
        ) : (
          <>
            <AvatarImage src={msg.profiles?.avatar_url || undefined} />
            <AvatarFallback className="text-xs">{senderName.charAt(0)}</AvatarFallback>
          </>
        )}
      </Avatar>
      <div className={`max-w-[80%] space-y-1.5 ${isOwn && !isAgent ? "items-end" : ""}`}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">{senderName}</span>
          <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</span>
        </div>
        <div className={`rounded-xl px-3 py-2 text-sm ${isAgent ? "bg-primary/5 border border-primary/10" : isOwn ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>{msg.message_text}</ReactMarkdown>
          </div>
        </div>

        {/* Suggestion cards */}
        {suggestions.length > 0 && (
          <div className="space-y-2 pt-1">
            {suggestions.map((s: any, i: number) => (
              <SuggestionCard key={i} suggestion={s} onCreatePoll={onCreatePoll} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function SuggestionCard({ suggestion, onCreatePoll }: { suggestion: any; onCreatePoll: (q: string, opts: string[]) => void }) {
  const icons: Record<string, any> = {
    DECISION_POLL: Vote,
    NEXT_STEPS: ListChecks,
    MISSING_SKILLS: Lightbulb,
  };
  const Icon = icons[suggestion.type] || Lightbulb;
  const labels: Record<string, string> = {
    DECISION_POLL: "Decision Poll Suggestion",
    NEXT_STEPS: "Suggested Next Steps",
    MISSING_SKILLS: "Missing Skills Detected",
  };

  return (
    <div className="rounded-lg border border-accent/20 bg-accent/5 p-3 space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-accent">
        <Icon className="h-3.5 w-3.5" />
        {labels[suggestion.type] || "Suggestion"}
      </div>

      {suggestion.type === "DECISION_POLL" && (
        <>
          <p className="text-sm font-medium">{suggestion.question}</p>
          <div className="flex flex-wrap gap-1">
            {(suggestion.options || []).map((opt: string, i: number) => (
              <Badge key={i} variant="outline" className="text-xs">{opt}</Badge>
            ))}
          </div>
          <Button size="sm" variant="outline" className="text-xs" onClick={() => onCreatePoll(suggestion.question, suggestion.options)}>
            <Vote className="h-3 w-3 mr-1" /> Create this poll
          </Button>
        </>
      )}

      {suggestion.type === "NEXT_STEPS" && (
        <ul className="space-y-1">
          {(suggestion.items || []).map((item: string, i: number) => (
            <li key={i} className="flex items-start gap-2 text-xs">
              <CheckCircle className="h-3 w-3 text-primary mt-0.5 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      )}

      {suggestion.type === "MISSING_SKILLS" && (
        <>
          <div className="flex flex-wrap gap-1">
            {(suggestion.skills || []).map((s: string, i: number) => (
              <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
            ))}
          </div>
          {suggestion.suggestion && <p className="text-xs text-muted-foreground">{suggestion.suggestion}</p>}
        </>
      )}
    </div>
  );
}
