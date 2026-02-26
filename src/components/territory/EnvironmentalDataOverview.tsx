import { useState } from "react";
import {
  Database, RefreshCw, TreePine, Droplets, Thermometer, Globe, Layers,
  ChevronDown, ChevronUp, ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  useMatchTerritoryDatasets,
  useTerritoryDatasetMatches,
  useTerritoryPrecisionSettings,
} from "@/hooks/useEnvironmentalDatasets";

interface Props {
  territoryId: string;
  territoryName: string;
}

const MATCH_LEVEL_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  STRICT_MATCH: { label: "Strict", color: "bg-blue-500/15 text-blue-600 border-blue-500/30", icon: "🎯" },
  PERIMETER_MATCH: { label: "Perimeter", color: "bg-amber-500/15 text-amber-600 border-amber-500/30", icon: "📐" },
  BIOREGIONAL_MATCH: { label: "Bioregional", color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", icon: "🌍" },
};

const SOURCE_ICONS: Record<string, typeof TreePine> = {
  "IIASA": TreePine,
  "Copernicus": Globe,
  "GBIF": Layers,
  "NASA": Thermometer,
  "NOAA": Droplets,
};

export function EnvironmentalDataOverview({ territoryId, territoryName }: Props) {
  const { data: matches, isLoading } = useTerritoryDatasetMatches(territoryId);
  const { data: settings } = useTerritoryPrecisionSettings(territoryId);
  const matchMutation = useMatchTerritoryDatasets();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(true);

  const handleRefresh = async () => {
    try {
      await matchMutation.mutateAsync(territoryId);
      toast({ title: "Environmental datasets refreshed!" });
    } catch {
      toast({ title: "Failed to refresh datasets", variant: "destructive" });
    }
  };

  const matchLevel = settings?.precision_level || "PERIMETER_MATCH";
  const config = MATCH_LEVEL_CONFIG[matchLevel] || MATCH_LEVEL_CONFIG.PERIMETER_MATCH;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 group"
        >
          <div className="h-9 w-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <Database className="h-4.5 w-4.5 text-emerald-600" />
          </div>
          <div className="text-left">
            <h3 className="font-display text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              Environmental Data Overview
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {matches?.length ?? 0} datasets linked · Matching: {config.label}
            </p>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        <Button
          size="sm"
          variant="outline"
          onClick={handleRefresh}
          disabled={matchMutation.isPending}
          className="text-xs"
        >
          <RefreshCw className={cn("h-3.5 w-3.5 mr-1", matchMutation.isPending && "animate-spin")} />
          Refresh Data
        </Button>
      </div>

      {expanded && (
        <div className="space-y-3">
          {/* Matching level badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn("text-[10px] gap-1", config.color)}>
              {config.icon} {config.label} Match
            </Badge>
            {settings?.granularity && (
              <Badge variant="secondary" className="text-[10px]">
                Granularity: {settings.granularity.replace(/_/g, " ")}
              </Badge>
            )}
            {settings?.auto_expand_perimeter && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                Auto-expand enabled
              </Badge>
            )}
          </div>

          {/* Dataset list */}
          {isLoading ? (
            <div className="grid gap-2 md:grid-cols-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl border border-border bg-muted animate-pulse" />
              ))}
            </div>
          ) : matches && matches.length > 0 ? (
            <div className="grid gap-2 md:grid-cols-2">
              {matches.map((match) => {
                const mConfig = MATCH_LEVEL_CONFIG[match.match_level] || MATCH_LEVEL_CONFIG.PERIMETER_MATCH;
                const summary = match.fetched_summary as Record<string, unknown>;
                const IconComp = Object.entries(SOURCE_ICONS).find(([k]) => 
                  (summary?.source as string || "").includes(k)
                )?.[1] || Database;

                return (
                  <Card key={match.id} className="overflow-hidden hover:border-primary/30 transition-all">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                          <IconComp className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {(summary?.title as string) || `Dataset ${match.dataset_id.slice(0, 8)}`}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {(summary?.source as string) || "Unknown source"} · {match.matched_granularity}
                          </p>
                        </div>
                        <Badge variant="outline" className={cn("text-[9px] py-0 shrink-0", mConfig.color)}>
                          {mConfig.label}
                        </Badge>
                      </div>

                      {/* Mini summary stats if available */}
                      {summary && Object.keys(summary).length > 2 && (
                        <div className="flex gap-3 text-[10px] text-muted-foreground">
                          {Object.entries(summary)
                            .filter(([k]) => !["title", "source", "dataset_id", "match_level", "matched_at", "linked_at", "granularity"].includes(k))
                            .slice(0, 3)
                            .map(([k, v]) => (
                              <span key={k} className="flex items-center gap-1">
                                <span className="font-medium text-foreground">{String(v)}</span>
                                {k.replace(/_/g, " ")}
                              </span>
                            ))}
                        </div>
                      )}

                      {match.last_fetched_at && (
                        <p className="text-[9px] text-muted-foreground/60">
                          Last fetched: {new Date(match.last_fetched_at).toLocaleDateString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <Database className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No environmental datasets linked yet.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Click "Refresh Data" to match datasets based on territory granularity.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 text-xs"
                onClick={handleRefresh}
                disabled={matchMutation.isPending}
              >
                <RefreshCw className={cn("h-3 w-3 mr-1", matchMutation.isPending && "animate-spin")} />
                Match Datasets Now
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
