import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";

/**
 * Hook to manage user-customizable tab ordering for a given view.
 * Falls back to defaultOrder when no preference is saved.
 */
export function useTabOrder(viewKey: string, defaultOrder: string[]) {
  const currentUser = useCurrentUser();
  const qc = useQueryClient();
  const userId = currentUser.id;

  const { data: savedOrder } = useQuery({
    queryKey: ["tab-order", viewKey, userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from("user_tab_preferences" as any)
        .select("tab_order")
        .eq("user_id", userId)
        .eq("view_key", viewKey)
        .maybeSingle();
      return (data as any)?.tab_order as string[] | null;
    },
    enabled: !!userId,
    staleTime: 300_000,
  });

  // Merge saved order with default: saved tabs first (if still valid), then any new tabs
  const orderedTabs = useMemo(() => {
    if (!savedOrder || savedOrder.length === 0) return defaultOrder;
    const validSaved = savedOrder.filter((t) => defaultOrder.includes(t));
    const remaining = defaultOrder.filter((t) => !validSaved.includes(t));
    return [...validSaved, ...remaining];
  }, [savedOrder, defaultOrder]);

  const saveMutation = useMutation({
    mutationFn: async (newOrder: string[]) => {
      if (!userId) return;
      await supabase
        .from("user_tab_preferences" as any)
        .upsert(
          { user_id: userId, view_key: viewKey, tab_order: newOrder } as any,
          { onConflict: "user_id,view_key" }
        );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tab-order", viewKey, userId] });
    },
  });

  const saveOrder = useCallback(
    (newOrder: string[]) => {
      saveMutation.mutate(newOrder);
    },
    [saveMutation]
  );

  const resetOrder = useCallback(() => {
    if (!userId) return;
    supabase
      .from("user_tab_preferences" as any)
      .delete()
      .eq("user_id", userId)
      .eq("view_key", viewKey)
      .then(() => {
        qc.invalidateQueries({ queryKey: ["tab-order", viewKey, userId] });
      });
  }, [userId, viewKey, qc]);

  return {
    orderedTabs,
    saveOrder,
    resetOrder,
    isCustomized: !!savedOrder && savedOrder.length > 0,
  };
}
