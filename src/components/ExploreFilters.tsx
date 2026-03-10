import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SlidersHorizontal, X, Hash, MapPin, CheckSquare, Square, Navigation, Home, Sparkles, ArrowUpDown, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useTopics, useTerritories } from "@/hooks/useSupabaseData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePersona } from "@/hooks/usePersona";
import { QuestStatus, MonetizationType, CourseLevel, PodType, GuildType } from "@/types/enums";
import { QuestNature } from "@/types/enums";
import { QUEST_NATURE_LABELS } from "@/lib/questTypes";
import { UniverseToggle } from "@/components/UniverseToggle";
import { type UniverseMode, defaultUniverseForPersona, HOUSE_DEFINITIONS, getHouseLabel, getHouseIcon } from "@/lib/universeMapping";

// ─── Sort options ───────────────────────────────────────────
export type ExploreSortBy = "most_recent" | "creation_date" | "most_active";

export const SORT_LABEL_KEYS: Record<ExploreSortBy, string> = {
  most_recent: "filters.sortMostRecent",
  creation_date: "filters.sortCreationDate",
  most_active: "filters.sortMostActive",
};

/** Generic sort utility — works with any object that has updated_at and created_at */
export function applySortBy<T extends Record<string, any>>(items: T[], sortBy: ExploreSortBy): T[] {
  const sorted = [...items];
  switch (sortBy) {
    case "most_recent":
      return sorted.sort((a, b) => new Date(b.updated_at ?? b.created_at ?? 0).getTime() - new Date(a.updated_at ?? a.created_at ?? 0).getTime());
    case "creation_date":
      return sorted.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
    case "most_active":
      return sorted.sort((a, b) => {
        const aActivity = (a.guild_members?.length ?? a.company_members?.length ?? a.pod_members?.length ?? a.upvote_count ?? 0);
        const bActivity = (b.guild_members?.length ?? b.company_members?.length ?? b.pod_members?.length ?? b.upvote_count ?? 0);
        if (bActivity !== aActivity) return bActivity - aActivity;
        return new Date(b.updated_at ?? b.created_at ?? 0).getTime() - new Date(a.updated_at ?? a.created_at ?? 0).getTime();
      });
    default:
      return sorted;
  }
}

// ─── Filter shape ───────────────────────────────────────────
export interface ExploreFilterValues {
  topicIds: string[];
  territoryIds: string[];
  status: string;
  monetization: string;
  level: string;
  podType: string;
  guildType: string;
  price: string;
  role: string;
  sortBy: ExploreSortBy;
  questType: string;
  missionOnly: boolean;
  hasBudget: boolean;
  hasCoins: boolean;
  hasCtg: boolean;
  isFundraising: boolean;
  hasOcu: boolean;
}

export const defaultFilters: ExploreFilterValues = {
  topicIds: [],
  territoryIds: [],
  status: "all",
  monetization: "all",
  level: "all",
  podType: "all",
  guildType: "all",
  price: "all",
  role: "all",
  sortBy: "most_recent",
  questType: "all",
  missionOnly: false,
  hasBudget: false,
  hasCoins: false,
  hasCtg: false,
  isFundraising: false,
  hasOcu: false,
};

// Which filter sections to show per page
export interface ExploreFilterConfig {
  showTopics?: boolean;
  showTerritories?: boolean;
  showStatus?: boolean;
  showMonetization?: boolean;
  showLevel?: boolean;
  showPodType?: boolean;
  showGuildType?: boolean;
  showPrice?: boolean;
  showRole?: boolean;
  showQuestType?: boolean;
  showMission?: boolean;
  showHasBudget?: boolean;
  showContributionOpportunity?: boolean;
  showOcu?: boolean;
}

interface Props {
  filters: ExploreFilterValues;
  onChange: (filters: ExploreFilterValues) => void;
  config: ExploreFilterConfig;
  /** Topic filter state — when provided, shows "My Topics only" toggle */
  houseFilter?: {
    active: boolean;
    onToggle: (val: boolean) => void;
    hasHouses: boolean;
    topicNames: Record<string, string>;
    myTopicIds: string[];
  };
  /** Universe toggle */
  universeMode?: UniverseMode;
  onUniverseModeChange?: (mode: UniverseMode) => void;
}

