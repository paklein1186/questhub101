import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePersona } from "@/hooks/usePersona";

/**
 * Central hook for global House-based filtering.
 *
 * Returns:
 *  - myTopicIds: the user's selected topic/house IDs
 *  - houseFilterEnabled: whether the DB preference is on
 *  - houseFilterActive: current runtime toggle (can be overridden per session)
 *  - setHouseFilterActive: toggle override
 *  - topicNames: map of id→name for display
 *  - isLoading
 *  - applyHouseFilter: helper to filter an array of items by topic match
 */
export function useHouseFilter() {
  const currentUser = useCurrentUser();
  const userId = currentUser.id;
  const { persona } = usePersona();

  // Fetch user's topics and filter preference
  const { data, isLoading } = useQuery({
    queryKey: ["house-filter-data", userId],
    queryFn: async () => {
      if (!userId) return { topicIds: [] as string[], topicNames: {} as Record<string, string>, enabled: false };

      const [topicsRes, profileRes] = await Promise.all([
        supabase.from("user_topics").select("topic_id, topics(id, name)").eq("user_id", userId),
        supabase.from("profiles").select("filter_by_houses").eq("user_id", userId).single(),
      ]);

      const topicIds = (topicsRes.data ?? []).map((r: any) => r.topic_id);
      const topicNames: Record<string, string> = {};
      (topicsRes.data ?? []).forEach((r: any) => {
        if (r.topics) topicNames[r.topic_id] = r.topics.name;
      });

      return {
        topicIds,
        topicNames,
        enabled: (profileRes.data as any)?.filter_by_houses ?? false,
      };
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  const myTopicIds = data?.topicIds ?? [];
  const topicNames = data?.topicNames ?? {};
  const houseFilterEnabled = data?.enabled ?? false;

  // Persona-driven default: auto-enable for creative/impact/hybrid, disable for neutral/unset
  const personaDefault = useMemo(() => {
    if (persona === "CREATIVE" || persona === "IMPACT" || persona === "HYBRID") return true;
    return false; // UNSET / neutral
  }, [persona]);

  // Runtime toggle — defaults to persona-driven preference, but user can override in-session
  const [overrideActive, setOverrideActive] = useState<boolean | null>(null);

  const houseFilterActive = useMemo(() => {
    if (overrideActive !== null) return overrideActive;
    // Auto-enable if persona says so OR DB pref is on, AND user has topics
    return (personaDefault || houseFilterEnabled) && myTopicIds.length > 0;
  }, [overrideActive, personaDefault, houseFilterEnabled, myTopicIds.length]);

  const setHouseFilterActive = useCallback((val: boolean) => {
    setOverrideActive(val);
  }, []);

  /**
   * Generic helper: given an array of items and a function that extracts
   * an item's topic IDs, returns only items matching user's topics.
   * Items with no topics are excluded in strict mode (houseFilterActive=true).
   */
  const applyHouseFilter = useCallback(
    <T,>(items: T[], getTopicIds: (item: T) => string[]): T[] => {
      if (!houseFilterActive || myTopicIds.length === 0) return items;
      const mySet = new Set(myTopicIds);
      return items.filter((item) => {
        const itemTopics = getTopicIds(item);
        if (itemTopics.length === 0) return false; // strict mode: exclude untagged
        return itemTopics.some((id) => mySet.has(id));
      });
    },
    [houseFilterActive, myTopicIds],
  );

  return {
    myTopicIds,
    topicNames,
    houseFilterEnabled,
    houseFilterActive,
    setHouseFilterActive,
    isLoading,
    applyHouseFilter,
    hasHouses: myTopicIds.length > 0,
  };
}
