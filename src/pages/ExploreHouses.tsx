import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Hash, X, Users, Compass, Shield, Building2, ShoppingBag, ScrollText, Boxes, ToggleLeft, ToggleRight, Briefcase } from "lucide-react";
import { UnitCoverImage } from "@/components/UnitCoverImage";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { UniverseToggle } from "@/components/UniverseToggle";
import { usePersona } from "@/hooks/usePersona";
import {
  type UniverseMode,
  defaultUniverseForPersona,
  HOUSE_DEFINITIONS,
  getHouseLabel,
  getHouseDescription,
  getHouseIcon,
  getHousesPageCopy,
} from "@/lib/universeMapping";

// ─── Types ──────────────────────────────────────────────────
interface TopicRow {
  id: string;
  name: string;
  slug: string;
}

const PAGE_SIZE = 20;

// ─── Hooks ──────────────────────────────────────────────────

function useAllTopics() {
  return useQuery({
    queryKey: ["houses-all-topics"],
    queryFn: async () => {
      const { data } = await supabase
        .from("topics")
        .select("id, name, slug")
        .eq("is_deleted", false)
        .order("name");
      return (data ?? []) as TopicRow[];
    },
    staleTime: 300_000,
  });
}

function useTopicStats(topicIds: string[]) {
  return useQuery({
    queryKey: ["houses-topic-stats", topicIds],
    enabled: topicIds.length > 0,
    queryFn: async () => {
      const [users, quests, guilds, services, courses, companies] = await Promise.all([
        supabase.from("user_topics").select("topic_id", { count: "exact", head: true }).in("topic_id", topicIds),
        supabase.from("quest_topics").select("topic_id", { count: "exact", head: true }).in("topic_id", topicIds),
        supabase.from("guild_topics").select("topic_id", { count: "exact", head: true }).in("topic_id", topicIds),
        supabase.from("service_topics").select("topic_id", { count: "exact", head: true }).in("topic_id", topicIds),
        supabase.from("course_topics").select("topic_id", { count: "exact", head: true }).in("topic_id", topicIds),
        supabase.from("company_topics").select("topic_id", { count: "exact", head: true }).in("topic_id", topicIds),
      ]);
      return { users: users.count ?? 0, quests: quests.count ?? 0, guilds: guilds.count ?? 0, services: services.count ?? 0, courses: courses.count ?? 0, companies: companies.count ?? 0 };
    },
    staleTime: 60_000,
  });
}

// Helper: fetch entity IDs from a junction table, apply AND/OR
async function getEntityIdsFromJunction(
  junctionTable: string,
  fkCol: string,
  topicIds: string[],
  matchAll: boolean,
): Promise<string[]> {
  const { data } = await supabase.from(junctionTable as any).select("*").in("topic_id", topicIds);
  if (!data || data.length === 0) return [];

  const entityTopics = new Map<string, Set<string>>();
  data.forEach((j: any) => {
    const eid = j[fkCol];
    if (!entityTopics.has(eid)) entityTopics.set(eid, new Set());
    entityTopics.get(eid)!.add(j.topic_id);
  });

  if (matchAll && topicIds.length > 1) {
    return [...entityTopics.entries()]
      .filter(([, topics]) => topicIds.every(t => topics.has(t)))
      .map(([id]) => id);
  }
  return [...entityTopics.keys()];
}

