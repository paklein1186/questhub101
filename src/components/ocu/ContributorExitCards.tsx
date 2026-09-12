import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Badge } from "@/components/ui/badge";
import { DoorOpen, HandshakeIcon } from "lucide-react";
import { CurrencyIcon } from "@/components/CurrencyIcon";
import { Link } from "react-router-dom";

const LEAVER_COLORS: Record<string, string> = {
  good: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  graceful: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  bad: "bg-destructive/10 text-destructive border-destructive/30",
};

export function ContributorExitCards() {
  const { t } = useTranslation();
  const currentUser = useCurrentUser();

  const { data: exits = [] } = useQuery({
    queryKey: ["my-exits", currentUser?.id],
    enabled: !!currentUser?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("contributor_exits" as any)
        .select("*")
        .eq("user_id", currentUser!.id)
        .order("exited_at", { ascending: false });

      if (!data || data.length === 0) return [];

      // Fetch quest titles
      const questIds = [...new Set((data as any[]).map(e => e.quest_id))];
      const { data: quests } = await supabase.from("quests").select("id, title").in("id", questIds);
      const questMap = new Map((quests ?? []).map(q => [q.id, q.title]));

      return (data as any[]).map(e => ({ ...e, quest_title: questMap.get(e.quest_id) ?? t("exitCards.unknown") }));
    },
  });

  if (!currentUser?.id || exits.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-display font-semibold text-sm flex items-center gap-1.5">
        <DoorOpen className="h-4 w-4" /> {t("exitCards.pastExits")}
      </h3>

      <div className="space-y-2">
        {exits.map((exit: any) => {
          const leaverColor = LEAVER_COLORS[exit.leaver_class] ?? LEAVER_COLORS.good;
          const leaverLabel = t(`exitCards.leaverClass.${exit.leaver_class}`, { defaultValue: t("exitCards.leaverClass.good") });
          return (
            <div key={exit.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Link to={`/quests/${exit.quest_id}`} className="font-medium text-sm text-primary hover:underline">
                  {exit.quest_title}
                </Link>
                <Badge variant="outline" className="text-[10px]">
                  {t("exitCards.exitedOn", { date: new Date(exit.exited_at).toLocaleDateString() })}
                </Badge>
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs">
                <Badge variant="outline" className={`text-[10px] ${leaverColor}`}>{leaverLabel}</Badge>
                <span className="text-muted-foreground">{t(`exitCards.exitTypes.${exit.exit_type}`, { defaultValue: exit.exit_type })}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">{t("exitCards.fmvEarned")}</span>
                  <p className="font-medium text-primary">🟩 {Number(exit.fmv_at_exit).toFixed(0)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("exitCards.settlement")}</span>
                  <p className="font-medium">🟩 {Number(exit.settlement_amount).toFixed(0)} ({exit.settlement_pct}%)</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("exitCards.status")}</span>
                  <p className="font-medium">
                    {exit.settlement_status === "paid" && <span className="text-emerald-600">{t("exitCards.paid")}</span>}
                    {exit.settlement_status === "pending" && <span className="text-amber-600">{t("exitCards.pending")}</span>}
                    {exit.settlement_status === "waived" && <span className="text-muted-foreground">{t("exitCards.waived")}</span>}
                  </p>
                </div>
              </div>

              {exit.settlement_status === "pending" && (
                <p className="text-[10px] text-muted-foreground">
                  {t("exitCards.awaitingDistribution")}
                </p>
              )}

              {exit.handover_committed && exit.handover_note && (
                <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <HandshakeIcon className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>{t("exitCards.handoverLabel", { note: exit.handover_note })}</span>
                </div>
              )}

              <p className="text-[10px] text-muted-foreground italic">
                {t("exitCards.xpRetainedNote")}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
