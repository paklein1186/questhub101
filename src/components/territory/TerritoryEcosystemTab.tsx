import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Loader2, Compass, Shield, CircleDot, Building2, GraduationCap, Briefcase,
  Users, Search, User, MapPin, Tag, ChevronDown, ChevronUp, Network,
} from "lucide-react";
import { FollowOnHoverButton, useFollowedUserIds } from "@/components/FollowOnHoverButton";

interface Props {
  territoryId: string;
}

type EntitySection = {
  key: string;
  label: string;
  icon: React.ElementType;
  linkPrefix: string;
  items: { id: string; name: string; description?: string | null; territoryId?: string }[];
};

type TerritoryPerson = {
  user_id: string;
  name: string;
  avatar_url: string | null;
  headline: string | null;
  persona_type: string;
  location: string | null;
  territory_id: string; // the explicit territory the user selected
  topic_ids: string[];
};

type TerritoryChild = {
  id: string;
  name: string;
  level: string;
  depth: number;
};

type TopicInfo = {
  id: string;
  name: string;
};

const PERSONA_OPTIONS = [
  { value: "all", label: "All" },
  { value: "creative", label: "Creative" },
  { value: "impact", label: "Impact" },
  { value: "hybrid", label: "Hybrid" },
];

// ─── LEVEL HIERARCHY for grouping ───
const LEVEL_ORDER: Record<string, number> = {
  GLOBAL: 0, CONTINENT: 1, OTHER: 1, NATIONAL: 2, REGION: 3, PROVINCE: 4, TOWN: 5, LOCALITY: 6,
};

const CHILD_LEVEL: Record<string, string[]> = {
  GLOBAL: ["CONTINENT", "OTHER"],
  CONTINENT: ["NATIONAL"],
  OTHER: ["NATIONAL"],
  NATIONAL: ["REGION"],
  REGION: ["PROVINCE", "TOWN"],
  PROVINCE: ["TOWN", "LOCALITY"],
  TOWN: ["LOCALITY"],
  LOCALITY: [],
};

// ─── Hook: get descendants of a territory via closure table ───
function useDescendantIds(territoryId: string, includeNested: boolean) {
  return useQuery({
    queryKey: ["territory-descendants", territoryId, includeNested],
    queryFn: async () => {
      if (!includeNested) return [territoryId];
      const { data } = await supabase
        .from("territory_closure")
        .select("descendant_id")
        .eq("ancestor_id", territoryId);
      return (data ?? []).map((d: any) => d.descendant_id) as string[];
    },
  });
}

// ─── Hook: get direct/near children for grouping distribution ───
function useChildTerritories(territoryId: string) {
  return useQuery({
    queryKey: ["territory-children-map", territoryId],
    queryFn: async () => {
      // Get all descendants with their territory info
      const { data } = await supabase
        .from("territory_closure")
        .select("descendant_id, depth")
        .eq("ancestor_id", territoryId)
        .gt("depth", 0);

      if (!data?.length) return { children: [] as TerritoryChild[], childMap: new Map<string, string>() };

      const descIds = data.map((d: any) => d.descendant_id);
      const depthMap = new Map(data.map((d: any) => [d.descendant_id, d.depth]));

      const { data: territories } = await supabase
        .from("territories")
        .select("id, name, level, parent_id")
        .in("id", descIds);

      const terrMap = new Map((territories ?? []).map((t: any) => [t.id, t]));

      // Get current territory level
      const { data: currentTerr } = await supabase
        .from("territories")
        .select("level")
        .eq("id", territoryId)
        .single();

      const currentLevel = currentTerr?.level || "OTHER";
      const groupLevels = CHILD_LEVEL[currentLevel] || [];

      // Find direct grouping children (one level below current)
      const groupChildren = (territories ?? [])
        .filter((t: any) => groupLevels.includes(t.level))
        .map((t: any) => ({
          id: t.id,
          name: t.name,
          level: t.level,
          depth: depthMap.get(t.id) || 1,
        })) as TerritoryChild[];

      // Build a map: for every descendant, find which groupChild it belongs to
      // by walking up the ancestry
      const childMap = new Map<string, string>();
      const groupChildIds = new Set(groupChildren.map(c => c.id));

      for (const desc of data) {
        const descId = desc.descendant_id as string;
        if (groupChildIds.has(descId)) {
          childMap.set(descId, descId);
          continue;
        }
        // Walk up: find the groupChild that is an ancestor of this descendant
        // Use closure table: find intersection of ancestors of descId and groupChildIds
        const { data: ancestors } = await supabase
          .from("territory_closure")
          .select("ancestor_id")
          .eq("descendant_id", descId)
          .gt("depth", 0);
        const ancestorIds = (ancestors ?? []).map((a: any) => a.ancestor_id);
        const matchedGroup = ancestorIds.find(a => groupChildIds.has(a));
        if (matchedGroup) {
          childMap.set(descId, matchedGroup);
        }
      }

      return { children: groupChildren.sort((a, b) => a.name.localeCompare(b.name)), childMap };
    },
  });
}

