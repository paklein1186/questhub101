import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Bot, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentSourceBadge } from "@/components/agent/AgentSourceBadge";

const AGENT_COLS = "id, name, description, category, agent_source, health_status";

type UnitKind = "guild" | "pod" | "quest";

interface UnitAccess {
  agent: any;
  unitType: UnitKind;
  unitId: string;
  unitName: string;
}

const UNIT_HREF: Record<UnitKind, (id: string) => string> = {
  guild: (id) => `/guilds/${id}?tab=ai`,
  pod: (id) => `/pods/${id}`,
  quest: (id) => `/quests/${id}`,
};

function useAgentAccess(userId: string) {
  return useQuery({
    queryKey: ["profile-agent-access", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [hires, guilds, pods, quests] = await Promise.all([
        supabase
          .from("agent_hires")
          .select(`id, agent_id, agents(${AGENT_COLS})`)
          .eq("user_id", userId)
          .eq("status", "active"),
        supabase.from("guild_members").select("guild_id, guilds(id, name)").eq("user_id", userId),
        supabase.from("pod_members").select("pod_id, pods(id, name)").eq("user_id", userId),
        supabase.from("quest_participants").select("quest_id, status, quests(id, title)").eq("user_id", userId),
      ]);

      const units: { unitType: UnitKind; unitId: string; unitName: string }[] = [
        ...((guilds.data ?? []) as any[]).filter((m) => m.guilds).map((m) => ({ unitType: "guild" as const, unitId: m.guild_id, unitName: m.guilds.name })),
        ...((pods.data ?? []) as any[]).filter((m) => m.pods).map((m) => ({ unitType: "pod" as const, unitId: m.pod_id, unitName: m.pods.name })),
        ...((quests.data ?? []) as any[])
          .filter((m) => m.quests && (m.status ?? "active").toLowerCase() === "active")
          .map((m) => ({ unitType: "quest" as const, unitId: m.quest_id, unitName: m.quests.title })),
      ];

      const access: UnitAccess[] = [];
      for (const kind of ["guild", "pod", "quest"] as UnitKind[]) {
        const ids = units.filter((u) => u.unitType === kind).map((u) => u.unitId);
        if (ids.length === 0) continue;
        const { data } = await supabase
          .from("unit_agents" as any)
          .select(`agent_id, unit_type, unit_id, agents(${AGENT_COLS})`)
          .eq("unit_type", kind)
          .in("unit_id", ids)
          .eq("is_active", true);
        for (const row of (data ?? []) as any[]) {
          if (!row.agents) continue;
          const unit = units.find((u) => u.unitType === kind && u.unitId === row.unit_id);
          access.push({ agent: row.agents, unitType: kind, unitId: row.unit_id, unitName: unit?.unitName ?? "" });
        }
      }

      return {
        hired: ((hires.data ?? []) as any[]).filter((h) => h.agents).map((h) => h.agents),
        viaUnits: access,
      };
    },
  });
}

function AgentRow({ agent, children }: { agent: any; children?: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-sm">{agent.name}</h4>
            {agent.category && <Badge variant="outline" className="text-[10px]">{agent.category}</Badge>}
            <AgentSourceBadge agentSource={agent.agent_source} healthStatus={agent.health_status} />
          </div>
          {agent.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{agent.description}</p>
          )}
          {children}
        </div>
      </div>
    </Card>
  );
}

export function ProfileAgentsTab({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const { data, isLoading } = useAgentAccess(userId);

  if (isLoading) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {[0, 1].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  const hired = data?.hired ?? [];
  const viaUnits = data?.viaUnits ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground max-w-xl">{t("profileAgents.intro")}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild><Link to="/agents">{t("profileAgents.browse")}</Link></Button>
          <Button variant="outline" size="sm" asChild><Link to="/my-agents">{t("profileAgents.manage")}</Link></Button>
        </div>
      </div>

      <section className="space-y-3">
        <h3 className="font-display font-semibold">{t("profileAgents.hiredTitle")}</h3>
        {hired.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("profileAgents.hiredEmpty")}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {hired.map((agent: any) => <AgentRow key={agent.id} agent={agent} />)}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="font-display font-semibold">{t("profileAgents.viaUnitsTitle")}</h3>
        {viaUnits.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("profileAgents.viaUnitsEmpty")}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {viaUnits.map((a) => (
              <AgentRow key={`${a.agent.id}-${a.unitType}-${a.unitId}`} agent={a.agent}>
                <Link
                  to={UNIT_HREF[a.unitType](a.unitId)}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                >
                  {t(`profileAgents.via.${a.unitType}`, { name: a.unitName })} <ArrowRight className="h-3 w-3" />
                </Link>
              </AgentRow>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
