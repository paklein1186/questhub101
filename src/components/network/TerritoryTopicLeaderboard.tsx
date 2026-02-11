import { useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Hash, Loader2, ArrowUpDown, Sparkles, BookOpen, Users, Compass } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  useTerritoryLeaderboard,
  useTopicLeaderboard,
  TOPIC_EMOJI_MAP,
  type TerritoryLeaderboardItem,
  type TopicLeaderboardItem,
} from "@/hooks/useNetworkLeaderboardData";

// ─── Color palette for territory initials ─────────────────────
const TERRITORY_COLORS = [
  "bg-primary/15 text-primary",
  "bg-chart-1/15 text-chart-1",
  "bg-chart-2/15 text-chart-2",
  "bg-chart-3/15 text-chart-3",
  "bg-chart-4/15 text-chart-4",
  "bg-chart-5/15 text-chart-5",
];

function getColorForIndex(i: number) {
  return TERRITORY_COLORS[i % TERRITORY_COLORS.length];
}

function getInitials(name: string) {
  return name
    .split(/[\s-]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function getTopicEmoji(slug: string): string {
  return TOPIC_EMOJI_MAP[slug] ?? "🏷️";
}

// ─── Territory Tile ────────────────────────────────────────────
function TerritoryTile({ item, index }: { item: TerritoryLeaderboardItem; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Link
        to={`/territories/${item.id}`}
        className="group block rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer"
      >
        <div className="flex items-start gap-3 mb-3">
          <div
            className={`flex items-center justify-center h-10 w-10 rounded-lg font-bold text-sm shrink-0 ${getColorForIndex(index)}`}
          >
            {getInitials(item.name)}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-display font-semibold text-sm truncate group-hover:text-primary transition-colors">
              {item.name}
            </h4>
            {item.parent_name && (
              <p className="text-[11px] text-muted-foreground truncate">{item.parent_name}</p>
            )}
          </div>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          <div className="rounded-lg bg-muted/50 px-2 py-1.5 text-center">
            <p className="text-sm font-bold text-primary">{item.quests}</p>
            <p className="text-[9px] text-muted-foreground">Quests</p>
          </div>
          <div className="rounded-lg bg-muted/50 px-2 py-1.5 text-center">
            <p className="text-sm font-bold text-primary">{item.entities}</p>
            <p className="text-[9px] text-muted-foreground">Entities</p>
          </div>
          <div className="rounded-lg bg-muted/50 px-2 py-1.5 text-center">
            <p className="text-sm font-bold text-primary">{item.memoryContributions}</p>
            <p className="text-[9px] text-muted-foreground">Memory</p>
          </div>
        </div>

        {/* Synthesis */}
        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
          <Sparkles className="h-3 w-3 inline mr-0.5 text-primary/60" />
          {item.synthesis}
        </p>
      </Link>
    </motion.div>
  );
}

// ─── Topic Tile ────────────────────────────────────────────────
function TopicTile({ item, index }: { item: TopicLeaderboardItem; index: number }) {
  const emoji = getTopicEmoji(item.slug);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Link
        to={`/explore?topics=${item.slug}`}
        className="group block rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer"
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-muted/60 text-xl shrink-0">
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

        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          <div className="rounded-lg bg-muted/50 px-2 py-1.5 text-center">
            <p className="text-sm font-bold text-primary">{item.quests}</p>
            <p className="text-[9px] text-muted-foreground">Quests</p>
          </div>
          <div className="rounded-lg bg-muted/50 px-2 py-1.5 text-center">
            <p className="text-sm font-bold text-primary">{item.entities}</p>
            <p className="text-[9px] text-muted-foreground">Entities</p>
          </div>
          <div className="rounded-lg bg-muted/50 px-2 py-1.5 text-center">
            <p className="text-sm font-bold text-primary">{item.territories}</p>
            <p className="text-[9px] text-muted-foreground">Territories</p>
          </div>
        </div>

        {/* Synthesis */}
        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
          <Sparkles className="h-3 w-3 inline mr-0.5 text-primary/60" />
          {item.synthesis}
        </p>
      </Link>
    </motion.div>
  );
}

// ─── Sort options ──────────────────────────────────────────────
type TerritorySort = "activity" | "name";
type TopicSort = "activity" | "name" | "territories";

// ─── Main Component ────────────────────────────────────────────
export default function TerritoryTopicLeaderboard() {
  const [sub, setSub] = useState<"territories" | "topics">("territories");
  const [tSort, setTSort] = useState<TerritorySort>("activity");
  const [topSort, setTopSort] = useState<TopicSort>("activity");

  const { data: territories = [], isLoading: loadingT } = useTerritoryLeaderboard();
  const { data: topics = [], isLoading: loadingTopics } = useTopicLeaderboard();

  const sortedTerritories = [...territories].sort((a, b) => {
    if (tSort === "name") return a.name.localeCompare(b.name);
    const scoreA = a.quests * 3 + a.entities * 2 + a.memoryContributions;
    const scoreB = b.quests * 3 + b.entities * 2 + b.memoryContributions;
    return scoreB - scoreA;
  });

  const sortedTopics = [...topics].sort((a, b) => {
    if (topSort === "name") return a.name.localeCompare(b.name);
    if (topSort === "territories") return b.territories - a.territories;
    const scoreA = a.quests * 3 + a.entities * 2 + a.territories;
    const scoreB = b.quests * 3 + b.entities * 2 + b.territories;
    return scoreB - scoreA;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-display text-xl font-semibold flex items-center gap-2">
          <Compass className="h-5 w-5 text-primary" /> Territories & Topics Leaderboard
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Where the energy is — explore active territories and trending topics.
        </p>
      </div>

      <Tabs value={sub} onValueChange={(v) => setSub(v as any)}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <TabsList>
            <TabsTrigger value="territories">
              <MapPin className="h-3.5 w-3.5 mr-1" /> Territories ({territories.length})
            </TabsTrigger>
            <TabsTrigger value="topics">
              <Hash className="h-3.5 w-3.5 mr-1" /> Topics ({topics.length})
            </TabsTrigger>
          </TabsList>

          {/* Sort controls */}
          {sub === "territories" && (
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

        {/* Territories grid */}
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
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedTerritories.map((t, i) => (
                <TerritoryTile key={t.id} item={t} index={i} />
              ))}
            </div>
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
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
