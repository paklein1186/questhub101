import { useState, useMemo } from "react";
import { PageShell } from "@/components/PageShell";
import { DestinationPostComposer } from "@/components/feed/DestinationPostComposer";
import { PostCard } from "@/components/feed/PostCard";
import { FeedSortControl, type FeedSortMode } from "@/components/feed/FeedSortControl";
import { FeedDisplayToggle, type FeedDisplayMode } from "@/components/feed/FeedDisplayToggle";
import { PostTile } from "@/components/feed/PostTile";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePostUpvotes } from "@/hooks/usePostUpvote";
import { sortPosts } from "@/lib/feedSort";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTopics, useTerritories } from "@/hooks/useSupabaseData";
import { usePersona } from "@/hooks/usePersona";
import type { FeedPostWithAttachments } from "@/hooks/useFeedPosts";
import {
  Loader2, SlidersHorizontal, Hash, MapPin, Rss, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const CONTENT_TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "text", label: "Text only" },
  { value: "image", label: "With images" },
  { value: "video", label: "With videos" },
  { value: "link", label: "With links" },
  { value: "document", label: "With documents" },
];

const SOURCE_OPTIONS = [
  { value: "all", label: "All sources" },
  { value: "USER", label: "Profile walls" },
  { value: "GUILD", label: "Guilds" },
  { value: "COMPANY", label: "Organizations" },
  { value: "TERRITORY", label: "Territories" },
  { value: "QUEST", label: "Quests" },
];

