import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Plus, Search, Filter, Eye, EyeOff, Bot,
  Pencil, Trash2, Tag, Loader2, ChevronDown, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePersona } from "@/hooks/usePersona";
import {
  useTerritoryMemory,
  useDeleteTerritoryMemory,
  MEMORY_CATEGORIES,
  type TerritoryMemoryEntry,
  type MemoryCategory,
} from "@/hooks/useTerritoryMemory";
import { TerritoryMemoryDialog } from "./TerritoryMemoryDialog";
import { TerritoryAIAnalyst } from "./TerritoryAIAnalyst";

interface Props {
  territoryId: string;
  territoryName: string;
  isMember: boolean;
}

const VISIBILITY_LABELS: Record<string, { label: string; icon: typeof Eye }> = {
  PUBLIC: { label: "Public", icon: Eye },
  ADMINS: { label: "Members only", icon: EyeOff },
  AI_ONLY: { label: "AI only", icon: Bot },
};

export function TerritoryMemoryTab({ territoryId, territoryName, isMember }: Props) {
  const { persona } = usePersona();
  const currentUser = useCurrentUser();
  const isLoggedIn = !!currentUser.id;
  const { data: entries = [], isLoading } = useTerritoryMemory(territoryId);
  const deleteMutation = useDeleteTerritoryMemory();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TerritoryMemoryEntry | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(MEMORY_CATEGORIES.map(c => c.value)));

  // Persona-adaptive labels
  const tabTitle = persona === "CREATIVE" ? "Lore & World Knowledge" : persona === "IMPACT" ? "Territory Intelligence" : "Resilience Engine";
  const addLabel = persona === "CREATIVE" ? "Add lore entry" : "Add data to this territory";

  const filtered = useMemo(() => {
    let result = entries;
    if (categoryFilter !== "ALL") result = result.filter(e => e.category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.content.toLowerCase().includes(q) ||
        e.tags?.some(t => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [entries, categoryFilter, search]);

  const grouped = useMemo(() => {
    const groups: Record<string, TerritoryMemoryEntry[]> = {};
    for (const entry of filtered) {
      if (!groups[entry.category]) groups[entry.category] = [];
      groups[entry.category].push(entry);
    }
    return groups;
  }, [filtered]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const getCategoryMeta = (cat: string) => MEMORY_CATEGORIES.find(c => c.value === cat) ?? { label: cat, icon: "📋" };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" /> {tabTitle}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {persona === "CREATIVE"
              ? `Collective lore and world-building knowledge for ${territoryName}`
              : `Structured intelligence and knowledge base for ${territoryName}`}
          </p>
        </div>
        {isMember && isLoggedIn && (
          <Button size="sm" onClick={() => { setEditingEntry(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> {addLabel}
          </Button>
        )}
      </div>

      {/* Two-column layout: Memory list + AI Analyst */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left: Memory entries */}
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search memory..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px] h-9">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                {MEMORY_CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.icon} {c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Empty */}
          {!isLoading && filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 py-12 text-center">
              <Brain className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium">No memory entries yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isMember ? "Start adding knowledge to help the AI understand this territory." : "Territory members can contribute knowledge here."}
              </p>
            </div>
          )}

          {/* Grouped entries */}
          <AnimatePresence mode="popLayout">
            {Object.entries(grouped).map(([category, items]) => {
              const meta = getCategoryMeta(category);
              const isExpanded = expandedCategories.has(category);
              return (
                <motion.div key={category} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(category)}>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 hover:text-primary transition-colors">
                      <span className="text-base">{meta.icon}</span>
                      <span className="text-sm font-semibold">{meta.label}</span>
                      <Badge variant="secondary" className="text-[10px] ml-1">{items.length}</Badge>
                      <ChevronDown className={`h-4 w-4 ml-auto text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-2 mt-2">
                        {items.map(entry => (
                          <MemoryEntryCard
                            key={entry.id}
                            entry={entry}
                            canEdit={isLoggedIn && (entry.created_by_user_id === currentUser.id || isMember)}
                            onEdit={() => { setEditingEntry(entry); setDialogOpen(true); }}
                            onDelete={() => deleteMutation.mutate({ id: entry.id, territory_id: territoryId })}
                          />
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Right: AI Analyst sidebar */}
        <TerritoryAIAnalyst territoryId={territoryId} territoryName={territoryName} />
      </div>

      {/* Add/Edit Dialog */}
      <TerritoryMemoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        territoryId={territoryId}
        editEntry={editingEntry}
      />
    </div>
  );
}

function MemoryEntryCard({
  entry,
  canEdit,
  onEdit,
  onDelete,
}: {
  entry: TerritoryMemoryEntry;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const vis = VISIBILITY_LABELS[entry.visibility] ?? VISIBILITY_LABELS.PUBLIC;
  const VisIcon = vis.icon;

  return (
    <motion.div
      layout
      className="rounded-lg border border-border bg-card p-3.5 hover:border-primary/20 transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold truncate">{entry.title}</h4>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-3 whitespace-pre-line">{entry.content}</p>
        </div>
        <Badge variant="outline" className="text-[10px] shrink-0 gap-1">
          <VisIcon className="h-3 w-3" /> {vis.label}
        </Badge>
      </div>
      {entry.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {entry.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="text-[10px]">
              <Tag className="h-2.5 w-2.5 mr-0.5" /> {tag}
            </Badge>
          ))}
        </div>
      )}
      {canEdit && (
        <div className="flex gap-1 mt-2 justify-end">
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onEdit}>
            <Pencil className="h-3 w-3 mr-1" /> Edit
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-3 w-3 mr-1" /> Delete
          </Button>
        </div>
      )}
    </motion.div>
  );
}
