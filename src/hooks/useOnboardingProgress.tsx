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
      const [topics, guilds, quests, services, bookings] = await Promise.all([
        supabase.from("user_topics").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("guild_members").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("quest_participants").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("services").select("id", { count: "exact", head: true }).eq("provider_user_id", userId),
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("requester_id", userId),
      ]);
      return {
        hasTopics: (topics.count ?? 0) > 0,
        hasGuild: (guilds.count ?? 0) > 0,
        hasQuest: (quests.count ?? 0) > 0,
        hasService: (services.count ?? 0) > 0,
        hasBooking: (bookings.count ?? 0) > 0,
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
  };

  const steps = useMemo(
    () => [
      { key: "completedProfile" as const, label: "Complete your profile", description: "Add a bio and headline", link: "/me/settings?tab=profile" },
      { key: "selectedHouses" as const, label: "Select your Houses", description: "Pick topics you care about", link: "/explore?tab=topics" },
      { key: "joinedGuild" as const, label: "Join a Guild", description: "Find your community", link: "/explore?tab=guilds" },
      { key: "followedQuests" as const, label: "Follow a Quest", description: "Stay updated on projects", link: "/explore?tab=quests" },
      { key: "createdService" as const, label: "Create a Service", description: "Offer your skills", link: "/work" },
      { key: "bookedSession" as const, label: "Book a Session", description: "Connect with someone", link: "/explore?tab=services" },
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
