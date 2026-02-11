import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { MapPin, Hash, Loader2, ArrowUpDown, Sparkles, Compass, Map, LayoutGrid, Globe, Users, Brain } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  useTerritoryLeaderboard,
  useTopicLeaderboard,
  TOPIC_EMOJI_MAP,
  type TerritoryLeaderboardItem,
  type TopicLeaderboardItem,
} from "@/hooks/useNetworkLeaderboardData";
import { TerritoryMapView } from "./TerritoryMapView";

// ─── Color palette for territory tiles ─────────────────────
const TERRITORY_GRADIENTS = [
  "from-emerald-500/20 to-teal-500/10",
  "from-blue-500/20 to-indigo-500/10",
  "from-amber-500/20 to-orange-500/10",
  "from-violet-500/20 to-purple-500/10",
  "from-rose-500/20 to-pink-500/10",
  "from-cyan-500/20 to-sky-500/10",
];

const TERRITORY_ACCENT = [
  "text-emerald-600 dark:text-emerald-400",
  "text-blue-600 dark:text-blue-400",
  "text-amber-600 dark:text-amber-400",
  "text-violet-600 dark:text-violet-400",
  "text-rose-600 dark:text-rose-400",
  "text-cyan-600 dark:text-cyan-400",
];

function getGradient(i: number) {
  return TERRITORY_GRADIENTS[i % TERRITORY_GRADIENTS.length];
}
function getAccent(i: number) {
  return TERRITORY_ACCENT[i % TERRITORY_ACCENT.length];
}

