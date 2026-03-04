import { Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { usePiPanel } from "@/hooks/usePiPanel";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/**
 * Compute lightweight nudge count based on user onboarding progress.
 */
function useNudgeCount(userId: string | undefined) {
  return useQuery({
    queryKey: ["pi-nudges", userId],
    enabled: !!userId,
    refetchInterval: 5 * 60_000,
    staleTime: 2 * 60_000,
    queryFn: async () => {
      if (!userId) return 0;
      let nudges = 0;

      const { count: guildCount } = await supabase
        .from("guild_members")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      if (!guildCount || guildCount === 0) nudges++;

      const { count: questCreated } = await supabase
        .from("quests")
        .select("id", { count: "exact", head: true })
        .eq("created_by_user_id", userId);
      if (!questCreated || questCreated === 0) nudges++;

      const { data: profile } = await supabase
        .from("profiles")
        .select("bio, avatar_url")
        .eq("user_id", userId)
        .maybeSingle();
      if (!profile?.bio || profile.bio.trim().length < 20) nudges++;
      if (!profile?.avatar_url) nudges++;

      return nudges;
    },
  });
}

/**
 * Poll for pending pi_triggers to show notification badge.
 */
function usePendingTriggerCount(userId: string | undefined) {
  return useQuery({
    queryKey: ["pi-triggers-pending", userId],
    enabled: !!userId,
    refetchInterval: 60_000, // every minute
    staleTime: 30_000,
    queryFn: async () => {
      if (!userId) return 0;
      const { count } = await supabase
        .from("pi_triggers" as any)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "pending");
      return count || 0;
    },
  });
}

export function PiFloatingButton() {
  const { session } = useAuth();
  const { togglePiPanel, isOpen } = usePiPanel();
  const { t } = useTranslation();

  const { data: nudgeCount } = useNudgeCount(session?.user?.id);
  const { data: triggerCount } = usePendingTriggerCount(session?.user?.id);

  if (!session) return null;

  const badgeCount = (nudgeCount ?? 0) + (triggerCount ?? 0);

  return (
    <button
      onClick={togglePiPanel}
      className={cn(
        "fixed bottom-16 z-50 flex flex-col items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-110",
        isOpen
          ? "w-10 h-10 bg-primary text-primary-foreground"
          : "w-10 h-10 bg-primary/90 text-primary-foreground hover:bg-primary"
      )}
      style={{ left: isOpen ? `${16}px` : '16px' }}
      aria-label={t("pi.openPi")}
      title={t("pi.piTitle")}
    >
      <Sparkles className="h-4 w-4" />
      {badgeCount > 0 && !isOpen && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground px-1 text-[9px] font-bold shadow-sm animate-in fade-in zoom-in">
          {badgeCount}
        </span>
      )}
    </button>
  );
}
