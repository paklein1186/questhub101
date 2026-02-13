import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePersona } from "@/hooks/usePersona";
import { expandTopicIds, defaultUniverseForPersona, type UniverseMode } from "@/lib/universeMapping";

/**
 * Central hook for global House-based filtering with Universe awareness.
 */
export function useHouseFilter() {
  const currentUser = useCurrentUser();
  const userId = currentUser.id;
  const { persona } = usePersona();

  // Universe mode — defaults based on persona
  const [universeMode, setUniverseMode] = useState<UniverseMode | null>(null);
  const effectiveUniverse: UniverseMode = universeMode ?? defaultUniverseForPersona(persona);

  // Fetch user's topics and filter preference
  const { data, isLoading } = useQuery({
    queryKey: ["house-filter-data", userId],
    queryFn: async () => {
      if (!userId) return { topicIds: [] as string[], topicNames: {} as Record<string, string>, topicUniverseTypes: {} as Record<string, string>, enabled: false };

      const [topicsRes, profileRes] = await Promise.all([
        supabase.from("user_topics").select("topic_id, topics(id, name, universe_type)").eq("user_id", userId),
        supabase.from("profiles").select("filter_by_houses").eq("user_id", userId).single(),
      ]);

      const topicIds = (topicsRes.data ?? []).map((r: any) => r.topic_id);
      const topicNames: Record<string, string> = {};
      const topicUniverseTypes: Record<string, string> = {};
      (topicsRes.data ?? []).forEach((r: any) => {
        if (r.topics) {
          topicNames[r.topic_id] = r.topics.name;
          topicUniverseTypes[r.topic_id] = r.topics.universe_type ?? "impact";
        }
      });

      return {
        topicIds,
        topicNames,
        topicUniverseTypes,
        enabled: (profileRes.data as any)?.filter_by_houses ?? false,
      };
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  // Fetch all topics for cross-mapping expansion
  const { data: allTopics = [] } = useQuery({
    queryKey: ["all-topics-for-mapping"],
    queryFn: async () => {
      const { data } = await supabase.from("topics").select("id, name, slug");
      return (data ?? []) as { id: string; name: string; slug?: string }[];
    },
    staleTime: 300_000,
  });

  const myTopicIds = data?.topicIds ?? [];
  const topicNames = data?.topicNames ?? {};
  const topicUniverseTypes = data?.topicUniverseTypes ?? {};
  const houseFilterEnabled = data?.enabled ?? false;

  // Derived: does user have at least one creative House?
  const hasCreativeHouse = useMemo(() => {
    return myTopicIds.some(id => topicUniverseTypes[id] === "creative");
  }, [myTopicIds, topicUniverseTypes]);

  // Persona-driven default: auto-enable for creative/impact/hybrid, disable for neutral/unset
  const personaDefault = useMemo(() => {
    if (persona === "CREATIVE" || persona === "IMPACT" || persona === "HYBRID") return true;
    return false;
  }, [persona]);

  // Runtime toggle
  const [overrideActive, setOverrideActive] = useState<boolean | null>(null);

  const houseFilterActive = useMemo(() => {
    if (overrideActive !== null) return overrideActive;
    return (personaDefault || houseFilterEnabled) && myTopicIds.length > 0;
  }, [overrideActive, personaDefault, houseFilterEnabled, myTopicIds.length]);

  const setHouseFilterActive = useCallback((val: boolean) => {
    setOverrideActive(val);
  }, []);

  /**
   * Expanded topic IDs — includes cross-mapped topics from the other universe.
   * This prevents empty results when a Creative user has only creative houses.
   */
  const expandedTopicIds = useMemo(() => {
    if (!houseFilterActive || myTopicIds.length === 0) return myTopicIds;
    return expandTopicIds(myTopicIds, allTopics, effectiveUniverse);
  }, [houseFilterActive, myTopicIds, allTopics, effectiveUniverse]);

  /**
   * Generic helper: given an array of items and a function that extracts
   * an item's topic IDs, returns only items matching user's topics (expanded).
   * Also filters by universe_visibility when the getter is provided.
   */
  const applyHouseFilter = useCallback(
    <T,>(
      items: T[],
      getTopicIds: (item: T) => string[],
      getUniverseVisibility?: (item: T) => string,
    ): T[] => {
      let filtered = items;

      // Filter by universe visibility if getter provided and not "both" mode
      if (getUniverseVisibility && effectiveUniverse !== "both") {
        filtered = filtered.filter((item) => {
          const vis = getUniverseVisibility(item);
          return vis === "both" || vis === effectiveUniverse;
        });
      }

      // Filter by expanded topics
      if (!houseFilterActive || expandedTopicIds.length === 0) return filtered;
      const mySet = new Set(expandedTopicIds);
      return filtered.filter((item) => {
        const itemTopics = getTopicIds(item);
        if (itemTopics.length === 0) return false;
        return itemTopics.some((id) => mySet.has(id));
      });
    },
    [houseFilterActive, expandedTopicIds, effectiveUniverse],
  );

  return {
    myTopicIds,
    expandedTopicIds,
    topicNames,
    topicUniverseTypes,
    houseFilterEnabled,
    houseFilterActive,
    setHouseFilterActive,
    isLoading,
    applyHouseFilter,
    hasHouses: myTopicIds.length > 0,
    hasCreativeHouse,
    universeMode: effectiveUniverse,
    setUniverseMode,
  };
}
