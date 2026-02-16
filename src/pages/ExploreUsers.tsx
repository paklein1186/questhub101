import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Users, Search, ArrowUpDown, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ExploreFilters, ExploreFilterValues, defaultFilters } from "@/components/ExploreFilters";
import { useHouseFilter } from "@/hooks/useHouseFilter";
import { useAuth } from "@/hooks/useAuth";
import { PublicExploreCTA } from "@/components/PublicExploreCTA";
import { redactName } from "@/lib/publicMode";
import { XpLevelBadge } from "@/components/XpLevelBadge";
import { computeLevelFromXp } from "@/lib/xpCreditsConfig";
import { FollowOnHoverButton, useFollowedUserIds } from "@/components/FollowOnHoverButton";

// ─── Types ───────────────────────────────────────────────────
interface ExploreUser {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
  role: string;
  xp: number;
  persona_type: string;
  created_at: string;
  topics: { id: string; name: string }[];
  territories: { id: string; name: string }[];
}

const PAGE_SIZE = 24;

const ROLE_LABELS: Record<string, string> = {
  GAMECHANGER: "Gamechanger",
  ECOSYSTEM_BUILDER: "Ecosystem Builder",
  BOTH: "Both",
};

const PERSONA_LABELS: Record<string, string> = {
  IMPACT: "Impact",
  CREATIVE: "Creative",
  HYBRID: "Hybrid",
};

// ─── Data Fetching ───────────────────────────────────────────

function useExploreUsers(filters: {
  search: string;
  role: string;
  topicIds: string[];
  territoryIds: string[];
  sort: string;
  page: number;
}) {
  return useQuery({
    queryKey: ["explore-users", filters],
    queryFn: async () => {
      let topicUserIds: string[] | null = null;
      let territoryUserIds: string[] | null = null;

      if (filters.topicIds.length > 0) {
        const { data } = await supabase
          .from("user_topics")
          .select("user_id")
          .in("topic_id", filters.topicIds);
        topicUserIds = [...new Set((data ?? []).map((d) => d.user_id))];
        if (topicUserIds.length === 0) return { users: [], total: 0 };
      }

      if (filters.territoryIds.length > 0) {
        const { data } = await supabase
          .from("user_territories")
          .select("user_id")
          .in("territory_id", filters.territoryIds);
        territoryUserIds = [...new Set((data ?? []).map((d) => d.user_id))];
        if (territoryUserIds.length === 0) return { users: [], total: 0 };
      }

      let allowedUserIds: string[] | null = null;
      if (topicUserIds && territoryUserIds) {
        const set = new Set(territoryUserIds);
        allowedUserIds = topicUserIds.filter((id) => set.has(id));
        if (allowedUserIds.length === 0) return { users: [], total: 0 };
      } else {
        allowedUserIds = topicUserIds ?? territoryUserIds;
      }

      let query = supabase
        .from("profiles_public")
        .select("*", { count: "exact" })
        .eq("has_completed_onboarding", true);

      if (filters.search.trim()) {
        const s = `%${filters.search.trim()}%`;
        query = query.or(`name.ilike.${s},headline.ilike.${s}`);
      }

      if (filters.role && filters.role !== "all") {
        query = query.eq("role", filters.role);
      }

      if (allowedUserIds) {
        query = query.in("user_id", allowedUserIds);
      }

      if (filters.sort === "newest") {
        query = query.order("created_at", { ascending: false });
      } else if (filters.sort === "xp") {
        query = query.order("xp", { ascending: false });
      } else {
        query = query.order("name", { ascending: true });
      }

      const from = filters.page * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1);

      const { data: profiles, count } = await query;
      if (!profiles || profiles.length === 0) return { users: [], total: count ?? 0 };

      const userIds = profiles.map((p) => p.user_id).filter(Boolean) as string[];

      const [topicsRes, terrRes] = await Promise.all([
        supabase.from("user_topics").select("user_id, topic_id, topics(id, name)").in("user_id", userIds),
        supabase.from("user_territories").select("user_id, territory_id, territories(id, name)").in("user_id", userIds),
      ]);

      const topicMap = new Map<string, { id: string; name: string }[]>();
      (topicsRes.data ?? []).forEach((row: any) => {
        const uid = row.user_id;
        if (!topicMap.has(uid)) topicMap.set(uid, []);
        if (row.topics) topicMap.get(uid)!.push({ id: row.topics.id, name: row.topics.name });
      });

      const terrMap = new Map<string, { id: string; name: string }[]>();
      (terrRes.data ?? []).forEach((row: any) => {
        const uid = row.user_id;
        if (!terrMap.has(uid)) terrMap.set(uid, []);
        if (row.territories) terrMap.get(uid)!.push({ id: row.territories.id, name: row.territories.name });
      });

      const users: ExploreUser[] = profiles.map((p) => ({
        id: p.user_id ?? "",
        user_id: p.user_id ?? "",
        name: p.name ?? "Unknown",
        avatar_url: p.avatar_url,
        headline: p.headline,
        bio: p.bio,
        role: p.role ?? "GAMECHANGER",
        xp: p.xp ?? 0,
        persona_type: (p as any).persona_type ?? "UNSET",
        created_at: p.created_at ?? "",
        topics: topicMap.get(p.user_id ?? "") ?? [],
        territories: terrMap.get(p.user_id ?? "") ?? [],
      }));

      return { users, total: count ?? 0 };
    },
    staleTime: 30_000,
  });
}

