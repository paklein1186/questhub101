import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, ChevronRight, Send, Loader2, Sparkles, RotateCcw, Check, X, Undo2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { PiActionPaths } from "./PiActionPaths";
import { useUserEntities } from "@/hooks/useUserEntities";

// ---------- Types ----------
type EntityRef = { type: string; id: string };
type LinkRef = {
  fromType: string;
  fromId: string;
  relation: string;
  toType: string;
  toId: string;
};

type ProposedAction = {
  name: string;
  args: any;
};

type Choice = {
  label: string;
  route: string;
  meta?: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  proposedActions?: ProposedAction[];
  pendingConfirmation?: boolean;
  choices?: Choice[];
  meta?: {
    createdEntities?: EntityRef[];
    updatedEntities?: EntityRef[];
    links?: LinkRef[];
    undoable?: boolean;
  };
};

// ---------- Props ----------
export type ConversationGuideProps = {
  contextType: "global" | "onboarding" | "guild" | "quest" | "territory";
  contextId?: string | null;
  sessionId?: string | null;
  onSessionChange?: (sessionId: string) => void;
  className?: string;
  inline?: boolean;
  /** When true, uses larger input/response areas (mobile overlay) */
  expanded?: boolean;
  prefillPrompt?: string | null;
  onPrefillConsumed?: () => void;
  onClose?: () => void;
};

// ---------- Helpers ----------
function entityRoute(type: string, id: string): string {
  const map: Record<string, string> = {
    quest: `/quests/${id}`,
    guild: `/guilds/${id}`,
    territory: `/territories/${id}`,
    event: `/events/${id}`,
    living_system: `/natural-systems/${id}`,
    service: `/services/${id}`,
    post: `/posts/${id}`,
  };
  return map[type] || `/explore`;
}

function entityLabel(type: string): string {
  const map: Record<string, string> = {
    quest: "Quest",
    guild: "Guild",
    territory: "Territory",
    event: "Event",
    living_system: "Living System",
    service: "Service",
    post: "Post",
  };
  return map[type] || type;
}

function actionSummary(action: ProposedAction): string {
  const { name, args } = action;
  if (name === "create_entity" || name === "prefill_form") {
    const t = args?.type || "entity";
    const title = args?.fields?.title || args?.fields?.name || "";
    return `Create ${entityLabel(t)}${title ? `: "${title}"` : ""}`;
  }
  if (name === "update_entity") {
    const t = args?.type || "entity";
    return `Update ${entityLabel(t)}`;
  }
  if (name === "link_entities") {
    return `Link ${entityLabel(args?.from_type)} → ${args?.relation} → ${entityLabel(args?.to_type)}`;
  }
  return name;
}

const CONTEXT_HINTS: Record<string, string> = {
  global: "Describe what you want to achieve and I'll propose quests, guilds, or services.",
  onboarding: "Tell me about your work, your territory and the kind of missions you are looking for.",
  guild: "Explain what this guild should coordinate and I'll propose quests, services and rituals.",
  quest: "Describe the quest in your own words (goals, people, timing, resources) and I'll refine it.",
  territory: "Tell me about this territory (actors, lands, challenges) and I'll sketch quests, entities and living systems.",
};

const CONTEXT_BADGES: Record<string, string> = {
  global: "Global",
  onboarding: "Onboarding",
  guild: "Guild",
  quest: "Quest",
  territory: "Territory",
};

// ---------- Storage helpers ----------
const STORAGE_KEY = "pi-guide-history";

function loadStoredMessages(contextType: string, contextId?: string | null): ChatMessage[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const all = JSON.parse(stored);
    const key = `${contextType}:${contextId ?? "global"}`;
    return all[key] ?? [];
  } catch {
    return [];
  }
}

function storeMessages(contextType: string, contextId: string | null | undefined, messages: ChatMessage[]) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const all = stored ? JSON.parse(stored) : {};
    const key = `${contextType}:${contextId ?? "global"}`;
    all[key] = messages;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch { /* ignore quota errors */ }
}

