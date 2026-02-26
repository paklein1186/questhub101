import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Send, Loader2, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";

// ---------- Types ----------
type EntityRef = { type: string; id: string };
type LinkRef = {
  fromType: string;
  fromId: string;
  relation: string;
  toType: string;
  toId: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  meta?: {
    createdEntities?: EntityRef[];
    updatedEntities?: EntityRef[];
    links?: LinkRef[];
  };
};

type AssistantResponse = {
  sessionId: string;
  assistantMessage: string;
  actionsExecuted: any[];
  createdEntities: EntityRef[];
  updatedEntities: EntityRef[];
  links: LinkRef[];
};

// ---------- Props ----------
export type ConversationGuideProps = {
  contextType: "global" | "onboarding" | "guild" | "quest" | "territory";
  contextId?: string | null;
  sessionId?: string | null;
  onSessionChange?: (sessionId: string) => void;
  className?: string;
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

const CONTEXT_HINTS: Record<string, string> = {
  global:
    "Describe what you want to achieve on CTG and I'll transform it into quests, guilds, or services.",
  onboarding:
    "Tell me about your work, your territory and the kind of missions you are looking for. I'll create your first quests and guilds.",
  guild:
    "Explain what this guild should coordinate and I'll propose quests, services and rituals to structure it.",
  quest:
    "Describe the quest in your own words (goals, people, timing, resources) and I'll refine the structure.",
  territory:
    "Tell me about this territory (actors, lands, challenges) and I'll sketch quests, entities and living systems.",
};

const CONTEXT_BADGES: Record<string, string> = {
  global: "Global",
  onboarding: "Onboarding",
  guild: "Guild",
  quest: "Quest",
  territory: "Territory",
};

// ---------- Component ----------
export default function ConversationGuide({
  contextType,
  contextId,
  sessionId: propSessionId,
  onSessionChange,
  className,
}: ConversationGuideProps) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [internalSessionId, setInternalSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const effectiveSessionId = propSessionId ?? internalSessionId ?? null;

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  if (!session) return null;

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

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
        },
      });

      if (error) throw error;

      const res = data as AssistantResponse;

      if (res.sessionId && res.sessionId !== effectiveSessionId) {
        setInternalSessionId(res.sessionId);
        onSessionChange?.(res.sessionId);
      }

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: res.assistantMessage,
        meta: {
          createdEntities: res.createdEntities,
          updatedEntities: res.updatedEntities,
          links: res.links,
        },
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e: any) {
      console.error("CTG guide error:", e);
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      send();
    }
  };

  return (
    <Card className={`flex flex-col overflow-hidden ${className ?? ""}`}>
      {/* Header */}
      <CardHeader
        className="flex flex-row items-center justify-between p-3 cursor-pointer select-none border-b"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">CTG Guide</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {CONTEXT_BADGES[contextType]}
          </Badge>
        </div>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </CardHeader>

      {open && (
        <CardContent className="flex flex-col p-0 flex-1 min-h-0">
          {/* Messages */}
          <ScrollArea className="flex-1 max-h-72 px-3 py-2" ref={scrollRef}>
            {messages.length === 0 && (
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

                    {/* Entity chips */}
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
          <div className="border-t p-2 flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what you need…"
              className="min-h-[40px] max-h-24 text-sm resize-none"
              rows={1}
            />
            <Button
              size="icon"
              onClick={send}
              disabled={isLoading || !input.trim()}
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
