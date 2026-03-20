import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lightbulb, Swords, Search } from "lucide-react";
import { ExploreFilters, defaultFilters, applySortBy, type ExploreFilterValues } from "@/components/ExploreFilters";
import { useHouseFilter } from "@/hooks/useHouseFilter";
import { usePersona } from "@/hooks/usePersona";
import { defaultUniverseForPersona, type UniverseMode } from "@/lib/universeMapping";

const CATEGORY_OPTIONS = [
  { value: "all", label: "All categories" },
  { value: "SKILLS", label: "Skills" },
  { value: "PARTNERSHIPS", label: "Partnerships" },
  { value: "FUNDING", label: "Funding" },
  { value: "RESOURCES", label: "Resources" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
];

interface Props {
  bare?: boolean;
}

export default function OpportunitiesExplore({ bare }: Props) {
  const { data: needs, isLoading } = useQuery({
    queryKey: ["explore-opportunities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quest_needs")
        .select("id, title, description, category, status, quest_id, created_at, quests!quest_needs_quest_id_fkey(title, status, quest_topics(topic_id))")
        .in("status", ["open", "in_progress", "OPEN", "IN_PROGRESS"])
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [exploreFilters, setExploreFilters] = useState<ExploreFilterValues>(defaultFilters);

  const { persona } = usePersona();
  const [universeMode, setUniverseMode] = useState<UniverseMode>(defaultUniverseForPersona(persona));
  const houseFilter = useHouseFilter();

  const filtered = useMemo(() => {
    if (!needs) return [];
    let result = needs.filter((need) => {
      // Search
      if (search) {
        const q = search.toLowerCase();
        if (
          !need.title.toLowerCase().includes(q) &&
          !(need.description ?? "").toLowerCase().includes(q) &&
          !((need.quests as any)?.title ?? "").toLowerCase().includes(q)
        ) return false;
      }
      // Category
      if (categoryFilter !== "all" && need.category?.toUpperCase() !== categoryFilter) return false;
      // Status
      if (statusFilter !== "all") {
        const s = need.status?.toLowerCase();
        if (statusFilter === "open" && s !== "open") return false;
        if (statusFilter === "in_progress" && s !== "in_progress") return false;
      }
      return true;
    });
    // Apply house/topic filter
    result = houseFilter.applyHouseFilter(
      result,
      (item: any) => ((item.quests as any)?.quest_topics ?? []).map((qt: any) => qt.topic_id),
    );
    return applySortBy(result, exploreFilters.sortBy);
  }, [needs, search, categoryFilter, statusFilter, exploreFilters.sortBy, houseFilter.applyHouseFilter]);

  return (
    <div className="space-y-4">
      {/* Topic & Territory filters */}
      <ExploreFilters
        filters={exploreFilters}
        onChange={setExploreFilters}
        config={{ showTopics: false, showTerritories: false }}
        houseFilter={{
          active: houseFilter.houseFilterActive,
          onToggle: houseFilter.setHouseFilterActive,
          hasHouses: houseFilter.myTopicIds.length > 0,
          topicNames: houseFilter.topicNames,
          myTopicIds: houseFilter.myTopicIds,
        }}
        universeMode={universeMode}
        onUniverseModeChange={setUniverseMode}
      />
      {/* Search & quick filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search opportunities…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[140px] h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">{filtered.length} opportunit{filtered.length !== 1 ? "ies" : "y"} found</p>

      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {/* Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((need) => {
          const quest = need.quests as any;
          return (
            <Link
              key={need.id}
              to={`/quests/${need.quest_id}?tab=explore`}
              className="group rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-all"
            >
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{need.title}</p>
                  {need.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{need.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {need.category && (
                      <Badge variant="secondary" className="text-[10px]">{need.category}</Badge>
                    )}
                    <Badge variant={need.status?.toLowerCase() === "open" ? "default" : "outline"} className="text-[10px] capitalize">
                      {need.status}
                    </Badge>
                  </div>
                  {quest?.title && (
                    <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
                      <Swords className="h-3 w-3" />
                      <span className="truncate">{quest.title}</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          <Lightbulb className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No opportunities match your filters.</p>
        </div>
      )}
    </div>
  );
}