// ─── Hook: get all topics available for filtering ───
function useTopicsList() {
  return useQuery({
    queryKey: ["all-topics-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("topics")
        .select("id, name")
        .order("name");
      return (data ?? []) as TopicInfo[];
    },
  });
}

// ─── Hook: ecosystem entities with hierarchy support ───
function useHierarchicalEcosystem(territoryId: string, descendantIds: string[] | undefined) {
  return useQuery({
    queryKey: ["territory-ecosystem-hierarchical", territoryId, descendantIds],
    enabled: !!descendantIds?.length,
    queryFn: async () => {
      const ids = descendantIds!;

      const [quests, guilds, pods, companies, courses, services] = await Promise.all([
        supabase
          .from("quest_territories")
          .select("territory_id, quest_id, quests(id, title, description, status)")
          .in("territory_id", ids)
          .then(r => {
            const seen = new Set<string>();
            return (r.data ?? []).map((d: any) => ({ ...d.quests, territoryId: d.territory_id }))
              .filter((q: any) => q && q.id && !seen.has(q.id) && (seen.add(q.id), true));
          }),
        supabase
          .from("guild_territories")
          .select("territory_id, guild_id, guilds(id, name, description)")
          .in("territory_id", ids)
          .then(r => {
            const seen = new Set<string>();
            return (r.data ?? []).map((d: any) => ({ ...d.guilds, territoryId: d.territory_id }))
              .filter((g: any) => g && g.id && !seen.has(g.id) && (seen.add(g.id), true));
          }),
        supabase
          .from("pod_territories")
          .select("territory_id, pod_id, pods(id, name, description)")
          .in("territory_id", ids)
          .then(r => {
            const seen = new Set<string>();
            return (r.data ?? []).map((d: any) => ({ ...d.pods, territoryId: d.territory_id }))
              .filter((p: any) => p && p.id && !seen.has(p.id) && (seen.add(p.id), true));
          }),
        supabase
          .from("company_territories")
          .select("territory_id, company_id, companies(id, name, description)")
          .in("territory_id", ids)
          .then(r => {
            const seen = new Set<string>();
            return (r.data ?? []).map((d: any) => ({ ...d.companies, territoryId: d.territory_id }))
              .filter((c: any) => c && c.id && !seen.has(c.id) && (seen.add(c.id), true));
          }),
        supabase
          .from("course_territories")
          .select("territory_id, course_id, courses(id, title, description)")
          .in("territory_id", ids)
          .then(r => {
            const seen = new Set<string>();
            return (r.data ?? []).map((d: any) => ({ ...d.courses, territoryId: d.territory_id }))
              .filter((c: any) => c && c.id && !seen.has(c.id) && (seen.add(c.id), true));
          }),
        supabase
          .from("service_territories")
          .select("territory_id, service_id, services(id, title, description)")
          .in("territory_id", ids)
          .then(r => {
            const seen = new Set<string>();
            return (r.data ?? []).map((d: any) => ({ ...d.services, territoryId: d.territory_id }))
              .filter((s: any) => s && s.id && !seen.has(s.id) && (seen.add(s.id), true));
          }),
      ]);

      return { quests, guilds, pods, companies, courses, services };
    },
  });
}