function useFilteredQuests(topicIds: string[], matchAll: boolean) {
  return useQuery({
    queryKey: ["houses-quests", topicIds, matchAll],
    enabled: topicIds.length > 0,
    queryFn: async () => {
      const ids = await getEntityIdsFromJunction("quest_topics", "quest_id", topicIds, matchAll);
      if (ids.length === 0) return [];
      const { data } = await supabase.from("quests").select("id, title, description, reward_xp, status, cover_image_url").in("id", ids).eq("is_deleted", false).eq("is_draft", false).limit(PAGE_SIZE);
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

function useFilteredGuilds(topicIds: string[], matchAll: boolean) {
  return useQuery({
    queryKey: ["houses-guilds", topicIds, matchAll],
    enabled: topicIds.length > 0,
    queryFn: async () => {
      const ids = await getEntityIdsFromJunction("guild_topics", "guild_id", topicIds, matchAll);
      if (ids.length === 0) return [];
      const { data } = await supabase.from("guilds").select("id, name, description, logo_url, type").in("id", ids).eq("is_deleted", false).eq("is_draft", false).limit(PAGE_SIZE);
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

function useFilteredServices(topicIds: string[], matchAll: boolean) {
  return useQuery({
    queryKey: ["houses-services", topicIds, matchAll],
    enabled: topicIds.length > 0,
    queryFn: async () => {
      const ids = await getEntityIdsFromJunction("service_topics", "service_id", topicIds, matchAll);
      if (ids.length === 0) return [];
      const { data } = await supabase.from("services").select("id, title, description, image_url, price_amount, price_currency").in("id", ids).eq("is_deleted", false).eq("is_draft", false).limit(PAGE_SIZE);
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

function useFilteredCourses(topicIds: string[], matchAll: boolean) {
  return useQuery({
    queryKey: ["houses-courses", topicIds, matchAll],
    enabled: topicIds.length > 0,
    queryFn: async () => {
      const ids = await getEntityIdsFromJunction("course_topics", "course_id", topicIds, matchAll);
      if (ids.length === 0) return [];
      const { data } = await supabase.from("courses").select("id, title, description, cover_image_url, level").in("id", ids).eq("is_deleted", false).eq("is_published", true).limit(PAGE_SIZE);
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

function useFilteredUsers(topicIds: string[], matchAll: boolean) {
  return useQuery({
    queryKey: ["houses-users", topicIds, matchAll],
    enabled: topicIds.length > 0,
    queryFn: async () => {
      const { data: junctions } = await supabase
        .from("user_topics")
        .select("user_id, topic_id")
        .in("topic_id", topicIds);

      if (!junctions || junctions.length === 0) return [];

      const userTopics = new Map<string, Set<string>>();
      junctions.forEach(j => {
        if (!userTopics.has(j.user_id)) userTopics.set(j.user_id, new Set());
        userTopics.get(j.user_id)!.add(j.topic_id);
      });

      let userIds: string[];
      if (matchAll && topicIds.length > 1) {
        userIds = [...userTopics.entries()]
          .filter(([, topics]) => topicIds.every(t => topics.has(t)))
          .map(([id]) => id);
      } else {
        userIds = [...userTopics.keys()];
      }

      if (userIds.length === 0) return [];

      const { data } = await supabase
        .from("profiles_public")
        .select("user_id, name, avatar_url, headline, xp, role")
        .in("user_id", userIds)
        .eq("has_completed_onboarding", true)
        .limit(PAGE_SIZE);

      return data ?? [];
    },
    staleTime: 30_000,
  });
}

function useFilteredCompanies(topicIds: string[], matchAll: boolean) {
  return useQuery({
    queryKey: ["houses-companies", topicIds, matchAll],
    enabled: topicIds.length > 0,
    queryFn: async () => {
      const ids = await getEntityIdsFromJunction("company_topics", "company_id", topicIds, matchAll);
      if (ids.length === 0) return [];
      const { data } = await supabase.from("companies").select("id, name, description, logo_url, sector").in("id", ids).eq("is_deleted", false).limit(PAGE_SIZE);
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

function useFilteredPods(topicIds: string[], matchAll: boolean) {
  return useQuery({
    queryKey: ["houses-pods", topicIds, matchAll],
    enabled: topicIds.length > 0,
    queryFn: async () => {
      if (matchAll && topicIds.length > 1) return [];
      const { data } = await supabase
        .from("pods")
        .select("id, name, description, type, image_url")
        .in("topic_id", topicIds)
        .eq("is_deleted", false)
        .eq("is_draft", false)
        .limit(PAGE_SIZE);
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

// ─── Component ──────────────────────────────────────────────

interface Props {
  bare?: boolean;
}

export default function ExploreHouses({ bare }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: allTopics, isLoading: topicsLoading } = useAllTopics();
  const { persona } = usePersona();

  // Universe mode
  const [universeMode, setUniverseMode] = useState<UniverseMode | null>(null);
  const effectiveUniverse: UniverseMode = universeMode ?? defaultUniverseForPersona(persona);
  const pageCopy = getHousesPageCopy(effectiveUniverse);

  // Read initial state from URL
  const initialHouses = useMemo(() => {
    const h = searchParams.get("houses");
    return h ? h.split(",").filter(Boolean) : [];
  }, []);

  const [selectedSlugs, setSelectedSlugs] = useState<string[]>(initialHouses);
  const [matchAll, setMatchAll] = useState(searchParams.get("mode") === "all");
  const [tab, setTab] = useState("overview");

  const selectedIds = useMemo(() => {
    if (!allTopics) return [];
    return allTopics
      .filter(t => selectedSlugs.includes(t.slug))
      .map(t => t.id);
  }, [allTopics, selectedSlugs]);

  const updateUrl = useCallback((slugs: string[], all: boolean) => {
    const params: Record<string, string> = {};
    if (slugs.length > 0) params.houses = slugs.join(",");
    if (all) params.mode = "all";
    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  const toggleHouse = (slug: string) => {
    const next = selectedSlugs.includes(slug)
      ? selectedSlugs.filter(s => s !== slug)
      : [...selectedSlugs, slug];
    setSelectedSlugs(next);
    updateUrl(next, matchAll);
  };

  const clearAll = () => {
    setSelectedSlugs([]);
    updateUrl([], matchAll);
  };

  const toggleMode = () => {
    const next = !matchAll;
    setMatchAll(next);
    updateUrl(selectedSlugs, next);
  };

  /** Navigate to Explore hub with this house pre-selected as a topic filter */
  const navigateToExploreWithHouse = (slug: string) => {
    const topic = allTopics?.find(t => t.slug === slug);
    if (!topic) return;
    // Navigate to explore quests tab with topic pre-selected via URL
    navigate(`/explore?tab=quests&houses=${slug}`);
  };

  // Data hooks
  const { data: stats } = useTopicStats(selectedIds);
  const { data: quests, isLoading: questsLoading } = useFilteredQuests(selectedIds, matchAll);
  const { data: guilds, isLoading: guildsLoading } = useFilteredGuilds(selectedIds, matchAll);
  const { data: services, isLoading: servicesLoading } = useFilteredServices(selectedIds, matchAll);
  const { data: courses, isLoading: coursesLoading } = useFilteredCourses(selectedIds, matchAll);
  const { data: users, isLoading: usersLoading } = useFilteredUsers(selectedIds, matchAll);
  const { data: pods, isLoading: podsLoading } = useFilteredPods(selectedIds, matchAll);
  const { data: companies, isLoading: companiesLoading } = useFilteredCompanies(selectedIds, matchAll);

  const hasSelection = selectedIds.length > 0;

  /** Get the display label for a topic based on universe */
  const getTopicLabel = useCallback((topic: TopicRow) => {
    const houseDef = HOUSE_DEFINITIONS[topic.slug];
    if (houseDef) return getHouseLabel(topic.slug, effectiveUniverse);
    return topic.name;
  }, [effectiveUniverse]);

  const content = (
    <div className="space-y-6">
      {/* Universe toggle */}
      <div className="flex items-center gap-3 flex-wrap">
        <UniverseToggle value={effectiveUniverse} onChange={setUniverseMode} />
      </div>

      {/* House cards grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <Hash className="h-5 w-5 text-primary" /> {effectiveUniverse === "creative" ? "Creative Houses" : effectiveUniverse === "impact" ? "Impact Houses" : "All Houses"}
          </h2>
          {selectedSlugs.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs">
              Clear all
            </Button>
          )}
        </div>

        {topicsLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(allTopics ?? []).map(t => {
              const isSelected = selectedSlugs.includes(t.slug);
              const houseDef = HOUSE_DEFINITIONS[t.slug];
              const icon = houseDef ? getHouseIcon(t.slug) : "🏠";
              const label = getTopicLabel(t);
              const desc = houseDef ? getHouseDescription(t.slug, effectiveUniverse) : "";

              return (
                <button
                  key={t.id}
                  onClick={() => toggleHouse(t.slug)}
                  onDoubleClick={() => navigateToExploreWithHouse(t.slug)}
                  className={`group relative text-left rounded-xl border p-4 transition-all duration-200 cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-semibold text-sm truncate">{label}</h3>
                        {isSelected && <X className="h-3.5 w-3.5 text-primary shrink-0" />}
                      </div>
                      {desc && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{desc}</p>
                      )}
                    </div>
                  </div>
                  {/* Click to explore hint */}
                  <div className="absolute bottom-1.5 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] text-muted-foreground">click to select · double-click to explore</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected chips + mode toggle */}
      {selectedSlugs.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          {selectedSlugs.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleMode}
              className="text-xs gap-1.5"
            >
              {matchAll ? <ToggleRight className="h-3.5 w-3.5 text-primary" /> : <ToggleLeft className="h-3.5 w-3.5" />}
              {matchAll ? "Match ALL" : "Match ANY"}
            </Button>
          )}
          <div className="flex flex-wrap gap-1.5">
            {selectedSlugs.map(slug => {
              const topic = allTopics?.find(t => t.slug === slug);
              if (!topic) return null;
              return (
                <Badge
                  key={slug}
                  variant="default"
                  className="text-xs gap-1.5 cursor-pointer"
                  onClick={() => toggleHouse(slug)}
                >
                  {getHouseIcon(slug)} {getTopicLabel(topic)}
                  <X className="h-3 w-3" />
                </Badge>
              );
            })}
          </div>
          {selectedSlugs.length > 1 && (
            <span className="text-xs text-muted-foreground">
              {matchAll
                ? "Showing items that belong to all selected Houses"
                : "Showing items that belong to any selected House"}
            </span>
          )}
        </div>
      )}

      {/* Results */}
      {!hasSelection ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-border bg-muted/20">
          <Boxes className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-display font-semibold text-lg">Pick one or more Houses to explore</p>
          <p className="text-sm text-muted-foreground mt-1">
            {effectiveUniverse === "creative"
              ? "Houses are creative realms that group circles, creations, and collaborators."
              : effectiveUniverse === "impact"
              ? "Houses are thematic lenses that group missions, guilds, and services."
              : "Houses are thematic lenses that group quests, guilds, users, and more."}
          </p>
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="quests">Quests {quests?.length ? `(${quests.length})` : ""}</TabsTrigger>
            <TabsTrigger value="users">Users {users?.length ? `(${users.length})` : ""}</TabsTrigger>
            <TabsTrigger value="guilds">Guilds {guilds?.length ? `(${guilds.length})` : ""}</TabsTrigger>
            <TabsTrigger value="pods">Pods {pods?.length ? `(${pods.length})` : ""}</TabsTrigger>
            <TabsTrigger value="services">Services {services?.length ? `(${services.length})` : ""}</TabsTrigger>
            <TabsTrigger value="courses">Courses {courses?.length ? `(${courses.length})` : ""}</TabsTrigger>
            <TabsTrigger value="companies">Companies {companies?.length ? `(${companies.length})` : ""}</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="mt-6 space-y-8">
            <SectionPreview title="Quests" icon={Compass} items={quests} loading={questsLoading} tab="quests" setTab={setTab} renderItem={(q: any) => (
              <Link key={q.id} to={`/quests/${q.id}`} className="block rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-all">
                <UnitCoverImage type="QUEST" imageUrl={q.cover_image_url} name={q.title} height="h-24" />
                <div className="p-4">
                  <h4 className="font-display font-semibold text-sm">{q.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{q.description}</p>
                  <Badge variant="secondary" className="text-[10px] mt-2">{q.reward_xp} XP</Badge>
                </div>
              </Link>
            )} />

            <SectionPreview title="Users" icon={Users} items={users} loading={usersLoading} tab="users" setTab={setTab} renderItem={(u: any) => (
              <Link key={u.user_id} to={`/users/${u.user_id}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-all">
                <Avatar className="h-9 w-9"><AvatarImage src={u.avatar_url} /><AvatarFallback className="text-xs">{u.name?.[0]}</AvatarFallback></Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{u.name}</p>
                  {u.headline && <p className="text-xs text-muted-foreground truncate">{u.headline}</p>}
                </div>
              </Link>
            )} />

            <SectionPreview title="Guilds" icon={Shield} items={guilds} loading={guildsLoading} tab="guilds" setTab={setTab} renderItem={(g: any) => (
              <Link key={g.id} to={`/guilds/${g.id}`} className="flex items-center gap-3 rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-all">
                <UnitCoverImage type="GUILD" logoUrl={g.logo_url} name={g.name} height="h-full" className="w-16 shrink-0" />
                <div className="min-w-0 py-3 pr-3">
                  <p className="text-sm font-semibold truncate">{g.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{g.description}</p>
                </div>
              </Link>
            )} />

            <SectionPreview title="Services" icon={ShoppingBag} items={services} loading={servicesLoading} tab="services" setTab={setTab} renderItem={(s: any) => (
              <Link key={s.id} to={`/services/${s.id}`} className="block rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-all">
                <UnitCoverImage type="SERVICE" imageUrl={s.image_url} name={s.title} height="h-20" />
                <div className="p-4">
                  <h4 className="font-display font-semibold text-sm">{s.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{s.description}</p>
                </div>
              </Link>
            )} />

            <SectionPreview title="Companies" icon={Building2} items={companies} loading={companiesLoading} tab="companies" setTab={setTab} renderItem={(c: any) => (
              <Link key={c.id} to={`/companies/${c.id}`} className="flex items-center gap-3 rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-all">
                <UnitCoverImage type="COMPANY" logoUrl={c.logo_url} name={c.name} height="h-full" className="w-16 shrink-0" />
                <div className="min-w-0 py-3 pr-3">
                  <p className="text-sm font-semibold truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.description}</p>
                </div>
              </Link>
            )} />
          </TabsContent>

          {/* Quests */}
          <TabsContent value="quests" className="mt-6">
            <EntityGrid items={quests} loading={questsLoading} empty="No quests found for these Houses." renderItem={(q: any) => (
              <Link key={q.id} to={`/quests/${q.id}`} className="block rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-all">
                <UnitCoverImage type="QUEST" imageUrl={q.cover_image_url} name={q.title} height="h-28" />
                <div className="p-4">
                  <h4 className="font-display font-semibold">{q.title}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{q.description}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary" className="text-[10px]">{q.reward_xp} XP</Badge>
                    <Badge variant="outline" className="text-[10px] capitalize">{q.status?.toLowerCase().replace("_", " ")}</Badge>
                  </div>
                </div>
              </Link>
            )} />
          </TabsContent>

          {/* Users */}
          <TabsContent value="users" className="mt-6">
            <EntityGrid items={users} loading={usersLoading} empty="No users found for these Houses." renderItem={(u: any) => (
              <Link key={u.user_id} to={`/users/${u.user_id}`} className="group block rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12"><AvatarImage src={u.avatar_url} /><AvatarFallback className="text-sm">{u.name?.[0]}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{u.name}</p>
                    {u.headline && <p className="text-xs text-muted-foreground truncate mt-0.5">{u.headline}</p>}
                  </div>
                  {u.xp > 0 && <Badge variant="secondary" className="text-[10px]">{u.xp} XP</Badge>}
                </div>
              </Link>
            )} />
          </TabsContent>

          {/* Guilds */}
          <TabsContent value="guilds" className="mt-6">
            <EntityGrid items={guilds} loading={guildsLoading} empty="No guilds found for these Houses." renderItem={(g: any) => (
              <Link key={g.id} to={`/guilds/${g.id}`} className="block rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-all">
                <UnitCoverImage type="GUILD" logoUrl={g.logo_url} name={g.name} height="h-24" />
                <div className="p-4">
                  <h4 className="font-display font-semibold">{g.name}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-1">{g.description}</p>
                </div>
              </Link>
            )} />
          </TabsContent>

          {/* Pods */}
          <TabsContent value="pods" className="mt-6">
            <EntityGrid items={pods} loading={podsLoading} empty="No pods found for these Houses." renderItem={(p: any) => (
              <Link key={p.id} to={`/pods/${p.id}`} className="block rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-all">
                <UnitCoverImage type="POD" imageUrl={p.image_url} name={p.name} height="h-24" />
                <div className="p-4">
                  <h4 className="font-display font-semibold">{p.name}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-1">{p.description}</p>
                  <Badge variant="outline" className="text-[10px] mt-2 capitalize">{p.type?.toLowerCase().replace("_", " ")}</Badge>
                </div>
              </Link>
            )} />
          </TabsContent>

          {/* Services */}
          <TabsContent value="services" className="mt-6">
            <EntityGrid items={services} loading={servicesLoading} empty="No services found for these Houses." renderItem={(s: any) => (
              <Link key={s.id} to={`/services/${s.id}`} className="block rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-all">
                <UnitCoverImage type="SERVICE" imageUrl={s.image_url} name={s.title} height="h-24" />
                <div className="p-4">
                  <h4 className="font-display font-semibold">{s.title}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{s.description}</p>
                  {s.price_amount != null && <Badge variant="secondary" className="text-[10px] mt-2">{s.price_amount} {s.price_currency}</Badge>}
                </div>
              </Link>
            )} />
          </TabsContent>

          {/* Courses */}
          <TabsContent value="courses" className="mt-6">
            <EntityGrid items={courses} loading={coursesLoading} empty="No courses found for these Houses." renderItem={(c: any) => (
              <Link key={c.id} to={`/courses/${c.id}`} className="block rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-all">
                <UnitCoverImage type="COURSE" imageUrl={c.cover_image_url} name={c.title} height="h-24" />
                <div className="p-4">
                  <h4 className="font-display font-semibold">{c.title}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{c.description}</p>
                  <Badge variant="outline" className="text-[10px] mt-2 capitalize">{c.level}</Badge>
                </div>
              </Link>
            )} />
          </TabsContent>

          {/* Companies */}
          <TabsContent value="companies" className="mt-6">
            <EntityGrid items={companies} loading={companiesLoading} empty="No companies found for these Houses." renderItem={(c: any) => (
              <Link key={c.id} to={`/companies/${c.id}`} className="block rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-all">
                <UnitCoverImage type="COMPANY" logoUrl={c.logo_url} name={c.name} height="h-24" />
                <div className="p-4">
                  <h4 className="font-display font-semibold">{c.name}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-1">{c.description}</p>
                  {c.sector && <Badge variant="outline" className="text-[10px] mt-2 capitalize">{c.sector}</Badge>}
                </div>
              </Link>
            )} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );

  if (bare) return content;

  return (
    <PageShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Hash className="h-7 w-7 text-primary" /> {pageCopy.title}
        </h1>
        <p className="text-muted-foreground mt-1">
          {pageCopy.subtitle}
        </p>
      </div>
      {content}
    </PageShell>
  );
}

// ─── Helpers ────────────────────────────────────────────────

function SectionPreview({ title, icon: Icon, items, loading, tab, setTab, renderItem }: {
  title: string;
  icon: React.ElementType;
  items: any[] | undefined;
  loading: boolean;
  tab: string;
  setTab: (t: string) => void;
  renderItem: (item: any) => React.ReactNode;
}) {
  if (loading) return <div className="space-y-2"><Skeleton className="h-6 w-32" /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div></div>;
  if (!items || items.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-primary" /> {title}
        </h3>
        {items.length > 3 && (
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => setTab(tab)}>
            View all ({items.length})
          </Button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.slice(0, 6).map(renderItem)}
      </div>
    </div>
  );
}

function EntityGrid({ items, loading, empty, renderItem }: {
  items: any[] | undefined;
  loading: boolean;
  empty: string;
  renderItem: (item: any) => React.ReactNode;
}) {
  if (loading) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>;
  if (!items || items.length === 0) return <div className="text-center py-16 text-muted-foreground"><p>{empty}</p></div>;
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map(renderItem)}</div>;
}
