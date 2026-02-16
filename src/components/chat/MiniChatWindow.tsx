import { useState, useRef, useEffect } from "react";
import { X, Minus, Send, Maximize2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useConversationMessages, useSendMessage } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import React from "react";
import type { ChatBubble } from "./ChatBubbleContext";
import { useChatBubbles } from "./ChatBubbleContext";
import { formatDistanceToNow } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";

const URL_REGEX = /https?:\/\/[^\s<]+/gi;
function renderWithLinks(text: string, isOwn: boolean) {
  const parts = text.split(URL_REGEX);
  const urls = text.match(URL_REGEX) || [];
  if (urls.length === 0) return text;
  const result: React.ReactNode[] = [];
  parts.forEach((part, i) => {
    result.push(part);
    if (i < urls.length) {
      result.push(
        <a key={i} href={urls[i]} target="_blank" rel="noopener noreferrer"
          className={cn("underline break-all", isOwn ? "text-primary-foreground/90 hover:text-primary-foreground" : "text-primary hover:text-primary/80")}>
          {urls[i]}
        </a>
      );
    }
  });
  return <>{result}</>;
}

interface Props {
  bubble: ChatBubble;
  index: number;
}

export function MiniChatWindow({ bubble, index }: Props) {
  const { closeBubble, toggleMinimize } = useChatBubbles();
  const { session } = useAuth();
  const userId = session?.user?.id;
  const isMobile = useIsMobile();
  const { data: messages = [] } = useConversationMessages(bubble.minimized ? null : bubble.conversationId);
  const sendMessage = useSendMessage();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage.mutate({ conversationId: bubble.conversationId, content: text.trim() });
    setText("");
  };

  // Position from the right — on mobile, stack full-width
  const rightOffset = isMobile ? 0 : 16 + index * 340;

  if (bubble.minimized) {
    return (
      <button
        onClick={() => toggleMinimize(bubble.conversationId)}
        className="fixed bottom-4 z-[60] group"
        style={{ right: `${16 + index * 56}px` }}
      >
        <Avatar className="h-12 w-12 ring-2 ring-primary shadow-lg hover:scale-110 transition-transform">
          <AvatarImage src={bubble.userAvatar} />
          <AvatarFallback className="text-sm font-semibold">{bubble.userName[0]}</AvatarFallback>
        </Avatar>
        <button
          onClick={(e) => { e.stopPropagation(); closeBubble(bubble.conversationId); }}
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="h-3 w-3" />
        </button>
      </button>
    );
  }

  return (
    <div
      className={cn(
        "fixed z-[60] rounded-2xl border border-border bg-card shadow-xl flex flex-col overflow-hidden",
        isMobile ? "inset-x-2 bottom-2" : "w-80 bottom-4"
      )}
      style={{ ...(isMobile ? {} : { right: `${rightOffset}px` }), height: isMobile ? "70vh" : "420px" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/50">
        <Avatar className="h-7 w-7">
          <AvatarImage src={bubble.userAvatar} />
          <AvatarFallback className="text-[10px]">{bubble.userName[0]}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-semibold truncate flex-1">{bubble.userName}</span>
        <div className="flex items-center gap-0.5">
          <Button size="icon" variant="ghost" className="h-6 w-6" asChild title="Open full messenger">
            <Link to="/inbox">
              <Maximize2 className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => toggleMinimize(bubble.conversationId)} title="Minimize">
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => closeBubble(bubble.conversationId)} title="Close">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-3 py-2">
        <div className="space-y-2">
          {messages.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">Start the conversation!</p>
          )}
          {messages.map((msg) => {
            const isOwn = msg.sender_id === userId;
            if (msg.is_deleted) return null;
            return (
              <div key={msg.id} className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3 py-1.5 text-xs leading-relaxed",
                    isOwn
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  )}
                >
                  <p>{renderWithLinks(msg.content, isOwn)}</p>
                  <p className={cn("text-[9px] mt-0.5", isOwn ? "text-primary-foreground/60" : "text-muted-foreground")}>
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="flex items-center gap-1.5 px-2 py-2 border-t border-border">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Message..."
          className="h-8 text-xs rounded-full"
        />
        <Button size="icon" className="h-8 w-8 shrink-0 rounded-full" onClick={handleSend} disabled={!text.trim()}>
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
