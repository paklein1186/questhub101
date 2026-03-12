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
import { PiActionPaths } from "@/components/assistant/PiActionPaths";
import { useUserEntities } from "@/hooks/useUserEntities";
import { PiActionCard, XpToast } from "@/components/pi/PiActionCard";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

type SuggestedAction = {
  title: string;
  subtitle?: string;
  description?: string;
  buttonLabel: string;
  effortMinutes?: number;
  xpReward?: number;
  trustReward?: number;
  priority: "primary" | "secondary" | "optional";
  toolCall?: string;
  toolParams?: any;
  status: "ready" | "locked" | "in_progress" | "completed";
  unlockCondition?: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  suggestedActions?: SuggestedAction[];
  followUpSuggestions?: { label: string; prompt?: string; route?: string }[];
  meta?: {
    createdEntities?: { type: string; id: string }[];
    updatedEntities?: { type: string; id: string }[];
    links?: { fromType: string; fromId: string; relation: string; toType: string; toId: string }[];
    undoable?: boolean;
  };
  scene?: { screen?: string; navigate?: string };
  nextPrompt?: string | null;
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
    closePiPanel,
  } = usePiPanel();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(activeConversationId);
  const [xpToast, setXpToast] = useState<number | null>(null);
  const [pathInfo, setPathInfo] = useState<{ path: string; step: number; totalSteps: number } | null>(null);
  const [hasGreeted, setHasGreeted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, []);

  // Load conversation messages from pi_messages table
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      setConversationId(null);
      return;
    }
    setConversationId(activeConversationId);
    setHasGreeted(true); // existing conversation = already greeted
    (async () => {
      const { data } = await supabase
        .from("pi_messages" as any)
        .select("id, role, content, metadata, created_at")
        .eq("conversation_id", activeConversationId)
        .order("created_at", { ascending: true });
      if (data) {
        setMessages(
          (data as any[]).map((m) => ({
            id: m.id,
            role: m.role === "pi" ? "assistant" : "user",
            text: m.content,
            suggestedActions: m.metadata?.suggestedActions?.map((a: any) => ({
              ...a,
              status: a.status || "ready",
            })),
            scene: m.metadata?.scene,
          }))
        );
      }
    })();
  }, [activeConversationId]);

  // Auto-greeting: when chat opens with no conversation, trigger Pi's proactive greeting
  useEffect(() => {
    if (!session?.user?.id || hasGreeted || activeConversationId || isLoading || prefillPrompt) return;
    if (!isChatActive) return; // only greet when chat is actually open

    setHasGreeted(true);
    setIsLoading(true);

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("pi-cognitive", {
          body: { greeting: true },
        });
        if (error) throw error;

        if (data?.conversationId) {
          setConversationId(data.conversationId);
          setActiveConversation(data.conversationId);
        }
        if (data?.pathInfo) setPathInfo(data.pathInfo);

        const suggestedActions = (data?.suggestedActions || []).map((a: any) => ({
          ...a,
          status: a.status || "ready",
        }));

        const greetingMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          text: data?.message || "Welcome! How can I help you today?",
          suggestedActions: suggestedActions.length > 0 ? suggestedActions : undefined,
          nextPrompt: data?.nextPrompt,
        };
        setMessages([greetingMsg]);

        if (data?.actions?.length) processActions(data.actions);
      } catch (e) {
        logger.error("Greeting error:", e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [session?.user?.id, isChatActive, hasGreeted, activeConversationId, prefillPrompt]);

  // Auto-scroll
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isChatActive, scrollToBottom]);
  useEffect(() => { autoResize(); }, [input, autoResize]);

  // Handle prefill prompt
  useEffect(() => {
    if (prefillPrompt && session?.user?.id) {
      const prompt = prefillPrompt;
      setPrefillPrompt(null);
      setTimeout(() => send(prompt), 200);
    }
  }, [prefillPrompt, session?.user?.id]);

  // Process navigation/notification actions from response
  const processActions = (actions: any[]) => {
    for (const action of actions) {
      if (action.action === "navigate" && action.screen) {
        closePiPanel();
        navigate(action.screen);
      }
      if (action.action === "notification") {
        toast(action.title, { description: action.message });
      }
      if (action.action === "award_xp") {
        setXpToast(action.amount);
      }
    }
  };

  const send = async (overrideText?: string, displayText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isLoading || !session?.user?.id) return;

    if (!isChatActive) setChatActive(true);

    const shownText = displayText ?? text;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", text: shownText };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("pi-cognitive", {
        body: {
          message: text,
          conversationId,
        },
      });

      if (error) throw error;

      // Update conversation ID from response
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
        setActiveConversation(data.conversationId);
      }

      // Update path info
      if (data.pathInfo) setPathInfo(data.pathInfo);

      const suggestedActions = (data.suggestedActions || []).map((a: any) => ({
        ...a,
        status: a.status || "ready",
      }));

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: data.message,
        suggestedActions: suggestedActions.length > 0 ? suggestedActions : undefined,
        scene: data.scene,
        nextPrompt: data.nextPrompt,
      };

      setMessages([...nextMessages, assistantMsg]);

      // Process side-effect actions
      if (data.actions?.length) processActions(data.actions);

      // Handle scene navigation
      if (data.scene?.navigate) {
        setTimeout(() => {
          closePiPanel();
          navigate(data.scene.navigate);
        }, 500);
      }
    } catch (e: any) {
      logger.error("Pi error:", e);
      const errMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: t("pi.errorRetry"),
      };
      setMessages([...nextMessages, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Execute an action card
  const executeAction = async (msgId: string, actionIndex: number) => {
    const msg = messages.find((m) => m.id === msgId);
    const action = msg?.suggestedActions?.[actionIndex];
    if (!action || !action.toolCall) return;

    // Update action status to in_progress
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              suggestedActions: m.suggestedActions?.map((a, i) =>
                i === actionIndex ? { ...a, status: "in_progress" as const } : a
              ),
            }
          : m
      )
    );

    try {
      const { data, error } = await supabase.functions.invoke("pi-cognitive", {
        body: {
          message: `EXECUTE_ACTION: ${JSON.stringify({ tool: action.toolCall, params: action.toolParams })}`,
          conversationId,
        },
      });

      if (error) throw error;

      // Update action status to completed
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                suggestedActions: m.suggestedActions?.map((a, i) =>
                  i === actionIndex ? { ...a, status: "completed" as const } : a
                ),
              }
            : m
        )
      );

      // Show XP toast
      if (action.xpReward && action.xpReward > 0) {
        setXpToast(action.xpReward);
      }

      // Process any returned actions
      if (data?.actions?.length) processActions(data.actions);

      // Add confirmation message if Pi responded
      if (data?.message) {
        const confirmMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          text: data.message,
          nextPrompt: data.nextPrompt,
        };
        setMessages((prev) => [...prev, confirmMsg]);
      }
    } catch (e: any) {
      logger.error("Action execution error:", e);
      // Revert to ready state
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                suggestedActions: m.suggestedActions?.map((a, i) =>
                  i === actionIndex ? { ...a, status: "ready" as const } : a
                ),
              }
            : m
        )
      );
      toast.error("Action failed. Please try again.");
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    setActiveConversation(null);
    setChatActive(false);
    setInput("");
    setHasGreeted(false);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className={`flex flex-col flex-1 min-h-0 ${className ?? ""}`}>
      {/* XP Toast */}
      {xpToast && <XpToast amount={xpToast} onDone={() => setXpToast(null)} />}

      {/* Path indicator */}
      {pathInfo && (
        <div className="px-3 pt-2 pb-1">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/40 rounded-lg px-2.5 py-1.5">
            <span>
              {pathInfo.path === "explorer" && "🌱"}
              {pathInfo.path === "mapper" && "🗺️"}
              {pathInfo.path === "builder" && "🏗️"}
              {pathInfo.path === "quester" && "⚔️"}
              {pathInfo.path === "weaver" && "🕸️"}
              {pathInfo.path === "steward" && "🌳"}
            </span>
            <span className="capitalize font-medium text-foreground">{pathInfo.path}</span>
            <span>·</span>
            <span>Step {pathInfo.step} of {pathInfo.totalSteps}</span>
          </div>
        </div>
      )}

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
                  <span className="text-xs font-bold text-primary">π</span>
                </div>
              )}
              <div className={`max-w-[85%] ${msg.role === "user" ? "" : ""}`}>
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-sm ${
                    msg.role === "user"
                      ? "bg-primary/10 text-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1.5 [&>p:last-child]:mb-0">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                </div>

                {/* Action Cards */}
                {msg.suggestedActions?.length ? (
                  <div className="mt-2 space-y-2">
                    {msg.suggestedActions.map((action, i) => (
                      <PiActionCard
                        key={i}
                        title={action.title}
                        subtitle={action.subtitle}
                        description={action.description}
                        effortMinutes={action.effortMinutes}
                        xpReward={action.xpReward}
                        trustReward={action.trustReward}
                        buttonLabel={action.buttonLabel || "Do this"}
                        status={action.status}
                        unlockCondition={action.unlockCondition}
                        priority={action.priority || "secondary"}
                        onExecute={() => executeAction(msg.id, i)}
                      />
                    ))}
                  </div>
                ) : null}

                {/* Next prompt suggestion */}
                {msg.nextPrompt && (
                  <div className="mt-2">
                    <button
                      onClick={() => send(msg.nextPrompt!)}
                      className="text-[11px] px-2.5 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/15 transition-colors cursor-pointer"
                    >
                      {msg.nextPrompt}
                    </button>
                  </div>
                )}

                {/* Follow-up suggestion chips */}
                {msg.followUpSuggestions?.length ? (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {msg.followUpSuggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          if (s.route) {
                            navigate(s.route);
                            closePiPanel();
                          } else if (s.prompt) {
                            send(s.prompt);
                          }
                        }}
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
                        onClick={() => { closePiPanel(); navigate(entityRoute(e.type, e.id)); }}>
                        ✨ {entityLabel(e.type)}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                {msg.meta?.undoable && (
                  <div className="mt-2">
                    <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1">
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
                <span className="text-xs font-bold text-primary">π</span>
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
