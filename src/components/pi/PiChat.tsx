import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, Sparkles, RotateCcw, Check, X, Undo2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { useTranslation } from "react-i18next";
import { usePiPanel } from "@/hooks/usePiPanel";
import { usePiConversationMutations } from "@/hooks/usePiConversations";
import { PiActionPaths } from "@/components/assistant/PiActionPaths";
import { useUserEntities } from "@/hooks/useUserEntities";

type ProposedAction = { name: string; args: any };
type FollowUpSuggestion = { label: string; prompt: string };

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  proposedActions?: ProposedAction[];
  pendingConfirmation?: boolean;
  followUpSuggestions?: FollowUpSuggestion[];
  meta?: {
    createdEntities?: { type: string; id: string }[];
    updatedEntities?: { type: string; id: string }[];
    links?: { fromType: string; fromId: string; relation: string; toType: string; toId: string }[];
    undoable?: boolean;
  };
};

function entityRoute(type: string, id: string): string {
  const map: Record<string, string> = {
    quest: `/quests/${id}`, guild: `/guilds/${id}`, territory: `/territories/${id}`,
    event: `/events/${id}`, living_system: `/natural-systems/${id}`, service: `/services/${id}`,
  };
  return map[type] || "/explore";
}

function entityLabel(type: string): string {
  const map: Record<string, string> = {
    quest: "Quest", guild: "Guild", territory: "Territory", event: "Event",
    living_system: "Living System", service: "Service",
  };
  return map[type] || type;
}

function actionSummary(action: ProposedAction): string {
  const { name, args } = action;
  if (name === "create_entity" || name === "prefill_form") {
    return `Create ${entityLabel(args?.type || "entity")}${args?.fields?.title ? `: "${args.fields.title}"` : ""}`;
  }
  if (name === "update_entity") return `Update ${entityLabel(args?.type || "entity")}${args?.fields?.title ? `: "${args.fields.title}"` : ""}`;
  if (name === "add_subtask") return `Add subtask${args?.title ? `: "${args.title}"` : ""} to quest`;
  if (name === "link_entities") return `Link ${entityLabel(args?.from_type)} → ${args?.relation} → ${entityLabel(args?.to_type)}`;
  return name;
}

interface PiChatProps {
  className?: string;
}