const ROLE_LABEL_KEYS: Record<string, string> = {
  GAMECHANGER: "filters.gamechanger",
  ECOSYSTEM_BUILDER: "filters.ecosystemBuilder",
  BOTH: "filters.both",
};

export function ExploreFilters({ filters, onChange, config, houseFilter, universeMode, onUniverseModeChange }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { data: topics } = useTopics();
  const { data: territories } = useTerritories();
  const { persona } = usePersona();
  const effectiveUniverse: UniverseMode = universeMode ?? defaultUniverseForPersona(persona);

  /** Get universe-aware label for a topic */
  const getTopicDisplayLabel = (topic: { id: string; name: string; slug?: string }) => {
    const slug = (topic as any).slug;
    if (slug && HOUSE_DEFINITIONS[slug]) {
      return getHouseLabel(slug, effectiveUniverse);
    }
    return topic.name;
  };

  const getTopicDisplayIcon = (topic: { id: string; name: string; slug?: string }) => {
    const slug = (topic as any).slug;
    if (slug && HOUSE_DEFINITIONS[slug]) {
      return getHouseIcon(slug);
    }
    return null;
  };
  const currentUser = useCurrentUser();

  // Fetch user's territory IDs for "My territories" quick filter
  const { data: myTerritoryIds = [] } = useQuery({
    queryKey: ["my-territory-ids", currentUser.id],
    queryFn: async () => {
      if (!currentUser.id) return [];
      const { data } = await supabase
        .from("user_territories")
        .select("territory_id")
        .eq("user_id", currentUser.id);
      return (data ?? []).map(d => d.territory_id);
    },
    enabled: !!currentUser.id && !!config.showTerritories,
  });

  const set = (patch: Partial<ExploreFilterValues>) => onChange({ ...filters, ...patch });

  const toggleTopic = (id: string) => {
    const next = filters.topicIds.includes(id)
      ? filters.topicIds.filter(t => t !== id)
      : [...filters.topicIds, id];
    set({ topicIds: next });
  };

  const toggleTerritory = (id: string) => {
    const next = filters.territoryIds.includes(id)
      ? filters.territoryIds.filter(t => t !== id)
      : [...filters.territoryIds, id];
    set({ territoryIds: next });
  };

  const selectAllTerritories = () => set({ territoryIds: (territories ?? []).map(t => t.id) });
  const deselectAllTerritories = () => set({ territoryIds: [] });

  const activeCount =
    filters.topicIds.length +
    filters.territoryIds.length +
    (filters.status !== "all" ? 1 : 0) +
    (filters.monetization !== "all" ? 1 : 0) +
    (filters.level !== "all" ? 1 : 0) +
    (filters.podType !== "all" ? 1 : 0) +
    (filters.guildType !== "all" ? 1 : 0) +
    (filters.price !== "all" ? 1 : 0) +
    (filters.role !== "all" ? 1 : 0) +
    (filters.questType !== "all" ? 1 : 0) +
    (filters.missionOnly ? 1 : 0) +
    (filters.hasBudget ? 1 : 0);

  const clearAll = () => onChange({ ...defaultFilters });

  return (
    <div className="space-y-3">
      {/* Universe toggle + toggle bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Universe toggle */}
        {onUniverseModeChange && universeMode && (
          <UniverseToggle value={universeMode} onChange={onUniverseModeChange} />
        )}

        {/* House filter toggle */}
        {houseFilter && houseFilter.hasHouses && (
          <Button
            variant={houseFilter.active ? "default" : "outline"}
            size="sm"
            onClick={() => houseFilter.onToggle(!houseFilter.active)}
            className="text-xs gap-1.5"
          >
            <Home className="h-3.5 w-3.5" />
            {t("filters.myTopicsOnly")}
          </Button>
        )}
        {houseFilter && houseFilter.active && !houseFilter.hasHouses && (
          <Badge variant="secondary" className="text-xs py-1 px-2">
            {t("filters.noTopicsSelected")} <a href="/settings?tab=persona" className="underline ml-1">{t("filters.addSome")}</a>
          </Badge>
        )}

        {/* Sort dropdown */}
        <Select value={filters.sortBy} onValueChange={v => set({ sortBy: v as ExploreSortBy })}>
          <SelectTrigger className="w-auto h-8 text-xs gap-1.5 border-border">
            <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(SORT_LABEL_KEYS) as [ExploreSortBy, string][]).map(([key, tKey]) => (
              <SelectItem key={key} value={key} className="text-xs">{t(tKey)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(!open)}
          className={open ? "bg-muted" : ""}
        >
          <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
          {t("filters.filters")}
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4">{activeCount}</Badge>
          )}
        </Button>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={clearAll}>
            {t("filters.clearAll")}
          </Button>
        )}
      </div>

      {/* Active house chips */}
      {houseFilter && houseFilter.active && houseFilter.myTopicIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground mr-1">{t("filters.showing")}</span>
          {houseFilter.myTopicIds.slice(0, 5).map((id) => (
            <Badge key={id} variant="secondary" className="text-[10px] gap-1">
              <Home className="h-2.5 w-2.5" />{houseFilter.topicNames[id] || id}
            </Badge>
          ))}
          {houseFilter.myTopicIds.length > 5 && (
            <span className="text-[10px] text-muted-foreground">{t("filters.more", { count: houseFilter.myTopicIds.length - 5 })}</span>
          )}
          <Button variant="ghost" size="sm" className="text-[10px] h-5 px-2" onClick={() => houseFilter.onToggle(false)}>
            {t("filters.showAll")}
          </Button>
        </div>
      )}

      {/* Collapsible panel */}
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleContent className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Dropdowns */}
            {config.showStatus && (
              <div>
                <p className="text-xs font-medium mb-1.5 text-muted-foreground">{t("filters.status")}</p>
                <Select value={filters.status} onValueChange={v => set({ status: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("filters.allStatuses")}</SelectItem>
                    {Object.values(QuestStatus).map(s => (
                      <SelectItem key={s} value={s}>{s.toLowerCase().replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {config.showQuestType && (
              <div>
                <p className="text-xs font-medium mb-1.5 text-muted-foreground">Nature</p>
                <Select value={filters.questType} onValueChange={v => set({ questType: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("filters.allTypes")}</SelectItem>
                    {(Object.values(QuestNature) as QuestNature[]).map(n => (
                      <SelectItem key={n} value={n}>{QUEST_NATURE_LABELS[n]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {config.showMission && (
              <div className="flex items-center gap-3 pt-5">
                <input type="checkbox" id="missionOnly"
                  checked={filters.missionOnly}
                  onChange={e => set({ missionOnly: e.target.checked })}
                  className="h-4 w-4 rounded border-border" />
                <label htmlFor="missionOnly"
                  className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                  💰 Missions only
                  <span className="text-xs text-muted-foreground font-normal">(funded quests)</span>
                </label>
              </div>
            )}

            {config.showHasBudget && (
              <div className="flex items-center gap-3 pt-5">
                <input type="checkbox" id="hasBudget"
                  checked={filters.hasBudget}
                  onChange={e => set({ hasBudget: e.target.checked })}
                  className="h-4 w-4 rounded border-border" />
                <label htmlFor="hasBudget"
                  className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                  🎁 Has budget / reward
                  <span className="text-xs text-muted-foreground font-normal">(credits, $CTG, or fiat)</span>
                </label>
              </div>
            )}

            {config.showMonetization && (
              <div>
                <p className="text-xs font-medium mb-1.5 text-muted-foreground">{t("filters.monetization")}</p>
                <Select value={filters.monetization} onValueChange={v => set({ monetization: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("filters.allTypes")}</SelectItem>
                    {Object.values(MonetizationType).map(m => (
                      <SelectItem key={m} value={m}>{m.toLowerCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {config.showLevel && (
              <div>
                <p className="text-xs font-medium mb-1.5 text-muted-foreground">{t("filters.level")}</p>
                <Select value={filters.level} onValueChange={v => set({ level: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("filters.allLevels")}</SelectItem>
                    {Object.values(CourseLevel).map(l => (
                      <SelectItem key={l} value={l}>{l.charAt(0) + l.slice(1).toLowerCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {config.showPodType && (
              <div>
                <p className="text-xs font-medium mb-1.5 text-muted-foreground">{t("filters.podType")}</p>
                <Select value={filters.podType} onValueChange={v => set({ podType: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("filters.allTypes")}</SelectItem>
                    <SelectItem value={PodType.QUEST_POD}>{t("filters.questPod")}</SelectItem>
                    <SelectItem value={PodType.STUDY_POD}>{t("filters.studyPod")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {config.showGuildType && (
              <div>
                <p className="text-xs font-medium mb-1.5 text-muted-foreground">{t("filters.guildType")}</p>
                <Select value={filters.guildType} onValueChange={v => set({ guildType: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("filters.allTypes")}</SelectItem>
                    {Object.values(GuildType).map(g => (
                      <SelectItem key={g} value={g}>{g.charAt(0) + g.slice(1).toLowerCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {config.showPrice && (
              <div>
                <p className="text-xs font-medium mb-1.5 text-muted-foreground">{t("filters.price")}</p>
                <Select value={filters.price} onValueChange={v => set({ price: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("filters.all")}</SelectItem>
                    <SelectItem value="free">{t("filters.free")}</SelectItem>
                    <SelectItem value="paid">{t("filters.paid")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {config.showRole && (
              <div>
                <p className="text-xs font-medium mb-1.5 text-muted-foreground">{t("filters.role")}</p>
                <Select value={filters.role} onValueChange={v => set({ role: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("filters.allRoles")}</SelectItem>
                    {Object.entries(ROLE_LABEL_KEYS).map(([k, tKey]) => (
                      <SelectItem key={k} value={k}>{t(tKey)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Topics multi-select — universe-aware */}
          {config.showTopics && (() => {
            const allTopicsList = topics ?? [];
            const impactTopics = allTopicsList.filter((t: any) => ((t as any).universe_type ?? "impact") === "impact");
            const creativeHouses = allTopicsList.filter((t: any) => (t as any).universe_type === "creative");
            const showImpact = effectiveUniverse === "impact" || effectiveUniverse === "both";
            const showCreative = effectiveUniverse === "creative" || effectiveUniverse === "both";
            return (
              <div className="space-y-3">
                {showCreative && creativeHouses.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> {t("filters.houses")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {creativeHouses.map(t => {
                        const icon = getTopicDisplayIcon(t);
                        const label = getTopicDisplayLabel(t);
                        return (
                          <Badge
                            key={t.id}
                            variant={filters.topicIds.includes(t.id) ? "default" : "outline"}
                            className="cursor-pointer text-xs gap-1"
                            onClick={() => toggleTopic(t.id)}
                          >
                            {icon && <span>{icon}</span>}
                            {label}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
                {showImpact && impactTopics.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Hash className="h-3 w-3" /> {t("filters.topics")}
                      </p>
                      {filters.topicIds.length > 0 && (
                        <Button variant="ghost" size="sm" className="h-5 text-[10px] px-2" onClick={() => set({ topicIds: [] })}>
                          {t("filters.clear")}
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {impactTopics.map(t => {
                        const icon = getTopicDisplayIcon(t);
                        const label = getTopicDisplayLabel(t);
                        return (
                          <Badge
                            key={t.id}
                            variant={filters.topicIds.includes(t.id) ? "default" : "outline"}
                            className="cursor-pointer text-xs gap-1"
                            onClick={() => toggleTopic(t.id)}
                          >
                            {icon && <span>{icon}</span>}
                            {label}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Territories multi-select */}
          {config.showTerritories && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {t("filters.territories")}
                </p>
                <div className="flex gap-1">
                  {myTerritoryIds.length > 0 && (
                    <Button
                      variant={filters.territoryIds.length > 0 && myTerritoryIds.every(id => filters.territoryIds.includes(id)) ? "default" : "outline"}
                      size="sm"
                      className="h-5 text-[10px] px-2"
                      onClick={() => set({ territoryIds: myTerritoryIds })}
                    >
                      <Navigation className="h-3 w-3 mr-0.5" /> {t("filters.myTerritories")}
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-5 text-[10px] px-2" onClick={selectAllTerritories}>
                    <CheckSquare className="h-3 w-3 mr-0.5" /> {t("filters.all")}
                  </Button>
                  {filters.territoryIds.length > 0 && (
                    <Button variant="ghost" size="sm" className="h-5 text-[10px] px-2" onClick={deselectAllTerritories}>
                      <Square className="h-3 w-3 mr-0.5" /> {t("filters.none")}
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(territories ?? []).map(t => (
                  <Badge
                    key={t.id}
                    variant={filters.territoryIds.includes(t.id) ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleTerritory(t.id)}
                  >
                    {t.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Active filter chips */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground mr-1">{t("filters.active")}</span>
          {filters.topicIds.map(id => {
            const t = (topics ?? []).find(x => x.id === id);
            if (!t) return null;
            const icon = getTopicDisplayIcon(t);
            const label = getTopicDisplayLabel(t);
            return (
              <Badge key={id} variant="secondary" className="text-[10px] gap-1">
                {icon ? <span>{icon}</span> : <Hash className="h-2.5 w-2.5" />}{label}
                <button onClick={() => toggleTopic(id)} className="ml-0.5"><X className="h-2.5 w-2.5" /></button>
              </Badge>
            );
          })}
          {filters.territoryIds.map(id => {
            const t = (territories ?? []).find(x => x.id === id);
            return t ? (
              <Badge key={id} variant="secondary" className="text-[10px] gap-1">
                <MapPin className="h-2.5 w-2.5" />{t.name}
                <button onClick={() => toggleTerritory(id)} className="ml-0.5"><X className="h-2.5 w-2.5" /></button>
              </Badge>
            ) : null;
          })}
          {filters.status !== "all" && (
            <Badge variant="secondary" className="text-[10px]">
              {filters.status.toLowerCase().replace(/_/g, " ")}
              <button onClick={() => set({ status: "all" })} className="ml-1"><X className="h-2.5 w-2.5" /></button>
            </Badge>
          )}
          {filters.monetization !== "all" && (
            <Badge variant="secondary" className="text-[10px]">
              {filters.monetization.toLowerCase()}
              <button onClick={() => set({ monetization: "all" })} className="ml-1"><X className="h-2.5 w-2.5" /></button>
            </Badge>
          )}
          {filters.level !== "all" && (
            <Badge variant="secondary" className="text-[10px]">
              {filters.level.toLowerCase()}
              <button onClick={() => set({ level: "all" })} className="ml-1"><X className="h-2.5 w-2.5" /></button>
            </Badge>
          )}
          {filters.podType !== "all" && (
            <Badge variant="secondary" className="text-[10px]">
              {filters.podType.replace(/_/g, " ").toLowerCase()}
              <button onClick={() => set({ podType: "all" })} className="ml-1"><X className="h-2.5 w-2.5" /></button>
            </Badge>
          )}
          {filters.guildType !== "all" && (
            <Badge variant="secondary" className="text-[10px]">
              {filters.guildType.toLowerCase()}
              <button onClick={() => set({ guildType: "all" })} className="ml-1"><X className="h-2.5 w-2.5" /></button>
            </Badge>
          )}
          {filters.price !== "all" && (
            <Badge variant="secondary" className="text-[10px]">
              {filters.price}
              <button onClick={() => set({ price: "all" })} className="ml-1"><X className="h-2.5 w-2.5" /></button>
            </Badge>
          )}
          {filters.role !== "all" && (
            <Badge variant="secondary" className="text-[10px]">
              {t(ROLE_LABEL_KEYS[filters.role] ?? filters.role)}
              <button onClick={() => set({ role: "all" })} className="ml-1"><X className="h-2.5 w-2.5" /></button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
