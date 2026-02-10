import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Send, Loader2, Vote, ListChecks, Lightbulb, CheckCircle,
  X, MessageCircle, Star, Sparkles, BookOpen, Copy, Pencil, Trash2,
  ChevronDown, ChevronRight, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
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

interface StarredExcerpt {
  id: string;
  thread_id: string;
  message_id: string;
  created_by_user_id: string;
  excerpt_text: string;
  title: string | null;
  tags: string[];
  is_from_agent: boolean;
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

function useStarredExcerpts(threadId: string | undefined) {
  return useQuery({
    queryKey: ["starred-excerpts", threadId],
    queryFn: async () => {
      if (!threadId) return [];
      const { data } = await supabase
        .from("starred_excerpts")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: false });
      if (!data?.length) return [];
      const userIds = [...new Set(data.map(d => d.created_by_user_id))];
      let profileMap: Record<string, { name: string; avatar_url: string | null }> = {};
      if (userIds.length) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, name, avatar_url").in("user_id", userIds);
        for (const p of profiles ?? []) profileMap[p.user_id] = { name: p.name, avatar_url: p.avatar_url };
      }
      return data.map(d => ({
        ...d,
        tags: Array.isArray(d.tags) ? d.tags : [],
        profiles: profileMap[d.created_by_user_id] || null,
      })) as StarredExcerpt[];
    },
    enabled: !!threadId,
    staleTime: 10_000,
  });
}