// ─── Component ───────────────────────────────────────────────

export default function ExploreUsers({ bare }: { bare?: boolean }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<ExploreFilterValues>(defaultFilters);
  const hf = useHouseFilter();
  const { session } = useAuth();
  const isLoggedIn = !!session;

  // When house filter is active and no manual topic filter set, inject user's topics
  const effectiveTopicIds = filters.topicIds;

  const { data, isLoading } = useExploreUsers({
    search,
    role: filters.role,
    topicIds: effectiveTopicIds,
    territoryIds: filters.territoryIds,
    sort,
    page,
  });

  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const content = (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder={isLoggedIn ? "Search by name, headline, or bio…" : "Search by first name…"}
            className="pl-9"
          />
        </div>
        <Select value={sort} onValueChange={(v) => { setSort(v); setPage(0); }}>
          <SelectTrigger className="w-[150px]">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="relevance">A–Z</SelectItem>
            <SelectItem value="xp">Most XP</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ExploreFilters
        filters={filters}
        onChange={(f: ExploreFilterValues) => { setFilters(f); setPage(0); }}
        config={{ showTopics: true, showTerritories: true, showRole: true }}
        universeMode={hf.universeMode}
        onUniverseModeChange={hf.setUniverseMode}
      />

      {!isLoggedIn && (
        <PublicExploreCTA
          message="You're seeing a preview. Log in to view full profiles and connect with people."
          compact
        />
      )}

      <p className="text-sm text-muted-foreground">
        {isLoading ? "Loading…" : `${total} user${total !== 1 ? "s" : ""} found`}
      </p>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No humans found</p>
          <p className="text-sm mt-1">Try adjusting your filters or search query.</p>
        </div>
      ) : (
        <UserCardGrid users={users} isLoggedIn={isLoggedIn} />
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="flex items-center text-sm text-muted-foreground px-3">Page {page + 1} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );

  if (bare) return content;

  return (
    <PageShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Users className="h-7 w-7 text-primary" /> Discover People
        </h1>
        <p className="text-muted-foreground mt-1">Browse and connect with community members.</p>
      </div>
      {content}
    </PageShell>
  );
}

// ─── User Card Grid (with bulk follow check) ────────────────

function UserCardGrid({ users, isLoggedIn }: { users: ExploreUser[]; isLoggedIn: boolean }) {
  const userIds = useMemo(() => users.map(u => u.user_id), [users]);
  const { data: followedIds = new Set<string>() } = useFollowedUserIds(userIds);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {users.map((u) => (
        <UserCard key={u.id} user={u} isLoggedIn={isLoggedIn} isFollowed={followedIds.has(u.user_id)} />
      ))}
    </div>
  );
}

// ─── User Card ───────────────────────────────────────────────

function UserCard({ user, isLoggedIn, isFollowed = false }: { user: ExploreUser; isLoggedIn: boolean; isFollowed?: boolean }) {
  const displayName = isLoggedIn ? user.name : redactName(user.name);
  const personaLabel = PERSONA_LABELS[user.persona_type];

  return (
    <Link
      to={isLoggedIn ? `/users/${user.user_id}` : "/login"}
      className="relative group block rounded-xl border border-border bg-card p-4 transition-all hover:shadow-md hover:border-primary/30"
    >
      {isLoggedIn && <FollowOnHoverButton targetUserId={user.user_id} isFollowed={isFollowed} />}
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12 shrink-0">
          {isLoggedIn ? (
            <AvatarImage src={user.avatar_url ?? undefined} />
          ) : null}
          <AvatarFallback className="text-sm font-semibold">{user.name?.[0] ?? "?"}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{displayName}</p>
          {isLoggedIn && user.headline && <p className="text-xs text-muted-foreground truncate mt-0.5">{user.headline}</p>}
          {!isLoggedIn && personaLabel && (
            <Badge variant="outline" className="text-[10px] mt-0.5">
              <Sparkles className="h-2.5 w-2.5 mr-0.5" />{personaLabel}
            </Badge>
          )}
          {isLoggedIn && (
            <Badge variant="outline" className="text-[10px] mt-1">{ROLE_LABELS[user.role] ?? user.role}</Badge>
          )}
        </div>
      {isLoggedIn && user.xp > 0 && (
          <XpLevelBadge level={computeLevelFromXp(user.xp)} xp={user.xp} compact />
        )}
      </div>
      {user.topics.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {user.topics.slice(0, 3).map((t) => (
            <Badge key={t.id} variant="outline" className="text-[10px] px-1.5 py-0 bg-muted/50">{t.name}</Badge>
          ))}
          {user.topics.length > 3 && <span className="text-[10px] text-muted-foreground">+{user.topics.length - 3}</span>}
        </div>
      )}
      {isLoggedIn && user.territories.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {user.territories.slice(0, 2).map((t) => (
            <Badge key={t.id} variant="outline" className="text-[10px] px-1.5 py-0">{t.name}</Badge>
          ))}
          {user.territories.length > 2 && <span className="text-[10px] text-muted-foreground">+{user.territories.length - 2}</span>}
        </div>
      )}
      {!isLoggedIn && (
        <p className="text-[10px] text-muted-foreground mt-3 italic">Log in to see full profile & connect</p>
      )}
    </Link>
  );
}
