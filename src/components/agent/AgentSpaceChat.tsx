import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UnitAgentChat, useOwnerFree } from "@/components/UnitAgentsTab";

export interface AgentSpace { unitType: "guild" | "pod" | "quest"; unitId: string; unitName: string; unitFree: boolean }

/**
 * Spaces (guilds, pods, quests) the user belongs to where this agent is attached: being a member of one is
 * enough to use the agent, with no separate hire. Quests also inherit the agents of their guild.
 */
export function useAgentSpaces(agentId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ["agent-spaces", agentId, userId],
    enabled: !!agentId && !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<AgentSpace[]> => {
      const [guilds, pods, quests, attached] = await Promise.all([
        supabase.from("guild_members").select("guild_id, role, guilds(id, name)").eq("user_id", userId!),
        supabase.from("pod_members").select("pod_id, role, pods(id, name)").eq("user_id", userId!),
        supabase.from("quest_participants").select("quest_id, status, quests(id, title, guild_id)").eq("user_id", userId!),
        supabase.from("unit_agents" as any).select("unit_type, unit_id, free_for, admitted_by_user_id, agents(creator_user_id, owner_type, owner_id)").eq("agent_id", agentId!).eq("is_active", true),
      ]);
      const rows = (attached.data ?? []) as any[];
      const find = (type: string, id: string) => rows.find((r) => r.unit_type === type && r.unit_id === id);
      const isFree = (row: any, role: string | null) => {
        if (!row || !row.free_for || row.free_for === "nobody") return false;
        const a = row.agents ?? {};
        const owned = row.admitted_by_user_id === a.creator_user_id || (a.owner_type === row.unit_type && a.owner_id === row.unit_id);
        if (!owned) return false;
        return row.free_for === "members" || (row.free_for === "admins" && ["ADMIN", "OWNER", "HOST"].includes(String(role ?? "").toUpperCase()));
      };

      const spaces: AgentSpace[] = [];
      for (const m of (guilds.data ?? []) as any[]) {
        const row = find("guild", m.guild_id);
        if (row && m.guilds) spaces.push({ unitType: "guild", unitId: m.guild_id, unitName: m.guilds.name, unitFree: isFree(row, m.role) });
      }
      for (const m of (pods.data ?? []) as any[]) {
        const row = find("pod", m.pod_id);
        if (row && m.pods) spaces.push({ unitType: "pod", unitId: m.pod_id, unitName: m.pods.name, unitFree: isFree(row, m.role) });
      }
      for (const m of (quests.data ?? []) as any[]) {
        if (!m.quests || (m.status ?? "active").toLowerCase() !== "active") continue;
        const own = find("quest", m.quest_id);
        const inherited = m.quests.guild_id ? find("guild", m.quests.guild_id) : null;
        const row = own ?? inherited;
        if (row) spaces.push({ unitType: "quest", unitId: m.quest_id, unitName: m.quests.title, unitFree: isFree(row, null) });
      }
      return spaces;
    },
  });
}

/** Chat with the agent through one of the user's spaces, on the agent's own page. */
export function AgentSpaceChat({ agent, spaces, userId }: { agent: any; spaces: AgentSpace[]; userId: string }) {
  const { t } = useTranslation();
  const [key, setKey] = useState(`${spaces[0].unitType}:${spaces[0].unitId}`);
  useEffect(() => {
    if (!spaces.some((s) => `${s.unitType}:${s.unitId}` === key)) setKey(`${spaces[0].unitType}:${spaces[0].unitId}`);
  }, [spaces, key]);
  const space = spaces.find((s) => `${s.unitType}:${s.unitId}` === key) ?? spaces[0];
  const ownerFree = useOwnerFree(agent, userId);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap text-sm">
        <span className="text-muted-foreground">{t("agentAccess.usingIn")}</span>
        {spaces.length > 1 ? (
          <Select value={key} onValueChange={setKey}>
            <SelectTrigger className="h-8 w-auto gap-1 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {spaces.map((s) => (
                <SelectItem key={`${s.unitType}:${s.unitId}`} value={`${s.unitType}:${s.unitId}`}>{t(`agentAccess.unit.${s.unitType}`)} · {s.unitName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="secondary">{t(`agentAccess.unit.${space.unitType}`)} · {space.unitName}</Badge>
        )}
        <span className="text-xs text-muted-foreground">{t("agentAccess.noHire")}</span>
      </div>
      <UnitAgentChat
        key={key}
        agent={agent}
        unitType={space.unitType}
        unitId={space.unitId}
        unitName={space.unitName}
        freeForMe={ownerFree || space.unitFree}
      />
    </div>
  );
}
