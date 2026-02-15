import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, ArrowDownUp } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "bg-muted text-muted-foreground" },
  OPEN_FOR_PROPOSALS: { label: "Open", color: "bg-blue-500/10 text-blue-700 border-blue-500/30" },
  ACTIVE: { label: "Active", color: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  COMPLETED: { label: "Completed", color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
};

type SortMode = "status" | "recent" | "budget";

interface EntityQuestsFiltersProps {
  quests: any[];
  children: (filtered: any[]) => React.ReactNode;
}

export function EntityQuestsFilters({ quests, children }: EntityQuestsFiltersProps) {
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortMode>("status");

  // Available statuses from data
  const availableStatuses = useMemo(() => {
    const s = new Set<string>();
    quests.forEach((q) => { if (q.status) s.add(q.status); });
    return Array.from(s);
  }, [quests]);

  const toggleStatus = (status: string) => {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  const filtered = useMemo(() => {
    let result = [...quests];

    // Status filter (multi-select, empty = all)
    if (statusFilter.size > 0) {
      result = result.filter((q) => statusFilter.has(q.status));
    }

    // Search
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(
        (q) =>
          q.title?.toLowerCase().includes(s) ||
          q.description?.toLowerCase().includes(s)
      );
    }

    // Sort
    if (sortBy === "status") {
      const ORDER: Record<string, number> = { ACTIVE: 0, OPEN_FOR_PROPOSALS: 1, DRAFT: 2, COMPLETED: 3 };
      result.sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9));
    } else if (sortBy === "recent") {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === "budget") {
      result.sort((a, b) => (b.budget_amount ?? b.reward_xp ?? 0) - (a.budget_amount ?? a.reward_xp ?? 0));
    }

    return result;
  }, [quests, statusFilter, search, sortBy]);

  if (quests.length === 0) return <>{children(quests)}</>;

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status chips */}
        {availableStatuses.length > 1 && availableStatuses.map((status) => {
          const cfg = STATUS_CONFIG[status];
          const active = statusFilter.size === 0 || statusFilter.has(status);
          return (
            <button
              key={status}
              onClick={() => toggleStatus(status)}
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border transition-all",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
            >
              {cfg?.label || status}
            </button>
          );
        })}

        {statusFilter.size > 0 && (
          <button
            onClick={() => setStatusFilter(new Set())}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {/* Sort toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() =>
              setSortBy(sortBy === "status" ? "recent" : sortBy === "recent" ? "budget" : "status")
            }
          >
            <ArrowDownUp className="h-3.5 w-3.5" />
            {sortBy === "status" ? "Status" : sortBy === "recent" ? "Recent" : "Budget"}
          </Button>

          {/* Search toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) setSearch(""); }}
          >
            {searchOpen ? <X className="h-3.5 w-3.5" /> : <Search className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Search input */}
      {searchOpen && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search quests…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 text-sm pl-8"
            autoFocus
          />
        </div>
      )}

      {/* Render filtered quests */}
      {children(filtered)}
    </div>
  );
}
