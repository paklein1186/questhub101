import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Globe, List, Map as MapIcon, History, Loader2, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TerritoryMapView } from "@/components/network/TerritoryMapView";
import type { TerritoryLeaderboardItem } from "@/hooks/useNetworkLeaderboardData";

function useStewardedTerritories(userId: string) {
  return useQuery({
    queryKey: ["stewarded-territories", userId],
    queryFn: async () => {
      const { data: edges } = await supabase
        .from("trust_edges")
        .select("to_node_id")
        .eq("from_node_id", userId)
        .eq("edge_type", "stewardship" as any)
        .eq("status", "active" as any);

      if (!edges?.length) return [];

      const ids = edges.map((e: any) => e.to_node_id);
      const { data: territories } = await supabase
        .from("territories")
        .select("id, name, level, slug")
        .in("id", ids)
        .eq("is_deleted", false)
        .order("name");

      return territories ?? [];
    },
    enabled: !!userId,
  });
}

const ATTACHMENT_LABELS: Record<string, { label: string; emoji: string }> = {
  LIVE_IN: { label: "Lives in", emoji: "🏠" },
  WORK_IN: { label: "Works in", emoji: "💼" },
  CARE_FOR: { label: "Cares for", emoji: "💚" },
};

interface Props {
  userId: string;
  territories: any[];
}

export function ProfileTerritoriesTab({ userId, territories }: Props) {
  const [view, setView] = useState<"map" | "tiles">("map");

  // Build leaderboard-shaped items for the map component
  const mapItems: TerritoryLeaderboardItem[] = useMemo(() => {
    const seen = new Map<string, TerritoryLeaderboardItem>();
    for (const t of territories) {
      const ter = t.territory;
      if (!ter || seen.has(ter.id)) continue;
      seen.set(ter.id, {
        id: ter.id,
        name: ter.name,
        level: ter.level ?? null,
        parent_name: null,
        quests: 0,
        entities: 0,
        memoryContributions: 0,
        topTopics: [],
        synthesis: "",
        cover_url: null,
        logo_url: null,
      });
    }
    return [...seen.values()];
  }, [territories]);

  const { data: stewarded = [] } = useStewardedTerritories(userId);

  // Group territories by attachment type
  const grouped = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const t of territories) {
      const type = t.attachmentType || "OTHER";
      if (!groups[type]) groups[type] = [];
      groups[type].push(t);
    }
    return groups;
  }, [territories]);

  // Fetch territory-scoped activity for this user
  const territoryIds = useMemo(() => [...new Set(territories.map((t: any) => t.territory?.id).filter(Boolean))], [territories]);

  const { data: territoryActivity = [], isLoading: loadingActivity } = useQuery({
    queryKey: ["profile-territory-activity", userId, territoryIds],
    queryFn: async () => {
      if (territoryIds.length === 0) return [];

      // Get activity_log entries that reference territories
      const { data: allActivity } = await supabase
        .from("activity_log")
        .select("*")
        .eq("actor_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (!allActivity?.length) return [];

      // Also fetch posts the user created in these territories
      const { data: territoryPosts } = await supabase
        .from("feed_posts")
        .select("id, context_type, context_id")
        .eq("author_user_id", userId)
        .eq("context_type", "TERRITORY")
        .in("context_id", territoryIds)
        .eq("is_deleted", false);

      const postIds = new Set((territoryPosts ?? []).map((p: any) => p.id));
      const postTerritoryMap: Record<string, string> = {};
      (territoryPosts ?? []).forEach((p: any) => { postTerritoryMap[p.id] = p.context_id; });

      // Filter activity to territory-related actions
      const filtered = allActivity.filter((a: any) => {
        // Direct territory actions (followed territory, etc.)
        if (a.target_type === "territory" && territoryIds.includes(a.target_id)) return true;
        // Posts created in territories
        if (a.action_type === "post_created" && a.target_id && postIds.has(a.target_id)) return true;
        // Territory memory contributions
        if (a.action_type === "territory_memory_contributed" && territoryIds.includes(a.target_id)) return true;
        return false;
      });

      // Enrich with territory name
      return filtered.map((a: any) => ({
        ...a,
        _territoryId: a.target_type === "territory" ? a.target_id : postTerritoryMap[a.target_id] || null,
      }));
    },
    enabled: !!userId && territoryIds.length > 0,
  });

  // Build territory name lookup
  const territoryNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    territories.forEach((t: any) => {
      if (t.territory) map[t.territory.id] = t.territory.name;
    });
    return map;
  }, [territories]);

  if (territories.length === 0 && stewarded.length === 0) {
    return (
      <div className="text-center py-12">
        <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No territories linked yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stewarded territories */}
      {stewarded.length > 0 && (
        <section>
          <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <Crown className="h-4 w-4 text-amber-500" /> Stewarded Territories
          </h4>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {stewarded.map((t: any) => (
              <Link
                key={t.id}
                to={`/territories/${t.id}`}
                className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 hover:border-amber-500/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                    <Crown className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="font-display font-semibold text-sm truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {t.name}
                    </h5>
                    {t.level && (
                      <Badge variant="outline" className="text-[10px] capitalize mt-0.5">
                        {t.level.toLowerCase()}
                      </Badge>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
      {/* View toggle */}
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" /> Territories ({mapItems.length})
        </h3>
        <div className="flex gap-1 rounded-lg border border-border p-0.5">
          <Button
            size="sm"
            variant={view === "map" ? "default" : "ghost"}
            className="h-7 px-2.5 text-xs"
            onClick={() => setView("map")}
          >
            <MapIcon className="h-3.5 w-3.5 mr-1" /> Map
          </Button>
          <Button
            size="sm"
            variant={view === "tiles" ? "default" : "ghost"}
            className="h-7 px-2.5 text-xs"
            onClick={() => setView("tiles")}
          >
            <List className="h-3.5 w-3.5 mr-1" /> Tiles
          </Button>
        </div>
      </div>

      {/* Map view */}
      {view === "map" && <TerritoryMapView territories={mapItems} />}

      {/* Tiles view — grouped by attachment type */}
      {view === "tiles" && (
        <div className="space-y-5">
          {Object.entries(ATTACHMENT_LABELS).map(([key, meta]) => {
            const items = grouped[key];
            if (!items?.length) return null;
            return (
              <section key={key}>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                  {meta.emoji} {meta.label}
                </h4>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((t: any) => (
                    <Link
                      key={t.territory?.id || t.id}
                      to={`/territories/${t.territory?.id}`}
                      className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h5 className="font-display font-semibold text-sm truncate group-hover:text-primary transition-colors">
                            {t.territory?.name}
                          </h5>
                          {t.territory?.level && (
                            <Badge variant="outline" className="text-[10px] capitalize mt-0.5">
                              {t.territory.level.toLowerCase()}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Territory activity */}
      <section>
        <h4 className="font-display font-semibold flex items-center gap-2 mb-3">
          <History className="h-4 w-4 text-primary" /> Territory Activity
        </h4>
        {loadingActivity ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : territoryActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No territory-specific activity recorded yet. Posts, follows, and contributions in your territories will appear here.
          </p>
        ) : (
          <div className="space-y-2">
            {territoryActivity.slice(0, 20).map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5">
                <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">
                    <span className="font-medium">{a.action_type.replace(/_/g, " ")}</span>
                    {a.target_name && <span className="text-muted-foreground"> — {a.target_name}</span>}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {a._territoryId && territoryNameMap[a._territoryId] && (
                      <Badge variant="outline" className="text-[9px]">{territoryNameMap[a._territoryId]}</Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
