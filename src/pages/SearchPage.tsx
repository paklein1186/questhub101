import { useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search, Filter, Users, Shield, Compass, Briefcase, Building2, Boxes } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { topics, territories } from "@/data/mock";
import { globalSearch, type SearchResult, type SearchResultType } from "@/lib/search";

const TYPE_META: Record<SearchResultType, { label: string; icon: typeof Users; color: string }> = {
  USER: { label: "Users", icon: Users, color: "text-blue-600" },
  GUILD: { label: "Guilds", icon: Shield, color: "text-emerald-600" },
  QUEST: { label: "Quests", icon: Compass, color: "text-amber-600" },
  POD: { label: "Pods", icon: Boxes, color: "text-violet-600" },
  SERVICE: { label: "Services", icon: Briefcase, color: "text-rose-600" },
  COMPANY: { label: "Companies", icon: Building2, color: "text-cyan-600" },
};

export default function SearchPage() {
  const [params] = useSearchParams();
  const currentUser = useCurrentUser();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [topicId, setTopicId] = useState("ALL");
  const [territoryId, setTerritoryId] = useState("ALL");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const results = useMemo(() => {
    if (query.trim().length < 2) return [];
    return globalSearch(query, currentUser.id, {
      topicId: topicId !== "ALL" ? topicId : undefined,
      territoryId: territoryId !== "ALL" ? territoryId : undefined,
      priceMin: priceMin ? Number(priceMin) : undefined,
      priceMax: priceMax ? Number(priceMax) : undefined,
    });
  }, [query, currentUser.id, topicId, territoryId, priceMin, priceMax]);

  const filtered = useMemo(() => {
    if (typeFilter === "ALL") return results;
    return results.filter((r) => r.type === typeFilter);
  }, [results, typeFilter]);

  const grouped = useMemo(() => {
    const map = new Map<SearchResultType, SearchResult[]>();
    for (const r of filtered) {
      if (!map.has(r.type)) map.set(r.type, []);
      map.get(r.type)!.push(r);
    }
    return map;
  }, [filtered]);

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-display font-bold mb-6 flex items-center gap-2">
          <Search className="h-6 w-6" /> Advanced Search
        </h1>

        {/* Search input */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across all entities…"
            className="pl-10 h-12 text-base"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6 p-4 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" /> Filters:
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              {(Object.keys(TYPE_META) as SearchResultType[]).map((t) => (
                <SelectItem key={t} value={t}>{TYPE_META[t].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={topicId} onValueChange={setTopicId}>
            <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Topic" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All topics</SelectItem>
              {topics.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={territoryId} onValueChange={setTerritoryId}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Territory" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All territories</SelectItem>
              {territories.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              placeholder="€ Min"
              className="w-[80px] h-9"
            />
            <span className="text-muted-foreground text-sm">–</span>
            <Input
              type="number"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              placeholder="€ Max"
              className="w-[80px] h-9"
            />
          </div>
        </div>

        {/* Results */}
        {query.trim().length < 2 ? (
          <p className="text-muted-foreground text-center py-12">Type at least 2 characters to search.</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">No results found for "{query}".</p>
        ) : (
          <div className="space-y-8">
            <p className="text-sm text-muted-foreground">{filtered.length} result{filtered.length !== 1 ? "s" : ""} found</p>
            {Array.from(grouped.entries()).map(([type, items]) => {
              const meta = TYPE_META[type];
              const Icon = meta.icon;
              return (
                <div key={type}>
                  <h2 className="font-display font-semibold text-lg mb-3 flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${meta.color}`} />
                    {meta.label}
                    <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                  </h2>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <Link key={`${item.type}-${item.id}`} to={item.url}>
                        <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                          <CardContent className="p-4 flex items-center gap-3">
                            <Badge variant="outline" className="text-[10px] shrink-0">{item.type}</Badge>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{item.title}</p>
                              {item.subtitle && <p className="text-sm text-muted-foreground truncate">{item.subtitle}</p>}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}