export default function FeedHub() {
  const { session } = useAuth();
  const currentUser = useCurrentUser();
  const { label } = usePersona();
  const isLoggedIn = !!session;

  const [sortMode, setSortMode] = useState<FeedSortMode>("recent");
  const [displayMode, setDisplayMode] = useState<FeedDisplayMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filters
  const [sourceFilter, setSourceFilter] = useState("all");
  const [contentTypeFilter, setContentTypeFilter] = useState("all");
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [selectedTerritoryIds, setSelectedTerritoryIds] = useState<string[]>([]);

  const { data: topics = [] } = useTopics();
  const { data: territories = [] } = useTerritories();

  // Fetch global feed posts
  const { data: allPosts = [], isLoading } = useQuery<FeedPostWithAttachments[]>({
    queryKey: ["global-feed", sourceFilter],
    queryFn: async () => {
      let q = supabase
        .from("feed_posts")
        .select("*, post_attachments(*), post_territories(territory_id, territories(id, name, slug)), post_topics(topic_id, topics(id, name, slug))")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(80);

      if (sourceFilter !== "all") {
        q = q.eq("context_type", sourceFilter);
      }

      const { data, error } = await q;
      if (error) throw error;

      const posts = (data ?? []) as unknown as FeedPostWithAttachments[];

      // Fetch author profiles
      const authorIds = [...new Set(posts.map((p) => p.author_user_id))];
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles_public")
          .select("user_id, name, avatar_url")
          .in("user_id", authorIds);
        const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
        for (const post of posts) {
          post.author = profileMap.get(post.author_user_id) as any;
        }
      }

      // Fetch context names
      const tableMap: Record<string, { table: string; nameCol: string }> = {
        GUILD: { table: "guilds", nameCol: "name" },
        COMPANY: { table: "companies", nameCol: "name" },
        QUEST: { table: "quests", nameCol: "title" },
        TERRITORY: { table: "territories", nameCol: "name" },
        USER: { table: "profiles", nameCol: "name" },
      };

      const contextGroups: Record<string, string[]> = {};
      for (const post of posts) {
        if (post.context_id) {
          const t = post.context_type;
          if (!contextGroups[t]) contextGroups[t] = [];
          if (!contextGroups[t].includes(post.context_id)) contextGroups[t].push(post.context_id);
        }
      }

      const contextNames = new Map<string, string>();
      const contextLinks = new Map<string, string>();
      const linkMap: Record<string, string> = {
        GUILD: "/guilds/",
        COMPANY: "/companies/",
        QUEST: "/quests/",
        TERRITORY: "/territories/",
        USER: "/users/",
      };

      await Promise.all(
        Object.entries(contextGroups).map(async ([type, ids]) => {
          const cfg = tableMap[type];
          if (!cfg || ids.length === 0) return;
          const { data } = await (supabase
            .from(cfg.table as any)
            .select(`id, ${cfg.nameCol}${type === "USER" ? ", user_id" : ""}`)
            .in(type === "USER" ? "user_id" : "id", ids) as any);
          (data ?? []).forEach((row: any) => {
            const key = type === "USER" ? row.user_id : row.id;
            contextNames.set(`${type}:${key}`, row[cfg.nameCol]);
            if (linkMap[type]) contextLinks.set(`${type}:${key}`, linkMap[type] + key);
          });
        })
      );

      for (const post of posts) {
        if (post.context_id) {
          const k = `${post.context_type}:${post.context_id}`;
          (post as any).contextName = contextNames.get(k) || null;
          (post as any).contextLink = contextLinks.get(k) || null;
        }
      }

      return posts;
    },
    staleTime: 20_000,
  });

  // Client-side filtering
  const filtered = useMemo(() => {
    let posts = allPosts;

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      posts = posts.filter(
        (p) =>
          (p.content && p.content.toLowerCase().includes(q)) ||
          (p.author?.name && p.author.name.toLowerCase().includes(q))
      );
    }

    // Content type
    if (contentTypeFilter !== "all") {
      posts = posts.filter((p) => {
        const atts = p.post_attachments || [];
        if (contentTypeFilter === "text") return atts.length === 0;
        if (contentTypeFilter === "image") return atts.some((a) => a.type === "IMAGE");
        if (contentTypeFilter === "video") return atts.some((a) => a.type === "VIDEO_LINK");
        if (contentTypeFilter === "link") return atts.some((a) => a.type === "LINK");
        if (contentTypeFilter === "document") return atts.some((a) => a.type === "DOCUMENT");
        return true;
      });
    }

    // Topics
    if (selectedTopicIds.length > 0) {
      posts = posts.filter((p) =>
        (p.post_topics || []).some((pt) => selectedTopicIds.includes(pt.topic_id))
      );
    }

    // Territories
    if (selectedTerritoryIds.length > 0) {
      posts = posts.filter((p) =>
        (p.post_territories || []).some((pt) => selectedTerritoryIds.includes(pt.territory_id))
      );
    }

    return posts;
  }, [allPosts, searchQuery, contentTypeFilter, selectedTopicIds, selectedTerritoryIds]);

  const sorted = useMemo(() => sortPosts(filtered, sortMode), [filtered, sortMode]);

  const postIds = useMemo(() => sorted.map((p) => p.id), [sorted]);
  const { data: myUpvotes = [] } = usePostUpvotes(postIds);
  const upvotedSet = useMemo(() => new Set(myUpvotes.map((u) => u.post_id)), [myUpvotes]);

  const activeFilterCount =
    (sourceFilter !== "all" ? 1 : 0) +
    (contentTypeFilter !== "all" ? 1 : 0) +
    selectedTopicIds.length +
    selectedTerritoryIds.length;

  const toggleTopic = (id: string) =>
    setSelectedTopicIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );

  const toggleTerritory = (id: string) =>
    setSelectedTerritoryIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );

  const clearFilters = () => {
    setSourceFilter("all");
    setContentTypeFilter("all");
    setSelectedTopicIds([]);
    setSelectedTerritoryIds([]);
    setSearchQuery("");
  };

  const gridClasses: Record<Exclude<FeedDisplayMode, "list">, string> = {
    small: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3",
    medium: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4",
    large: "grid grid-cols-1 sm:grid-cols-2 gap-5",
  };

  return (
    <PageShell>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-playful">
            <Rss className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Feed</h1>
            <p className="text-sm text-muted-foreground">Activity from across the platform</p>
          </div>
        </div>

        {/* Post composer with destination picker */}
        {isLoggedIn && <DestinationPostComposer />}

        {/* Search + filters bar */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Input
                placeholder="Search posts…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 text-sm pl-3 pr-8"
              />
              {searchQuery && (
                <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setSearchQuery("")}>
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={cn(filtersOpen && "bg-muted")}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0 h-4">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>

            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={clearFilters}>
                Clear all
              </Button>
            )}

            <FeedDisplayToggle value={displayMode} onChange={setDisplayMode} />
            <FeedSortControl value={sortMode} onChange={setSortMode} />
          </div>

          {/* Collapsible filters */}
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleContent className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium mb-1.5 text-muted-foreground">Source</p>
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SOURCE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs font-medium mb-1.5 text-muted-foreground">Content type</p>
                  <Select value={contentTypeFilter} onValueChange={setContentTypeFilter}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONTENT_TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Topics chips */}
              {topics.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Hash className="h-3 w-3" /> Topics
                    </p>
                    {selectedTopicIds.length > 0 && (
                      <Button variant="ghost" size="sm" className="h-5 text-[10px] px-2" onClick={() => setSelectedTopicIds([])}>
                        Clear
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {topics.map((t) => (
                      <Badge
                        key={t.id}
                        variant={selectedTopicIds.includes(t.id) ? "default" : "outline"}
                        className="cursor-pointer text-xs"
                        onClick={() => toggleTopic(t.id)}
                      >
                        {t.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Territories chips */}
              {territories.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Territories
                    </p>
                    {selectedTerritoryIds.length > 0 && (
                      <Button variant="ghost" size="sm" className="h-5 text-[10px] px-2" onClick={() => setSelectedTerritoryIds([])}>
                        Clear
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {territories.map((t) => (
                      <Badge
                        key={t.id}
                        variant={selectedTerritoryIds.includes(t.id) ? "default" : "outline"}
                        className="cursor-pointer text-xs"
                        onClick={() => toggleTerritory(t.id)}
                      >
                        {t.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Feed content */}
        <div>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-16 rounded-xl border border-dashed border-border">
              <Rss className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground mb-1">No posts found</p>
              <p className="text-xs text-muted-foreground">Try adjusting your filters or be the first to post!</p>
            </div>
          ) : displayMode === "list" ? (
            <div className="space-y-4">
              {sorted.map((post) => (
                <PostCard key={post.id} post={post} hasUpvoted={upvotedSet.has(post.id)} />
              ))}
            </div>
          ) : (
            <div className={gridClasses[displayMode]}>
              {sorted.map((post) => (
                <PostTile key={post.id} post={post} hasUpvoted={upvotedSet.has(post.id)} size={displayMode} />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