function getInitials(name: string) {
  return name
    .split(/[\s-]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function getActivityLevel(t: TerritoryLeaderboardItem) {
  const score = t.quests * 3 + t.entities * 2 + t.memoryContributions;
  if (score >= 15) return { label: "Very Active", color: "bg-emerald-500" };
  if (score >= 6) return { label: "Active", color: "bg-blue-500" };
  if (score >= 1) return { label: "Growing", color: "bg-amber-500" };
  return { label: "Emerging", color: "bg-muted-foreground" };
}

// ─── Redesigned Territory Tile ─────────────────────────────
function TerritoryTile({ item, index }: { item: TerritoryLeaderboardItem; index: number }) {
  const activity = getActivityLevel(item);
  const totalScore = item.quests * 3 + item.entities * 2 + item.memoryContributions;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.04, type: "spring", stiffness: 300, damping: 25 }}
    >
      <Link
        to={`/territories/${item.id}`}
        className="group relative block rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all duration-300"
      >
        {/* Gradient header */}
        <div className={`h-20 bg-gradient-to-br ${getGradient(index)} relative`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)]" />
          <div className="absolute top-3 left-3">
            <div className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${activity.color}`} />
              <span className="text-[10px] font-medium text-foreground/70">{activity.label}</span>
            </div>
          </div>
          <div className="absolute -bottom-5 left-4">
            <div className={`h-10 w-10 rounded-xl bg-card border-2 border-background shadow-md flex items-center justify-center font-bold text-sm ${getAccent(index)}`}>
              {getInitials(item.name)}
            </div>
          </div>
          {totalScore > 0 && (
            <div className="absolute top-3 right-3">
              <Badge variant="secondary" className="text-[10px] font-mono bg-background/80 backdrop-blur-sm">
                {totalScore} pts
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-4 pt-7 pb-4 space-y-3">
          <div>
            <h4 className="font-display font-bold text-sm truncate group-hover:text-primary transition-colors">
              {item.name}
            </h4>
            {item.parent_name && (
              <p className="text-[11px] text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                <Globe className="h-3 w-3" /> {item.parent_name}
              </p>
            )}
          </div>

          {/* Stats pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5">
              <Compass className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-semibold">{item.quests}</span>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5">
              <Users className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-semibold">{item.entities}</span>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5">
              <Brain className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-semibold">{item.memoryContributions}</span>
            </div>
          </div>

          {/* Synthesis */}
          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
            <Sparkles className="h-3 w-3 inline mr-0.5 text-primary/60" />
            {item.synthesis}
          </p>

          {/* Topic tags */}
          {item.topTopics.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {item.topTopics.slice(0, 3).map((topic) => (
                <span key={topic} className="text-[9px] bg-primary/8 text-primary rounded-full px-2 py-0.5 font-medium">
                  {topic}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

// ─── Topic Tile (unchanged but slightly refreshed) ─────────
function TopicTile({ item, index }: { item: TopicLeaderboardItem; index: number }) {
  const emoji = TOPIC_EMOJI_MAP[item.slug] ?? "🏷️";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.04 }}
    >
      <Link
        to={`/explore?topics=${item.slug}`}
        className="group block rounded-2xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-lg transition-all duration-300 cursor-pointer"
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-muted/60 text-xl shrink-0">
            {emoji}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-display font-semibold text-sm truncate group-hover:text-primary transition-colors">
              {item.name}
            </h4>
            {item.topTerritories.length > 0 && (
              <p className="text-[11px] text-muted-foreground truncate">
                {item.topTerritories.slice(0, 2).join(", ")}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          <div className="flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5">
            <Compass className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-semibold">{item.quests}</span>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5">
            <Users className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-semibold">{item.entities}</span>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5">
            <MapPin className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-semibold">{item.territories}</span>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
          <Sparkles className="h-3 w-3 inline mr-0.5 text-primary/60" />
          {item.synthesis}
        </p>
      </Link>
    </motion.div>
  );
}

// ─── Sort options ──────────────────────────────────────────
type TerritorySort = "activity" | "name";
type TopicSort = "activity" | "name" | "territories";
type ViewMode = "grid" | "map";

// ─── Main Component ────────────────────────────────────────
export default function TerritoryTopicLeaderboard() {
  const [sub, setSub] = useState<"territories" | "topics">("territories");
  const [tSort, setTSort] = useState<TerritorySort>("activity");
  const [topSort, setTopSort] = useState<TopicSort>("activity");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const { data: territories = [], isLoading: loadingT } = useTerritoryLeaderboard();
  const { data: topics = [], isLoading: loadingTopics } = useTopicLeaderboard();

  const sortedTerritories = useMemo(() => [...territories].sort((a, b) => {
    if (tSort === "name") return a.name.localeCompare(b.name);
    const scoreA = a.quests * 3 + a.entities * 2 + a.memoryContributions;
    const scoreB = b.quests * 3 + b.entities * 2 + b.memoryContributions;
    return scoreB - scoreA;
  }), [territories, tSort]);

  const sortedTopics = useMemo(() => [...topics].sort((a, b) => {
    if (topSort === "name") return a.name.localeCompare(b.name);
    if (topSort === "territories") return b.territories - a.territories;
    const scoreA = a.quests * 3 + a.entities * 2 + a.territories;
    const scoreB = b.quests * 3 + b.entities * 2 + b.territories;
    return scoreB - scoreA;
  }), [topics, topSort]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-display text-xl font-semibold flex items-center gap-2">
          <Compass className="h-5 w-5 text-primary" /> Territories & Topics
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Explore active territories and trending topics across the ecosystem.
        </p>
      </div>

      <Tabs value={sub} onValueChange={(v) => { setSub(v as any); setViewMode("grid"); }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <TabsList>
            <TabsTrigger value="territories">
              <MapPin className="h-3.5 w-3.5 mr-1" /> Territories ({territories.length})
            </TabsTrigger>
            <TabsTrigger value="topics">
              <Hash className="h-3.5 w-3.5 mr-1" /> Topics ({topics.length})
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            {/* View toggle for territories */}
            {sub === "territories" && (
              <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-0.5">
                <Button
                  size="sm"
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  className="h-7 w-7 p-0"
                  onClick={() => setViewMode("grid")}
                  title="Grid view"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "map" ? "secondary" : "ghost"}
                  className="h-7 w-7 p-0"
                  onClick={() => setViewMode("map")}
                  title="Map view"
                >
                  <Map className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {/* Sort controls */}
            {sub === "territories" && viewMode === "grid" && (
              <div className="flex items-center gap-1">
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                <Button
                  size="sm"
                  variant={tSort === "activity" ? "secondary" : "ghost"}
                  className="h-7 text-xs"
                  onClick={() => setTSort("activity")}
                >
                  Most active
                </Button>
                <Button
                  size="sm"
                  variant={tSort === "name" ? "secondary" : "ghost"}
                  className="h-7 text-xs"
                  onClick={() => setTSort("name")}
                >
                  A–Z
                </Button>
              </div>
            )}
            {sub === "topics" && (
              <div className="flex items-center gap-1">
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                <Button
                  size="sm"
                  variant={topSort === "activity" ? "secondary" : "ghost"}
                  className="h-7 text-xs"
                  onClick={() => setTopSort("activity")}
                >
                  Most active
                </Button>
                <Button
                  size="sm"
                  variant={topSort === "territories" ? "secondary" : "ghost"}
                  className="h-7 text-xs"
                  onClick={() => setTopSort("territories")}
                >
                  Most territories
                </Button>
                <Button
                  size="sm"
                  variant={topSort === "name" ? "secondary" : "ghost"}
                  className="h-7 text-xs"
                  onClick={() => setTopSort("name")}
                >
                  A–Z
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Territories */}
        <TabsContent value="territories" className="mt-5">
          {loadingT ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sortedTerritories.length === 0 ? (
            <div className="text-center py-16 rounded-xl border border-dashed border-border space-y-3">
              <MapPin className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-muted-foreground">No territories found yet.</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {viewMode === "grid" ? (
                <motion.div
                  key="grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {sortedTerritories.map((t, i) => (
                    <TerritoryTile key={t.id} item={t} index={i} />
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="map"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <TerritoryMapView territories={sortedTerritories} />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </TabsContent>

        {/* Topics grid */}
        <TabsContent value="topics" className="mt-5">
          {loadingTopics ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sortedTopics.length === 0 ? (
            <div className="text-center py-16 rounded-xl border border-dashed border-border space-y-3">
              <Hash className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-muted-foreground">No topics found yet.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedTopics.map((t, i) => (
                <TopicTile key={t.id} item={t} index={i} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
