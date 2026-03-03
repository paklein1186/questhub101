import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCallback } from "react";

export interface PiConversation {
  id: string;
  user_id: string;
  title: string | null;
  model_id: string | null;
  context_type: string | null;
  context_id: string | null;
  created_at: string;
  updated_at: string;
  messages: any[];
}

export function usePiConversations(limit = 5) {
  const { session } = useAuth();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: ["pi-conversations", userId, limit],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pi_conversations" as any)
        .select("*")
        .eq("user_id", userId!)
        .order("updated_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as unknown as PiConversation[];
    },
  });
}

export function usePiConversationMutations() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const userId = session?.user?.id;

  const createConversation = useCallback(
    async (params: {
      title?: string;
      modelId?: string;
      contextType?: string;
      contextId?: string | null;
      messages?: any[];
    }) => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("pi_conversations" as any)
        .insert({
          user_id: userId,
          title: params.title || null,
          model_id: params.modelId || "gemini-flash",
          context_type: params.contextType || "global",
          context_id: params.contextId || null,
          messages: params.messages || [],
        } as any)
        .select()
        .single();
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["pi-conversations"] });
      return data as unknown as PiConversation;
    },
    [userId, qc]
  );

  const updateConversation = useCallback(
    async (id: string, updates: { title?: string; messages?: any[]; model_id?: string }) => {
      const { error } = await supabase
        .from("pi_conversations" as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["pi-conversations"] });
    },
    [qc]
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("pi_conversations" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["pi-conversations"] });
    },
    [qc]
  );

  return { createConversation, updateConversation, deleteConversation };
}
