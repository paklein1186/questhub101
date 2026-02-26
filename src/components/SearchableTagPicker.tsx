import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface TagItem {
  id: string;
  name: string;
  /** Optional subtitle, e.g. territory level */
  subtitle?: string;
  /** Whether this item was AI-suggested */
  suggested?: boolean;
}

interface SearchableTagPickerProps {
  label: string;
  items: TagItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSelectAll?: () => void;
  onClearAll?: () => void;
  /** Renders as compact badges (default) or as checkbox list */
  variant?: "badges" | "checkboxes";
  /** Max height of the scrollable list */
  maxHeight?: string;
  /** Optional icon to render before each item */
  icon?: React.ReactNode;
  className?: string;
}

export function SearchableTagPicker({
  label,
  items,
  selectedIds,
  onToggle,
  onSelectAll,
  onClearAll,
  variant = "badges",
  maxHeight = "200px",
  icon,
  className,
}: SearchableTagPickerProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.subtitle?.toLowerCase().includes(q)
    );
  }, [items, search]);

  const selectedCount = selectedIds.length;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center gap-1">
          {onSelectAll && (
            <Button
              variant="outline"
              size="sm"
              type="button"
              className="h-6 text-[10px] px-2"
              onClick={onSelectAll}
            >
              Select all
            </Button>
          )}
          {onClearAll && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              className="h-6 text-[10px] px-2"
              onClick={onClearAll}
              disabled={selectedCount === 0}
            >
              Clear
            </Button>
          )}
          {selectedCount > 0 && (
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
              {selectedCount}
            </Badge>
          )}
        </div>
      </div>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${label.toLowerCase()}…`}
          className="pl-8 pr-8 h-8 text-xs"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Items */}
      <ScrollArea style={{ maxHeight }} className="rounded-md border border-border">
        <div
          className={cn(
            "p-2",
            variant === "badges" ? "flex flex-wrap gap-1.5" : "space-y-0.5"
          )}
        >
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground py-2 text-center w-full">
              No results for "{search}"
            </p>
          )}

          {variant === "badges"
            ? filtered.map((item) => (
                <Badge
                  key={item.id}
                  variant={selectedIds.includes(item.id) ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer text-xs transition-colors",
                    item.suggested && !selectedIds.includes(item.id) && "border-primary/40 text-primary"
                  )}
                  onClick={() => onToggle(item.id)}
                >
                  {icon}
                  {item.name}
                  {item.subtitle && (
                    <span className="text-[9px] opacity-60 ml-0.5">({item.subtitle})</span>
                  )}
                  {item.suggested && <span className="ml-0.5">✨</span>}
                </Badge>
              ))
            : filtered.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedIds.includes(item.id)}
                    onCheckedChange={() => onToggle(item.id)}
                  />
                  {icon}
                  <span
                    className={cn(
                      "truncate text-xs",
                      item.suggested && "font-medium text-primary"
                    )}
                  >
                    {item.name}
                  </span>
                  {item.subtitle && (
                    <span className="text-[10px] text-muted-foreground">
                      ({item.subtitle})
                    </span>
                  )}
                  {item.suggested && <span className="text-xs">✨</span>}
                </label>
              ))}
        </div>
      </ScrollArea>
    </div>
  );
}
