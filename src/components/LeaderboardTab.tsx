import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Trophy, Heart, Paintbrush, Users, MapPin, GraduationCap,
  Shield, TrendingUp, Sparkles, Loader2, RefreshCw, Clock,
  Calendar, CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  useLeaderboard,
  useRefreshLeaderboard,
  getTopForDimension,
  type TimeScope,
  type DimensionKey,
  type LeaderboardEntry,
} from "@/hooks/useLeaderboard";
import { usePersona } from "@/hooks/usePersona";
import { toast } from "sonner";

const TIME_SCOPES: { key: TimeScope; label: string; icon: React.ReactNode }[] = [
  { key: "WEEKLY", label: "Weekly", icon: <Clock className="h-3.5 w-3.5" /> },
  { key: "MONTHLY", label: "Monthly", icon: <Calendar className="h-3.5 w-3.5" /> },
  { key: "ALL_TIME", label: "All time", icon: <CalendarDays className="h-3.5 w-3.5" /> },
];

interface DimensionConfig {
  key: DimensionKey;
  icon: React.ReactNode;
  title: (isCreative: boolean) => string;
  description: (isCreative: boolean) => string;
  unit: string;
}

const DIMENSIONS: DimensionConfig[] = [
  {
    key: "helpful",
    icon: <Heart className="h-5 w-5" />,
    title: () => "Most Helpful Humans",
    description: () => "Recognizing those whose contributions support everyone else.",
    unit: "helpful pts",
  },
  {
    key: "creator",
    icon: <Paintbrush className="h-5 w-5" />,
    title: (c) => c ? "Most Active Creators" : "Most Active Creators",
    description: (c) => c ? "Artists & makers who keep creating and sharing." : "People who keep making, sharing and launching.",
    unit: "creator pts",
  },
  {
    key: "collaborator",
    icon: <Users className="h-5 w-5" />,
    title: () => "Top Collaborators",
    description: () => "The connectors who join, contribute and co-create.",
    unit: "collab pts",
  },
  {
    key: "territory",
    icon: <MapPin className="h-5 w-5" />,
    title: (c) => c ? "Place-Based Creators" : "Territory Builders",
    description: (c) => c ? "Creators rooted in their territories." : "Building impact in their territories.",
    unit: "territory pts",
  },
  {
    key: "mentor",
    icon: <GraduationCap className="h-5 w-5" />,
    title: (c) => c ? "Creative Mentors & Teachers" : "Skill Mentors",
    description: () => "Those who teach, guide and empower others.",
    unit: "mentor pts",
  },
  {
    key: "guild",
    icon: <Shield className="h-5 w-5" />,
    title: () => "Guild Champions",
    description: () => "Leaders who grow thriving communities.",
    unit: "guild pts",
  },
  {
    key: "rising",
    icon: <TrendingUp className="h-5 w-5" />,
    title: () => "Rising Stars",
    description: () => "Fastest-growing contributors this period.",
    unit: "rising pts",
  },
  {
    key: "ai",
    icon: <Sparkles className="h-5 w-5" />,
    title: () => "AI-Augmented Humans",
    description: () => "Leveraging AI to amplify their impact.",
    unit: "AI pts",
  },
];

function DimensionCard({
  config,
  entries,
  isCreative,
  timeScopeLabel,
}: {
  config: DimensionConfig;
  entries: (LeaderboardEntry & { score: number })[];
  isCreative: boolean;
  timeScopeLabel: string;
}) {
  if (entries.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2.5">
          <div className="text-primary">{config.icon}</div>
          <div>
            <h3 className="font-display font-semibold text-sm">{config.title(isCreative)}</h3>
            <p className="text-xs text-muted-foreground">{config.description(isCreative)}</p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-border">
        {entries.map((entry, i) => {
          const rank = i + 1;
          const isTop3 = rank <= 3;
          return (
            <Link
              key={entry.user_id}
              to={`/users/${entry.user_id}`}
              className={`flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors ${isTop3 ? "bg-primary/[0.03]" : ""}`}
            >
              <span
                className={`w-6 text-center font-bold text-sm shrink-0 ${
                  rank === 1
                    ? "text-yellow-500"
                    : rank === 2
                      ? "text-slate-400"
                      : rank === 3
                        ? "text-amber-600"
                        : "text-muted-foreground"
                }`}
              >
                {rank}
              </span>
              <Avatar className={isTop3 ? "h-9 w-9" : "h-7 w-7"}>
                <AvatarImage src={entry.profile?.avatar_url ?? undefined} />
                <AvatarFallback>{entry.profile?.name?.[0] ?? "?"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${isTop3 ? "text-sm" : "text-xs"}`}>
                  {entry.profile?.name ?? "Unknown"}
                </p>
                {isTop3 && entry.profile?.headline && (
                  <p className="text-[11px] text-muted-foreground truncate">{entry.profile.headline}</p>
                )}
              </div>
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {entry.score} {config.unit}
              </Badge>
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
}

export default function LeaderboardTab() {
  const [timeScope, setTimeScope] = useState<TimeScope>("WEEKLY");
  const { data: entries = [], isLoading, refetch } = useLeaderboard(timeScope);
  const refreshLeaderboard = useRefreshLeaderboard();
  const { persona } = usePersona();
  const isCreative = persona === "CREATIVE";
  const [refreshing, setRefreshing] = useState(false);

  const timeScopeLabel = TIME_SCOPES.find((t) => t.key === timeScope)?.label ?? "";

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshLeaderboard();
      await refetch();
      toast.success("Leaderboard refreshed");
    } catch {
      toast.error("Failed to refresh leaderboard");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" /> Leaderboard
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Different ways people change the game.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
            {TIME_SCOPES.map((t) => (
              <Button
                key={t.key}
                variant={timeScope === t.key ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-xs gap-1.5"
                onClick={() => setTimeScope(t.key)}
              >
                {t.icon}
                {t.label}
              </Button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-border space-y-3">
          <Trophy className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <p className="text-muted-foreground font-medium">No leaderboard data yet.</p>
          <p className="text-sm text-muted-foreground">
            Click refresh to compute the leaderboard from platform activity.
          </p>
          <Button size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
            Compute now
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {DIMENSIONS.map((dim) => {
            const top = getTopForDimension(entries, dim.key, 10);
            return (
              <DimensionCard
                key={dim.key}
                config={dim}
                entries={top}
                isCreative={isCreative}
                timeScopeLabel={timeScopeLabel}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
