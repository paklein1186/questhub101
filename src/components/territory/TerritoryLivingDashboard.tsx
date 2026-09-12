import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  Leaf, Activity, Coins, Shield, Plus,
  TreePine, Droplets, Bug, Mountain, Sprout, Microscope,
  Users, Swords, Link2, RefreshCw, ChevronDown, ChevronUp,
  AlertCircle, Database, Globe, Layers, Thermometer,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { KINGDOM_LABELS, SYSTEM_TYPE_LABELS } from "@/types/naturalSystems";
import {
  useTerritoryLivingDashboard,
  useTerritoryNaturalSystems,
  type TerritoryNaturalSystem,
} from "@/hooks/useTerritoryLivingDashboard";
import {
  useMatchTerritoryDatasets,
  useTerritoryDatasetMatches,
  useTerritoryPrecisionSettings,
  useTerritoryLivingIndicators,
  useRefreshLivingIndicators,
  type StandardIndicator,
} from "@/hooks/useEnvironmentalDatasets";
import { AddLinkNaturalSystemModal } from "@/components/living/AddLinkNaturalSystemModal";
import { TerritoryPrecisionSettings } from "@/components/territory/TerritoryPrecisionSettings";

interface Props {
  territoryId: string;
  territoryName: string;
}

/* ─── Health helpers ─── */
const healthColor = (v: number) =>
  v < 30 ? "text-destructive" : v < 60 ? "text-warning" : v < 80 ? "text-accent" : "text-success";
const healthKey = (v: number) =>
  v < 30 ? "critical" : v < 60 ? "stressed" : v < 80 ? "stable" : "thriving";

