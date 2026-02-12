import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useXpCredits } from "@/hooks/useXpCredits";
import { XP_EVENT_TYPES } from "@/lib/xpCreditsConfig";

/* ───── Territory detail ───── */

export function useTerritoryDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["territory-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("territories")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

/* ───── Territory Excerpts ───── */

export interface TerritoryExcerpt {
  id: string;
  territory_id: string;
  text: string;
  synthesis: string | null;
  source_prompt: string | null;
  created_by_user_id: string | null;
  upvote_count: number;
  source_memory_entry_id: string | null;
  source_quest_id: string | null;
  is_deleted: boolean;
  created_at: string;
  // joined
  contributor_name?: string | null;
  contributor_avatar?: string | null;
}

export function useTerritoryExcerpts(territoryId: string | undefined, sort: "top" | "recent" = "top") {
  return useQuery({
    queryKey: ["territory-excerpts", territoryId, sort],
    queryFn: async () => {
      let q = supabase
        .from("territory_excerpts" as any)
        .select("*")
        .eq("territory_id", territoryId!)
        .eq("is_deleted", false);
      if (sort === "top") q = q.order("upvote_count", { ascending: false });
      else q = q.order("created_at", { ascending: false });
      const { data, error } = await q;
      if (error) throw error;
      const excerpts = (data ?? []) as unknown as TerritoryExcerpt[];

      // Fetch contributor profiles and auth users
       const userIds = [...new Set(excerpts.filter(e => e.created_by_user_id).map(e => e.created_by_user_id!))];
       if (userIds.length > 0) {
         const { data: profiles } = await supabase
           .from("profiles")
           .select("id, display_name, avatar_url")
           .in("id", userIds);
         const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
         
         // Get auth user data as fallback
         const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
         const authMap = new Map((authUsers ?? []).map((u: any) => [u.id, u]));
         
         excerpts.forEach(e => {
           const p = e.created_by_user_id ? profileMap.get(e.created_by_user_id) : null;
           if (p) {
             e.contributor_name = p.display_name;
             e.contributor_avatar = p.avatar_url;
           } else if (e.created_by_user_id) {
             // Fallback to email if no profile
             const authUser = authMap.get(e.created_by_user_id);
             if (authUser?.email) {
               e.contributor_name = authUser.email.split("@")[0];
             }
           }
         });
       }
      return excerpts;
    },
    enabled: !!territoryId,
  });
}

export function useExcerptUserUpvotes(territoryId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ["territory-excerpt-upvotes-user", territoryId, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("territory_excerpt_upvotes" as any)
        .select("excerpt_id")
        .eq("user_id", userId!);
      if (error) throw error;
      return new Set((data ?? []).map((r: any) => r.excerpt_id));
    },
    enabled: !!territoryId && !!userId,
  });
}

export function useToggleExcerptUpvote() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { grantXp } = useXpCredits();

  return useMutation({
    mutationFn: async ({ excerptId, userId, isUpvoted, authorUserId }: {
      excerptId: string; userId: string; isUpvoted: boolean; authorUserId: string | null;
    }) => {
      if (isUpvoted) {
        await supabase.from("territory_excerpt_upvotes" as any).delete().eq("excerpt_id", excerptId).eq("user_id", userId);
      } else {
        await supabase.from("territory_excerpt_upvotes" as any).insert({ excerpt_id: excerptId, user_id: userId } as any);
        // Award XP to author
        if (authorUserId && authorUserId !== userId) {
          try {
            await grantXp(authorUserId, { type: XP_EVENT_TYPES.TERRITORY_EXCERPT_UPVOTE_AUTHOR as any, relatedEntityId: excerptId });
          } catch {}
        }
        // Small XP for curator
        try {
          await grantXp(userId, { type: XP_EVENT_TYPES.TERRITORY_EXCERPT_UPVOTE_CURATOR as any, relatedEntityId: excerptId }, true);
        } catch {}
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["territory-excerpts"] });
      qc.invalidateQueries({ queryKey: ["territory-excerpt-upvotes-user"] });
    },
    onError: (e: any) => {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    },
  });
}

