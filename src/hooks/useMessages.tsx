import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export interface Conversation {
  id: string;
  title: string | null;
  is_group: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
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
  sender?: { name: string; avatar_url: string | null };
}

export function useConversations() {
  const { session } = useAuth();
  const userId = session?.user?.id;

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

      // Get all participants for these conversations via RPC (bypasses RLS safely)
      const { data: allParticipants } = await supabase
        .rpc("get_conversation_participants", { conv_ids: convIds });

      // Get profile info for all participants
      const allUserIds = [...new Set(allParticipants?.map((p) => p.user_id) ?? [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", allUserIds);

      const profileMap = Object.fromEntries(
        (profiles ?? []).map((p) => [p.user_id, p])
      );

      // Get last message for each conversation
      const results: Conversation[] = [];
      for (const conv of convs) {
        const { data: lastMsg } = await supabase
          .from("direct_messages")
          .select("content, created_at, sender_id")
          .eq("conversation_id", conv.id)
          .eq("is_deleted", false)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        // Count unread
        const { count } = await supabase
          .from("direct_messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .eq("is_deleted", false)
          .gt("created_at", lastReadMap[conv.id] ?? conv.created_at)
          .neq("sender_id", userId);

        const participants = (allParticipants ?? [])
          .filter((p) => p.conversation_id === conv.id)
          .map((p) => ({
            user_id: p.user_id,
            name: profileMap[p.user_id]?.name ?? "Unknown",
            avatar_url: profileMap[p.user_id]?.avatar_url ?? null,
          }));

        results.push({
          ...conv,
          participants,
          last_message: lastMsg ?? undefined,
          unread_count: count ?? 0,
        });
      }

      return results;
    },
    enabled: !!userId,
    refetchInterval: 30000,
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
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", senderIds);

      const profileMap = Object.fromEntries(
        (profiles ?? []).map((p) => [p.user_id, p])
      );

      return messages.map((m) => ({
        ...m,
        sender: profileMap[m.sender_id]
          ? { name: profileMap[m.sender_id].name, avatar_url: profileMap[m.sender_id].avatar_url }
          : undefined,
      }));
    },
    enabled: !!conversationId,
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
  }, [conversationId, session?.user?.id]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`dm-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages", filter: `conversation_id=eq.${conversationId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  return query;
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      // Insert message
      const { data: msg, error } = await supabase.from("direct_messages").insert({
        conversation_id: conversationId,
        sender_id: session!.user.id,
        content,
      }).select().single();
      
      if (error) throw error;

      // Update conversation updated_at
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);

      // Trigger email notification edge function
      try {
        const response = await fetch(
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
        );
        if (!response.ok) {
          console.error("Failed to send DM notification:", response.statusText);
        }
      } catch (err) {
        console.error("Error triggering DM notification:", err);
      }
    },
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
      const { error } = await supabase
        .from("direct_messages")
        .update({ is_deleted: true })
        .eq("id", messageId);
      if (error) throw error;
      return conversationId;
    },
    onSuccess: (conversationId) => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
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
    onSuccess: (conversationId) => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
  });
}

export function useAddParticipants() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, userIds, makeGroup, title }: { conversationId: string; userIds: string[]; makeGroup?: boolean; title?: string }) => {
      // Add participants
      const { error } = await supabase
        .from("conversation_participants")
        .insert(userIds.map((uid) => ({ conversation_id: conversationId, user_id: uid })));
      if (error) throw error;

      // Convert to group if needed
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
            // Check if any of these are 1:1 (not group)
            for (const conv of otherConvs) {
              const { data: convData } = await supabase
                .from("conversations")
                .select("id, is_group")
                .eq("id", conv.conversation_id)
                .eq("is_group", false)
                .single();
              if (convData) return convData.id;
            }
          }
        }
      }

      // Create new conversation
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

      // Add all participants including self
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