const MATCH_LEVEL_CONFIG: Record<string, { key: string; color: string; icon: string }> = {
  STRICT_MATCH: { key: "strict", color: "bg-blue-500/15 text-blue-600 border-blue-500/30", icon: "🎯" },
  PERIMETER_MATCH: { key: "perimeter", color: "bg-amber-500/15 text-amber-600 border-amber-500/30", icon: "📐" },
  BIOREGIONAL_MATCH: { key: "bioregional", color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", icon: "🌍" },
};

const DATASET_TYPE_ICONS: Record<string, typeof TreePine> = {
  FOREST_NAVIGATOR: TreePine,
  COPERNICUS: Globe,
  GBIF: Layers,
  CUSTOM: Database,
};

const KINGDOM_ICONS: Record<string, React.ReactNode> = {
  plants: <TreePine className="h-3.5 w-3.5" />,
  animals: <Bug className="h-3.5 w-3.5" />,
  fungi_lichens: <Sprout className="h-3.5 w-3.5" />,
  microorganisms: <Microscope className="h-3.5 w-3.5" />,
  multi_species_guild: <Leaf className="h-3.5 w-3.5" />,
};

/* ─── Sparkline mini chart ─── */
function Sparkline({ values, color = "stroke-primary" }: { values: number[]; color?: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const w = 80;
  const h = 24;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline points={points} fill="none" className={cn(color, "opacity-60")} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Card ─── */
function DashCard({ icon: Icon, title, accent, children }: {
  icon: typeof Leaf; title: string; accent: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex items-center gap-3">
        <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", accent)}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <h3 className="font-display text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="px-5 pb-5 space-y-4">{children}</div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="text-center">
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/70">{sub}</p>}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 animate-pulse space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-muted" />
        <div className="h-4 w-32 rounded bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-12 rounded-lg bg-muted" />
        <div className="h-12 rounded-lg bg-muted" />
      </div>
    </div>
  );
}

/* ─── NS Card ─── */
function NsCard({ ns }: { ns: TerritoryNaturalSystem }) {
  const { t } = useTranslation();
  const desc = ns.description
    ? ns.description.length > 120 ? ns.description.slice(0, 120) + "…" : ns.description
    : null;

  return (
    <Link to={`/natural-systems/${ns.id}`} className="block">
      <Card className="overflow-hidden hover:border-primary/30 transition-all cursor-pointer">
        <div className="flex">
          {ns.picture_url && (
            <div className="w-24 h-24 shrink-0">
              <img src={ns.picture_url} alt={ns.name} className="w-full h-full object-cover" loading="lazy" />
            </div>
          )}
          <CardContent className="p-3 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-display font-semibold text-sm truncate flex-1">{ns.name}</h4>
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 shrink-0", healthColor(ns.health_index))}>
                {t(`livingDashboard.healthLabels.${healthKey(ns.health_index)}`)}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              <Badge variant="outline" className="text-[10px] gap-1 py-0">
                {KINGDOM_ICONS[ns.kingdom] || <Leaf className="h-3 w-3" />}
                {KINGDOM_LABELS[ns.kingdom as keyof typeof KINGDOM_LABELS] || ns.kingdom}
              </Badge>
              <Badge variant="secondary" className="text-[10px] py-0">
                {SYSTEM_TYPE_LABELS[ns.system_type as keyof typeof SYSTEM_TYPE_LABELS] || ns.system_type}
              </Badge>
            </div>
            {desc && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{desc}</p>}
            <div className="mt-1.5">
              <Progress value={ns.health_index} className="h-1.5" />
            </div>
          </CardContent>
        </div>
      </Card>
    </Link>
  );
}

/* ─── Indicator card with sparkline ─── */
const INDICATOR_META: Record<string, { key: string; unit: string; icon: typeof TreePine; sparkColor: string }> = {
  forest_cover: { key: "forestCover", unit: "%", icon: TreePine, sparkColor: "stroke-success" },
  carbon_stock: { key: "carbonStock", unit: "tC/ha", icon: Layers, sparkColor: "stroke-primary" },
  forest_change_rate: { key: "changeRate", unit: "%/yr", icon: Thermometer, sparkColor: "stroke-warning" },
  disturbances_index: { key: "disturbances", unit: "idx", icon: Droplets, sparkColor: "stroke-destructive" },
};

function IndicatorMiniCard({ indicatorKey, value, sparkValues }: {
  indicatorKey: string; value: number | null; sparkValues?: number[];
}) {
  const { t } = useTranslation();
  const meta = INDICATOR_META[indicatorKey];
  if (!meta) return null;
  const IconComp = meta.icon;
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <IconComp className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground">{t(`livingDashboard.indicators.${meta.key}`)}</p>
          <p className="text-sm font-bold text-foreground">
            {value != null ? `${value} ${meta.unit}` : "—"}
          </p>
        </div>
        {sparkValues && sparkValues.length >= 2 && (
          <Sparkline values={sparkValues} color={meta.sparkColor} />
        )}
      </CardContent>
    </Card>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════ */
export function TerritoryLivingDashboard({ territoryId, territoryName }: Props) {
  const { t } = useTranslation();
  const { data: dashboard, isLoading: dLoading } = useTerritoryLivingDashboard(territoryId);
  const { data: systems, isLoading: sLoading } = useTerritoryNaturalSystems(territoryId);
  const { data: settings } = useTerritoryPrecisionSettings(territoryId);
  const { data: indicators, isLoading: indicatorsLoading } = useTerritoryLivingIndicators(territoryId);
  const { data: matches } = useTerritoryDatasetMatches(territoryId);
  const matchMutation = useMatchTerritoryDatasets();
  const refreshMutation = useRefreshLivingIndicators();
  const [modalOpen, setModalOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const d = dashboard;
  const matchLevel = settings?.precision_level || "PERIMETER_MATCH";
  const mConfig = MATCH_LEVEL_CONFIG[matchLevel] || MATCH_LEVEL_CONFIG.PERIMETER_MATCH;
  const isRefreshing = matchMutation.isPending || refreshMutation.isPending;
  const mergedView = indicators?.mergedView || {};
  const datasetResults = indicators?.datasets || [];

  const handleRefresh = async () => {
    try {
      await matchMutation.mutateAsync(territoryId);
      await refreshMutation.mutateAsync(territoryId);
    } catch { /* handled by mutation */ }
  };

  return (
    <div className="space-y-8">

      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
            <Leaf className="h-5 w-5 text-success" /> {t("livingDashboard.header")}
          </h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="outline" className={cn("text-[10px] gap-1", mConfig.color)}>
              {mConfig.icon} {t(`livingDashboard.matchLevel.${mConfig.key}.label`)}
            </Badge>
            {settings?.granularity && (
              <Badge variant="secondary" className="text-[10px]">
                {settings.granularity.replace(/_/g, " ")}
              </Badge>
            )}
            {indicators?.eco_region && (
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                🌿 {indicators.eco_region.eco_region_name}
              </Badge>
            )}
            <span className="text-[10px] text-muted-foreground">{t(`livingDashboard.matchLevel.${mConfig.key}.fallback`)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowSettings(!showSettings)} className="text-xs">
            {t("livingDashboard.settingsButton")}
          </Button>
          <Button size="sm" variant="outline" onClick={handleRefresh} disabled={isRefreshing} className="text-xs">
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1", isRefreshing && "animate-spin")} />
            {t("livingDashboard.refreshData")}
          </Button>
        </div>
      </div>

      {/* ═══ PRECISION SETTINGS (collapsible) ═══ */}
      {showSettings && <TerritoryPrecisionSettings territoryId={territoryId} />}

      {/* ═══ SECTION 1: LIVING SYSTEMS ═══ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
            <TreePine className="h-4 w-4 text-success" /> {t("livingDashboard.livingSystems")}
            {systems && <span className="text-muted-foreground font-normal text-sm">({systems.length})</span>}
          </h3>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> {t("livingDashboard.addLink")}
          </Button>
        </div>

        {sLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl border border-border bg-muted animate-pulse" />
            ))}
          </div>
        ) : systems && systems.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {systems.map((ns) => <NsCard key={ns.id} ns={ns} />)}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Leaf className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{t("livingDashboard.noNaturalSystems")}</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> {t("livingDashboard.registerFirst")}
            </Button>
          </div>
        )}
      </section>

      {/* ═══ SECTION 2: ENVIRONMENTAL INDICATORS ═══ */}
      <section className="space-y-4">
        <h3 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
          <Database className="h-4 w-4 text-emerald-600" /> {t("livingDashboard.environmentalIndicators")}
          <span className="text-muted-foreground font-normal text-sm">{t("livingDashboard.datasetsCount", { count: matches?.length ?? 0 })}</span>
        </h3>

        {/* Merged indicators summary with sparklines */}
        {Object.keys(mergedView).length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.keys(INDICATOR_META).map((key) => (
              <IndicatorMiniCard
                key={key}
                indicatorKey={key}
                value={mergedView[key] as number | null ?? null}
                sparkValues={
                  // Generate mock sparkline from value for visual preview
                  mergedView[key] != null
                    ? Array.from({ length: 6 }, (_, i) => (mergedView[key] as number) * (0.85 + Math.random() * 0.3))
                    : undefined
                }
              />
            ))}
          </div>
        ) : !indicatorsLoading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.keys(INDICATOR_META).map((key) => (
              <IndicatorMiniCard key={key} indicatorKey={key} value={null} />
            ))}
          </div>
        )}

        {/* Dataset cards grouped by category */}
        {indicatorsLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 rounded-xl border border-border bg-muted animate-pulse" />
            ))}
          </div>
        ) : datasetResults.length > 0 ? (
          <div className="space-y-3">
            {/* Forest & Health */}
            {datasetResults.filter(ds => ds.dataset_type === "FOREST_NAVIGATOR" || ds.indicators.forest_cover != null).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <TreePine className="h-3 w-3" /> {t("livingDashboard.forestHealth")}
                </p>
                <div className="grid gap-2 md:grid-cols-2">
                  {datasetResults
                    .filter(ds => ds.dataset_type === "FOREST_NAVIGATOR" || ds.indicators.forest_cover != null)
                    .map((ds) => <DatasetCard key={ds.dataset_id} ds={ds} />)}
                </div>
              </div>
            )}

            {/* Carbon & Climate */}
            {datasetResults.filter(ds => ds.indicators.carbon_stock != null).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-3 w-3" /> {t("livingDashboard.carbonClimate")}
                </p>
                <div className="grid gap-2 md:grid-cols-2">
                  {datasetResults
                    .filter(ds => ds.indicators.carbon_stock != null)
                    .map((ds) => <DatasetCard key={`carbon-${ds.dataset_id}`} ds={ds} />)}
                </div>
              </div>
            )}

            {/* Other datasets */}
            {datasetResults.filter(ds =>
              ds.dataset_type !== "FOREST_NAVIGATOR" &&
              ds.indicators.forest_cover == null &&
              ds.indicators.carbon_stock == null
            ).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Globe className="h-3 w-3" /> {t("livingDashboard.otherDatasets")}
                </p>
                <div className="grid gap-2 md:grid-cols-2">
                  {datasetResults
                    .filter(ds =>
                      ds.dataset_type !== "FOREST_NAVIGATOR" &&
                      ds.indicators.forest_cover == null &&
                      ds.indicators.carbon_stock == null
                    )
                    .map((ds) => <DatasetCard key={`other-${ds.dataset_id}`} ds={ds} />)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <Database className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{t("livingDashboard.noDatasetsLinked")}</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {t("livingDashboard.noDatasetsHint")}
            </p>
            <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={cn("h-3 w-3 mr-1", isRefreshing && "animate-spin")} />
              {t("livingDashboard.matchDatasetsNow")}
            </Button>
          </div>
        )}
      </section>

      {/* ═══ SECTION 3: BIOREGIONAL DASHBOARD (stats) ═══ */}
      <section className="space-y-4">
        <h3 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" /> {t("livingDashboard.stewardshipGovernance")}
        </h3>

        {dLoading ? (
          <div className="grid gap-5 md:grid-cols-2">
            <CardSkeleton /><CardSkeleton />
          </div>
        ) : d ? (
          <div className="grid gap-5 md:grid-cols-2">
            {/* Ecosystem Health */}
            <DashCard icon={Leaf} title={t("livingDashboard.ecosystemHealth")} accent="bg-success/15 text-success">
              {d.natural_systems_count === 0 ? (
                <p className="text-sm text-muted-foreground">{t("livingDashboard.noNaturalSystems")}</p>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <div className="relative h-16 w-16 shrink-0">
                      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                        <circle cx="18" cy="18" r="15.9" fill="none" className="stroke-muted" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15.9" fill="none"
                          className={cn(
                            d.avg_health_index < 30 ? "stroke-destructive" :
                            d.avg_health_index < 60 ? "stroke-warning" :
                            d.avg_health_index < 80 ? "stroke-accent" : "stroke-success"
                          )}
                          strokeWidth="3"
                          strokeDasharray={`${d.avg_health_index} ${100 - d.avg_health_index}`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground">
                        {d.avg_health_index}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive" /> {t("livingDashboard.countedHealth.critical", { count: d.critical_systems_count })}</span>
                      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning" /> {t("livingDashboard.countedHealth.stressed", { count: d.stressed_systems_count })}</span>
                      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent" /> {t("livingDashboard.countedHealth.stable", { count: d.stable_systems_count })}</span>
                      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" /> {t("livingDashboard.countedHealth.thriving", { count: d.thriving_systems_count })}</span>
                    </div>
                  </div>
                  {Object.keys(d.natural_systems_by_type).length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-medium text-muted-foreground">{t("livingDashboard.byEcosystemType")}</p>
                      {Object.entries(d.natural_systems_by_type).map(([type, count]) => (
                        <div key={type} className="flex items-center gap-2">
                          <span className="text-[11px] w-28 truncate text-muted-foreground">
                            {SYSTEM_TYPE_LABELS[type as keyof typeof SYSTEM_TYPE_LABELS] || type}
                          </span>
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-success/60 transition-all" style={{ width: `${(count / d.natural_systems_count) * 100}%` }} />
                          </div>
                          <span className="text-[10px] font-medium text-foreground w-6 text-right">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </DashCard>

            {/* Stewardship Activity */}
            <DashCard icon={Activity} title={t("livingDashboard.stewardshipActivity")} accent="bg-primary/15 text-primary">
              <p className="text-[11px] text-muted-foreground -mt-2">{t("livingDashboard.last30Days")}</p>
              <div className="grid grid-cols-2 gap-4">
                <Stat label={t("livingDashboard.ecoQuests")} value={d.eco_quests_last_30d} />
                <Stat label={t("livingDashboard.completed")} value={d.eco_quests_completed_last_30d}
                  sub={d.eco_quests_last_30d > 0 ? t("livingDashboard.rateSuffix", { pct: Math.round((d.eco_quests_completed_last_30d / d.eco_quests_last_30d) * 100) }) : undefined} />
                <Stat label={t("livingDashboard.uniqueStewards")} value={d.unique_stewards_last_30d} />
                <Stat label={t("livingDashboard.activeGuilds")} value={d.active_guilds_last_30d} />
              </div>
            </DashCard>

            {/* Funding */}
            <DashCard icon={Coins} title={t("livingDashboard.fundingEnergy")} accent="bg-warning/15 text-warning">
              <p className="text-[11px] text-muted-foreground -mt-2">{t("livingDashboard.last90Days")}</p>
              <div className="grid grid-cols-2 gap-4">
                <Stat label={t("livingDashboard.creditsBudgeted")} value={`${d.credits_budgeted_last_90d} ¢`} />
                <Stat label={t("livingDashboard.creditsSpent")} value={`${d.credits_spent_last_90d} ¢`} />
                <Stat label={t("livingDashboard.xpEarned")} value={d.xp_from_eco_quests_last_90d} />
                <Stat label={t("livingDashboard.biopoints")} value={d.biopoints_distributed_last_90d} />
              </div>
            </DashCard>

            {/* Trust & Governance */}
            <DashCard icon={Shield} title={t("livingDashboard.trustGovernance")} accent="bg-secondary/15 text-secondary">
              {d.top_steward_users.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" /> {t("livingDashboard.topStewards")}
                  </p>
                  {d.top_steward_users.slice(0, 3).map((u, i) => (
                    <div key={u.user_id} className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2">
                      <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{u.display_name || "—"}</p>
                        <p className="text-[10px] text-muted-foreground">{t("livingDashboard.ecoQuestsCount", { count: u.eco_quests_count })}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] py-0 shrink-0">{t("livingDashboard.trustSuffix", { value: u.total_steward_weight })}</Badge>
                    </div>
                  ))}
                </div>
              )}
              {d.top_steward_guilds.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                    <Swords className="h-3 w-3" /> {t("livingDashboard.topGuilds")}
                  </p>
                  {d.top_steward_guilds.slice(0, 3).map((g, i) => (
                    <div key={g.guild_id} className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2">
                      <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                      <p className="text-xs font-medium text-foreground truncate flex-1">{g.name || "—"}</p>
                      <Badge variant="outline" className="text-[10px] py-0 shrink-0">{t("livingDashboard.trustSuffix", { value: g.total_steward_weight })}</Badge>
                    </div>
                  ))}
                </div>
              )}
              {d.top_steward_users.length === 0 && d.top_steward_guilds.length === 0 && (
                <p className="text-xs text-muted-foreground">{t("livingDashboard.noStewardshipEdges")}</p>
              )}
            </DashCard>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("livingDashboard.couldNotLoad")}</p>
        )}
      </section>

      <AddLinkNaturalSystemModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        linkedType="territory"
        linkedId={territoryId}
        defaultTerritoryId={territoryId}
      />
    </div>
  );
}

/* ─── Dataset status card ─── */
const STATUS_CONFIG: Record<string, { key: string; className: string }> = {
  ok: { key: "live", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  unavailable: { key: "unavailable", className: "bg-destructive/15 text-destructive border-destructive/30" },
  no_data: { key: "noData", className: "bg-muted text-muted-foreground border-border" },
};

function DatasetCard({ ds }: { ds: StandardIndicator }) {
  const { t } = useTranslation();
  const IconComp = DATASET_TYPE_ICONS[ds.dataset_type] || Database;
  const statusCfg = STATUS_CONFIG[ds.status] || STATUS_CONFIG.no_data;

  return (
    <Card className="overflow-hidden hover:border-primary/30 transition-all">
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
            {t(`livingDashboard.status.${statusCfg.key}`)}
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
            <AlertCircle className="h-3 w-3" /> {ds.error}
          </div>
        )}
        {ds.indicators.time_span && (
          <p className="text-[9px] text-muted-foreground/60">
            {t("livingDashboard.dataRange", { from: ds.indicators.time_span.from, to: ds.indicators.time_span.to })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
