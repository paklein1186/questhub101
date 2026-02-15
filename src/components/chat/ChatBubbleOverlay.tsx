import { useChatBubbles } from "./ChatBubbleContext";
import { MiniChatWindow } from "./MiniChatWindow";
import { useAuth } from "@/hooks/useAuth";

export function ChatBubbleOverlay() {
  const { bubbles } = useChatBubbles();
  const { session } = useAuth();

  if (!session || bubbles.length === 0) return null;

  return (
    <>
      {bubbles.map((bubble, i) => (
        <MiniChatWindow key={bubble.conversationId} bubble={bubble} index={i} />
      ))}
    </>
  );
}
