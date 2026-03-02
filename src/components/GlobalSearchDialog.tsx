import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, Shield } from "lucide-react";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { globalSearch, type SearchResult, type SearchResultType } from "@/lib/search";
import { useTrustSummaryBatch } from "@/hooks/useTrustSummary";

const TYPE_I18N_KEYS: Record<SearchResultType, string> = {
  USER: "search.users",
  GUILD: "search.guilds",
  QUEST: "search.quests",
  POD: "search.pods",
  SERVICE: "search.services",
  COMPANY: "search.companies",
  TERRITORY: "search.territories",
};

const TYPE_COLORS: Record<SearchResultType, string> = {
  USER: "bg-blue-500/10 text-blue-600",
  GUILD: "bg-emerald-500/10 text-emerald-600",
  QUEST: "bg-amber-500/10 text-amber-600",
  POD: "bg-violet-500/10 text-violet-600",
  SERVICE: "bg-rose-500/10 text-rose-600",
  COMPANY: "bg-cyan-500/10 text-cyan-600",
  TERRITORY: "bg-orange-500/10 text-orange-600",
};

export function GlobalSearchDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
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

  // Debounced async search
  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      const res = await globalSearch(query, currentUser.id);
      setResults(res);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, currentUser.id]);

  const grouped = (() => {
    const map = new Map<SearchResultType, SearchResult[]>();
    for (const r of results) {
      if (!map.has(r.type)) map.set(r.type, []);
      map.get(r.type)!.push(r);
    }
    return map;
  })();

  const TRUST_NODE_MAP: Record<string, string> = { USER: "profile", GUILD: "guild", QUEST: "quest", SERVICE: "service", COMPANY: "partner_entity" };
  const trustableIds = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const r of results) {
      const nt = TRUST_NODE_MAP[r.type];
      if (nt) { if (!map[nt]) map[nt] = []; map[nt].push(r.id); }
    }
    return map;
  }, [results]);

  const { data: profileTrust } = useTrustSummaryBatch("profile", trustableIds["profile"] ?? []);
  const { data: guildTrust } = useTrustSummaryBatch("guild", trustableIds["guild"] ?? []);
  const { data: questTrust } = useTrustSummaryBatch("quest", trustableIds["quest"] ?? []);
  const { data: serviceTrust } = useTrustSummaryBatch("service", trustableIds["service"] ?? []);
  const { data: companyTrust } = useTrustSummaryBatch("partner_entity", trustableIds["partner_entity"] ?? []);
  const allTrust = useMemo(() => ({ ...profileTrust, ...guildTrust, ...questTrust, ...serviceTrust, ...companyTrust }), [profileTrust, guildTrust, questTrust, serviceTrust, companyTrust]);

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
        className="flex items-center gap-2 h-8 w-56 sm:w-72 px-3 rounded-md border border-input bg-background text-sm text-muted-foreground hover:bg-muted transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t("search.placeholder")}</span>
        <kbd className="hidden md:inline-flex h-5 select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder={t("search.inputPlaceholder")}
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {query.trim().length >= 2 && results.length === 0 && (
            <CommandEmpty>{t("search.noResults")}</CommandEmpty>
          )}

          {Array.from(grouped.entries()).map(([type, items]) => (
            <CommandGroup key={type} heading={t(TYPE_I18N_KEYS[type])}>
              {items.slice(0, 5).map((item) => (
                <CommandItem
                  key={`${item.type}-${item.id}`}
                  value={`${item.type}-${item.id}-${item.title}`}
                  onSelect={() => handleSelect(item.url)}
                  className="cursor-pointer"
                >
                  <Badge variant="secondary" className={`mr-2 text-[10px] px-1.5 py-0 ${TYPE_COLORS[item.type]}`}>
                    {t(TYPE_I18N_KEYS[item.type])}
                  </Badge>
                  <span className="font-medium">{item.title}</span>
                   {item.subtitle && (
                    <span className="ml-2 text-muted-foreground text-xs truncate max-w-[200px]">
                      {item.subtitle}
                    </span>
                  )}
                  {allTrust[item.id] && allTrust[item.id].publicAttestationCount > 0 && (
                    <span className="ml-auto flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 shrink-0">
                      <Shield className="h-3 w-3" />
                      {allTrust[item.id].trustScoreGlobal}
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
                {query ? t("search.advancedSearchFor", { query }) : t("search.advancedSearch")}
              </CommandItem>
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}