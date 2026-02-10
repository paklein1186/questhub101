import { useState, useCallback, useMemo } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { OnboardingProgress } from "@/types/models";
import {
  userTopics, guildMembers, questParticipants, services, bookings,
} from "@/data/mock";

function computeProgress(userId: string): OnboardingProgress {
  const hasTopics = userTopics.some((ut) => ut.userId === userId);
  const hasGuild = guildMembers.some((gm) => gm.userId === userId);
  const hasQuestFollow = questParticipants.some((qp) => qp.userId === userId);
  const hasService = services.some((s) => s.providerUserId === userId);
  const hasBooking = bookings.some((b) => b.requesterId === userId);

  // Profile is "complete" if bio and headline exist on the mock user
  const user = (await_users()).find((u) => u.id === userId);
  const completedProfile = !!(user?.bio && user?.headline);

  return {
    userId,
    completedProfile,
    selectedHouses: hasTopics,
    joinedGuild: hasGuild,
    followedQuests: hasQuestFollow,
    createdService: hasService,
    bookedSession: hasBooking,
  };
}

// Lazy import to avoid circular
function await_users() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require("@/data/mock").users as import("@/types").User[];
}

export function useOnboardingProgress() {
  const currentUser = useCurrentUser();
  const [progress, setProgress] = useState<OnboardingProgress>(() =>
    computeProgress(currentUser.id),
  );

  const steps = useMemo(
    () => [
      { key: "completedProfile" as const, label: "Complete your profile", description: "Add a bio and headline", link: "/profile/edit" },
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
    setProgress(computeProgress(currentUser.id));
  }, [currentUser.id]);

  return { progress, steps, completedCount, totalSteps, percentage, isComplete, refresh };
}
