import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";

// ─── Guild by ID ─────────────────────────────────────────────
export function useGuildById(id: string | undefined) {
  return useQuery({
    queryKey: ["guild", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guilds")
        .select("*, guild_topics(topic_id, topics(id, name, slug)), guild_territories(territory_id, territories(id, name, level)), guild_members(id, user_id, role, joined_at)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

// ─── Quest by ID ─────────────────────────────────────────────
export function useQuestById(id: string | undefined) {
  return useQuery({
    queryKey: ["quest", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quests")
        .select("*, quest_topics(topic_id, topics(id, name, slug)), quest_territories(territory_id, territories(id, name)), guilds(id, name, logo_url)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

// ─── Quest participants ──────────────────────────────────────
export function useQuestParticipants(questId: string | undefined) {
  return useQuery({
    queryKey: ["quest-participants", questId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quest_participants")
        .select("*")
        .eq("quest_id", questId!);
      if (error) throw error;
      // Fetch profiles for participants
      const userIds = data.map(p => p.user_id);
      if (userIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, name, avatar_url")
        .in("user_id", userIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      return data.map(p => ({ ...p, user: profileMap.get(p.user_id) }));
    },
    enabled: !!questId,
  });
}

// ─── Quest updates ───────────────────────────────────────────
export function useQuestUpdates(questId: string | undefined) {
  return useQuery({
    queryKey: ["quest-updates", questId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quest_updates")
        .select("*")
        .eq("quest_id", questId!)
        .eq("is_deleted", false)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Resolve author profiles
      const authorIds = [...new Set((data ?? []).map((u: any) => u.author_id))];
      if (authorIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, name, avatar_url")
        .in("user_id", authorIds);
      const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
      return (data ?? []).map((u: any) => ({ ...u, author: profileMap.get(u.author_id) }));
    },
    enabled: !!questId,
  });
}

// ─── Pods for quest ──────────────────────────────────────────
export function usePodsForQuest(questId: string | undefined) {
  return useQuery({
    queryKey: ["pods-for-quest", questId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pods")
        .select("*, pod_members(id, user_id, role)")
        .eq("quest_id", questId!)
        .eq("is_deleted", false);
      if (error) throw error;
      return data;
    },
    enabled: !!questId,
  });
}

// ─── Service by ID ───────────────────────────────────────────
export function useServiceById(id: string | undefined) {
  return useQuery({
    queryKey: ["service", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*, service_topics(topic_id, topics(id, name)), service_territories(territory_id, territories(id, name))")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

// ─── Pod by ID ───────────────────────────────────────────────
export function usePodById(id: string | undefined) {
  return useQuery({
    queryKey: ["pod", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pods")
        .select("*, pod_members(id, user_id, role, joined_at), quests(id, title), topics(id, name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      // Fetch profiles for members
      const userIds = (data.pod_members || []).map((m: any) => m.user_id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles_public")
          .select("user_id, name, avatar_url")
          .in("user_id", userIds);
        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
        data.pod_members = data.pod_members.map((m: any) => ({ ...m, user: profileMap.get(m.user_id) }));
      }
      return data;
    },
    enabled: !!id,
  });
}

// ─── Course by ID ────────────────────────────────────────────
export function useCourseById(id: string | undefined) {
  return useQuery({
    queryKey: ["course", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, course_topics(topic_id, topics(id, name)), course_territories(territory_id, territories(id, name))")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

// ─── Lessons for course ──────────────────────────────────────
export function useLessonsForCourse(courseId: string | undefined) {
  return useQuery({
    queryKey: ["lessons", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("course_id", courseId!)
        .order("position");
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });
}

// ─── Course enrollment for user ──────────────────────────────
export function useCourseEnrollment(courseId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ["course-enrollment", courseId, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_enrollments")
        .select("*")
        .eq("course_id", courseId!)
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId && !!userId,
  });
}

// ─── Course enrollments count ────────────────────────────────
export function useCourseEnrollmentCount(courseId: string | undefined) {
  return useQuery({
    queryKey: ["course-enrollment-count", courseId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("course_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("course_id", courseId!);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!courseId,
  });
}

// ─── Company by ID ───────────────────────────────────────────
export function useCompanyById(id: string | undefined) {
  return useQuery({
    queryKey: ["company", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*, company_members(id, user_id, role, joined_at), company_territories(territory_id, territories(id, name, level)), company_topics(topic_id, topics(id, name))")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

// ─── Company members with profiles ───────────────────────────
export function useCompanyMembersWithProfiles(companyId: string | undefined) {
  return useQuery({
    queryKey: ["company-members-profiles", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_members")
        .select("*")
        .eq("company_id", companyId!);
      if (error) throw error;
      const userIds = data.map((m) => m.user_id);
      if (userIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, name, avatar_url, headline")
        .in("user_id", userIds);
      return data.map((m) => ({ ...m, user: (profiles ?? []).find((p) => p.user_id === m.user_id) }));
    },
    enabled: !!companyId,
  });
}

// ─── Services for company ────────────────────────────────────
export function useServicesForCompany(companyId: string | undefined) {
  return useQuery({
    queryKey: ["services-for-company", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("owner_type", "COMPANY")
        .eq("owner_id", companyId!)
        .eq("is_deleted", false);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

// ─── Quests for company ──────────────────────────────────────
export function useQuestsForCompany(companyId: string | undefined) {
  return useQuery({
    queryKey: ["quests-for-company", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quests")
        .select("*")
        .eq("company_id", companyId!)
        .eq("is_deleted", false);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

// ─── Bookings for company ────────────────────────────────────
export function useBookingsForCompany(companyId: string | undefined) {
  return useQuery({
    queryKey: ["bookings-for-company", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("company_id", companyId!)
        .eq("is_deleted", false);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

// ─── Services for guild ──────────────────────────────────────
export function useServicesForGuild(guildId: string | undefined) {
  return useQuery({
    queryKey: ["services-for-guild", guildId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("provider_guild_id", guildId!)
        .eq("is_deleted", false);
      if (error) throw error;
      return data;
    },
    enabled: !!guildId,
  });
}

// ─── Quests for guild ────────────────────────────────────────
export function useQuestsForGuild(guildId: string | undefined) {
  return useQuery({
    queryKey: ["quests-for-guild", guildId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quests")
        .select("*")
        .eq("guild_id", guildId!)
        .eq("is_deleted", false);
      if (error) throw error;
      return data;
    },
    enabled: !!guildId,
  });
}

// ─── Achievements for quest IDs ──────────────────────────────
export function useAchievementsForQuests(questIds: string[]) {
  return useQuery({
    queryKey: ["achievements-for-quests", questIds],
    queryFn: async () => {
      if (questIds.length === 0) return [];
      const { data, error } = await supabase
        .from("achievements")
        .select("*")
        .in("quest_id", questIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: questIds.length > 0,
  });
}

// ─── Achievement by ID ───────────────────────────────────────
export function useAchievementById(id: string | undefined) {
  return useQuery({
    queryKey: ["achievement", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achievements")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

// ─── Topic by slug ───────────────────────────────────────────
export function useTopicBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["topic-slug", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topics")
        .select("*")
        .eq("slug", slug!)
        .eq("is_deleted", false)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });
}

// ─── Topic stewards ──────────────────────────────────────────
export function useTopicStewards(topicId: string | undefined) {
  return useQuery({
    queryKey: ["topic-stewards", topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topic_stewards")
        .select("*")
        .eq("topic_id", topicId!);
      if (error) throw error;
      // Fetch profiles
      const userIds = data.map(s => s.user_id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles_public")
          .select("user_id, name, avatar_url")
          .in("user_id", userIds);
        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
        return data.map(s => ({ ...s, user: profileMap.get(s.user_id) }));
      }
      return data;
    },
    enabled: !!topicId,
  });
}

// ─── Topic features ──────────────────────────────────────────
export function useTopicFeatures(topicId: string | undefined) {
  return useQuery({
    queryKey: ["topic-features", topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topic_features")
        .select("*")
        .eq("topic_id", topicId!);
      if (error) throw error;
      return data;
    },
    enabled: !!topicId,
  });
}

// ─── Quests by topic ─────────────────────────────────────────
export function useQuestsForTopic(topicId: string | undefined) {
  return useQuery({
    queryKey: ["quests-for-topic", topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quest_topics")
        .select("quest_id, quests(id, title, description, status, reward_xp, is_featured, is_draft)")
        .eq("topic_id", topicId!);
      if (error) throw error;
      return (data || []).map(qt => qt.quests).filter(Boolean);
    },
    enabled: !!topicId,
  });
}

// ─── Guilds by topic ─────────────────────────────────────────
export function useGuildsForTopic(topicId: string | undefined) {
  return useQuery({
    queryKey: ["guilds-for-topic", topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guild_topics")
        .select("guild_id, guilds(id, name, description, logo_url, is_approved, is_draft)")
        .eq("topic_id", topicId!);
      if (error) throw error;
      return (data || []).map(gt => gt.guilds).filter(Boolean);
    },
    enabled: !!topicId,
  });
}

// ─── Profile by user ID ─────────────────────────────────────
export function usePublicProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["public-profile", userId],
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

// ─── Availability rules ─────────────────────────────────────
export function useAvailabilityRules(providerUserId: string | undefined, serviceId?: string) {
  return useQuery({
    queryKey: ["availability-rules", providerUserId, serviceId],
    queryFn: async () => {
      let query = supabase
        .from("availability_rules")
        .select("*")
        .eq("provider_user_id", providerUserId!)
        .eq("is_active", true);
      if (serviceId) {
        query = query.or(`service_id.eq.${serviceId},service_id.is.null`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!providerUserId,
  });
}

// ─── Availability exceptions ─────────────────────────────────
export function useAvailabilityExceptions(providerUserId: string | undefined) {
  return useQuery({
    queryKey: ["availability-exceptions", providerUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("availability_exceptions")
        .select("*")
        .eq("provider_user_id", providerUserId!);
      if (error) throw error;
      return data;
    },
    enabled: !!providerUserId,
  });
}

// ─── Bookings for provider ───────────────────────────────────
export function useBookingsForProvider(providerUserId: string | undefined) {
  return useQuery({
    queryKey: ["bookings-for-provider", providerUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("provider_user_id", providerUserId!)
        .eq("is_deleted", false);
      if (error) throw error;
      return data;
    },
    enabled: !!providerUserId,
  });
}

// ─── User achievements ──────────────────────────────────────
export function useUserAchievements(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-achievements", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achievements")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

// ─── User guild memberships ─────────────────────────────────
export function useUserGuildMemberships(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-guild-memberships", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guild_members")
        .select("*, guilds(id, name, logo_url)")
        .eq("user_id", userId!);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

// ─── User quest participations ──────────────────────────────
export function useUserQuestParticipations(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-quest-participations", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quest_participants")
        .select("*, quests(id, title, reward_xp, status, company_id)")
        .eq("user_id", userId!);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

// ─── User pod memberships ───────────────────────────────────
export function useUserPodMemberships(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-pod-memberships", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pod_members")
        .select("*, pods(id, name, type)")
        .eq("user_id", userId!);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

// ─── User services ──────────────────────────────────────────
export function useUserServices(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-services", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("provider_user_id", userId!)
        .eq("is_deleted", false);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

// ─── User topics & territories ──────────────────────────────
export function useUserTopics(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-topics", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_topics")
        .select("*, topics(id, name, slug)")
        .eq("user_id", userId!);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useUserTerritories(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-territories", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_territories")
        .select("*, territories(id, name)")
        .eq("user_id", userId!);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

// ─── My bookings ─────────────────────────────────────────────
export function useMyBookings(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-bookings", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, services(id, title, duration_minutes, price_amount, price_currency)")
        .or(`requester_id.eq.${userId},provider_user_id.eq.${userId}`)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

// ─── My drafts ───────────────────────────────────────────────
export function useMyDrafts(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-drafts", userId],
    queryFn: async () => {
      if (!userId) return { quests: [], guilds: [], pods: [], services: [] };
      const [questsRes, guildsRes, podsRes, servicesRes] = await Promise.all([
        supabase.from("quests").select("id, title, description").eq("created_by_user_id", userId).eq("is_draft", true).eq("is_deleted", false),
        supabase.from("guilds").select("id, name, description").eq("created_by_user_id", userId).eq("is_draft", true).eq("is_deleted", false),
        supabase.from("pods").select("id, name, description").eq("creator_id", userId).eq("is_draft", true).eq("is_deleted", false),
        supabase.from("services").select("id, title, description").eq("provider_user_id", userId).eq("is_draft", true).eq("is_deleted", false),
      ]);
      return {
        quests: questsRes.data || [],
        guilds: guildsRes.data || [],
        pods: podsRes.data || [],
        services: servicesRes.data || [],
      };
    },
    enabled: !!userId,
  });
}

// ─── Social links from profiles ─────────────────────────────
export function useProfileSocialLinks(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile-social-links", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("website_url, twitter_url, linkedin_url, instagram_url")
        .eq("user_id", userId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

// ─── Guild members with profiles ─────────────────────────────
export function useGuildMembersWithProfiles(guildId: string | undefined) {
  return useQuery({
    queryKey: ["guild-members-profiles", guildId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guild_members")
        .select("*")
        .eq("guild_id", guildId!);
      if (error) throw error;
      const userIds = data.map(m => m.user_id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles_public")
          .select("user_id, name, avatar_url")
          .in("user_id", userIds);
        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
        return data.map(m => ({ ...m, user: profileMap.get(m.user_id) }));
      }
      return data;
    },
    enabled: !!guildId,
  });
}

// ─── All companies ───────────────────────────────────────────
export function useAllCompanies() {
  return useQuery({
    queryKey: ["all-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("is_deleted", false)
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

// ─── Booking by ID ───────────────────────────────────────────
export function useBookingById(id: string | undefined) {
  return useQuery({
    queryKey: ["booking", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, services(id, title, description, duration_minutes, price_amount, price_currency, online_location_type)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

// ─── Update booking status mutation ──────────────────────────
export function useUpdateBookingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: string }) => {
      const { error } = await supabase
        .from("bookings")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-bookings"] });
      qc.invalidateQueries({ queryKey: ["booking"] });
      qc.invalidateQueries({ queryKey: ["bookings-for-provider"] });
      qc.invalidateQueries({ queryKey: ["bookings-for-company"] });
    },
  });
}

// ─── My course enrollments ───────────────────────────────────
export function useMyEnrollments(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-enrollments", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_enrollments")
        .select("*, courses(id, title, description, cover_image_url, is_free, price_amount, level, owner_user_id, owner_type)")
        .eq("user_id", userId!);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

// ─── Courses I created / own ─────────────────────────────────
export function useMyCourses(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-created-courses", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*, lessons(id)")
        .eq("owner_user_id", userId!)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

// ─── Availability mutations ──────────────────────────────────
export function useCreateAvailabilityRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      provider_user_id: string; weekday: number; start_time: string;
      end_time: string; timezone?: string; service_id?: string;
    }) => {
      const { data, error } = await supabase
        .from("availability_rules")
        .insert({
          provider_user_id: input.provider_user_id,
          weekday: input.weekday,
          start_time: input.start_time,
          end_time: input.end_time,
          timezone: input.timezone || "Europe/Paris",
          service_id: input.service_id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["availability-rules"] }),
  });
}

export function useUpdateAvailabilityRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; weekday?: number; start_time?: string; end_time?: string; is_active?: boolean }) => {
      const { error } = await supabase
        .from("availability_rules")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["availability-rules"] }),
  });
}

export function useDeleteAvailabilityRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("availability_rules")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["availability-rules"] }),
  });
}

export function useCreateAvailabilityException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      provider_user_id: string; date: string; is_available: boolean;
      start_time?: string; end_time?: string;
    }) => {
      const { data, error } = await supabase
        .from("availability_exceptions")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["availability-exceptions"] }),
  });
}

export function useUpdateAvailabilityException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; date?: string; is_available?: boolean; start_time?: string; end_time?: string }) => {
      const { error } = await supabase
        .from("availability_exceptions")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["availability-exceptions"] }),
  });
}

export function useDeleteAvailabilityException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("availability_exceptions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["availability-exceptions"] }),
  });
}

// ─── Update guild mutation ───────────────────────────────────
export function useUpdateGuild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; description?: string; type?: "COLLECTIVE" | "GUILD" | "NETWORK"; logo_url?: string; banner_url?: string }) => {
      const { error } = await supabase
        .from("guilds")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["guild", vars.id] });
      qc.invalidateQueries({ queryKey: ["guilds"] });
    },
  });
}

// ─── Guild topic/territory mutations ─────────────────────────
export function useSetGuildTopics() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ guildId, topicIds }: { guildId: string; topicIds: string[] }) => {
      await supabase.from("guild_topics").delete().eq("guild_id", guildId);
      if (topicIds.length > 0) {
        const { error } = await supabase.from("guild_topics").insert(
          topicIds.map(topic_id => ({ guild_id: guildId, topic_id }))
        );
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["guild", vars.guildId] }),
  });
}

export function useSetGuildTerritories() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ guildId, territoryIds }: { guildId: string; territoryIds: string[] }) => {
      await supabase.from("guild_territories").delete().eq("guild_id", guildId);
      if (territoryIds.length > 0) {
        const { error } = await supabase.from("guild_territories").insert(
          territoryIds.map(territory_id => ({ guild_id: guildId, territory_id }))
        );
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["guild", vars.guildId] }),
  });
}

// ─── Guild member mutations ──────────────────────────────────
export function useAddGuildMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ guildId, userId, role }: { guildId: string; userId: string; role: string }) => {
      const { data, error } = await supabase
        .from("guild_members")
        .insert({ guild_id: guildId, user_id: userId, role: role as any })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["guild-members-profiles", vars.guildId] });
      qc.invalidateQueries({ queryKey: ["guild", vars.guildId] });
    },
  });
}

export function useUpdateGuildMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      const { error } = await supabase
        .from("guild_members")
        .update({ role: role as any })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["guild-members-profiles"] }),
  });
}

export function useRemoveGuildMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("guild_members")
        .delete()
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guild-members-profiles"] });
      qc.invalidateQueries({ queryKey: ["guild"] });
    },
  });
}

// ─── All profiles (for admin) ────────────────────────────────
export function useAllProfiles() {
  return useQuery({
    queryKey: ["all-profiles-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles_public")
        .select("user_id, name, avatar_url, email")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}
