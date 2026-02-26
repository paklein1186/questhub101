import { useState } from "react";
import {
  Database, RefreshCw, TreePine, Droplets, Thermometer, Globe, Layers,
  ChevronDown, ChevronUp, AlertCircle,
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
  useTerritoryLivingIndicators,
  useRefreshLivingIndicators,
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

const DATASET_TYPE_ICONS: Record<string, typeof TreePine> = {
  FOREST_NAVIGATOR: TreePine,
  COPERNICUS: Globe,
  GBIF: Layers,
  CUSTOM: Database,
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  ok: { label: "Live", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  unavailable: { label: "Unavailable", className: "bg-destructive/15 text-destructive border-destructive/30" },
  no_data: { label: "No data", className: "bg-muted text-muted-foreground border-border" },
};

const INDICATOR_LABELS: Record<string, { label: string; unit: string; icon: typeof TreePine }> = {
  forest_cover: { label: "Forest Cover", unit: "%", icon: TreePine },
  carbon_stock: { label: "Carbon Stock", unit: "tC/ha", icon: Layers },
  forest_change_rate: { label: "Change Rate", unit: "%/yr", icon: Thermometer },
  disturbances_index: { label: "Disturbances", unit: "idx", icon: Droplets },
};

export function EnvironmentalDataOverview({ territoryId, territoryName }: Props) {
  const { data: matches, isLoading: matchesLoading } = useTerritoryDatasetMatches(territoryId);
  const { data: settings } = useTerritoryPrecisionSettings(territoryId);
  const { data: indicators, isLoading: indicatorsLoading } = useTerritoryLivingIndicators(territoryId);
  const matchMutation = useMatchTerritoryDatasets();
  const refreshMutation = useRefreshLivingIndicators();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(true);

  const isLoading = matchesLoading || indicatorsLoading;
  const isRefreshing = matchMutation.isPending || refreshMutation.isPending;

  const handleRefresh = async () => {
    try {
      await matchMutation.mutateAsync(territoryId);
      await refreshMutation.mutateAsync(territoryId);
      toast({ title: "Environmental data refreshed!" });
    } catch {
      toast({ title: "Failed to refresh datasets", variant: "destructive" });
    }
  };

  const matchLevel = settings?.precision_level || "PERIMETER_MATCH";
  const config = MATCH_LEVEL_CONFIG[matchLevel] || MATCH_LEVEL_CONFIG.PERIMETER_MATCH;

  // Merged indicators from the edge function
  const mergedView = indicators?.mergedView || {};
  const datasetResults = indicators?.datasets || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 group">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <Database className="h-4.5 w-4.5 text-emerald-600" />
          </div>
          <div className="text-left">
            <h3 className="font-display text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              Environmental Data Overview
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {matches?.length ?? 0} datasets linked · Matching: {config.label}
              {indicators?.eco_region && ` · Eco: ${indicators.eco_region.eco_region_name}`}
            </p>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        <Button size="sm" variant="outline" onClick={handleRefresh} disabled={isRefreshing} className="text-xs">
          <RefreshCw className={cn("h-3.5 w-3.5 mr-1", isRefreshing && "animate-spin")} />
          Refresh Data
        </Button>
      </div>

      {expanded && (
        <div className="space-y-4">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn("text-[10px] gap-1", config.color)}>
              {config.icon} {config.label} Match
            </Badge>
            {settings?.granularity && (
              <Badge variant="secondary" className="text-[10px]">
                Granularity: {settings.granularity.replace(/_/g, " ")}
              </Badge>
            )}
            {indicators?.eco_region && (
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                🌿 {indicators.eco_region.eco_region_code}
              </Badge>
            )}
          </div>

          {/* Merged indicators summary */}
          {Object.keys(mergedView).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(INDICATOR_LABELS).map(([key, meta]) => {
                const val = mergedView[key];
                const IconComp = meta.icon;
                return (
                  <Card key={key} className="overflow-hidden">
                    <CardContent className="p-3 flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <IconComp className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">{meta.label}</p>
                        <p className="text-sm font-semibold text-foreground">
                          {val != null ? `${val} ${meta.unit}` : "—"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Datasets list */}
          {isLoading ? (
            <div className="grid gap-2 md:grid-cols-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl border border-border bg-muted animate-pulse" />
              ))}
            </div>
          ) : datasetResults.length > 0 ? (
            <div className="grid gap-2 md:grid-cols-2">
              {datasetResults.map((ds) => {
                const IconComp = DATASET_TYPE_ICONS[ds.dataset_type] || Database;
                const statusCfg = STATUS_CONFIG[ds.status] || STATUS_CONFIG.no_data;

                return (
                  <Card key={ds.dataset_id} className="overflow-hidden hover:border-primary/30 transition-all">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                          <IconComp className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{ds.dataset_title}</p>
                          <p className="text-[10px] text-muted-foreground">{ds.dataset_source} · {ds.dataset_type}</p>
                        </div>
                        <Badge variant="outline" className={cn("text-[9px] py-0 shrink-0", statusCfg.className)}>
                          {statusCfg.label}
                        </Badge>
                      </div>

                      {ds.status === "ok" && (
                        <div className="flex gap-3 text-[10px] text-muted-foreground flex-wrap">
                          {Object.entries(ds.indicators)
                            .filter(([k, v]) => k !== "meta" && k !== "time_span" && v != null)
                            .map(([k, v]) => (
                              <span key={k} className="flex items-center gap-1">
                                <span className="font-medium text-foreground">{String(v)}</span>
                                {k.replace(/_/g, " ")}
                              </span>
                            ))}
                        </div>
                      )}

                      {ds.status === "unavailable" && ds.error && (
                        <div className="flex items-center gap-1 text-[10px] text-destructive">
                          <AlertCircle className="h-3 w-3" />
                          {ds.error}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : matches && matches.length > 0 ? (
            <div className="rounded-xl border border-dashed border-border p-4 text-center">
              <p className="text-xs text-muted-foreground">
                {matches.length} datasets matched but no live indicators fetched yet.
              </p>
              <Button size="sm" variant="outline" className="mt-2 text-xs" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={cn("h-3 w-3 mr-1", isRefreshing && "animate-spin")} />
                Fetch Indicators
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <Database className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No environmental datasets linked yet.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Click "Refresh Data" to match datasets based on territory granularity.
              </p>
              <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={cn("h-3 w-3 mr-1", isRefreshing && "animate-spin")} />
                Match Datasets Now
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
