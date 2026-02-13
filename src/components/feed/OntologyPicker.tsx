import { useState, useEffect, useMemo } from "react";
import { Globe, Compass, X, ChevronDown, Search, Plus, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface OntologyPickerProps {
  selectedTerritoryIds: string[];
  selectedTopicIds: string[];
  onTerritoriesChange: (ids: string[]) => void;
  onTopicsChange: (ids: string[]) => void;
}

function useAllTerritories() {
  return useQuery({
    queryKey: ["all-territories"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("territories")
        .select("id, name, slug, level")
        .eq("is_deleted", false)
        .order("name");
      return data ?? [];
    },
  });
}

function useAllTopics() {
  return useQuery({
    queryKey: ["all-topics"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("topics")
        .select("id, name, slug")
        .eq("is_deleted", false)
        .order("name");
      return data ?? [];
    },
  });
}

function MultiSelectPopover({
  label,
  icon: Icon,
  items,
  selectedIds,
  onChange,
  getSlug,
  allowCreate = false,
  onCreateItem,
}: {
  label: string;
  icon: React.ElementType;
  items: { id: string; name: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  getSlug?: (item: any) => string | null;
  allowCreate?: boolean;
  onCreateItem?: (name: string) => Promise<string | null>;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, search]);

  const selectedItems = useMemo(
    () => items.filter((i) => selectedIds.includes(i.id)),
    [items, selectedIds]
  );

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs justify-between w-full font-normal"
          >
            {selectedIds.length > 0
              ? `${selectedIds.length} selected`
              : `Select ${label.toLowerCase()}…`}
            <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}…`}
              className="h-8 text-xs pl-7"
            />
          </div>
          <ScrollArea className="max-h-48">
            {filtered.length === 0 && !allowCreate ? (
              <p className="text-xs text-muted-foreground text-center py-3">
                No {label.toLowerCase()} found
              </p>
            ) : (
              <div className="space-y-0.5">
                {filtered.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs hover:bg-accent transition-colors flex items-center gap-2 ${
                      selectedIds.includes(item.id)
                        ? "bg-primary/10 text-primary font-medium"
                        : ""
                    }`}
                  >
                    <span className="truncate flex-1">{item.name}</span>
                    {selectedIds.includes(item.id) && (
                      <span className="text-primary text-[10px]">✓</span>
                    )}
                  </button>
                ))}
                {allowCreate && search.trim() && !items.some(i => i.name.toLowerCase() === search.trim().toLowerCase()) && (
                  <button
                    onClick={async () => {
                      if (!onCreateItem || creating) return;
                      setCreating(true);
                      const newId = await onCreateItem(search.trim());
                      setCreating(false);
                      if (newId) {
                        onChange([...selectedIds, newId]);
                        setSearch("");
                      }
                    }}
                    disabled={creating}
                    className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-accent transition-colors flex items-center gap-2 text-primary"
                  >
                    {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    <span>Create "{search.trim()}"</span>
                  </button>
                )}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedItems.map((item) => (
            <Badge
              key={item.id}
              variant="secondary"
              className="text-[10px] h-5 gap-1 pr-1"
            >
              {item.name}
              <button
                onClick={() => toggle(item.id)}
                className="hover:text-destructive"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function OntologyPicker({
  selectedTerritoryIds,
  selectedTopicIds,
  onTerritoriesChange,
  onTopicsChange,
}: OntologyPickerProps) {
  const { data: territories = [] } = useAllTerritories();
  const { data: topics = [] } = useAllTopics();
  const qc = useQueryClient();

  const hasSelections = selectedTerritoryIds.length > 0 || selectedTopicIds.length > 0;
  const [expanded, setExpanded] = useState(false);

  // Auto-expand if there are selections
  useEffect(() => {
    if (hasSelections) setExpanded(true);
  }, [hasSelections]);

  const handleCreateTerritory = async (name: string): Promise<string | null> => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const { data, error } = await supabase
      .from("territories")
      .insert({ name, slug, level: "LOCAL" as any })
      .select("id")
      .single();
    if (error) {
      toast.error("Failed to create territory");
      return null;
    }
    toast.success(`Territory "${name}" created`);
    qc.invalidateQueries({ queryKey: ["all-territories"] });
    return data.id;
  };

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Globe className="h-3.5 w-3.5" />
        <span>Attach to Network</span>
        <ChevronDown
          className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
        {hasSelections && !expanded && (
          <Badge variant="secondary" className="text-[10px] h-4 ml-1">
            {selectedTerritoryIds.length + selectedTopicIds.length}
          </Badge>
        )}
      </button>

      {expanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-5">
          <MultiSelectPopover
            label="Territories"
            icon={Globe}
            items={territories}
            selectedIds={selectedTerritoryIds}
            onChange={onTerritoriesChange}
            allowCreate
            onCreateItem={handleCreateTerritory}
          />
          <MultiSelectPopover
            label="Topics"
            icon={Compass}
            items={topics}
            selectedIds={selectedTopicIds}
            onChange={onTopicsChange}
          />
        </div>
      )}
    </div>
  );
}

export { useAllTerritories, useAllTopics };
