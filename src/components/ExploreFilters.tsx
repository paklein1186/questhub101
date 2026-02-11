import { useState } from "react";
import { SlidersHorizontal, X, Hash, MapPin, CheckSquare, Square, Navigation, Home } from "lucide-react";
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
import { QuestStatus, MonetizationType, CourseLevel, PodType, GuildType } from "@/types/enums";
import { UniverseToggle } from "@/components/UniverseToggle";
import type { UniverseMode } from "@/lib/universeMapping";

// ─── Filter shape ───────────────────────────────────────────
export interface ExploreFilterValues {
  topicIds: string[];
  territoryIds: string[];
  status: string;        // "all" | QuestStatus values
  monetization: string;  // "all" | "FREE" | "PAID" | "MIXED"
  level: string;         // "all" | CourseLevel values
  podType: string;       // "all" | PodType values
  guildType: string;     // "all" | GuildType values
  price: string;         // "all" | "free" | "paid"
  role: string;          // "all" | user role
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
};

// Which filter sections to show per page
export interface ExploreFilterConfig {
  showTopics?: boolean;
  showTerritories?: boolean;
  showStatus?: boolean;         // quest status
  showMonetization?: boolean;   // quest monetization
  showLevel?: boolean;          // course level
  showPodType?: boolean;
  showGuildType?: boolean;
  showPrice?: boolean;          // free/paid for services & courses
  showRole?: boolean;           // user role
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

const ROLE_LABELS: Record<string, string> = {
  GAMECHANGER: "Gamechanger",
  ECOSYSTEM_BUILDER: "Ecosystem Builder",
  BOTH: "Both",
};

export function ExploreFilters({ filters, onChange, config, houseFilter, universeMode, onUniverseModeChange }: Props) {
  const [open, setOpen] = useState(false);
  const { data: topics } = useTopics();
  const { data: territories } = useTerritories();
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
    (filters.role !== "all" ? 1 : 0);

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
            My Topics only
          </Button>
        )}
        {houseFilter && houseFilter.active && !houseFilter.hasHouses && (
          <Badge variant="secondary" className="text-xs py-1 px-2">
            No Topics selected — <a href="/settings?tab=persona" className="underline ml-1">add some</a>
          </Badge>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(!open)}
          className={open ? "bg-muted" : ""}
        >
          <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
          Filters
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4">{activeCount}</Badge>
          )}
        </Button>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={clearAll}>
            Clear all
          </Button>
        )}
      </div>

      {/* Active house chips */}
      {houseFilter && houseFilter.active && houseFilter.myTopicIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground mr-1">Showing:</span>
          {houseFilter.myTopicIds.slice(0, 5).map((id) => (
            <Badge key={id} variant="secondary" className="text-[10px] gap-1">
              <Home className="h-2.5 w-2.5" />{houseFilter.topicNames[id] || id}
            </Badge>
          ))}
          {houseFilter.myTopicIds.length > 5 && (
            <span className="text-[10px] text-muted-foreground">+{houseFilter.myTopicIds.length - 5} more</span>
          )}
          <Button variant="ghost" size="sm" className="text-[10px] h-5 px-2" onClick={() => houseFilter.onToggle(false)}>
            Show all
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
                <p className="text-xs font-medium mb-1.5 text-muted-foreground">Status</p>
                <Select value={filters.status} onValueChange={v => set({ status: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {Object.values(QuestStatus).map(s => (
                      <SelectItem key={s} value={s}>{s.toLowerCase().replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {config.showMonetization && (
              <div>
                <p className="text-xs font-medium mb-1.5 text-muted-foreground">Monetization</p>
                <Select value={filters.monetization} onValueChange={v => set({ monetization: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {Object.values(MonetizationType).map(m => (
                      <SelectItem key={m} value={m}>{m.toLowerCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {config.showLevel && (
              <div>
                <p className="text-xs font-medium mb-1.5 text-muted-foreground">Level</p>
                <Select value={filters.level} onValueChange={v => set({ level: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All levels</SelectItem>
                    {Object.values(CourseLevel).map(l => (
                      <SelectItem key={l} value={l}>{l.charAt(0) + l.slice(1).toLowerCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {config.showPodType && (
              <div>
                <p className="text-xs font-medium mb-1.5 text-muted-foreground">Pod type</p>
                <Select value={filters.podType} onValueChange={v => set({ podType: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value={PodType.QUEST_POD}>Quest Pod</SelectItem>
                    <SelectItem value={PodType.STUDY_POD}>Study Pod</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {config.showGuildType && (
              <div>
                <p className="text-xs font-medium mb-1.5 text-muted-foreground">Guild type</p>
                <Select value={filters.guildType} onValueChange={v => set({ guildType: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {Object.values(GuildType).map(g => (
                      <SelectItem key={g} value={g}>{g.charAt(0) + g.slice(1).toLowerCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {config.showPrice && (
              <div>
                <p className="text-xs font-medium mb-1.5 text-muted-foreground">Price</p>
                <Select value={filters.price} onValueChange={v => set({ price: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {config.showRole && (
              <div>
                <p className="text-xs font-medium mb-1.5 text-muted-foreground">Role</p>
                <Select value={filters.role} onValueChange={v => set({ role: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    {Object.entries(ROLE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Topics multi-select */}
          {config.showTopics && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Hash className="h-3 w-3" /> Topics
                </p>
                {filters.topicIds.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-5 text-[10px] px-2" onClick={() => set({ topicIds: [] })}>
                    Clear
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(topics ?? []).map(t => (
                  <Badge
                    key={t.id}
                    variant={filters.topicIds.includes(t.id) ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleTopic(t.id)}
                  >
                    {t.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Territories multi-select */}
          {config.showTerritories && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Territories
                </p>
                <div className="flex gap-1">
                  {myTerritoryIds.length > 0 && (
                    <Button
                      variant={filters.territoryIds.length > 0 && myTerritoryIds.every(id => filters.territoryIds.includes(id)) ? "default" : "outline"}
                      size="sm"
                      className="h-5 text-[10px] px-2"
                      onClick={() => set({ territoryIds: myTerritoryIds })}
                    >
                      <Navigation className="h-3 w-3 mr-0.5" /> My territories
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-5 text-[10px] px-2" onClick={selectAllTerritories}>
                    <CheckSquare className="h-3 w-3 mr-0.5" /> All
                  </Button>
                  {filters.territoryIds.length > 0 && (
                    <Button variant="ghost" size="sm" className="h-5 text-[10px] px-2" onClick={deselectAllTerritories}>
                      <Square className="h-3 w-3 mr-0.5" /> None
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
          <span className="text-[10px] text-muted-foreground mr-1">Active:</span>
          {filters.topicIds.map(id => {
            const t = (topics ?? []).find(x => x.id === id);
            return t ? (
              <Badge key={id} variant="secondary" className="text-[10px] gap-1">
                <Hash className="h-2.5 w-2.5" />{t.name}
                <button onClick={() => toggleTopic(id)} className="ml-0.5"><X className="h-2.5 w-2.5" /></button>
              </Badge>
            ) : null;
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
              {filters.status.toLowerCase().replace("_", " ")}
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
              {filters.podType.replace("_", " ").toLowerCase()}
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
              {ROLE_LABELS[filters.role] ?? filters.role}
              <button onClick={() => set({ role: "all" })} className="ml-1"><X className="h-2.5 w-2.5" /></button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
