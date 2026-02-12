import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { autoFollowEntity } from "@/hooks/useFollow";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";

// ─── Topics ──────────────────────────────────────────────────
export function useTopics() {
  return useQuery({
    queryKey: ["topics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topics")
        .select("*")
        .eq("is_deleted", false)
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

// ─── Territories ─────────────────────────────────────────────
export function useTerritories() {
  return useQuery({
    queryKey: ["territories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("territories")
        .select("*")
        .eq("is_deleted", false)
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

// ─── Guilds ──────────────────────────────────────────────────
export function useGuilds() {
  return useQuery({
    queryKey: ["guilds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guilds")
        .select("*, guild_topics(topic_id, topics(id, name)), guild_territories(territory_id, territories(id, name)), guild_members(id, user_id, role)")
        .eq("is_deleted", false)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateGuild() {
  const qc = useQueryClient();
  const user = useCurrentUser();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; type: string; isDraft: boolean }) => {
      const logoUrl = `https://api.dicebear.com/7.x/shapes/svg?seed=${input.name.trim().toLowerCase().replace(/\s/g, "")}`;
      const { data: guild, error } = await supabase
        .from("guilds")
        .insert({
          name: input.name.trim(),
          description: input.description?.trim() || null,
          logo_url: logoUrl,
          type: input.type as any,
          is_draft: input.isDraft,
          is_approved: false,
          created_by_user_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      // Add creator as admin member
      const { error: memErr } = await supabase
        .from("guild_members")
        .insert({ guild_id: guild.id, user_id: user.id, role: "ADMIN" as any });
      if (memErr) throw memErr;
      // Auto-follow the created guild
      await autoFollowEntity(user.id, "GUILD", guild.id);
      return guild;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["guilds"] }),
  });
}

// ─── Quests ──────────────────────────────────────────────────
export function useQuests() {
  return useQuery({
    queryKey: ["quests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quests")
        .select("*, quest_topics(topic_id), quest_territories(territory_id, territories(id, name)), guilds(id, name)")
        .eq("is_deleted", false)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ─── Services ────────────────────────────────────────────────
export function useServices() {
  return useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*, service_topics(topic_id, topics(id, name)), service_territories(territory_id, territories(id, name)), guilds(id, name, logo_url)")
        .eq("is_deleted", false)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      // Enrich with provider profiles
      const userIds = [...new Set((data || []).map(s => s.provider_user_id).filter(Boolean))] as string[];
      let profileMap = new Map<string, any>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles_public").select("user_id, name, avatar_url, xp").in("user_id", userIds);
        profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      }
      return (data || []).map(s => ({ ...s, provider_profile: s.provider_user_id ? profileMap.get(s.provider_user_id) || null : null }));
    },
  });
}

// ─── Pods ────────────────────────────────────────────────────
export function usePods() {
  return useQuery({
    queryKey: ["pods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pods")
        .select("*, pod_members(id, user_id, role), quests(id, title), topics(id, name)")
        .eq("is_deleted", false)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreatePod() {
  const qc = useQueryClient();
  const user = useCurrentUser();
  return useMutation({
    mutationFn: async (input: {
      name: string; description?: string; type: string;
      questId?: string; topicId?: string;
      startDate?: string; endDate?: string; isDraft: boolean;
    }) => {
      const { data: pod, error } = await supabase
        .from("pods")
        .insert({
          name: input.name.trim(),
          description: input.description?.trim() || null,
          type: input.type as any,
          quest_id: input.questId || null,
          topic_id: input.topicId || null,
          start_date: input.startDate || null,
          end_date: input.endDate || null,
          is_draft: input.isDraft,
          creator_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      const { error: memErr } = await supabase
        .from("pod_members")
        .insert({ pod_id: pod.id, user_id: user.id, role: "HOST" as any });
      if (memErr) throw memErr;
      await autoFollowEntity(user.id, "POD", pod.id);
      return pod;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pods"] }),
  });
}

// ─── Courses ─────────────────────────────────────────────────
export function useCourses() {
  return useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, course_topics(topic_id, topics(id, name)), course_enrollments(id)")
        .eq("is_deleted", false)
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ─── Guild members for current user ─────────────────────────
export function useMyGuildMemberships() {
  const user = useCurrentUser();
  return useQuery({
    queryKey: ["my-guild-memberships", user.id],
    queryFn: async () => {
      if (!user.id) return [];
      const { data, error } = await supabase
        .from("guild_members")
        .select("*, guilds(id, name)")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user.id,
  });
}

// ─── Companies for current user ─────────────────────────────
export function useMyCompanies() {
  const user = useCurrentUser();
  return useQuery({
    queryKey: ["my-companies", user.id],
    queryFn: async () => {
      if (!user.id) return [];
      const { data, error } = await supabase
        .from("company_members")
        .select("*, companies(id, name)")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user.id,
  });
}

// ─── Profiles (public view) ─────────────────────────────────
export function useProfileByUserId(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles_public")
        .select("*")
        .eq("user_id", userId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}
