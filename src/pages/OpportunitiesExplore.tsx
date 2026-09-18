import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Compass, Search, Coins, Briefcase, Sparkles, GraduationCap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOpportunities, type OpportunityType } from "@/hooks/useOpportunities";
import { OpportunityCard } from "@/components/opportunities/OpportunityCard";
import { ExploreFilters, defaultFilters, applySortBy, type ExploreFilterValues } from "@/components/ExploreFilters";

const TYPE_TABS: { value: OpportunityType | "all"; icon: typeof Compass }[] = [
  { value: "all", icon: Compass },
  { value: "MISSION", icon: Coins },
  { value: "JOB", icon: Briefcase },
  { value: "SERVICE", icon: Sparkles },
  { value: "COURSE", icon: GraduationCap },
];

interface Props {
  bare?: boolean;
}

/**
 * Unified feed of missions, jobs, services and courses — shared body used
 * both standalone (OpportunitiesPage, /opportunities) and embedded here in
 * ExploreHub's "Jobs" tab, replacing what used to be four separate,
 * overlapping sub-tabs (Open Positions / Opportunities / Quests / Ideas).
 */
export default function OpportunitiesExplore({ bare }: Props) {
  const { t } = useTranslation();
  const { opportunities, isLoading } = useOpportunities();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<OpportunityType | "all">("all");
  const [exploreFilters, setExploreFilters] = useState<ExploreFilterValues>(defaultFilters);

  const filtered = useMemo(() => {
    let list = opportunities;

    if (typeFilter !== "all") {
      list = list.filter((o) => o.type === typeFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((o) =>
        o.title.toLowerCase().includes(q) ||
        (o.description ?? "").toLowerCase().includes(q) ||
        (o.ownerName ?? "").toLowerCase().includes(q)
      );
    }

    if (exploreFilters.topicIds.length > 0) {
      list = list.filter((o) => exploreFilters.topicIds.some((id) => o.topicIds.includes(id)));
    }

    if (exploreFilters.territoryIds.length > 0) {
      list = list.filter((o) => exploreFilters.territoryIds.some((id) => o.territoryIds.includes(id)));
    }

    if (exploreFilters.price === "free") {
      list = list.filter((o) => o.isFree || !o.priceLabel);
    } else if (exploreFilters.price === "paid") {
      list = list.filter((o) => !!o.priceLabel && !o.isFree);
    }

    return applySortBy(
      list.map((o) => ({ ...o, created_at: o.createdAt, updated_at: o.updatedAt })),
      exploreFilters.sortBy
    );
  }, [opportunities, typeFilter, search, exploreFilters]);

  const countByType = useMemo(() => {
    const counts: Record<string, number> = { all: opportunities.length };
    for (const o of opportunities) counts[o.type] = (counts[o.type] ?? 0) + 1;
    return counts;
  }, [opportunities]);

  return (
    <div className="space-y-4">
      {/* Intent tabs */}
      <div className="flex flex-wrap gap-2">
        {TYPE_TABS.map(({ value, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setTypeFilter(value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all",
              typeFilter === value
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {t(`opportunities.tabs.${value}`)}
            <span className="opacity-70">({countByType[value] ?? 0})</span>
          </button>
        ))}
      </div>

      <ExploreFilters
        filters={exploreFilters}
        onChange={setExploreFilters}
        config={{ showTopics: true, showTerritories: true, showPrice: true }}
      />
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("opportunities.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("opportunities.loading")}</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card/50 p-8 text-center">
          <Compass className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">{t("opportunities.empty")}</p>
          {(search || typeFilter !== "all") && (
            <Button variant="link" size="sm" className="mt-2" onClick={() => { setSearch(""); setTypeFilter("all"); }}>
              {t("opportunities.clearFilters")}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((opportunity) => (
            <OpportunityCard key={opportunity.id} opportunity={opportunity} />
          ))}
        </div>
      )}
    </div>
  );
}
