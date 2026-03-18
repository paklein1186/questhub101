import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useCallback } from "react";

export interface Conversation {
  id: string;
  title: string | null;
  is_group: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  sender_label?: string | null;
  sender_entity_type?: string | null;
  sender_entity_id?: string | null;
  participants: { user_id: string; name: string; avatar_url: string | null }[];
  last_message?: { content: string; created_at: string; sender_id: string };
  unread_count: number;
}

export interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_deleted: boolean;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  attachment_size?: number | null;
  sender_label?: string | null;
  sender?: { name: string; avatar_url: string | null };
}

export function useConversations() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const queryClient = useQueryClient();

  // Global realtime: listen for any new DM to refresh conversation list
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("inbox-global")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["conversations", userId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, queryClient]);

  return useQuery({
    queryKey: ["conversations", userId],
    queryFn: async (): Promise<Conversation[]> => {
      if (!userId) return [];

      // Get conversations the user participates in
      const { data: participations } = await supabase
        .from("conversation_participants")
        .select("conversation_id, last_read_at")
        .eq("user_id", userId);

      if (!participations?.length) return [];

      const convIds = participations.map((p) => p.conversation_id);
      const lastReadMap = Object.fromEntries(
        participations.map((p) => [p.conversation_id, p.last_read_at])
      );

      // Get conversations
      const { data: convs } = await supabase
        .from("conversations")
        .select("*")
        .in("id", convIds)
        .order("updated_at", { ascending: false });

      if (!convs?.length) return [];

      // Get all participants via RPC
      const { data: allParticipants } = await supabase
        .rpc("get_conversation_participants", { conv_ids: convIds });

      // Get profile info for all participants
      const allUserIds = [...new Set(allParticipants?.map((p: any) => p.user_id) ?? [])];
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, name, avatar_url")
        .in("user_id", allUserIds);

      const profileMap = Object.fromEntries(
        (profiles ?? []).map((p) => [p.user_id, p])
      );

      // Batch fetch: get last messages and unread counts in parallel
      const [lastMsgsResult, unreadResults] = await Promise.all([
        // Get last message per conversation — fetch most recent messages for all convs
        Promise.all(
          convs.map((conv) =>
            supabase
              .from("direct_messages")
              .select("content, created_at, sender_id")
              .eq("conversation_id", conv.id)
              .eq("is_deleted", false)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle()
          )
        ),
        // Unread counts in parallel
        Promise.all(
          convs.map((conv) =>
            supabase
              .from("direct_messages")
              .select("id", { count: "exact", head: true })
              .eq("conversation_id", conv.id)
              .eq("is_deleted", false)
              .gt("created_at", lastReadMap[conv.id] ?? conv.created_at)
              .neq("sender_id", userId)
          )
        ),
      ]);

      return convs.map((conv, i) => {
        const participants = (allParticipants ?? [])
          .filter((p: any) => p.conversation_id === conv.id)
          .map((p: any) => ({
            user_id: p.user_id,
            name: profileMap[p.user_id]?.name ?? "Unknown",
            avatar_url: profileMap[p.user_id]?.avatar_url ?? null,
          }));

        return {
          ...conv,
          participants,
          last_message: lastMsgsResult[i]?.data ?? undefined,
          unread_count: unreadResults[i]?.count ?? 0,
        };
      });
    },
    enabled: !!userId,
    refetchInterval: 30000,
    staleTime: 5000,
  });
}

