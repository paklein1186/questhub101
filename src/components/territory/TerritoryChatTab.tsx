import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Send, Loader2, Brain, Sparkles, BookOpen, MessageSquare, Paperclip, X, FileText, Image as ImageIcon, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useInsertChatMessage, useCreateExcerpt, type TerritoryChatMessage } from "@/hooks/useTerritoryDetail";
import { useAddTerritoryMemory } from "@/hooks/useTerritoryMemory";
import { useXpCredits } from "@/hooks/useXpCredits";
import { XP_EVENT_TYPES } from "@/lib/xpCreditsConfig";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ImageLightbox from "@/components/ImageLightbox";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const URL_REGEX = /https?:\/\/[^\s<]+/gi;

function sanitizeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-");
}

function extractUrls(text: string): string[] {
  return text.match(URL_REGEX) || [];
}

interface ChatAttachment {
  file: File;
  preview?: string;
}

interface Props {
  territoryId: string;
  territoryName: string;
  userId?: string;
}

type EnrichedMessage = TerritoryChatMessage & {
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  attachment_size?: number | null;
  urls?: string[];
};

export function TerritoryChatTab({ territoryId, territoryName, userId }: Props) {
  const [messages, setMessages] = useState<EnrichedMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isKnowledge, setIsKnowledge] = useState(false);
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const insertChat = useInsertChatMessage();
  const addMemory = useAddTerritoryMemory();
  const createExcerpt = useCreateExcerpt();
  const { grantXp } = useXpCredits();
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large. Maximum size is 25 MB.");
      return;
    }
    const preview = IMAGE_TYPES.includes(file.type) ? URL.createObjectURL(file) : undefined;
    setAttachment({ file, preview });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = () => {
    if (attachment?.preview) URL.revokeObjectURL(attachment.preview);
    setAttachment(null);
  };

  const uploadFile = async (file: File): Promise<{ url: string; name: string; type: string; size: number }> => {
    const safeName = sanitizeFileName(file.name);
    const path = `${userId}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from("territory-chat").upload(path, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from("territory-chat").getPublicUrl(path);
    return { url: urlData.publicUrl, name: file.name, type: file.type, size: file.size };
  };

  const sendMessage = async () => {
    if ((!input.trim() && !attachment) || !userId) return;
    const text = input.trim();
    const currentAttachment = attachment;
    const urls = extractUrls(text);

    const userMsg: EnrichedMessage = {
      id: crypto.randomUUID(),
      territory_id: territoryId,
      user_id: userId,
      message_role: "USER",
      content: text,
      is_knowledge_contribution: isKnowledge,
      linked_memory_entry_id: null,
      created_at: new Date().toISOString(),
      attachment_url: currentAttachment?.preview || null,
      attachment_name: currentAttachment?.file.name || null,
      attachment_type: currentAttachment?.file.type || null,
      attachment_size: currentAttachment?.file.size || null,
      urls,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setAttachment(null);
    setLoading(true);

    try {
      // Upload file if present
      let fileData: { url: string; name: string; type: string; size: number } | null = null;
      if (currentAttachment) {
        fileData = await uploadFile(currentAttachment.file);
        // Update the preview URL with the real URL
        setMessages((prev) =>
          prev.map((m) => (m.id === userMsg.id ? { ...m, attachment_url: fileData!.url } : m))
        );
      }

      // Save user message
      await insertChat.mutateAsync({
        territory_id: territoryId,
        user_id: userId,
        message_role: "USER",
        content: text || (fileData ? `[File: ${fileData.name}]` : ""),
        is_knowledge_contribution: isKnowledge,
        ...(fileData && {
          attachment_url: fileData.url,
          attachment_name: fileData.name,
          attachment_type: fileData.type,
          attachment_size: fileData.size,
        }),
      } as any);

      // If knowledge contribution, also save to territory memory
      let memoryEntryId: string | undefined;
      if (isKnowledge && text) {
        const memResult = await addMemory.mutateAsync({
          territory_id: territoryId,
          title: text.slice(0, 80),
          content: text + (fileData ? `\n\n[Attached: ${fileData.name}](${fileData.url})` : ""),
          category: "RAW_NOTES",
          visibility: "PUBLIC",
          tags: [],
          created_by_user_id: userId,
        });
        memoryEntryId = (memResult as any)?.id;
        try {
          await grantXp(userId, {
            type: XP_EVENT_TYPES.TERRITORY_CHAT_KNOWLEDGE as any,
            relatedEntityId: memoryEntryId,
            territoryId,
          });
        } catch {}
      }

      // Call AI for response
      const promptContent = text || (fileData ? `User shared a file: ${fileData.name}` : "");
      const { data, error } = await supabase.functions.invoke("territory-intelligence", {
        body: {
          territoryId,
          analysisPrompt: isKnowledge
            ? `The user has contributed the following knowledge to the territory "${territoryName}": "${promptContent}"${fileData ? ` (with attached file: ${fileData.name})` : ""}. Acknowledge the contribution, summarize what it adds to the territory's knowledge, and suggest whether it should be saved as a Library excerpt.`
            : `The user is asking about the territory "${territoryName}": "${promptContent}". Answer using all available territory memory and context. Be helpful and specific.`,
        },
      });

      const aiContent = data?.analysisResponse || data?.summary || data?.error || "I couldn't generate a response. Please try again.";

      const aiMsg: EnrichedMessage = {
        id: crypto.randomUUID(),
        territory_id: territoryId,
        user_id: null,
        message_role: "AI",
        content: aiContent,
        is_knowledge_contribution: false,
        linked_memory_entry_id: memoryEntryId || null,
        created_at: new Date().toISOString(),
        urls: extractUrls(aiContent),
      };
      setMessages((prev) => [...prev, aiMsg]);

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

  const saveAsExcerpt = (msg: EnrichedMessage) => {
    if (!userId) return;
    createExcerpt.mutate({
      territory_id: territoryId,
      text: msg.content.slice(0, 500) + (msg.attachment_url ? `\n\n[Attachment](${msg.attachment_url})` : ""),
      created_by_user_id: userId,
      source_memory_entry_id: msg.linked_memory_entry_id || undefined,
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
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
                  "max-w-[85%] rounded-2xl px-5 py-4",
                  msg.message_role === "USER"
                    ? "bg-primary text-primary-foreground rounded-br-md text-sm leading-relaxed"
                    : "bg-muted text-foreground rounded-bl-md text-[0.9rem] leading-[1.75]"
                )}
              >
                {msg.is_knowledge_contribution && (
                  <Badge variant="secondary" className="text-[10px] mb-2 gap-1">
                    <Sparkles className="h-2.5 w-2.5" /> Knowledge contribution
                  </Badge>
                )}

                {/* Attachment display */}
                {msg.attachment_url && (
                  <div className="mb-2">
                    {msg.attachment_type && IMAGE_TYPES.includes(msg.attachment_type) ? (
                    <img
                          src={msg.attachment_url}
                          alt={msg.attachment_name || "Attachment"}
                          className="rounded-lg max-h-48 max-w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setLightboxSrc(msg.attachment_url!)}
                        />
                    ) : (
                      <a
                        href={msg.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg border transition-colors",
                          msg.message_role === "USER"
                            ? "border-primary-foreground/20 hover:bg-primary-foreground/10"
                            : "border-border hover:bg-background"
                        )}
                      >
                        <FileText className="h-4 w-4 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{msg.attachment_name}</p>
                          {msg.attachment_size && (
                            <p className="text-[10px] opacity-70">{formatFileSize(msg.attachment_size)}</p>
                          )}
                        </div>
                      </a>
                    )}
                  </div>
                )}

                {/* Message text */}
                {msg.content && msg.message_role === "AI" ? (
                  <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-a:text-primary prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-headings:my-2 prose-li:my-0.5">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : msg.content ? (
                  <p className="whitespace-pre-line">
                    {renderContentWithUrls(msg.content, true)}
                  </p>
                ) : null}

                {/* URL previews */}
                {msg.urls && msg.urls.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {msg.urls.slice(0, 3).map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg text-xs truncate transition-colors",
                          msg.message_role === "USER"
                            ? "bg-primary-foreground/10 hover:bg-primary-foreground/20"
                            : "bg-background hover:bg-muted/80 border border-border"
                        )}
                      >
                        <Link2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{url}</span>
                      </a>
                    ))}
                  </div>
                )}

                {msg.message_role === "AI" && userId && (
                  <button
                    onClick={() => saveAsExcerpt(msg)}
                    className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-medium hover:bg-primary/20 hover:border-primary/30 transition-all group"
                  >
                    <BookOpen className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                    <span>Save to Library</span>
                    <Sparkles className="h-3 w-3 opacity-50" />
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

        {/* Attachment preview */}
        {attachment && (
          <div className="px-3 pt-2 flex items-center gap-2">
            <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 text-xs max-w-xs">
              {attachment.preview ? (
                <img src={attachment.preview} alt="" className="h-8 w-8 rounded object-cover" />
              ) : (
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className="truncate">{attachment.file.name}</span>
              <span className="text-muted-foreground shrink-0">({formatFileSize(attachment.file.size)})</span>
              <button onClick={removeAttachment} className="shrink-0 hover:text-destructive transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

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
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || !userId || !!attachment}
              title="Attach file (max 25 MB)"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
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
              disabled={loading || (!input.trim() && !attachment) || !userId}
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
    <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </>
  );
}

/** Renders text with clickable URL links */
function renderContentWithUrls(text: string, isUser: boolean) {
  const parts = text.split(URL_REGEX);
  const urls = text.match(URL_REGEX) || [];

  if (urls.length === 0) return text;

  const result: React.ReactNode[] = [];
  parts.forEach((part, i) => {
    result.push(part);
    if (i < urls.length) {
      result.push(
        <a
          key={i}
          href={urls[i]}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "underline break-all",
            isUser ? "text-primary-foreground/90 hover:text-primary-foreground" : "text-primary hover:text-primary/80"
          )}
        >
          {urls[i]}
        </a>
      );
    }
  });
  return <>{result}</>;
}