// ─── Hook: people with hierarchy support ───
function useHierarchicalPeople(descendantIds: string[] | undefined) {
  return useQuery({
    queryKey: ["territory-people-hierarchical", descendantIds],
    enabled: !!descendantIds?.length,
    queryFn: async () => {
      const ids = descendantIds!;

      // Get user → territory mappings
      const { data: utData } = await supabase
        .from("user_territories")
        .select("user_id, territory_id")
        .in("territory_id", ids);

      if (!utData?.length) return [] as TerritoryPerson[];

      // Dedupe users, keep first territory_id mapping
      const userTerritoryMap = new Map<string, string>();
      for (const ut of utData) {
        if (!userTerritoryMap.has(ut.user_id)) {
          userTerritoryMap.set(ut.user_id, ut.territory_id);
        }
      }
      const userIds = [...userTerritoryMap.keys()];

      // Fetch profiles + topics in parallel
      const [profilesRes, topicsRes] = await Promise.all([
        supabase.from("profiles")
          .select("user_id, name, avatar_url, headline, persona_type, location")
          .in("user_id", userIds),
        supabase.from("user_topics")
          .select("user_id, topic_id")
          .in("user_id", userIds),
      ]);

      const topicsByUser = new Map<string, string[]>();
      for (const t of (topicsRes.data ?? [])) {
        const arr = topicsByUser.get(t.user_id) || [];
        arr.push(t.topic_id);
        topicsByUser.set(t.user_id, arr);
      }

      return (profilesRes.data ?? [])
        .filter((p: any) => p && p.name)
        .map((p: any) => ({
          user_id: p.user_id,
          name: p.name,
          avatar_url: p.avatar_url,
          headline: p.headline,
          persona_type: p.persona_type,
          location: p.location,
          territory_id: userTerritoryMap.get(p.user_id) || "",
          topic_ids: topicsByUser.get(p.user_id) || [],
        })) as TerritoryPerson[];
    },
  });
}

