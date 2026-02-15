import { useChatBubbles } from "@/components/chat/ChatBubbleContext";
import { useCreateConversation } from "@/hooks/useMessages";
import { useCallback, useState } from "react";

/**
 * Hook to open a chat bubble with a specific user.
 * Creates or finds existing 1:1 conversation, then opens bubble overlay.
 */
export function useOpenChatBubble() {
  const { openBubble } = useChatBubbles();
  const createConversation = useCreateConversation();
  const [isPending, setIsPending] = useState(false);

  const open = useCallback(
    async (targetUser: { id: string; name: string; avatarUrl?: string }) => {
      setIsPending(true);
      try {
        const conversationId = await createConversation.mutateAsync({
          participantIds: [targetUser.id],
          isGroup: false,
        });
        openBubble({
          conversationId,
          userId: targetUser.id,
          userName: targetUser.name,
          userAvatar: targetUser.avatarUrl,
        });
      } finally {
        setIsPending(false);
      }
    },
    [openBubble, createConversation]
  );

  return { open, isPending };
}
