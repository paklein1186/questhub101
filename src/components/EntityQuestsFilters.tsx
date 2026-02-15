import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, ArrowDownUp, LayoutGrid, LayoutList, Columns3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { UnitCoverImage } from "@/components/UnitCoverImage";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "bg-muted text-muted-foreground" },
  OPEN_FOR_PROPOSALS: { label: "Open", color: "bg-blue-500/10 text-blue-700 border-blue-500/30" },
  ACTIVE: { label: "Active", color: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  COMPLETED: { label: "Completed", color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
};

const KANBAN_COLUMNS = [
  { key: "DRAFT", label: "Draft" },
  { key: "OPEN_FOR_PROPOSALS", label: "Open" },
  { key: "ACTIVE", label: "Active" },
  { key: "COMPLETED", label: "Completed" },
];

type SortMode = "status" | "recent" | "budget";
type ViewMode = "list" | "grid" | "kanban";

interface EntityQuestsFiltersProps {
  quests: any[];
  children: (filtered: any[], viewMode: ViewMode) => React.ReactNode;
}

export function EntityQuestsFilters({ quests, children }: EntityQuestsFiltersProps) {
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortMode>("status");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

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
    if (statusFilter.size > 0) {
      result = result.filter((q) => statusFilter.has(q.status));
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(
        (q) =>
          q.title?.toLowerCase().includes(s) ||
          q.description?.toLowerCase().includes(s)
      );
    }
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

  if (quests.length === 0) return <>{children(quests, viewMode)}</>;

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

          {/* View mode toggle */}
          <div className="flex border border-border rounded-md overflow-hidden">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              className="h-8 rounded-none px-2"
              onClick={() => setViewMode("list")}
            >
              <LayoutList className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              className="h-8 rounded-none px-2"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === "kanban" ? "default" : "ghost"}
              size="sm"
              className="h-8 rounded-none px-2"
              onClick={() => setViewMode("kanban")}
            >
              <Columns3 className="h-3.5 w-3.5" />
            </Button>
          </div>

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

      {/* Render based on view mode */}
      {viewMode === "kanban" ? (
        <KanbanView quests={filtered} />
      ) : (
        children(filtered, viewMode)
      )}
    </div>
  );
}

/* ─── Kanban View ─── */
function KanbanView({ quests }: { quests: any[] }) {
  const columns = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const col of KANBAN_COLUMNS) map[col.key] = [];
    for (const q of quests) {
      if (map[q.status]) map[q.status].push(q);
      else if (map.ACTIVE) map.ACTIVE.push(q); // fallback
    }
    return map;
  }, [quests]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {KANBAN_COLUMNS.map((col) => {
        const items = columns[col.key] || [];
        const cfg = STATUS_CONFIG[col.key];
        return (
          <div key={col.key} className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <span className={cn("inline-block w-2 h-2 rounded-full", cfg?.color?.split(" ")[0] || "bg-muted")} />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {col.label}
              </span>
              <Badge variant="secondary" className="text-[10px] ml-auto h-4 min-w-[1.25rem] justify-center">
                {items.length}
              </Badge>
            </div>
            <div className="space-y-2 min-h-[60px] rounded-lg bg-muted/20 p-2">
              {items.length === 0 && (
                <p className="text-[11px] text-muted-foreground/50 text-center py-4">No quests</p>
              )}
              {items.map((q) => (
                <Link
                  key={q.id}
                  to={`/quests/${q.id}`}
                  className="block rounded-lg border border-border bg-card p-3 hover:border-primary/30 transition-all"
                >
                  <h4 className="font-display font-semibold text-sm truncate">{q.title}</h4>
                  {q.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{q.description}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {q.reward_xp != null && (
                      <Badge className="bg-primary/10 text-primary border-0 text-[10px]">{q.reward_xp} XP</Badge>
                    )}
                    {q.monetization_type && (
                      <Badge variant="secondary" className="text-[10px] capitalize">{q.monetization_type.toLowerCase()}</Badge>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
