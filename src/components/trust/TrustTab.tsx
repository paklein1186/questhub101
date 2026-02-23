import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrustNodeType } from "@/types/enums";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Shield, Star, Hash, Clock, ExternalLink, Eye, Users, Filter, ChevronDown, ChevronUp, Zap, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// ─── Types ─────────────────────────────────────────────────
interface TrustEdgeRow {
  id: string;
  from_node_type: string;
  from_node_id: string;
  to_node_type: string;
  to_node_id: string;
  edge_type: string;
  score: number;
  tags: string[] | null;
  note: string | null;
  evidence_url: string | null;
  visibility: string;
  status: string;
  created_at: string;
  last_confirmed_at: string | null;
  context_territory_id: string | null;
  context_guild_id: string | null;
  context_quest_id: string | null;
  created_by: string;
}

interface GiverProfile {
  user_id: string;
  name: string;
  avatar_url: string | null;
}

const EDGE_TYPE_LABELS: Record<string, string> = {
  skill_trust: "Skill Trust",
  reliability: "Reliability",
  collaboration: "Collaboration",
  stewardship: "Stewardship",
  financial_trust: "Financial Trust",
};

const VISIBILITY_BADGE: Record<string, { label: string; className: string }> = {
  public: { label: "Public", className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
  network: { label: "Network", className: "bg-blue-500/10 text-blue-700 border-blue-500/30" },
  private: { label: "Private", className: "bg-muted text-muted-foreground border-border" },
};

const MONTHS_24_MS = 24 * 30 * 24 * 60 * 60 * 1000;

function FreshnessIndicator({ lastConfirmedAt, createdAt }: { lastConfirmedAt: string | null; createdAt: string }) {
  const ref = lastConfirmedAt || createdAt;
  const age = Date.now() - new Date(ref).getTime();
  const isFresh = age < 6 * 30 * 24 * 60 * 60 * 1000;
  const isStale = age > MONTHS_24_MS;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${isFresh ? "text-emerald-600" : isStale ? "text-orange-500" : "text-muted-foreground"}`}>
          <Clock className="h-3 w-3" />
          {isFresh ? "Fresh" : isStale ? "Aging" : "Active"}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">Last confirmed {formatDistanceToNow(new Date(ref), { addSuffix: true })}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Summary Header ────────────────────────────────────────
function TrustSummaryHeader({ edges }: { edges: TrustEdgeRow[] }) {
  const publicEdges = edges.filter(e => e.visibility === "public");
  const totalPublicTrust = publicEdges.length;

  // Global trust score (sum of weighted scores)
  const trustScoreGlobal = useMemo(() => {
    let score = 0;
    for (const edge of edges) {
      const base = 1 + edge.score * 0.2;
      if (edge.last_confirmed_at) {
        const age = Date.now() - new Date(edge.last_confirmed_at).getTime();
        score += age > MONTHS_24_MS ? base * 0.8 : base;
      } else {
        score += base;
      }
    }
    return Math.round(score * 100) / 100;
  }, [edges]);

  // Top 3 tags
  const topTags = useMemo(() => {
    const tagCount: Record<string, number> = {};
    for (const edge of edges) {
      if (edge.tags) {
        for (const tag of edge.tags) {
          if (tag.startsWith("__")) continue;
          tagCount[tag] = (tagCount[tag] || 0) + 1;
        }
      }
    }
    return Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag, count]) => ({ tag, count }));
  }, [edges]);

  // Freshness: % of edges confirmed in last 12 months
  const freshnessPercent = useMemo(() => {
    if (edges.length === 0) return 0;
    const twelveMonthsAgo = Date.now() - 12 * 30 * 24 * 60 * 60 * 1000;
    const fresh = edges.filter(e => {
      const ref = e.last_confirmed_at || e.created_at;
      return new Date(ref).getTime() > twelveMonthsAgo;
    }).length;
    return Math.round((fresh / edges.length) * 100);
  }, [edges]);

  if (edges.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-6 text-center">
        <Shield className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No trust attestations received yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card/50 p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="text-center">
        <p className="text-2xl font-bold text-foreground">{totalPublicTrust}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Public Trust</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-primary">{trustScoreGlobal}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Trust Score</p>
      </div>
      <div className="text-center">
        <div className="flex justify-center gap-1 mb-1 flex-wrap">
          {topTags.length > 0 ? topTags.map(t => (
            <Badge key={t.tag} variant="secondary" className="text-[10px]">
              <Hash className="h-2.5 w-2.5 mr-0.5" />{t.tag}
            </Badge>
          )) : <span className="text-xs text-muted-foreground">—</span>}
        </div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Top Tags</p>
      </div>
      <div className="text-center">
        <p className={`text-2xl font-bold ${freshnessPercent > 70 ? "text-emerald-600" : freshnessPercent > 40 ? "text-amber-600" : "text-orange-500"}`}>
          {freshnessPercent}%
        </p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Freshness</p>
      </div>
    </div>
  );
}

// ─── Edge Card ─────────────────────────────────────────────
function TrustEdgeCard({ edge, giver }: { edge: TrustEdgeRow; giver?: GiverProfile }) {
  const visBadge = VISIBILITY_BADGE[edge.visibility] || VISIBILITY_BADGE.public;
  const displayTags = (edge.tags || []).filter(t => !t.startsWith("__"));

  return (
    <div className="rounded-xl border border-border bg-card p-4 hover:border-primary/20 transition-all">
      <div className="flex items-start gap-3">
        {/* Giver */}
        <Link to={`/users/${edge.from_node_id}`} className="shrink-0">
          <Avatar className="h-9 w-9">
            <AvatarImage src={giver?.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs">{giver?.name?.[0] || "?"}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link to={`/users/${edge.from_node_id}`} className="text-sm font-semibold hover:text-primary transition-colors truncate">
              {giver?.name || "Unknown"}
            </Link>
            <Badge variant="outline" className="text-[10px] capitalize">
              {EDGE_TYPE_LABELS[edge.edge_type] || edge.edge_type}
            </Badge>
            <Badge variant="outline" className={`text-[10px] ${visBadge.className}`}>
              <Eye className="h-2.5 w-2.5 mr-0.5" />{visBadge.label}
            </Badge>
          </div>
          {/* Score */}
          <div className="flex items-center gap-1 mt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-3.5 w-3.5 ${i < edge.score ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"}`}
              />
            ))}
            <FreshnessIndicator lastConfirmedAt={edge.last_confirmed_at} createdAt={edge.created_at} />
          </div>
          {/* Tags */}
          {displayTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {displayTags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-[10px]">
                  <Hash className="h-2.5 w-2.5 mr-0.5" />{tag}
                </Badge>
              ))}
            </div>
          )}
          {/* Note */}
          {edge.note && (
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 italic">"{edge.note}"</p>
          )}
          {/* Evidence + date */}
          <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
            <span>{formatDistanceToNow(new Date(edge.created_at), { addSuffix: true })}</span>
            {edge.evidence_url && (
              <a href={edge.evidence_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-0.5">
                <ExternalLink className="h-3 w-3" /> Evidence
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main TrustTab ─────────────────────────────────────────
export function TrustTab({ nodeType, nodeId }: { nodeType: TrustNodeType; nodeId: string }) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterTag, setFilterTag] = useState("");
  const [filterEdgeType, setFilterEdgeType] = useState("all");
  const [filterDate, setFilterDate] = useState("all");

  // Fetch edges
  const { data: edges = [], isLoading } = useQuery({
    queryKey: ["trust-edges-received", nodeType, nodeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trust_edges")
        .select("*")
        .eq("to_node_type", nodeType)
        .eq("to_node_id", nodeId)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TrustEdgeRow[];
    },
    enabled: !!nodeId,
  });

  // Fetch giver profiles
  const giverIds = useMemo(() => {
    const ids = new Set<string>();
    for (const e of edges) {
      if (e.from_node_type === "profile") ids.add(e.from_node_id);
    }
    return [...ids];
  }, [edges]);

  const { data: giverProfiles = [] } = useQuery({
    queryKey: ["trust-giver-profiles", giverIds],
    queryFn: async () => {
      if (giverIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", giverIds);
      return (data ?? []) as GiverProfile[];
    },
    enabled: giverIds.length > 0,
  });

  const giverMap = useMemo(() => {
    const m: Record<string, GiverProfile> = {};
    for (const p of giverProfiles) m[p.user_id] = p;
    return m;
  }, [giverProfiles]);

  // Available tags for filter
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const e of edges) {
      if (e.tags) e.tags.forEach(t => { if (!t.startsWith("__")) tagSet.add(t); });
    }
    return [...tagSet].sort();
  }, [edges]);

  // Filter
  const filteredEdges = useMemo(() => {
    let result = edges;
    if (filterTag) result = result.filter(e => e.tags?.includes(filterTag));
    if (filterEdgeType !== "all") result = result.filter(e => e.edge_type === filterEdgeType);
    if (filterDate === "30d") {
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      result = result.filter(e => new Date(e.created_at).getTime() > cutoff);
    } else if (filterDate === "6m") {
      const cutoff = Date.now() - 6 * 30 * 24 * 60 * 60 * 1000;
      result = result.filter(e => new Date(e.created_at).getTime() > cutoff);
    } else if (filterDate === "1y") {
      const cutoff = Date.now() - 12 * 30 * 24 * 60 * 60 * 1000;
      result = result.filter(e => new Date(e.created_at).getTime() > cutoff);
    }
    return result;
  }, [edges, filterTag, filterEdgeType, filterDate]);

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground text-sm">Loading trust data…</div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <TrustSummaryHeader edges={edges} />

      {/* Filters */}
      {edges.length > 0 && (
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <Filter className="h-3.5 w-3.5 mr-1" /> Filters
              {filtersOpen ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="flex flex-wrap gap-3">
              <Select value={filterEdgeType} onValueChange={setFilterEdgeType}>
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue placeholder="Edge type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {Object.entries(EDGE_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {allTags.length > 0 && (
                <Select value={filterTag} onValueChange={setFilterTag}>
                  <SelectTrigger className="w-[160px] h-8 text-xs">
                    <SelectValue placeholder="Filter by tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All tags</SelectItem>
                    {allTags.map(tag => (
                      <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={filterDate} onValueChange={setFilterDate}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="6m">Last 6 months</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Edge list */}
      {filteredEdges.length === 0 && edges.length > 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">No edges match the current filters.</p>
      )}
      <div className="space-y-3">
        {filteredEdges.map(edge => (
          <TrustEdgeCard key={edge.id} edge={edge} giver={giverMap[edge.from_node_id]} />
        ))}
      </div>
    </div>
  );
}