// ═══════════════════════════════════════════════
//  Territory Distribution Bar
// ═══════════════════════════════════════════════
function TerritoryDistribution({
  people,
  childTerritories,
  childMap,
}: {
  people: TerritoryPerson[];
  childTerritories: TerritoryChild[];
  childMap: Map<string, string>;
}) {
  const [expanded, setExpanded] = useState(false);

  const distribution = useMemo(() => {
    const counts = new Map<string, number>();
    let unmapped = 0;

    for (const person of people) {
      const groupId = childMap.get(person.territory_id);
      if (groupId) {
        counts.set(groupId, (counts.get(groupId) || 0) + 1);
      } else {
        unmapped++;
      }
    }

    const buckets = childTerritories
      .map(c => ({ ...c, count: counts.get(c.id) || 0 }))
      .filter(b => b.count > 0)
      .sort((a, b) => b.count - a.count);

    return { buckets, unmapped };
  }, [people, childTerritories, childMap]);

  if (distribution.buckets.length === 0) return null;

  const total = people.length;
  const visibleBuckets = expanded ? distribution.buckets : distribution.buckets.slice(0, 6);

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <MapPin className="h-3 w-3" />
        Territory distribution
        {distribution.buckets.length > 6 && (
          expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        )}
      </button>

      <div className="flex flex-wrap gap-1.5">
        {visibleBuckets.map(bucket => {
          const pct = Math.round((bucket.count / total) * 100);
          return (
            <Link key={bucket.id} to={`/territories/${bucket.id}?tab=ecosystem`}>
              <Badge
                variant="outline"
                className="text-[10px] gap-1 hover:bg-muted/60 transition-colors cursor-pointer"
              >
                {bucket.name}
                <span className="text-muted-foreground">{bucket.count} · {pct}%</span>
              </Badge>
            </Link>
          );
        })}
        {distribution.unmapped > 0 && (
          <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
            Direct · {distribution.unmapped}
          </Badge>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  Topic Filter Chips
// ═══════════════════════════════════════════════
function TopicFilterBar({
  topics,
  selectedTopicIds,
  onToggle,
  onClear,
}: {
  topics: TopicInfo[];
  selectedTopicIds: Set<string>;
  onToggle: (id: string) => void;
  onClear: () => void;
}) {
  const [topicSearch, setTopicSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  const filtered = topics.filter(t =>
    topicSearch.trim().length < 2 || t.name.toLowerCase().includes(topicSearch.trim().toLowerCase())
  );
  const visible = showAll ? filtered : filtered.slice(0, 12);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Tag className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Filter by Topics</span>
        {selectedTopicIds.size > 0 && (
          <button onClick={onClear} className="text-[10px] text-primary hover:underline">
            Clear
          </button>
        )}
      </div>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        <Input
          value={topicSearch}
          onChange={(e) => setTopicSearch(e.target.value)}
          placeholder="Search topics…"
          className="pl-7 h-7 text-xs"
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {visible.map(topic => (
          <button
            key={topic.id}
            onClick={() => onToggle(topic.id)}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
              selectedTopicIds.has(topic.id)
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary/50"
            }`}
          >
            {topic.name}
          </button>
        ))}
        {filtered.length > 12 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-[10px] text-primary hover:underline px-1"
          >
            {showAll ? "Show less" : `+${filtered.length - 12} more`}
          </button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  People Section (with hierarchy, topics, distribution)
// ═══════════════════════════════════════════════
function PeopleSection({
  people,
  isLoading,
  topics,
  childTerritories,
  childMap,
}: {
  people: TerritoryPerson[];
  isLoading: boolean;
  topics: TopicInfo[];
  childTerritories: TerritoryChild[];
  childMap: Map<string, string>;
}) {
  const [search, setSearch] = useState("");
  const [personaFilter, setPersonaFilter] = useState("all");
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(new Set());
  const [clusterByTopic, setClusterByTopic] = useState(false);

  const peopleUserIds = useMemo(() => people.map(p => p.user_id), [people]);
  const { data: followedIds = new Set<string>() } = useFollowedUserIds(peopleUserIds);

  const toggleTopic = (id: string) => {
    setSelectedTopicIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => {
    return people.filter((p) => {
      if (personaFilter !== "all" && p.persona_type !== personaFilter) return false;
      if (search.trim().length >= 2) {
        const q = search.trim().toLowerCase();
        if (
          !p.name.toLowerCase().includes(q) &&
          !p.headline?.toLowerCase().includes(q) &&
          !p.location?.toLowerCase().includes(q)
        ) return false;
      }
      if (selectedTopicIds.size > 0) {
        // ANY mode: user must have at least one of the selected topics
        if (!p.topic_ids.some(tid => selectedTopicIds.has(tid))) return false;
      }
      return true;
    });
  }, [people, personaFilter, search, selectedTopicIds]);

  // Topic clustering view
  const topicClusters = useMemo(() => {
    if (!clusterByTopic || selectedTopicIds.size === 0) return null;
    const clusters = new Map<string, TerritoryPerson[]>();
    for (const person of filtered) {
      for (const tid of person.topic_ids) {
        if (selectedTopicIds.has(tid)) {
          const arr = clusters.get(tid) || [];
          arr.push(person);
          clusters.set(tid, arr);
        }
      }
    }
    return [...clusters.entries()]
      .map(([topicId, members]) => ({
        topic: topics.find(t => t.id === topicId),
        members,
      }))
      .filter(c => c.topic)
      .sort((a, b) => b.members.length - a.members.length);
  }, [clusterByTopic, filtered, selectedTopicIds, topics]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">People</h3>
        <Badge variant="secondary" className="text-xs">{people.length}</Badge>
        {filtered.length !== people.length && (
          <span className="text-[10px] text-muted-foreground">({filtered.length} shown)</span>
        )}
      </div>

      {/* Territory distribution */}
      {childTerritories.length > 0 && (
        <TerritoryDistribution
          people={people}
          childTerritories={childTerritories}
          childMap={childMap}
        />
      )}

      {/* Filters */}
      <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, headline, location…"
              className="pl-8 h-8 text-xs"
            />
          </div>
          <div className="flex gap-1">
            {PERSONA_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPersonaFilter(opt.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  personaFilter === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Topic filter */}
        {topics.length > 0 && (
          <TopicFilterBar
            topics={topics}
            selectedTopicIds={selectedTopicIds}
            onToggle={toggleTopic}
            onClear={() => setSelectedTopicIds(new Set())}
          />
        )}

        {/* Cluster by topic toggle */}
        {selectedTopicIds.size > 0 && (
          <div className="flex items-center gap-2 pt-1">
            <Switch
              checked={clusterByTopic}
              onCheckedChange={setClusterByTopic}
              className="h-4 w-7"
            />
            <span className="text-[10px] text-muted-foreground">Cluster by topic</span>
          </div>
        )}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          {people.length === 0 ? "No individuals connected to this territory yet." : "No matches found."}
        </p>
      ) : topicClusters ? (
        <div className="space-y-5">
          {topicClusters.map(({ topic, members }) => (
            <div key={topic!.id} className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Tag className="h-3 w-3 text-primary" />
                <span className="text-xs font-semibold text-foreground">{topic!.name}</span>
                <Badge variant="secondary" className="text-[10px]">{members.length}</Badge>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {members.map(person => (
                  <PersonCard key={person.user_id} person={person} isFollowed={followedIds.has(person.user_id)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((person) => (
            <PersonCard key={person.user_id} person={person} isFollowed={followedIds.has(person.user_id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function PersonCard({ person, isFollowed = false }: { person: TerritoryPerson; isFollowed?: boolean }) {
  return (
    <Link to={`/profile/${person.user_id}`}>
      <Card className="relative group p-3 hover:bg-muted/50 transition-colors cursor-pointer flex items-center gap-3">
        <FollowOnHoverButton targetUserId={person.user_id} isFollowed={isFollowed} />
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={person.avatar_url || undefined} />
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {person.name[0]?.toUpperCase() || <User className="h-3.5 w-3.5" />}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">{person.name}</p>
          {person.headline && (
            <p className="text-xs text-muted-foreground truncate">{person.headline}</p>
          )}
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
              {person.persona_type}
            </Badge>
            {person.location && (
              <span className="text-[10px] text-muted-foreground truncate">{person.location}</span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

// ═══════════════════════════════════════════════
//  Main Ecosystem Tab
// ═══════════════════════════════════════════════
export function TerritoryEcosystemTab({ territoryId }: Props) {
  const [includeNested, setIncludeNested] = useState(true);

  const { data: descendantIds, isLoading: loadingDesc } = useDescendantIds(territoryId, includeNested);
  const { data: ecosystemData, isLoading: loadingEco } = useHierarchicalEcosystem(territoryId, descendantIds);
  const { data: people = [], isLoading: loadingPeople } = useHierarchicalPeople(descendantIds);
  const { data: topics = [] } = useTopicsList();
  const { data: childData } = useChildTerritories(territoryId);

  const isLoading = loadingDesc || loadingEco;

  const sections: EntitySection[] = useMemo(() => {
    if (!ecosystemData) return [];
    return [
      {
        key: "quests",
        label: "Quests",
        icon: Compass,
        linkPrefix: "/quests",
        items: ecosystemData.quests.map((q: any) => ({ id: q.id, name: q.title, description: q.description, territoryId: q.territoryId })),
      },
      {
        key: "guilds",
        label: "Guilds",
        icon: Shield,
        linkPrefix: "/guilds",
        items: ecosystemData.guilds.map((g: any) => ({ id: g.id, name: g.name, description: g.description, territoryId: g.territoryId })),
      },
      {
        key: "pods",
        label: "Pods",
        icon: CircleDot,
        linkPrefix: "/pods",
        items: ecosystemData.pods.map((p: any) => ({ id: p.id, name: p.name, description: p.description, territoryId: p.territoryId })),
      },
      {
        key: "companies",
        label: "Companies",
        icon: Building2,
        linkPrefix: "/companies",
        items: ecosystemData.companies.map((c: any) => ({ id: c.id, name: c.name, description: c.description, territoryId: c.territoryId })),
      },
      {
        key: "courses",
        label: "Courses",
        icon: GraduationCap,
        linkPrefix: "/courses",
        items: ecosystemData.courses.map((c: any) => ({ id: c.id, name: c.title, description: c.description, territoryId: c.territoryId })),
      },
      {
        key: "services",
        label: "Services",
        icon: Briefcase,
        linkPrefix: "/services",
        items: ecosystemData.services.map((s: any) => ({ id: s.id, name: s.title, description: s.description, territoryId: s.territoryId })),
      },
    ].filter(s => s.items.length > 0);
  }, [ecosystemData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Nested territories toggle */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2">
          <Network className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-foreground">Include nested territories</span>
          {includeNested && descendantIds && descendantIds.length > 1 && (
            <Badge variant="secondary" className="text-[10px]">
              {descendantIds.length - 1} sub-territories
            </Badge>
          )}
        </div>
        <Switch
          checked={includeNested}
          onCheckedChange={setIncludeNested}
        />
      </div>

      {/* People section */}
      <PeopleSection
        people={people}
        isLoading={loadingPeople}
        topics={topics}
        childTerritories={childData?.children || []}
        childMap={childData?.childMap || new Map()}
      />

      {/* Entity sections */}
      {sections.map(section => {
        const Icon = section.icon;
        return (
          <div key={section.key} className="space-y-3">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">{section.label}</h3>
              <Badge variant="secondary" className="text-xs">{section.items.length}</Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {section.items.map(item => (
                <Link key={item.id} to={`${section.linkPrefix}/${item.id}`}>
                  <Card className="p-3 hover:bg-muted/50 transition-colors cursor-pointer">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{item.description}</p>
                    )}
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        );
      })}

      {sections.length === 0 && people.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No entities connected to this territory yet.
        </div>
      )}
    </div>
  );
}