export function useConversationMessages(conversationId: string | null) {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  const query = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async (): Promise<DirectMessage[]> => {
      if (!conversationId) return [];

      const { data: messages } = await supabase
        .from("direct_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(200);

      if (!messages?.length) return [];

      const senderIds = [...new Set(messages.map((m) => m.sender_id))];
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, name, avatar_url")
        .in("user_id", senderIds);

      const profileMap = Object.fromEntries(
        (profiles ?? []).map((p) => [p.user_id, p])
      );

      // Resolve signed URLs for dm-attachments (bucket is now private)
      const resolvedMessages = await Promise.all(
        messages.map(async (m) => {
          let attachmentUrl = m.attachment_url;
          if (attachmentUrl) {
            const bucketSegment = "/storage/v1/object/public/dm-attachments/";
            const idx = attachmentUrl.indexOf(bucketSegment);
            const storagePath = idx !== -1
              ? decodeURIComponent(attachmentUrl.substring(idx + bucketSegment.length))
              : attachmentUrl; // New format: path stored directly
            // Only generate signed URL if it looks like a storage path (not an external URL)
            if (!storagePath.startsWith("http")) {
              const { data: signedData } = await supabase.storage
                .from("dm-attachments")
                .createSignedUrl(storagePath, 3600); // 1 hour expiry
              if (signedData?.signedUrl) {
                attachmentUrl = signedData.signedUrl;
              }
            }
          }
          return {
            ...m,
            attachment_url: attachmentUrl,
            sender: profileMap[m.sender_id]
              ? { name: profileMap[m.sender_id].name, avatar_url: profileMap[m.sender_id].avatar_url }
              : undefined,
          };
        })
      );

      return resolvedMessages;
    },
    enabled: !!conversationId,
    staleTime: 2000,
    placeholderData: (prev) => prev,
  });

  // Mark as read when viewing
  useEffect(() => {
    if (!conversationId || !session?.user?.id) return;
    supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", session.user.id)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      });
  }, [conversationId, session?.user?.id, queryClient]);

  // Realtime subscription — listen for INSERT, UPDATE, DELETE
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`dm-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "direct_messages", filter: `conversation_id=eq.${conversationId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, queryClient]);

  return query;
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async ({ conversationId, content, attachment_url, attachment_name, attachment_type, attachment_size }: { conversationId: string; content: string; attachment_url?: string; attachment_name?: string; attachment_type?: string; attachment_size?: number }) => {
      const { data: msg, error } = await supabase.from("direct_messages").insert({
        conversation_id: conversationId,
        sender_id: session!.user.id,
        content,
        ...(attachment_url && { attachment_url, attachment_name, attachment_type, attachment_size }),
      }).select().single();

      if (error) throw error;

      // Update conversation updated_at
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);

      // Trigger email notification (fire-and-forget)
      fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-dm-notification`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messageId: msg?.id,
            conversationId,
            senderId: session!.user.id,
            content,
          }),
        }
      ).catch((err) => console.error("DM notification error:", err));

      return msg;
    },
    // Optimistic update: inject the message immediately
    onMutate: async ({ conversationId, content, attachment_url, attachment_name, attachment_type, attachment_size }) => {
      const userId = session!.user.id;
      await queryClient.cancelQueries({ queryKey: ["messages", conversationId] });

      const previousMessages = queryClient.getQueryData<DirectMessage[]>(["messages", conversationId]);

      const optimisticMsg: DirectMessage = {
        id: `optimistic-${Date.now()}`,
        conversation_id: conversationId,
        sender_id: userId,
        content,
        created_at: new Date().toISOString(),
        is_deleted: false,
        attachment_url: attachment_url ?? null,
        attachment_name: attachment_name ?? null,
        attachment_type: attachment_type ?? null,
        attachment_size: attachment_size ? Number(attachment_size) : null,
        sender: { name: "You", avatar_url: null },
      };

      queryClient.setQueryData<DirectMessage[]>(["messages", conversationId], (old = []) => [...old, optimisticMsg]);

      return { previousMessages, conversationId };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousMessages !== undefined) {
        queryClient.setQueryData(["messages", context.conversationId], context.previousMessages);
      }
    },
    onSettled: (_data, _err, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
      // Fetch the message first to get attachment info for storage cleanup
      const { data: msg } = await supabase
        .from("direct_messages")
        .select("attachment_url")
        .eq("id", messageId)
        .maybeSingle();

      // Delete attachment from storage if present
      if (msg?.attachment_url) {
        try {
          const url = msg.attachment_url as string;
          // Support both old public URLs and new storage paths
          const bucketSegment = "/storage/v1/object/public/dm-attachments/";
          const idx = url.indexOf(bucketSegment);
          const storagePath = idx !== -1
            ? decodeURIComponent(url.substring(idx + bucketSegment.length))
            : url; // New format: path is stored directly
          await supabase.storage.from("dm-attachments").remove([storagePath]);
        } catch (e) {
          console.error("Failed to delete attachment from storage:", e);
        }
      }

      // Hard-delete the message row
      const { error } = await supabase
        .from("direct_messages")
        .delete()
        .eq("id", messageId);
      if (error) throw error;
      return conversationId;
    },
    // Optimistic delete — remove from list immediately
    onMutate: async ({ messageId, conversationId }) => {
      await queryClient.cancelQueries({ queryKey: ["messages", conversationId] });
      const previousMessages = queryClient.getQueryData<DirectMessage[]>(["messages", conversationId]);
      queryClient.setQueryData<DirectMessage[]>(["messages", conversationId], (old = []) =>
        old.filter((m) => m.id !== messageId)
      );
      return { previousMessages, conversationId };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousMessages !== undefined) {
        queryClient.setQueryData(["messages", context.conversationId], context.previousMessages);
      }
    },
    onSettled: (conversationId) => {
      if (conversationId) {
        queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      }
    },
  });
}

export function useEditMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, content, conversationId }: { messageId: string; content: string; conversationId: string }) => {
      const { error } = await supabase
        .from("direct_messages")
        .update({ content })
        .eq("id", messageId);
      if (error) throw error;
      return conversationId;
    },
    // Optimistic edit
    onMutate: async ({ messageId, content, conversationId }) => {
      await queryClient.cancelQueries({ queryKey: ["messages", conversationId] });
      const previousMessages = queryClient.getQueryData<DirectMessage[]>(["messages", conversationId]);
      queryClient.setQueryData<DirectMessage[]>(["messages", conversationId], (old = []) =>
        old.map((m) => m.id === messageId ? { ...m, content } : m)
      );
      return { previousMessages, conversationId };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousMessages !== undefined) {
        queryClient.setQueryData(["messages", context.conversationId], context.previousMessages);
      }
    },
    onSettled: (conversationId) => {
      if (conversationId) {
        queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      }
    },
  });
}

export function useAddParticipants() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, userIds, makeGroup, title }: { conversationId: string; userIds: string[]; makeGroup?: boolean; title?: string }) => {
      const { error } = await supabase
        .from("conversation_participants")
        .insert(userIds.map((uid) => ({ conversation_id: conversationId, user_id: uid })));
      if (error) throw error;

      if (makeGroup) {
        await supabase
          .from("conversations")
          .update({ is_group: true, title: title || null })
          .eq("id", conversationId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async ({ participantIds, title, isGroup }: { participantIds: string[]; title?: string; isGroup?: boolean }) => {
      const userId = session!.user.id;

      // Check if 1:1 conversation already exists
      if (!isGroup && participantIds.length === 1) {
        const otherId = participantIds[0];
        const { data: myConvs } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", userId);

        if (myConvs?.length) {
          const { data: otherConvs } = await supabase
            .from("conversation_participants")
            .select("conversation_id")
            .eq("user_id", otherId)
            .in("conversation_id", myConvs.map((c) => c.conversation_id));

          if (otherConvs?.length) {
            for (const conv of otherConvs) {
              const { data: convData } = await supabase
                .from("conversations")
                .select("id, is_group")
                .eq("id", conv.conversation_id)
                .eq("is_group", false)
                .maybeSingle();
              if (!convData) continue;

              const { count } = await supabase
                .from("conversation_participants")
                .select("id", { count: "exact", head: true })
                .eq("conversation_id", convData.id);
              if (count === 2) return convData.id;
            }
          }
        }
      }

      const { data: conv, error } = await supabase
        .from("conversations")
        .insert({
          title: title ?? null,
          is_group: isGroup ?? participantIds.length > 1,
          created_by: userId,
        })
        .select("id")
        .single();

      if (error || !conv) throw error ?? new Error("Failed to create conversation");

      const allIds = [...new Set([userId, ...participantIds])];
      const { error: pError } = await supabase
        .from("conversation_participants")
        .insert(allIds.map((uid) => ({ conversation_id: conv.id, user_id: uid })));

      if (pError) throw pError;

      return conv.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useUnreadMessageCount() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const { data: conversations } = useConversations();
  const totalUnread = (conversations ?? []).reduce((sum, c) => sum + c.unread_count, 0);

  return totalUnread;
}
