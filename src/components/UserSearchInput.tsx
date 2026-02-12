import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserSearchResult {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Props {
  onSelect: (user: UserSearchResult) => void;
  placeholder?: string;
  excludeUserIds?: string[];
}

export function UserSearchInput({ onSelect, placeholder = "Search by name…", excludeUserIds = [] }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) { setResults([]); return; }

    const timeout = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .ilike("display_name", `%${trimmed}%`)
        .limit(10);
      const filtered = (data ?? []).filter(
        (p) => !excludeUserIds.includes(p.user_id)
      ) as UserSearchResult[];
      setResults(filtered);
      setOpen(filtered.length > 0);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, excludeUserIds]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        placeholder={placeholder}
        onFocus={() => results.length > 0 && setOpen(true)}
      />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
      )}
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border border-border bg-popover shadow-lg max-h-48 overflow-y-auto">
          {results.map((user) => (
            <button
              key={user.user_id}
              type="button"
              className={cn(
                "flex items-center gap-2.5 w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
              )}
              onClick={() => {
                onSelect(user);
                setQuery(user.display_name || "");
                setOpen(false);
              }}
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className="text-[9px] bg-primary/5 text-primary">
                  {user.display_name?.[0]?.toUpperCase() || <User className="h-3 w-3" />}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{user.display_name || "Unnamed user"}</span>
            </button>
          ))}
        </div>
      )}
      {open && query.trim().length >= 2 && !loading && results.length === 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border border-border bg-popover shadow-lg px-3 py-3 text-xs text-muted-foreground text-center">
          No users found
        </div>
      )}
    </div>
  );
}