// ---------- Chat body (shared) ----------
function ChatBody({
  messages,
  input,
  setInput,
  isLoading,
  send,
  onConfirmActions,
  onRejectActions,
  onUndo,
  onNewConversation,
  contextType,
  navigate,
  onClose,
  userEntities,
}: {
  messages: ChatMessage[];
  input: string;
  setInput: (v: string) => void;
  isLoading: boolean;
  send: () => void;
  onConfirmActions: (msgId: string) => void;
  onRejectActions: (msgId: string) => void;
  onUndo: (msgId: string) => void;
  onNewConversation: () => void;
  contextType: string;
  navigate: (to: string) => void;
  onClose?: () => void;
  userEntities?: any;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pathsExpanded, setPathsExpanded] = useState(true);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Collapse paths when first message appears
  useEffect(() => {
    if (messages.length > 0) {
      setPathsExpanded(false);
    }
  }, [messages.length]);

  const hasMessages = messages.length > 0;
  const hasPending = messages.some((m) => m.pendingConfirmation);

  return (
    <>
      {/* Quick Actions */}
      <div className="border-b border-border">
        <button
          onClick={() => setPathsExpanded((v) => !v)}
          className="flex items-center justify-between w-full px-3 py-2 text-xs text-muted-foreground hover:bg-muted/40 transition-colors"
        >
          <span className="font-medium">Quick actions</span>
          {pathsExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
        <AnimatePresence>
          {pathsExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <PiActionPaths
                onPromptSelect={(prompt) => {
                  setInput(prompt);
                  setPathsExpanded(false);
                }}
                onClose={onClose}
                userEntities={userEntities}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Messages */}
      <ScrollArea
        className={`flex-1 px-3 py-2 ${hasMessages ? "min-h-[200px]" : "max-h-20"}`}
        ref={scrollRef}
      >
        {!hasMessages && (
          <p className="text-xs text-muted-foreground italic py-4 text-center">
            {CONTEXT_HINTS[contextType]}
          </p>
        )}
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>

                {/* Proposed actions awaiting confirmation */}
                {msg.pendingConfirmation && msg.proposedActions && msg.proposedActions.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Proposed actions:
                    </p>
                    {msg.proposedActions.map((a, i) => (
                      <div key={i} className="text-xs px-2 py-1 rounded-md bg-background/60 border border-border">
                        {actionSummary(a)}
                      </div>
                    ))}
                    <div className="flex gap-1.5 pt-1">
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => onConfirmActions(msg.id)}
                      >
                        <Check className="h-3 w-3" /> Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs gap-1"
                        onClick={() => onRejectActions(msg.id)}
                      >
                        <X className="h-3 w-3" /> Skip
                      </Button>
                    </div>
                  </div>
                )}

                {/* Executed entity chips */}
                {msg.meta?.createdEntities && msg.meta.createdEntities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {msg.meta.createdEntities.map((e) => (
                      <Badge
                        key={e.id}
                        variant="outline"
                        className="text-[10px] cursor-pointer hover:bg-primary/10"
                        onClick={() => navigate(entityRoute(e.type, e.id))}
                      >
                        ✨ New {entityLabel(e.type)}
                      </Badge>
                    ))}
                  </div>
                )}
                {msg.meta?.updatedEntities && msg.meta.updatedEntities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {msg.meta.updatedEntities.map((e) => (
                      <Badge
                        key={e.id}
                        variant="outline"
                        className="text-[10px] cursor-pointer hover:bg-primary/10"
                        onClick={() => navigate(entityRoute(e.type, e.id))}
                      >
                        ✏️ Updated {entityLabel(e.type)}
                      </Badge>
                    ))}
                  </div>
                )}
                {msg.meta?.links && msg.meta.links.length > 0 && (
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {msg.meta.links.map((l, i) => (
                      <span key={i}>
                        🔗 {entityLabel(l.fromType)} → {l.relation} → {entityLabel(l.toType)}
                        {i < msg.meta!.links!.length - 1 && " · "}
                      </span>
                    ))}
                  </div>
                )}

                {/* Choices for disambiguation */}
                {msg.choices && msg.choices.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-2">
                    {msg.choices.map((choice, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          navigate(choice.route);
                          onClose?.();
                        }}
                        className="flex items-start gap-2 w-full text-left px-3 py-2 rounded-lg border border-border bg-muted/40 hover:bg-accent/60 transition-colors text-sm"
                      >
                        <span className="flex-1">{choice.label}</span>
                        {choice.meta && (
                          <span className="text-[10px] text-muted-foreground shrink-0">{choice.meta}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Undo button */}
                {msg.meta?.undoable && (
                  <div className="mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] gap-1"
                      onClick={() => onUndo(msg.id)}
                    >
                      <Undo2 className="h-3 w-3" /> Undo
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-xl px-3 py-2 text-sm flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Thinking…
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-2 flex gap-2 items-end">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={hasPending ? "Confirm actions above first, or type to skip…" : "Describe what you need… (Enter to send)"}
          className="min-h-[48px] max-h-32 text-sm resize-none flex-1"
          rows={1}
        />
        <div className="flex flex-col gap-1">
          <Button
            size="icon"
            onClick={send}
            disabled={isLoading || !input.trim()}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
          {hasMessages && (
            <Button
              size="icon"
              variant="ghost"
              onClick={onNewConversation}
              className="shrink-0 h-8 w-8"
              title="New conversation"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

// ---------- Component ----------
export default function ConversationGuide({
  contextType,
  contextId,
  sessionId: propSessionId,
  onSessionChange,
  className,
  inline = false,
  expanded = false,
  prefillPrompt,
  onPrefillConsumed,
  onClose,
}: ConversationGuideProps) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [open, setOpen] = useState(inline);
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    loadStoredMessages(contextType, contextId)
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [internalSessionId, setInternalSessionId] = useState<string | null>(null);

  const effectiveSessionId = propSessionId ?? internalSessionId ?? null;

  // Persist messages
  useEffect(() => {
    storeMessages(contextType, contextId, messages);
  }, [messages, contextType, contextId]);

  // Handle prefill prompt
  useEffect(() => {
    if (prefillPrompt) {
      setInput(prefillPrompt);
      onPrefillConsumed?.();
    }
  }, [prefillPrompt]);

  if (!session) return null;

  // Clear undo flags from all messages (called when a new prompt comes in)
  const clearUndoFlags = () => {
    setMessages((prev) =>
      prev.map((m) =>
        m.meta?.undoable ? { ...m, meta: { ...m.meta, undoable: false } } : m
      )
    );
  };

  // Clear pending confirmations (called when user sends a new prompt, cancelling unconfirmed actions)
  const clearPendingConfirmations = () => {
    setMessages((prev) =>
      prev.map((m) =>
        m.pendingConfirmation
          ? { ...m, pendingConfirmation: false, proposedActions: undefined }
          : m
      )
    );
  };

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    // New prompt cancels any pending undo or unconfirmed actions
    clearUndoFlags();
    clearPendingConfirmations();

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ctg-guide", {
        body: {
          message: text,
          contextType,
          contextId: contextId ?? null,
          sessionId: effectiveSessionId,
          mode: "propose",
        },
      });

      if (error) throw error;

      if (data.sessionId && data.sessionId !== effectiveSessionId) {
        setInternalSessionId(data.sessionId);
        onSessionChange?.(data.sessionId);
      }

      const proposedActions = data.proposedActions || [];
      const hasActions = proposedActions.length > 0;

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: data.assistantMessage,
        proposedActions: hasActions ? proposedActions : undefined,
        pendingConfirmation: hasActions,
        choices: data.choices || undefined,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e: any) {
      console.error("Pi error:", e);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmActions = async (msgId: string) => {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg?.proposedActions?.length) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ctg-guide", {
        body: {
          mode: "execute",
          pendingActions: msg.proposedActions,
          contextType,
          contextId: contextId ?? null,
          sessionId: effectiveSessionId,
        },
      });

      if (error) throw error;

      // Update message: remove pending, add executed results + undo flag
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                pendingConfirmation: false,
                proposedActions: undefined,
                meta: {
                  createdEntities: data.createdEntities || [],
                  updatedEntities: data.updatedEntities || [],
                  links: data.links || [],
                  undoable: (data.createdEntities || []).length > 0,
                },
              }
            : m
        )
      );
    } catch (e: any) {
      console.error("Execute error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const rejectActions = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? { ...m, pendingConfirmation: false, proposedActions: undefined }
          : m
      )
    );
  };

  const undoActions = async (msgId: string) => {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg?.meta?.createdEntities?.length) return;

    setIsLoading(true);
    try {
      await supabase.functions.invoke("ctg-guide", {
        body: {
          mode: "undo",
          createdEntities: msg.meta.createdEntities,
          contextType,
          contextId: contextId ?? null,
        },
      });

      // Remove undo flag and add a note
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                meta: { ...m.meta, undoable: false, createdEntities: [], links: [] },
                text: m.text + "\n\n*⏪ Actions undone.*",
              }
            : m
        )
      );
    } catch (e: any) {
      console.error("Undo error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setInternalSessionId(null);
    setInput("");
  };

  const chatBodyProps = {
    messages,
    input,
    setInput,
    isLoading,
    send,
    onConfirmActions: confirmActions,
    onRejectActions: rejectActions,
    onUndo: undoActions,
    onNewConversation: startNewConversation,
    contextType,
    navigate,
    onClose,
  };

  // ─── Inline mode ───
  if (inline) {
    return (
      <div className={`flex flex-col w-full rounded-xl border border-border bg-card overflow-hidden ${className ?? ""}`}>
        <ChatBody {...chatBodyProps} />
      </div>
    );
  }

  // ─── Collapsible card mode ───
  return (
    <Card className={`flex flex-col overflow-hidden ${className ?? ""}`}>
      <CardHeader
        className="flex flex-row items-center justify-between p-3 cursor-pointer select-none border-b"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Pi</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {CONTEXT_BADGES[contextType]}
          </Badge>
        </div>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </CardHeader>

      {open && (
        <CardContent className="flex flex-col p-0 flex-1 min-h-0">
          <ChatBody {...chatBodyProps} />
        </CardContent>
      )}
    </Card>
  );
}