export function PiChat({ className }: PiChatProps) {
  const { session } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: userEntities } = useUserEntities();
  const {
    activeConversationId,
    setActiveConversation,
    setChatActive,
    contextType,
    contextId,
    isChatActive,
    prefillPrompt,
    setPrefillPrompt,
  } = usePiPanel();
  const { createConversation, updateConversation } = usePiConversationMutations();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(activeConversationId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, []);

  // Load conversation from DB when activeConversationId changes
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      setConversationId(null);
      return;
    }
    setConversationId(activeConversationId);
    (async () => {
      const { data } = await supabase
        .from("pi_conversations" as any)
        .select("messages")
        .eq("id", activeConversationId)
        .single();
      if (data) {
        setMessages((data as any).messages || []);
      }
    })();
  }, [activeConversationId]);

  // Auto-scroll
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isChatActive, scrollToBottom]);

  // Auto-resize textarea when input changes programmatically
  useEffect(() => {
    autoResize();
  }, [input, autoResize]);

  // Handle prefill prompt from external sources (e.g. GuidedPathways)
  useEffect(() => {
    if (prefillPrompt && session?.user?.id) {
      const prompt = prefillPrompt;
      setPrefillPrompt(null);
      // Small delay to ensure panel is rendered
      setTimeout(() => send(prompt), 200);
    }
  }, [prefillPrompt, session?.user?.id]);

  const persistMessages = useCallback(
    async (msgs: ChatMessage[], convId: string | null) => {
      if (!convId || !session?.user?.id) return;
      await updateConversation(convId, {
        messages: msgs as any,
        title: msgs.find((m) => m.role === "user")?.text?.slice(0, 60) || "Conversation",
      });
    },
    [session, updateConversation]
  );

  const send = async (overrideText?: string, displayText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isLoading || !session?.user?.id) return;

    // Mark chat as active (collapses volets)
    if (!isChatActive) setChatActive(true);

    const shownText = displayText ?? text;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", text: shownText };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    // Create conversation in DB if needed
    let cId = conversationId;
    if (!cId) {
      try {
        const conv = await createConversation({
          title: text.slice(0, 60),
          modelId: "gemini-flash",
          contextType,
          contextId,
          messages: [userMsg],
        });
        if (conv) {
          cId = conv.id;
          setConversationId(cId);
          setActiveConversation(cId);
        }
      } catch (e) {
        console.error("Failed to create conversation:", e);
      }
    }

    try {
      const { data, error } = await supabase.functions.invoke("ctg-guide", {
        body: {
          message: text,
          contextType,
          contextId: contextId ?? null,
          mode: "propose",
        },
      });

      if (error) throw error;

      const proposedActions = data.proposedActions || [];
      const followUpSuggestions = data.followUpSuggestions || [];
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: data.assistantMessage,
        proposedActions: proposedActions.length > 0 ? proposedActions : undefined,
        pendingConfirmation: proposedActions.length > 0,
        followUpSuggestions: followUpSuggestions.length > 0 && !proposedActions.length ? followUpSuggestions : undefined,
      };

      const updatedMessages = [...nextMessages, assistantMsg];
      setMessages(updatedMessages);
      if (cId) persistMessages(updatedMessages, cId);
    } catch (e: any) {
      console.error("Pi error:", e);
      const errMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: t("pi.errorRetry"),
      };
      const updatedMessages = [...nextMessages, errMsg];
      setMessages(updatedMessages);
      if (cId) persistMessages(updatedMessages, cId);
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
        },
      });
      if (error) throw error;

      const updated = messages.map((m) =>
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
      );
      setMessages(updated);
      if (conversationId) persistMessages(updated, conversationId);
    } catch (e) {
      console.error("Execute error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const rejectActions = async (msgId: string) => {
    const msg = messages.find((m) => m.id === msgId);
    const skippedActions = msg?.proposedActions;

    // Call LLM again with skip context to get follow-up suggestions
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ctg-guide", {
        body: {
          message: `[SYSTEM: User skipped these proposed actions: ${skippedActions?.map(a => actionSummary(a)).join(", ")}. Provide alternative suggestions. Include followUpSuggestions in your response.]`,
          contextType,
          contextId: contextId ?? null,
          mode: "propose",
        },
      });

      if (!error && data?.followUpSuggestions?.length) {
        const updated = messages.map((m) =>
          m.id === msgId
            ? { ...m, pendingConfirmation: false, proposedActions: undefined, followUpSuggestions: data.followUpSuggestions }
            : m
        );
        // Add assistant follow-up message
        const followUpMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          text: data.assistantMessage || t("pi.skippedAlternatives"),
          proposedActions: data.proposedActions?.length ? data.proposedActions : undefined,
          pendingConfirmation: data.proposedActions?.length > 0,
          followUpSuggestions: !data.proposedActions?.length ? data.followUpSuggestions : undefined,
        };
        const updatedWithFollow = [...updated, followUpMsg];
        setMessages(updatedWithFollow);
        if (conversationId) persistMessages(updatedWithFollow, conversationId);
      } else {
        // Fallback: just clear actions and show default suggestions
        const defaultSuggestions: FollowUpSuggestion[] = [
          { label: t("pi.suggestModify"), prompt: t("pi.suggestModifyPrompt") },
          { label: t("pi.suggestSearchExisting"), prompt: t("pi.suggestSearchExistingPrompt") },
          { label: t("pi.suggestDifferent"), prompt: t("pi.suggestDifferentPrompt") },
        ];
        const updated = messages.map((m) =>
          m.id === msgId
            ? { ...m, pendingConfirmation: false, proposedActions: undefined, followUpSuggestions: defaultSuggestions }
            : m
        );
        setMessages(updated);
        if (conversationId) persistMessages(updated, conversationId);
      }
    } catch {
      // On error, just clear with defaults
      const updated = messages.map((m) =>
        m.id === msgId ? { ...m, pendingConfirmation: false, proposedActions: undefined } : m
      );
      setMessages(updated);
      if (conversationId) persistMessages(updated, conversationId);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = useCallback((prompt: string) => {
    setInput(prompt);
    // Use a microtask to ensure input is set before sending
    queueMicrotask(() => {
      // Directly invoke the send logic with the prompt
      const text = prompt.trim();
      if (!text || isLoading || !session?.user?.id) return;
      if (!isChatActive) setChatActive(true);

      const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", text };
      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      setInput("");
      setIsLoading(true);

      (async () => {
        let cId = conversationId;
        if (!cId) {
          try {
            const conv = await createConversation({ title: text.slice(0, 60), modelId: "gemini-flash", contextType, contextId, messages: [userMsg] });
            if (conv) { cId = conv.id; setConversationId(cId); setActiveConversation(cId); }
          } catch (e) { console.error("Failed to create conversation:", e); }
        }
        try {
          const { data, error } = await supabase.functions.invoke("ctg-guide", {
            body: { message: text, contextType, contextId: contextId ?? null, mode: "propose" },
          });
          if (error) throw error;
          const proposedActions = data.proposedActions || [];
          const followUpSuggestions = data.followUpSuggestions || [];
          const assistantMsg: ChatMessage = {
            id: crypto.randomUUID(), role: "assistant", text: data.assistantMessage,
            proposedActions: proposedActions.length > 0 ? proposedActions : undefined,
            pendingConfirmation: proposedActions.length > 0,
            followUpSuggestions: followUpSuggestions.length > 0 && !proposedActions.length ? followUpSuggestions : undefined,
          };
          const updatedMessages = [...nextMessages, assistantMsg];
          setMessages(updatedMessages);
          if (cId) persistMessages(updatedMessages, cId);
        } catch (e: any) {
          console.error("Pi error:", e);
          const errMsg: ChatMessage = { id: crypto.randomUUID(), role: "assistant", text: t("pi.errorRetry") };
          const updatedMessages = [...nextMessages, errMsg];
          setMessages(updatedMessages);
          if (cId) persistMessages(updatedMessages, cId);
        } finally {
          setIsLoading(false);
        }
      })();
    });
  }, [messages, isLoading, session, isChatActive, conversationId, contextType, contextId]);

  const undoActions = async (msgId: string) => {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg?.meta?.createdEntities?.length) return;

    setIsLoading(true);
    try {
      await supabase.functions.invoke("ctg-guide", {
        body: { mode: "undo", createdEntities: msg.meta.createdEntities, contextType, contextId },
      });
      const updated = messages.map((m) =>
        m.id === msgId
          ? { ...m, meta: { ...m.meta, undoable: false, createdEntities: [], links: [] }, text: m.text + `\n\n*⏪ ${t("pi.actionsUndone")}*` }
          : m
      );
      setMessages(updated);
      if (conversationId) persistMessages(updated, conversationId);
    } catch (e) {
      console.error("Undo error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    setActiveConversation(null);
    setChatActive(false);
    setInput("");
  };

  const hasMessages = messages.length > 0;

  return (
    <div className={`flex flex-col flex-1 min-h-0 ${className ?? ""}`}>
      {/* Messages */}
      <ScrollArea className="flex-1 px-3 py-3" ref={scrollRef}>
        {!hasMessages && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">{t("pi.greeting")}</p>
            <p className="text-xs text-muted-foreground max-w-[260px]">
              {t("pi.greetingSubtext")}
            </p>
          </div>
        )}
        <div className="space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
              {msg.role === "assistant" && (
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                  msg.role === "user"
                    ? "bg-primary/10 text-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1.5 [&>p:last-child]:mb-0">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>

                {/* Proposed actions */}
                {msg.pendingConfirmation && msg.proposedActions?.length ? (
                  <div className="mt-2.5 space-y-1.5">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      {t("pi.proposedActions")}
                    </p>
                    {msg.proposedActions.map((a, i) => (
                      <div key={i} className="text-xs px-2 py-1.5 rounded-lg bg-background/60 border border-border">
                        {actionSummary(a)}
                      </div>
                    ))}
                    <div className="flex gap-1.5 pt-1">
                      <Button size="sm" className="h-7 text-xs gap-1" onClick={() => confirmActions(msg.id)}>
                        <Check className="h-3 w-3" /> {t("pi.confirm")}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => rejectActions(msg.id)}>
                        <X className="h-3 w-3" /> {t("pi.skip")}
                      </Button>
                    </div>
                  </div>
                ) : null}

                {/* Follow-up suggestion chips */}
                {msg.followUpSuggestions?.length && !msg.pendingConfirmation ? (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {msg.followUpSuggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => handleSuggestionClick(s.prompt)}
                        className="text-[11px] px-2.5 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/15 transition-colors cursor-pointer"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                ) : null}

                {/* Entity chips */}
                {msg.meta?.createdEntities?.length ? (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {msg.meta.createdEntities.map((e) => (
                      <Badge key={e.id} variant="outline" className="text-[10px] cursor-pointer hover:bg-primary/10"
                        onClick={() => navigate(entityRoute(e.type, e.id))}>
                        ✨ {entityLabel(e.type)}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                {msg.meta?.undoable && (
                  <div className="mt-2">
                    <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={() => undoActions(msg.id)}>
                      <Undo2 className="h-3 w-3" /> {t("pi.undo")}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start gap-2">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="bg-muted rounded-2xl px-3.5 py-2.5 text-sm flex items-center gap-2 text-muted-foreground">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
                </span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input + Action chips */}
      <div className="border-t border-border p-3 space-y-2">
        <div className="flex items-end gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoResize();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={t("pi.placeholder")}
            className="flex-1 resize-none border-0 bg-transparent text-sm focus-visible:ring-0 min-h-[20px] max-h-[120px] p-0"
            rows={1}
          />
          <Button data-pi-send size="icon" variant="ghost" onClick={() => send()} disabled={!input.trim() || isLoading} className="h-8 w-8 shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Voies chips */}
        <PiActionPaths
          onPromptSelect={(prompt, displayPrompt) => {
            if (!isChatActive) setChatActive(true);
            send(prompt, displayPrompt);
          }}
          userEntities={userEntities}
        />

        <div className="flex items-center justify-between mt-1 px-1">
          <p className="text-[10px] text-muted-foreground">
            {t("pi.sendHint")}
          </p>
          {hasMessages && (
            <button
              onClick={startNewConversation}
              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="h-3 w-3" /> {t("pi.newConversation")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
