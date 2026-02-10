import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export function useBlock(targetUserId: string) {
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: blockRecord } = useQuery({
    queryKey: ["user-block", currentUser.id, targetUserId],
    enabled: !!currentUser.id && !!targetUserId,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_blocks")
        .select("id")
        .eq("blocker_id", currentUser.id)
        .eq("blocked_id", targetUserId)
        .maybeSingle();
      return data;
    },
  });

  const isBlocked = !!blockRecord;

  const toggle = useCallback(async () => {
    if (!currentUser.id) return;
    if (isBlocked) {
      await supabase.from("user_blocks").delete().eq("blocker_id", currentUser.id).eq("blocked_id", targetUserId);
      toast({ title: "User unblocked" });
    } else {
      await supabase.from("user_blocks").insert({ blocker_id: currentUser.id, blocked_id: targetUserId });
      toast({ title: "User blocked", description: "They won't be able to interact with your content." });
    }
    qc.invalidateQueries({ queryKey: ["user-block", currentUser.id, targetUserId] });
  }, [isBlocked, currentUser.id, targetUserId, toast, qc]);

  return { isBlocked, toggle };
}
