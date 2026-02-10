import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { globalSearch, type SearchResult, type SearchResultType } from "@/lib/search";

const TYPE_LABELS: Record<SearchResultType, string> = {
  USER: "Users",
  GUILD: "Guilds",
  QUEST: "Quests",
  POD: "Pods",
  SERVICE: "Services",
  COMPANY: "Companies",
};

const TYPE_COLORS: Record<SearchResultType, string> = {
  USER: "bg-blue-500/10 text-blue-600",
  GUILD: "bg-emerald-500/10 text-emerald-600",
  QUEST: "bg-amber-500/10 text-amber-600",
  POD: "bg-violet-500/10 text-violet-600",
  SERVICE: "bg-rose-500/10 text-rose-600",
  COMPANY: "bg-cyan-500/10 text-cyan-600",
};

export function GlobalSearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const currentUser = useCurrentUser();
  const navigate = useNavigate();

  // Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const results = useMemo(() => {
    if (query.trim().length < 2) return [];
    return globalSearch(query, currentUser.id);
  }, [query, currentUser.id]);

  const grouped = useMemo(() => {
    const map = new Map<SearchResultType, SearchResult[]>();
    for (const r of results) {
      if (!map.has(r.type)) map.set(r.type, []);
      map.get(r.type)!.push(r);
    }
    return map;
  }, [results]);

  const handleSelect = useCallback(
    (url: string) => {
      setOpen(false);
      setQuery("");
      navigate(url);
    },
    [navigate],
  );

  const handleAdvanced = () => {
    setOpen(false);
    navigate(`/search${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    setQuery("");
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 h-8 px-3 rounded-md border border-input bg-background text-sm text-muted-foreground hover:bg-muted transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Search…</span>
        <kbd className="hidden md:inline-flex h-5 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search users, guilds, quests, pods, services, companies…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {query.trim().length >= 2 && results.length === 0 && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}

          {Array.from(grouped.entries()).map(([type, items]) => (
            <CommandGroup key={type} heading={TYPE_LABELS[type]}>
              {items.slice(0, 5).map((item) => (
                <CommandItem
                  key={`${item.type}-${item.id}`}
                  value={`${item.type}-${item.id}-${item.title}`}
                  onSelect={() => handleSelect(item.url)}
                  className="cursor-pointer"
                >
                  <Badge variant="secondary" className={`mr-2 text-[10px] px-1.5 py-0 ${TYPE_COLORS[item.type]}`}>
                    {item.type}
                  </Badge>
                  <span className="font-medium">{item.title}</span>
                  {item.subtitle && (
                    <span className="ml-2 text-muted-foreground text-xs truncate max-w-[200px]">
                      {item.subtitle}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}

          {query.trim().length >= 2 && (
            <CommandGroup>
              <CommandItem onSelect={handleAdvanced} className="cursor-pointer text-primary">
                <Search className="h-4 w-4 mr-2" />
                Advanced search{query ? ` for "${query}"` : ""}
              </CommandItem>
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
