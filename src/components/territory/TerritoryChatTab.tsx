import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, Brain, Sparkles, BookOpen, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useInsertChatMessage, useCreateExcerpt, type TerritoryChatMessage } from "@/hooks/useTerritoryDetail";
import { useAddTerritoryMemory } from "@/hooks/useTerritoryMemory";
import { useXpCredits } from "@/hooks/useXpCredits";
import { XP_EVENT_TYPES } from "@/lib/xpCreditsConfig";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  territoryId: string;
  territoryName: string;
  userId?: string;
}

export function TerritoryChatTab({ territoryId, territoryName, userId }: Props) {
  const [messages, setMessages] = useState<TerritoryChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isKnowledge, setIsKnowledge] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const insertChat = useInsertChatMessage();
  const addMemory = useAddTerritoryMemory();
  const createExcerpt = useCreateExcerpt();
  const { grantXp } = useXpCredits();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !userId) return;
    const userMsg: TerritoryChatMessage = {
      id: crypto.randomUUID(),
      territory_id: territoryId,
      user_id: userId,
      message_role: "USER",
      content: input.trim(),
      is_knowledge_contribution: isKnowledge,
      linked_memory_entry_id: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    const userInput = input.trim();
    setInput("");
    setLoading(true);

    try {
      // Save user message
      await insertChat.mutateAsync({
        territory_id: territoryId,
        user_id: userId,
        message_role: "USER",
        content: userInput,
        is_knowledge_contribution: isKnowledge,
      });

      // If knowledge contribution, also save to territory memory
      let memoryEntryId: string | undefined;
      if (isKnowledge) {
        const memResult = await addMemory.mutateAsync({
          territory_id: territoryId,
          title: userInput.slice(0, 80),
          content: userInput,
          category: "RAW_NOTES",
          visibility: "PUBLIC",
          tags: [],
          created_by_user_id: userId,
        });
        memoryEntryId = (memResult as any)?.id;
        // Grant knowledge XP
        try {
          await grantXp(userId, {
            type: XP_EVENT_TYPES.TERRITORY_CHAT_KNOWLEDGE as any,
            relatedEntityId: memoryEntryId,
            territoryId,
          });
        } catch {}
      }

      // Call AI for response
      const { data, error } = await supabase.functions.invoke("territory-intelligence", {
        body: {
          territoryId,
          analysisPrompt: isKnowledge
            ? `The user has contributed the following knowledge to the territory "${territoryName}": "${userInput}". Acknowledge the contribution, summarize what it adds to the territory's knowledge, and suggest whether it should be saved as a Library excerpt.`
            : `The user is asking about the territory "${territoryName}": "${userInput}". Answer using all available territory memory and context. Be helpful and specific.`,
        },
      });

      const aiContent = data?.analysisResponse || data?.summary || data?.error || "I couldn't generate a response. Please try again.";

      const aiMsg: TerritoryChatMessage = {
        id: crypto.randomUUID(),
        territory_id: territoryId,
        user_id: null,
        message_role: "AI",
        content: aiContent,
        is_knowledge_contribution: false,
        linked_memory_entry_id: memoryEntryId || null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);

      // Save AI message
      await insertChat.mutateAsync({
        territory_id: territoryId,
        user_id: null,
        message_role: "AI",
        content: aiContent,
      });
    } catch (e: any) {
      toast.error(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const saveAsExcerpt = (text: string) => {
    if (!userId) return;
    createExcerpt.mutate({
      territory_id: territoryId,
      text,
      created_by_user_id: userId,
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-lg font-display font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" /> Territory Chat
        </h2>
        <p className="text-sm text-muted-foreground">
          This AI is trained on what we know about {territoryName}. You can both ask and teach it.
        </p>
      </div>

      {/* Chat area */}
      <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col" style={{ height: "min(60vh, 500px)" }}>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
              <Brain className="h-10 w-10 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Start a conversation</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ask questions or contribute knowledge about {territoryName}
                </p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex",
                msg.message_role === "USER" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  msg.message_role === "USER"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                )}
              >
                {msg.is_knowledge_contribution && (
                  <Badge variant="secondary" className="text-[10px] mb-2 gap-1">
                    <Sparkles className="h-2.5 w-2.5" /> Knowledge contribution
                  </Badge>
                )}
                <p className="whitespace-pre-line">{msg.content}</p>
                {msg.message_role === "AI" && userId && (
                  <button
                    onClick={() => saveAsExcerpt(msg.content.slice(0, 500))}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground mt-2 transition-colors"
                  >
                    <BookOpen className="h-3 w-3" /> Save as Library excerpt
                  </button>
                )}
              </div>
            </motion.div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Thinking…</span>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-border p-3 space-y-2 bg-background">
          <div className="flex items-center gap-3 px-1">
            <div className="flex items-center gap-2">
              <Switch
                id="knowledge-mode"
                checked={isKnowledge}
                onCheckedChange={setIsKnowledge}
                className="scale-75"
              />
              <Label htmlFor="knowledge-mode" className="text-xs text-muted-foreground cursor-pointer">
                {isKnowledge ? "Adding knowledge (+10 XP)" : "Asking a question"}
              </Label>
            </div>
          </div>
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isKnowledge ? "Share knowledge about this territory…" : "Ask about this territory…"}
              className="min-h-[44px] max-h-[100px] resize-none text-sm flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <Button
              onClick={sendMessage}
              disabled={loading || !input.trim() || !userId}
              size="icon"
              className="h-11 w-11 shrink-0"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {!userId && (
        <p className="text-xs text-center text-muted-foreground">
          Sign in to chat and contribute to this territory's knowledge.
        </p>
      )}
    </div>
  );
}
