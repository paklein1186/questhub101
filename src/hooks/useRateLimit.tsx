import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type RateLimitAction = "comment" | "direct_message" | "quest_creation" | "pod_creation";

/**
 * Hook to check rate limits before performing an action.
 * Returns { checkRateLimit, isChecking }.
 * checkRateLimit returns true if allowed, false if rate-limited.
 */
export function useRateLimit() {
  const [isChecking, setIsChecking] = useState(false);

  const checkRateLimit = async (action: RateLimitAction): Promise<boolean> => {
    setIsChecking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return true; // skip for unauthenticated (guards handle separately)

      const res = await supabase.functions.invoke("check-rate-limit", {
        body: { action },
      });

      if (res.error || res.data?.allowed === false) {
        toast({
          title: "Slow down",
          description: res.data?.message ?? "You're doing too much too fast. Please slow down.",
          variant: "destructive",
        });
        return false;
      }

      return true;
    } catch {
      // On network failure, allow the action (fail open for UX)
      return true;
    } finally {
      setIsChecking(false);
    }
  };

  return { checkRateLimit, isChecking };
}