export function useCreateExcerpt() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { grantXp } = useXpCredits();

  return useMutation({
    mutationFn: async (entry: {
      territory_id: string;
      text: string;
      synthesis?: string;
      source_prompt?: string;
      created_by_user_id: string;
      source_memory_entry_id?: string;
      source_chat_log_id?: string;
    }) => {
      const { data, error } = await supabase
        .from("territory_excerpts" as any)
        .insert(entry as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data, vars) => {
      qc.invalidateQueries({ queryKey: ["territory-excerpts", vars.territory_id] });
      toast({ title: "Excerpt saved to Library" });
      try {
        await grantXp(vars.created_by_user_id, {
          type: XP_EVENT_TYPES.TERRITORY_EXCERPT_CREATED as any,
          relatedEntityId: (data as any)?.id,
          territoryId: vars.territory_id,
        });
      } catch {}
    },
    onError: (e: any) => {
      toast({ title: "Failed to save excerpt", description: e.message, variant: "destructive" });
    },
  });
}

/* ───── Delete Excerpt (soft) ───── */

export function useDeleteExcerpt() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ excerptId }: { excerptId: string; territoryId: string }) => {
      const { error } = await supabase
        .from("territory_excerpts" as any)
        .update({ is_deleted: true, deleted_at: new Date().toISOString() } as any)
        .eq("id", excerptId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["territory-excerpts", vars.territoryId] });
      toast({ title: "Excerpt removed" });
    },
    onError: (e: any) => {
      toast({ title: "Failed to delete", description: e.message, variant: "destructive" });
    },
  });
}

/* ───── Report Excerpt ───── */

export function useReportExcerpt() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ excerptId, userId, reason, customReason }: {
      excerptId: string; userId: string; reason: string; customReason?: string;
    }) => {
      // Insert report
      const { error } = await supabase
        .from("territory_excerpt_reports" as any)
        .insert({ excerpt_id: excerptId, reported_by_user_id: userId, reason, custom_reason: customReason } as any);
      if (error) throw error;

      // Notify admins via notification
      const { data: admins } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "admin");
      if (admins && admins.length > 0) {
        const notifications = admins.map((a: any) => ({
          user_id: a.id,
          type: "excerpt_report",
          title: "Excerpt reported",
          body: `Reason: ${reason}${customReason ? ` — ${customReason}` : ""}`,
          related_entity_type: "territory_excerpt",
          related_entity_id: excerptId,
        }));
        await supabase.from("notifications").insert(notifications);
      }
    },
    onSuccess: () => {
      toast({ title: "Report submitted", description: "Admins have been notified." });
    },
    onError: (e: any) => {
      toast({ title: "Failed to report", description: e.message, variant: "destructive" });
    },
  });
}

/* ───── Territory Chat Logs ───── */

export interface TerritoryChatMessage {
  id: string;
  territory_id: string;
  user_id: string | null;
  message_role: "USER" | "AI";
  content: string;
  is_knowledge_contribution: boolean;
  linked_memory_entry_id: string | null;
  created_at: string;
}

export function useTerritoryChat(territoryId: string | undefined) {
  return useQuery({
    queryKey: ["territory-chat", territoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("territory_chat_logs" as any)
        .select("*")
        .eq("territory_id", territoryId!)
        .order("created_at", { ascending: true })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as TerritoryChatMessage[];
    },
    enabled: !!territoryId,
  });
}

export function useInsertChatMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (msg: {
      territory_id: string;
      user_id: string | null;
      message_role: "USER" | "AI";
      content: string;
      is_knowledge_contribution?: boolean;
      linked_memory_entry_id?: string;
    }) => {
      const { data, error } = await supabase
        .from("territory_chat_logs" as any)
        .insert(msg as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as TerritoryChatMessage;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["territory-chat", vars.territory_id] });
    },
  });
}

/* ───── Territory stats (quests, entities in territory) ───── */

export function useTerritoryStats(territoryId: string | undefined) {
  return useQuery({
    queryKey: ["territory-stats", territoryId],
    queryFn: async () => {
      // Count quests linked to this territory
      const [questsRes, guildsRes, podsRes, memoryRes] = await Promise.all([
        supabase.from("quest_territories" as any).select("id", { count: "exact", head: true }).eq("territory_id", territoryId!),
        supabase.from("guild_territories").select("id", { count: "exact", head: true }).eq("territory_id", territoryId!),
        supabase.from("pod_territories").select("id", { count: "exact", head: true }).eq("territory_id", territoryId!),
        supabase.from("territory_memory" as any).select("id", { count: "exact", head: true }).eq("territory_id", territoryId!),
      ]);
      return {
        quests: questsRes.count ?? 0,
        guilds: guildsRes.count ?? 0,
        pods: podsRes.count ?? 0,
        memoryEntries: memoryRes.count ?? 0,
      };
    },
    enabled: !!territoryId,
  });
}