export function UnitChat({ entityType, entityId, entityName }: UnitChatProps) {
  const [input, setInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("conversation");
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: thread } = useUnitChatThread(entityType, entityId);
  const { data: messages = [] } = useUnitChatMessages(thread?.id);
  const { data: starredExcerpts = [] } = useStarredExcerpts(thread?.id);

  const agentLabel = `${AGENT_NAMES[entityType] || "Agent"} of ${entityName}`;
  const agentMessages = messages.filter(m => m.sender_type === "AGENT");

  // Star dialog state
  const [starDialog, setStarDialog] = useState<{
    open: boolean;
    messageId: string;
    excerptText: string;
    isFromAgent: boolean;
  } | null>(null);
  const [starTitle, setStarTitle] = useState("");
  const [starTags, setStarTags] = useState("");
  const [starExcerpt, setStarExcerpt] = useState("");

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
    if (scrollRef.current && activeTab === "conversation") {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeTab]);

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
      await supabase.from("unit_chat_messages").insert({
        thread_id: threadId,
        sender_type: "USER",
        sender_user_id: currentUser.id,
        message_text: msg.trim(),
      });
      setInput("");
      qc.invalidateQueries({ queryKey: ["unit-chat-messages", threadId] });

      const shouldAsk = msg.includes("@agent") || msg.includes("@Agent") || msg.endsWith("?")
        || /what (next|should|can)/i.test(msg) || /help|suggest|idea/i.test(msg);

      if (shouldAsk) {
        setAiLoading(true);
        try {
          const { data, error } = await supabase.functions.invoke("unit-agent", {
            body: { entityType, entityId, message: msg },
          });
          if (error) throw error;
          if (data?.error) toast({ title: "Agent unavailable", description: data.error, variant: "destructive" });
          qc.invalidateQueries({ queryKey: ["unit-chat-messages", threadId] });
        } catch (e: any) {
          toast({ title: "Agent error", description: e.message || "Could not reach the agent", variant: "destructive" });
        } finally { setAiLoading(false); }
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
      await supabase.from("unit_chat_messages").insert({
        thread_id: threadId,
        sender_type: "USER",
        sender_user_id: currentUser.id,
        message_text: `@Agent ${prompt}`,
      });
      qc.invalidateQueries({ queryKey: ["unit-chat-messages", threadId] });

      const { data, error } = await supabase.functions.invoke("unit-agent", {
        body: { entityType, entityId, message: prompt },
      });
      if (error) throw error;
      if (data?.error) toast({ title: "Agent unavailable", description: data.error, variant: "destructive" });
      qc.invalidateQueries({ queryKey: ["unit-chat-messages", threadId] });
    } catch (e: any) {
      toast({ title: "Agent error", description: e.message, variant: "destructive" });
    } finally { setAiLoading(false); }
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

  const openStarDialog = (messageId: string, excerptText: string, isFromAgent: boolean) => {
    setStarDialog({ open: true, messageId, excerptText, isFromAgent });
    setStarExcerpt(excerptText);
    setStarTitle("");
    setStarTags("");
  };

  const handleSaveStar = async () => {
    if (!starDialog || !starExcerpt.trim() || !thread?.id) return;
    try {
      const tags = starTags.split(",").map(t => t.trim()).filter(Boolean);
      await supabase.from("starred_excerpts").insert({
        thread_id: thread.id,
        message_id: starDialog.messageId,
        created_by_user_id: currentUser.id,
        excerpt_text: starExcerpt.trim(),
        title: starTitle.trim() || null,
        tags: tags,
        is_from_agent: starDialog.isFromAgent,
      });
      qc.invalidateQueries({ queryKey: ["starred-excerpts", thread.id] });
      setStarDialog(null);
      toast({ title: "Excerpt starred!" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-[540px] rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
        <Bot className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{agentLabel}</span>
        <Badge variant="secondary" className="text-[10px] ml-auto">AI-assisted</Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-3 mt-2 justify-start">
          <TabsTrigger value="conversation" className="text-xs gap-1">
            <MessageCircle className="h-3 w-3" /> Conversation
          </TabsTrigger>
          <TabsTrigger value="insights" className="text-xs gap-1">
            <Sparkles className="h-3 w-3" /> AI Insights
          </TabsTrigger>
          <TabsTrigger value="starred" className="text-xs gap-1">
            <Star className="h-3 w-3" /> Starred
            {starredExcerpts.length > 0 && (
              <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-0.5">{starredExcerpts.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Conversation Tab */}
        <TabsContent value="conversation" className="flex-1 flex flex-col min-h-0 m-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && !aiLoading && (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2">
                <MessageCircle className="h-8 w-8 opacity-30" />
                <p className="text-sm">No messages yet. Start a conversation or ask the agent for suggestions.</p>
              </div>
            )}
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                agentLabel={agentLabel}
                isOwn={msg.sender_user_id === currentUser.id}
                onCreatePoll={createPoll}
                onStarMessage={(text) => openStarDialog(msg.id, text, msg.sender_type === "AGENT")}
              />
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
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="insights" className="flex-1 overflow-y-auto m-0 px-4 py-3">
          {agentMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2">
              <Sparkles className="h-8 w-8 opacity-30" />
              <p className="text-sm">No AI insights yet.</p>
              <p className="text-xs">Ask the agent something or let it react to your activity.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...agentMessages].reverse().map((msg) => (
                <AIInsightCard
                  key={msg.id}
                  msg={msg}
                  onStar={(text) => openStarDialog(msg.id, text, true)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Starred Excerpts Tab */}
        <TabsContent value="starred" className="flex-1 overflow-y-auto m-0 px-4 py-3">
          {starredExcerpts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2">
              <BookOpen className="h-8 w-8 opacity-30" />
              <p className="text-sm">No starred excerpts yet.</p>
              <p className="text-xs">Use the ★ icon in chats to save useful insights for everyone in this unit.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {starredExcerpts.map((ex) => (
                <StarredExcerptCard
                  key={ex.id}
                  excerpt={ex}
                  isOwner={ex.created_by_user_id === currentUser.id}
                  onDelete={async () => {
                    await supabase.from("starred_excerpts").delete().eq("id", ex.id);
                    qc.invalidateQueries({ queryKey: ["starred-excerpts", thread?.id] });
                    toast({ title: "Excerpt removed" });
                  }}
                  onScrollToMessage={() => {
                    setActiveTab("conversation");
                    setTimeout(() => {
                      const el = document.getElementById(`msg-${ex.message_id}`);
                      el?.scrollIntoView({ behavior: "smooth", block: "center" });
                      el?.classList.add("ring-2", "ring-primary");
                      setTimeout(() => el?.classList.remove("ring-2", "ring-primary"), 2000);
                    }, 100);
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Star Dialog */}
      {starDialog && (
        <Dialog open={starDialog.open} onOpenChange={(open) => !open && setStarDialog(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Star className="h-4 w-4 text-yellow-500" /> Star Excerpt</DialogTitle>
              <DialogDescription>Save this highlight to the unit's starred library.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Excerpt</label>
                <Textarea
                  value={starExcerpt}
                  onChange={(e) => setStarExcerpt(e.target.value)}
                  rows={4}
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Title (optional)</label>
                <Input
                  value={starTitle}
                  onChange={(e) => setStarTitle(e.target.value)}
                  placeholder="Short descriptive title..."
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Tags (comma-separated, optional)</label>
                <Input
                  value={starTags}
                  onChange={(e) => setStarTags(e.target.value)}
                  placeholder="strategy, next-steps, decision..."
                  className="mt-1 text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStarDialog(null)}>Cancel</Button>
              <Button onClick={handleSaveStar} disabled={!starExcerpt.trim()}>
                <Star className="h-3.5 w-3.5 mr-1" /> Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

/* ─── Message Bubble ─── */
function MessageBubble({
  msg, agentLabel, isOwn, onCreatePoll, onStarMessage,
}: {
  msg: ChatMessage;
  agentLabel: string;
  isOwn: boolean;
  onCreatePoll: (q: string, opts: string[]) => void;
  onStarMessage: (text: string) => void;
}) {
  const isAgent = msg.sender_type === "AGENT";
  const senderName = isAgent ? agentLabel : (msg.profiles?.name || "User");
  const suggestions = msg.metadata_json?.suggestions || [];
  const [showActions, setShowActions] = useState(false);

  const handleTextSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.toString().trim().length > 0) {
      onStarMessage(sel.toString().trim());
    }
  };

  return (
    <motion.div
      id={`msg-${msg.id}`}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group flex gap-2 rounded-lg transition-all ${isOwn && !isAgent ? "flex-row-reverse" : ""}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
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
          {showActions && (
            <button
              onClick={() => onStarMessage(msg.message_text)}
              className="text-muted-foreground hover:text-yellow-500 transition-colors"
              title="Star this message"
            >
              <Star className="h-3 w-3" />
            </button>
          )}
        </div>
        <div
          className={`rounded-xl px-3 py-2 text-sm ${isAgent ? "bg-primary/5 border border-primary/10" : isOwn ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          onMouseUp={handleTextSelection}
        >
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>{msg.message_text}</ReactMarkdown>
          </div>
        </div>

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

/* ─── AI Insight Card ─── */
function AIInsightCard({ msg, onStar }: { msg: ChatMessage; onStar: (text: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const firstLine = msg.message_text.split("\n")[0].slice(0, 100);

  return (
    <div className="rounded-lg border border-border p-3 space-y-1.5 bg-card hover:bg-muted/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1.5 text-left flex-1 min-w-0">
          {expanded ? <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />}
          <span className="text-sm font-medium truncate">{firstLine || "AI Response"}</span>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</span>
          <button onClick={() => onStar(msg.message_text)} className="text-muted-foreground hover:text-yellow-500 transition-colors" title="Star excerpt">
            <Star className="h-3 w-3" />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="prose prose-sm max-w-none dark:prose-invert pl-5 pt-1 text-sm">
          <ReactMarkdown>{msg.message_text}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

/* ─── Starred Excerpt Card ─── */
function StarredExcerptCard({
  excerpt, isOwner, onDelete, onScrollToMessage,
}: {
  excerpt: StarredExcerpt;
  isOwner: boolean;
  onDelete: () => void;
  onScrollToMessage: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const displayTitle = excerpt.title || excerpt.excerpt_text.slice(0, 60) + (excerpt.excerpt_text.length > 60 ? "…" : "");

  return (
    <div className="rounded-lg border border-border p-3 space-y-2 bg-card">
      <div className="flex items-start justify-between gap-2">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1.5 text-left flex-1 min-w-0">
          {expanded ? <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />}
          <span className="text-sm font-medium truncate">{displayTitle}</span>
        </button>
        <Badge variant="outline" className="text-[9px] shrink-0">
          {excerpt.is_from_agent ? "From agent" : `From ${excerpt.profiles?.name || "user"}`}
        </Badge>
      </div>

      {(excerpt.tags as string[]).length > 0 && (
        <div className="flex flex-wrap gap-1 pl-5">
          {(excerpt.tags as string[]).map((tag, i) => (
            <Badge key={i} variant="secondary" className="text-[9px]">{tag}</Badge>
          ))}
        </div>
      )}

      {expanded && (
        <div className="pl-5 space-y-2">
          <div className="prose prose-sm max-w-none dark:prose-invert text-sm bg-muted/30 rounded-lg p-2">
            <ReactMarkdown>{excerpt.excerpt_text}</ReactMarkdown>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onScrollToMessage} className="text-xs text-primary hover:underline flex items-center gap-1">
              <ExternalLink className="h-3 w-3" /> Go to original message
            </button>
            {isOwner && (
              <button onClick={onDelete} className="text-xs text-destructive hover:underline flex items-center gap-1">
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 pl-5">
        <Avatar className="h-4 w-4">
          <AvatarImage src={excerpt.profiles?.avatar_url || undefined} />
          <AvatarFallback className="text-[8px]">{excerpt.profiles?.name?.charAt(0) || "?"}</AvatarFallback>
        </Avatar>
        <span className="text-[10px] text-muted-foreground">
          {excerpt.profiles?.name || "User"} · {formatDistanceToNow(new Date(excerpt.created_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}

/* ─── Suggestion Card (unchanged) ─── */
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
