import { Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { usePiPanel } from "@/hooks/usePiPanel";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export function PiFloatingButton() {
  const { session } = useAuth();
  const { togglePiPanel, isOpen } = usePiPanel();
  const { t } = useTranslation();

  const { data: creditsBalance } = useQuery({
    queryKey: ["pi-credits-balance", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("credits_balance")
        .eq("user_id", session!.user.id)
        .maybeSingle();
      return (data as any)?.credits_balance ?? 0;
    },
    refetchInterval: 60_000,
  });

  if (!session) return null;

  return (
    <button
      onClick={togglePiPanel}
      className={cn(
        "fixed bottom-16 left-4 z-50 flex flex-col items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-110",
        isOpen
          ? "w-10 h-10 bg-primary text-primary-foreground"
          : "w-10 h-10 bg-primary/90 text-primary-foreground hover:bg-primary"
      )}
      aria-label={t("pi.openPi")}
      title={t("pi.piTitle")}
    >
      <Sparkles className="h-4 w-4" />
      {creditsBalance != null && !isOpen && (
        <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent text-accent-foreground px-1 text-[9px] font-bold shadow-sm">
          {creditsBalance > 999 ? "999+" : creditsBalance}
        </span>
      )}
    </button>
  );
}
