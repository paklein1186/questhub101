import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface ChatBubble {
  conversationId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  minimized: boolean;
}

interface ChatBubbleContextType {
  bubbles: ChatBubble[];
  openBubble: (bubble: Omit<ChatBubble, "minimized">) => void;
  closeBubble: (conversationId: string) => void;
  toggleMinimize: (conversationId: string) => void;
}

const ChatBubbleContext = createContext<ChatBubbleContextType | null>(null);

export function useChatBubbles() {
  const ctx = useContext(ChatBubbleContext);
  if (!ctx) throw new Error("useChatBubbles must be used within ChatBubbleProvider");
  return ctx;
}

export function ChatBubbleProvider({ children }: { children: ReactNode }) {
  const [bubbles, setBubbles] = useState<ChatBubble[]>([]);

  const openBubble = useCallback((bubble: Omit<ChatBubble, "minimized">) => {
    setBubbles((prev) => {
      const exists = prev.find((b) => b.conversationId === bubble.conversationId);
      if (exists) {
        return prev.map((b) =>
          b.conversationId === bubble.conversationId ? { ...b, minimized: false } : b
        );
      }
      // Max 3 bubbles open
      const next = [...prev, { ...bubble, minimized: false }];
      return next.slice(-3);
    });
  }, []);

  const closeBubble = useCallback((conversationId: string) => {
    setBubbles((prev) => prev.filter((b) => b.conversationId !== conversationId));
  }, []);

  const toggleMinimize = useCallback((conversationId: string) => {
    setBubbles((prev) =>
      prev.map((b) =>
        b.conversationId === conversationId ? { ...b, minimized: !b.minimized } : b
      )
    );
  }, []);

  return (
    <ChatBubbleContext.Provider value={{ bubbles, openBubble, closeBubble, toggleMinimize }}>
      {children}
    </ChatBubbleContext.Provider>
  );
}
