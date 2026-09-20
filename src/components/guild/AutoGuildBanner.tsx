import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ReportButton } from "@/components/ReportButton";
import { ReportTargetType } from "@/types/enums";
import { toast } from "sonner";

interface Props {
  guild: { id: string; auto_created_by_agent_id?: string | null; claimed_at?: string | null };
  isLoggedIn: boolean;
}

/** Shown on a guild created automatically by an external agent until someone claims it. */
export function AutoGuildBanner({ guild, isLoggedIn }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [claiming, setClaiming] = useState(false);
  const isAuto = !!guild.auto_created_by_agent_id && !guild.claimed_at;

  const { data: agent } = useQuery({
    queryKey: ["auto-guild-agent", guild.auto_created_by_agent_id],
    enabled: isAuto,
    queryFn: async () => {
      const { data } = await supabase.from("agents").select("name").eq("id", guild.auto_created_by_agent_id!).maybeSingle();
      return data;
    },
  });

  if (!isAuto) return null;

  const claim = async () => {
    setClaiming(true);
    const { error } = await supabase.rpc("claim_auto_guild" as any, { p_guild_id: guild.id } as any);
    setClaiming(false);
    if (error) { toast.error(t("autoGuild.claimFailed")); return; }
    toast.success(t("autoGuild.claimed"));
    qc.invalidateQueries({ queryKey: ["guild", guild.id] });
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700/50 p-3">
      <Bot className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
      <p className="flex-1 min-w-[220px] text-sm text-amber-900 dark:text-amber-200">
        {t("autoGuild.notice", { agent: agent?.name ?? t("autoGuild.anAgent") })}
      </p>
      {isLoggedIn ? (
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={claim} disabled={claiming}>{t("autoGuild.claim")}</Button>
          <ReportButton targetType={ReportTargetType.GUILD} targetId={guild.id} variant="inline" />
        </div>
      ) : (
        <Button size="sm" asChild><Link to="/login">{t("autoGuild.loginToClaim")}</Link></Button>
      )}
    </div>
  );
}
