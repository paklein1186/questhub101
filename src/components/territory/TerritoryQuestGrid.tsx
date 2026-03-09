/**
 * TerritoryQuestGrid.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Combined grid showing:
 *  - Active quests (filterable by nature: idea / achievement / ongoing / mission)
 *  - Community entities (guilds, pods, companies)
 *  - Natural entities (natural systems)
 * Shown on the main portal tab above the tabbed area.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Compass, Shield, CircleDot, Building2, Leaf, TreePine,
  Users, Search, Plus, Zap, Target, Lightbulb, Layers,
  Star,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/* ── Types ── */
interface TerritoryQuestGridProps {
  territoryId: string;
  territoryName: string;
  canCreateQuest?: boolean;
}

interface QuestItem {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  quest_nature?: string | null;
  reward_xp?: number | null;
  participant_count?: number;
}

interface EntityItem {
  id: string;
  name: string;
  description?: string | null;
  avatar_url?: string | null;
  type: "guild" | "pod" | "company" | "natural_system";
}

/* ── Hooks ── */
function useTerritoryQuestsAndEntities(territoryId: string) {
  return useQuery({
    queryKey: ["territory-portal-grid", territoryId],
    queryFn: async () => {
      const { getAllTerritoryIds } = await import("@/lib/territoryIds");
      const ids = await getAllTerritoryIds(territoryId);

      const [questsRes, guildsRes, podsRes, companiesRes, nsRes, nsLinksRes] = await Promise.all([
        (supabase
          .from("quest_territories" as any)
          .select("quest_id, is_hidden, quests(id, title, description, status, quest_nature, reward_xp)") as any)
          .in("territory_id", ids)
          .eq("is_hidden", false)
          .limit(50),

        supabase
          .from("guild_territories")
          .select("guild_id, guilds(id, name, description, avatar_url)")
          .in("territory_id", ids)
          .limit(20),

        (supabase
          .from("pod_territories" as any)
          .select("pod_id, pods(id, name, description)") as any)
          .in("territory_id", ids)
          .limit(20),

        supabase
          .from("company_territories")
          .select("company_id, companies(id, name, description, logo_url)")
          .in("territory_id", ids)
          .limit(20),

        (supabase
          .from("natural_system_territories" as any)
          .select("natural_system_id, natural_systems(id, name, system_type, kingdom)") as any)
          .in("territory_id", ids)
          .limit(20),

        // Also check natural_system_links (used by bioregion creation)
        (supabase
          .from("natural_system_links" as any)
          .select("natural_system_id, natural_systems(id, name, system_type, kingdom)") as any)
          .in("linked_id", ids)
          .eq("linked_type", "territory")
          .limit(20),
      ]);

      // Deduplicate quests by id
      const questSeen = new Set<string>();
      const quests: QuestItem[] = (questsRes.data ?? [])
        .map((r: any) => r.quests)
        .filter(Boolean)
        .filter((q: any) => {
          if (questSeen.has(q.id)) return false;
          questSeen.add(q.id);
          return ["ACTIVE", "PUBLISHED", "OPEN", "OPEN_FOR_PROPOSALS", "DRAFT", "IDEA", "COMPLETED"].includes(q.status);
        });

      // Combine natural systems from both tables, dedup
      const nsSeen = new Set<string>();
      const allNs = [
        ...(nsRes.data ?? []).map((r: any) => r.natural_systems).filter(Boolean),
        ...(nsLinksRes.data ?? []).map((r: any) => r.natural_systems).filter(Boolean),
      ].filter((ns: any) => {
        if (nsSeen.has(ns.id)) return false;
        nsSeen.add(ns.id);
        return true;
      });

      // Deduplicate entities by id
      const entitySeen = new Set<string>();
      const entities: EntityItem[] = [
        ...(guildsRes.data ?? []).map((r: any) => ({
          ...r.guilds,
          type: "guild" as const,
          avatar_url: r.guilds?.avatar_url,
        })).filter(Boolean),
        ...(podsRes.data ?? []).map((r: any) => ({
          ...r.pods,
          type: "pod" as const,
        })).filter(Boolean),
        ...(companiesRes.data ?? []).map((r: any) => ({
          ...r.companies,
          type: "company" as const,
          avatar_url: r.companies?.logo_url,
        })).filter(Boolean),
        ...allNs.map((ns: any) => ({
          ...ns,
          type: "natural_system" as const,
        })),
      ].filter((e: any) => {
        if (!e || !e.id || entitySeen.has(e.id)) return false;
        entitySeen.add(e.id);
        return true;
      });

      return { quests, entities };
    },
    enabled: !!territoryId,
    staleTime: 60_000,
  });
}

/* ── Quest nature config ── */
const QUEST_NATURE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  IDEA: { label: "Idea", icon: Lightbulb, color: "text-yellow-500" },
  ACHIEVEMENT: { label: "Achievement", icon: Star, color: "text-violet-500" },
  ONGOING_PROJECT: { label: "Project", icon: Layers, color: "text-blue-500" },
  MISSION: { label: "Mission", icon: Target, color: "text-red-500" },
};

/* ── Entity type config ── */
const ENTITY_CONFIG: Record<string, { icon: React.ElementType; color: string; prefix: string; label: string }> = {
  guild: { icon: Shield, color: "text-amber-500", prefix: "/guilds", label: "Guild" },
  pod: { icon: CircleDot, color: "text-blue-500", prefix: "/pods", label: "Pod" },
  company: { icon: Building2, color: "text-slate-500", prefix: "/companies", label: "Org" },
  natural_system: { icon: TreePine, color: "text-green-500", prefix: "/natural-systems", label: "Nature" },
};

