import { useCallback, useMemo } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { OnboardingProgress } from "@/types/models";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export function useOnboardingProgress() {
  const currentUser = useCurrentUser();
  const userId = currentUser.id;

  const { data: profile } = useQuery({
    queryKey: ["onboarding-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("bio, headline").eq("user_id", userId).maybeSingle();
      return data;
    },
  });

  const { data: counts } = useQuery({
    queryKey: ["onboarding-counts", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [topics, guilds, quests, services, bookings, pods, territories, events, languages] = await Promise.all([
        supabase.from("user_topics").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("guild_members").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("quests").select("id", { count: "exact", head: true }).eq("created_by_user_id", userId).eq("is_deleted", false),
        supabase.from("services").select("id", { count: "exact", head: true }).eq("provider_user_id", userId).eq("is_deleted", false),
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("requester_id", userId).eq("is_deleted", false),
        supabase.from("pod_members").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("territory_memory").select("id", { count: "exact", head: true }).eq("created_by_user_id", userId),
        supabase.from("guild_event_attendees").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("user_spoken_languages").select("id", { count: "exact", head: true }).eq("user_id", userId),
      ]);
      return {
        hasTopics: (topics.count ?? 0) > 0,
        hasGuild: (guilds.count ?? 0) > 0,
        hasQuest: (quests.count ?? 0) > 0,
        hasService: (services.count ?? 0) > 0,
        hasBooking: (bookings.count ?? 0) > 0,
        hasPod: (pods.count ?? 0) > 0,
        hasTerritory: (territories.count ?? 0) > 0,
        hasEvent: (events.count ?? 0) > 0,
        hasLanguages: (languages.count ?? 0) > 0,
      };
    },
  });

  const progress: OnboardingProgress = {
    userId,
    completedProfile: !!(profile?.bio && profile?.headline),
    selectedHouses: counts?.hasTopics ?? false,
    joinedGuild: counts?.hasGuild ?? false,
    followedQuests: counts?.hasQuest ?? false,
    createdService: counts?.hasService ?? false,
    bookedSession: counts?.hasBooking ?? false,
    joinedPod: counts?.hasPod ?? false,
    contributedTerritory: counts?.hasTerritory ?? false,
    attendedEvent: counts?.hasEvent ?? false,
    addedLanguages: counts?.hasLanguages ?? false,
    enrichedProfile: !!(profile?.bio && profile.bio.length > 100 && profile?.headline),
  };

  // Only show steps that are NOT already covered by the onboarding wizard
  // The wizard already handles: profile (photo/bio/headline/location), languages, and topics/houses
  const steps = useMemo(
    () => [
      { key: "joinedGuild" as const, label: "Join a Guild", description: "Find your community (+30 XP)", link: "/explore?tab=guilds" },
      { key: "followedQuests" as const, label: "Create your first Quest", description: "Launch a project (+50 Platform Credits)", link: "/quests/new" },
      { key: "createdService" as const, label: "Publish a Service", description: "Offer your skills (+15 XP)", link: "/services/new" },
      { key: "joinedPod" as const, label: "Collaborate in a Pod", description: "Join or create a pod (+20 XP)", link: "/explore?tab=pods" },
      { key: "contributedTerritory" as const, label: "Contribute to a Territory", description: "Add a memory entry (+40 XP)", link: "/explore/territories" },
      { key: "attendedEvent" as const, label: "Attend an Event", description: "Register for a guild event (+20 Platform Credits)", link: "/calendar" },
      { key: "bookedSession" as const, label: "Book a Session", description: "Connect with someone", link: "/explore?tab=services" },
      { key: "enrichedProfile" as const, label: "Enrich your profile with AI", description: "Let Pulse analyze your resume or LinkedIn (+25 XP)", link: "/profile/enrich" },
    ],
    [],
  );

  const completedCount = steps.filter((s) => progress[s.key]).length;
  const totalSteps = steps.length;
  const percentage = Math.round((completedCount / totalSteps) * 100);
  const isComplete = completedCount === totalSteps;

  const refresh = useCallback(() => {
    // React Query handles refetching; this is a no-op for backward compat
  }, []);

  return { progress, steps, completedCount, totalSteps, percentage, isComplete, refresh };
}