const QUEST_NATURE_FILTERS = ["all", "IDEA", "ACHIEVEMENT", "ONGOING_PROJECT", "MISSION"] as const;

/* ── Quest card ── */
function QuestCard({ quest }: { quest: QuestItem }) {
  const cfg = quest.quest_nature ? QUEST_NATURE_CONFIG[quest.quest_nature] : null;
  const Icon = cfg?.icon ?? Compass;

  return (
    <Link to={`/quests/${quest.id}`}>
      <Card className="group hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer h-full">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start gap-2">
            <div className={cn("mt-0.5 shrink-0", cfg?.color ?? "text-primary")}>
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
              {quest.title}
            </p>
          </div>
          {quest.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{quest.description}</p>
          )}
          <div className="flex items-center gap-2 pt-1">
            {cfg && (
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", cfg.color)}>
                {cfg.label}
              </Badge>
            )}
            {quest.reward_xp && quest.reward_xp > 0 && (
              <span className="ml-auto flex items-center gap-0.5 text-[10px] text-amber-500 font-medium">
                <Zap className="h-3 w-3" /> {quest.reward_xp} XP
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/* ── Entity chip ── */
function EntityChip({ entity }: { entity: EntityItem }) {
  const cfg = ENTITY_CONFIG[entity.type];
  const Icon = cfg.icon;

  return (
    <Link to={`${cfg.prefix}/${entity.id}`}>
      <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-muted/50 transition-all group cursor-pointer">
        {entity.avatar_url ? (
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarImage src={entity.avatar_url} />
            <AvatarFallback className="text-[10px]">{entity.name?.charAt(0)}</AvatarFallback>
          </Avatar>
        ) : (
          <div className={cn("h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0", cfg.color)}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {entity.name}
          </p>
          <p className="text-[10px] text-muted-foreground">{cfg.label}</p>
        </div>
      </div>
    </Link>
  );
}

/* ── Main component ── */
export function TerritoryQuestGrid({
  territoryId,
  territoryName,
  canCreateQuest = false,
}: TerritoryQuestGridProps) {
  const { data, isLoading } = useTerritoryQuestsAndEntities(territoryId);
  const [questFilter, setQuestFilter] = useState<string>("all");
  const [entitySearch, setEntitySearch] = useState("");

  const filteredQuests = (data?.quests ?? []).filter(
    q => questFilter === "all" || q.quest_nature === questFilter
  );

  const filteredEntities = (data?.entities ?? []).filter(e =>
    !entitySearch || e.name?.toLowerCase().includes(entitySearch.toLowerCase())
  );

  const communityEntities = filteredEntities.filter(e => e.type !== "natural_system");
  const naturalEntities = filteredEntities.filter(e => e.type === "natural_system");

  return (
    <div className="space-y-8">
      {/* ── Active Quests ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Quests</h2>
            <Badge variant="secondary" className="text-[10px]">
              {filteredQuests.length}
            </Badge>
          </div>
          {canCreateQuest && (
            <Link to={`/quests/create?territory=${territoryId}`}>
              <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs">
                <Plus className="h-3.5 w-3.5" /> New Quest
              </Button>
            </Link>
          )}
        </div>

        {/* Nature filter pills */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {QUEST_NATURE_FILTERS.map(f => {
            const cfg = f !== "all" ? QUEST_NATURE_CONFIG[f] : null;
            const count = f === "all"
              ? (data?.quests ?? []).length
              : (data?.quests ?? []).filter(q => q.quest_nature === f).length;
            return (
              <button
                key={f}
                onClick={() => setQuestFilter(f)}
                className={cn(
                  "inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-all",
                  questFilter === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                )}
              >
                {cfg && <cfg.icon className="h-3 w-3" />}
                {f === "all" ? "All" : cfg?.label}
                {count > 0 && (
                  <span className={cn("ml-0.5", questFilter === f ? "opacity-70" : "opacity-50")}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filteredQuests.length === 0 ? (
          <div className="text-center py-10 rounded-xl border border-dashed border-border">
            <Compass className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No quests in {territoryName} yet.</p>
            {canCreateQuest && (
              <Link to={`/quests/create?territory=${territoryId}`}>
                <Button size="sm" variant="outline" className="mt-3 gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Create the first quest
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredQuests.map(q => (
              <QuestCard key={q.id} quest={q} />
            ))}
          </div>
        )}
      </section>

      {/* ── Community Entities ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-foreground">Community</h2>
            <Badge variant="secondary" className="text-[10px]">{communityEntities.length}</Badge>
          </div>
          <div className="relative w-36">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={entitySearch}
              onChange={e => setEntitySearch(e.target.value)}
              className="pl-7 h-7 text-xs"
            />
          </div>
        </div>

        {communityEntities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No guilds, pods or organizations yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {communityEntities.map(e => (
              <EntityChip key={`${e.type}-${e.id}`} entity={e} />
            ))}
          </div>
        )}
      </section>

      {/* ── Natural Entities ── */}
      {naturalEntities.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Leaf className="h-4 w-4 text-green-500" />
            <h2 className="text-sm font-semibold text-foreground">Natural Systems</h2>
            <Badge variant="secondary" className="text-[10px]">{naturalEntities.length}</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {naturalEntities.map(e => (
              <EntityChip key={`ns-${e.id}`} entity={e} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
