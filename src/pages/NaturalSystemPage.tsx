import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Leaf, Activity, Shield, ExternalLink, Plus, Settings, TreePine,
  Bug, Sprout, Microscope, Droplets, Users, Swords, MapPin, Link2,
  TrendingUp, AlertTriangle, BarChart3
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { KINGDOM_LABELS, SYSTEM_TYPE_LABELS } from "@/types/naturalSystems";
import {
  useNaturalSystem,
  useNaturalSystemLinks,
  useNsStewardEdges,
  useNsQuests,
  useTerritoryName,
  useProfilesByIds,
  useGuildsByIds,
  useAvailableMetrics,
} from "@/hooks/useNaturalSystemDetail";
import { useRecentDataPoints, useLatestIndicators } from "@/hooks/useNaturalSystemData";
import { AddLinkNaturalSystemModal } from "@/components/living/AddLinkNaturalSystemModal";
import { NsTimeseriesChart } from "@/components/natural-system/NsTimeseriesChart";
import { NsLiveConfigEditor } from "@/components/natural-system/NsLiveConfigEditor";

/* ─── Health helpers ─── */
const healthColor = (v: number) =>
  v < 30 ? "text-destructive" : v < 60 ? "text-warning" : v < 80 ? "text-accent" : "text-success";
const healthBg = (v: number) =>
  v < 30 ? "bg-destructive/10" : v < 60 ? "bg-warning/10" : v < 80 ? "bg-accent/10" : "bg-success/10";
const healthLabel = (v: number) =>
  v < 30 ? "Critical" : v < 60 ? "Stressed" : v < 80 ? "Stable" : "Thriving";

const KINGDOM_ICONS: Record<string, React.ReactNode> = {
  plants: <TreePine className="h-4 w-4" />,
  animals: <Bug className="h-4 w-4" />,
  fungi_lichens: <Sprout className="h-4 w-4" />,
  microorganisms: <Microscope className="h-4 w-4" />,
  multi_species_guild: <Leaf className="h-4 w-4" />,
};

function SectionHeading({ icon: Icon, title, sub }: { icon: typeof Leaf; title: string; sub?: string }) {
  return (
    <div className="space-y-1">
      <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
        <Icon className="h-5 w-5 text-success" /> {title}
      </h2>
      {sub && <p className="text-sm text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="text-center">
      <p className={cn("text-2xl font-bold", accent ?? "text-foreground")}>{value}</p>
      <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
    </div>
  );
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("rounded-xl bg-muted animate-pulse", className)} />;
}

export default function NaturalSystemPage() {
  const { id } = useParams<{ id: string }>();
  const { data: ns, isLoading } = useNaturalSystem(id);
  const { data: links } = useNaturalSystemLinks(id);
  const { data: stewardEdges } = useNsStewardEdges(id);
  const { data: quests } = useNsQuests(id);
  const { data: indicators } = useLatestIndicators(id);
  const { data: metrics } = useAvailableMetrics(id);
  const { data: territoryName } = useTerritoryName(ns?.territory_id);

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  // Resolve linked user/guild names
  const userLinks = useMemo(() => (links ?? []).filter(l => l.linked_type === "user"), [links]);
  const entityLinks = useMemo(() => (links ?? []).filter(l => l.linked_type === "entity"), [links]);
  const userIds = useMemo(() => userLinks.map(l => l.linked_id), [userLinks]);
  const guildIds = useMemo(() => entityLinks.map(l => l.linked_id), [entityLinks]);
  const { data: profiles } = useProfilesByIds(userIds);
  const { data: guilds } = useGuildsByIds(guildIds);

  const healthIndicator = indicators?.find(i => i.indicator === "health_index");
  const stressIndicator = indicators?.find(i => i.indicator === "stress_index");
  const healthVal = healthIndicator?.value ?? ns?.health_index ?? 50;

  // Quest stats
  const completedQuests = useMemo(() => (quests ?? []).filter(q => q.status === "COMPLETED"), [quests]);
  const totalXp = useMemo(() => (quests ?? []).reduce((s, q) => s + (q.xp_reward ?? 0), 0), [quests]);
  const totalCredits = useMemo(() => (quests ?? []).reduce((s, q) => s + (q.credit_budget ?? 0), 0), [quests]);

  // Top metrics to chart (first 3)
  const chartMetrics = useMemo(() => (metrics ?? []).slice(0, 3), [metrics]);

  if (isLoading) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-8 space-y-6">
        <SkeletonBlock className="h-48 w-full" />
        <div className="grid gap-4 md:grid-cols-2"><SkeletonBlock className="h-40" /><SkeletonBlock className="h-40" /></div>
      </div>
    );
  }

  if (!ns) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-20 text-center">
        <Leaf className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-xl font-bold text-foreground mb-2">Natural System not found</h1>
        <p className="text-muted-foreground">This system may have been removed or doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto px-4 py-6 space-y-10">

      {/* ═══════════════════════════════════════════════════════
          SECTION A – HERO & SUMMARY
         ═══════════════════════════════════════════════════════ */}
      <section>
        {/* Banner */}
        <div className="relative rounded-2xl overflow-hidden h-48 md:h-56">
          {ns.picture_url ? (
            <img src={ns.picture_url} alt={ns.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-success/20 via-primary/10 to-accent/10" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">{ns.name}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline" className="gap-1 bg-background/60 backdrop-blur-sm">
                {KINGDOM_ICONS[ns.kingdom] || <Leaf className="h-3.5 w-3.5" />}
                {KINGDOM_LABELS[ns.kingdom] || ns.kingdom}
              </Badge>
              <Badge variant="secondary" className="bg-background/60 backdrop-blur-sm">
                {SYSTEM_TYPE_LABELS[ns.system_type] || ns.system_type}
              </Badge>
              <Badge variant="outline" className={cn("bg-background/60 backdrop-blur-sm", healthColor(healthVal))}>
                {healthLabel(healthVal)}
              </Badge>
            </div>
          </div>
        </div>

        {/* Info strip */}
        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
          {ns.territory_id && territoryName && (
            <Link to={`/territories/${ns.territory_id}`} className="flex items-center gap-1 hover:text-primary transition-colors">
              <MapPin className="h-3.5 w-3.5" /> {territoryName}
            </Link>
          )}
          {ns.location_text && (
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {ns.location_text}</span>
          )}
          {ns.source_url && (
            <a href={ns.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
              <ExternalLink className="h-3.5 w-3.5" /> Source
            </a>
          )}
        </div>

        {ns.description && (
          <p className="mt-4 text-sm text-foreground/80 leading-relaxed max-w-prose">{ns.description}</p>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Button size="sm" variant="outline" onClick={() => setLinkModalOpen(true)}>
            <Link2 className="h-4 w-4 mr-1" /> Link to unit…
          </Button>
          <Button size="sm" variant="outline" onClick={() => setConfigOpen(true)}>
            <Settings className="h-4 w-4 mr-1" /> Configure live data
          </Button>
          {ns.territory_id && (
            <Link to={`/territories/${ns.territory_id}?tab=living`}>
              <Button size="sm" variant="ghost">
                <TreePine className="h-4 w-4 mr-1" /> Territory Living dashboard
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION B – LIVE DATA & HEALTH DASHBOARD
         ═══════════════════════════════════════════════════════ */}
      <section className="space-y-5">
        <SectionHeading icon={Activity} title="Live Data & Health" sub="Real-time metrics and computed indicators" />

        {/* Health card */}
        <div className="grid gap-5 md:grid-cols-2">
          <Card className="overflow-hidden">
            <CardContent className="p-5 flex items-center gap-6">
              <div className="relative h-20 w-20 shrink-0">
                <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" className="stroke-muted" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    className={cn(
                      healthVal < 30 ? "stroke-destructive" :
                      healthVal < 60 ? "stroke-warning" :
                      healthVal < 80 ? "stroke-accent" : "stroke-success"
                    )}
                    strokeWidth="3"
                    strokeDasharray={`${healthVal} ${100 - healthVal}`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-foreground">
                  {Math.round(healthVal)}
                </span>
              </div>
              <div className="space-y-2">
                <h3 className="font-display font-semibold text-sm">Health Index</h3>
                <Badge variant="outline" className={cn("text-xs", healthColor(healthVal))}>
                  {healthLabel(healthVal)}
                </Badge>
                {stressIndicator && (
                  <p className="text-xs text-muted-foreground">
                    Stress index: <span className="font-medium text-foreground">{Math.round(stressIndicator.value)}</span>
                  </p>
                )}
                {indicators && indicators.filter(i => i.indicator !== "health_index" && i.indicator !== "stress_index").map(ind => (
                  <p key={ind.indicator} className="text-xs text-muted-foreground">
                    {ind.indicator.replace(/_/g, " ")}: <span className="font-medium text-foreground">{Math.round(ind.value)}</span>
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Data sources card */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <h3 className="font-display font-semibold text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" /> Data Sources
              </h3>
              {(metrics ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No data points recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {(metrics ?? []).map(m => (
                    <div key={m.metric} className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="text-[10px] py-0">{m.source ?? "—"}</Badge>
                      <span className="font-medium text-foreground">{m.metric.replace(/_/g, " ")}</span>
                      {m.unit && <span className="text-muted-foreground">({m.unit})</span>}
                    </div>
                  ))}
                </div>
              )}
              {(ns as any).live_config && (
                <div className="mt-2 p-2 rounded-lg bg-muted/50 text-[11px] text-muted-foreground">
                  <span className="font-medium">Live source:</span> {(ns as any).live_config.type ?? "configured"} — {(ns as any).live_config.endpoint?.slice(0, 60) ?? "—"}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Time-series charts */}
        {chartMetrics.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {chartMetrics.map(m => (
              <NsTimeseriesChart key={m.metric} naturalSystemId={id!} metric={m.metric} unit={m.unit} />
            ))}
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION C – STEWARDSHIP & GOVERNANCE
         ═══════════════════════════════════════════════════════ */}
      <section className="space-y-5">
        <SectionHeading icon={Shield} title="Stewardship & Governance" sub="Eco-quests, stewards, and governance relationships" />

        {/* Stewardship activity */}
        <div className="grid gap-5 md:grid-cols-2">
          <Card>
            <CardContent className="p-5 space-y-4">
              <h3 className="font-display font-semibold text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Stewardship Activity
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <Stat label="Eco Quests" value={(quests ?? []).length} />
                <Stat label="Completed" value={completedQuests.length} accent="text-success" />
                <Stat label="XP Earned" value={totalXp} />
              </div>
              {totalCredits > 0 && (
                <p className="text-xs text-muted-foreground">Credits budgeted: <span className="font-medium">{totalCredits} ¢</span></p>
              )}
              {(quests ?? []).length > 0 && (
                <div className="space-y-2 mt-2">
                  <p className="text-[11px] font-medium text-muted-foreground">Recent quests</p>
                  {(quests ?? []).slice(0, 5).map(q => (
                    <Link key={q.id} to={`/quests/${q.id}`} className="flex items-center gap-2 rounded-lg p-2 hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{q.title}</p>
                        <p className="text-[10px] text-muted-foreground">{q.quest_type} · {q.status}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] py-0 shrink-0">{q.status}</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stewards */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <h3 className="font-display font-semibold text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Stewards
              </h3>

              {/* From OTG edges */}
              {(stewardEdges ?? []).length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-medium text-muted-foreground">Trust-weighted stewards</p>
                  {(stewardEdges ?? []).slice(0, 5).map((e, i) => {
                    const profile = profiles?.find(p => p.user_id === e.from_id);
                    const guild = guilds?.find(g => g.id === e.from_id);
                    const name = profile?.name ?? guild?.name ?? e.from_id.slice(0, 8);
                    return (
                      <div key={e.id} className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2">
                        <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{name}</p>
                          <p className="text-[10px] text-muted-foreground">{e.from_type} · {e.edge_type}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] py-0 shrink-0">
                          {e.weight.toFixed(2)} trust
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* From links */}
              {((profiles ?? []).length > 0 || (guilds ?? []).length > 0) && (
                <div className="space-y-2">
                  <p className="text-[11px] font-medium text-muted-foreground">Linked stewards</p>
                  {(profiles ?? []).map(p => (
                    <Link key={p.user_id} to={`/users/${p.user_id}`} className="flex items-center gap-2 rounded-lg p-2 hover:bg-muted/50 transition-colors">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-foreground truncate">{p.name || "—"}</span>
                    </Link>
                  ))}
                  {(guilds ?? []).map(g => (
                    <Link key={g.id} to={`/guilds/${g.id}`} className="flex items-center gap-2 rounded-lg p-2 hover:bg-muted/50 transition-colors">
                      <Swords className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-foreground truncate">{g.name || "—"}</span>
                    </Link>
                  ))}
                </div>
              )}

              {(stewardEdges ?? []).length === 0 && (profiles ?? []).length === 0 && (guilds ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">No stewards linked yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Governance relationships */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="font-display font-semibold text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Governance Relationships
            </h3>
            <div className="flex flex-wrap gap-3">
              {ns.territory_id && territoryName && (
                <Link to={`/territories/${ns.territory_id}`}>
                  <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted/50">
                    <MapPin className="h-3 w-3" /> Territory: {territoryName}
                  </Badge>
                </Link>
              )}
              {(links ?? []).filter(l => l.linked_type === "territory").map(l => (
                <Link key={l.id} to={`/territories/${l.linked_id}`}>
                  <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted/50">
                    <MapPin className="h-3 w-3" /> Linked territory
                  </Badge>
                </Link>
              ))}
            </div>
            {(stewardEdges ?? []).length > 0 && (
              <div className="rounded-xl border border-border bg-muted/30 p-4 mt-3">
                <p className="text-[11px] font-medium text-muted-foreground text-center mb-3">Trust Network</p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="h-10 w-10 rounded-full bg-success/20 ring-2 ring-success/30 flex items-center justify-center text-sm">🌿</div>
                    <span className="text-[9px] text-muted-foreground max-w-[60px] truncate text-center">{ns.name}</span>
                  </div>
                  {(stewardEdges ?? []).slice(0, 6).map(e => {
                    const emoji = e.from_type === "profile" ? "👤" : "⚔️";
                    const profile = profiles?.find(p => p.user_id === e.from_id);
                    const guild = guilds?.find(g => g.id === e.from_id);
                    const name = profile?.name ?? guild?.name ?? "";
                    return (
                      <div key={e.id} className="flex flex-col items-center gap-0.5">
                        <div className="h-8 w-8 rounded-full bg-secondary/15 flex items-center justify-center text-xs">{emoji}</div>
                        <span className="text-[8px] text-muted-foreground max-w-[50px] truncate text-center">{name}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-2">
                  {(stewardEdges ?? []).length} trust connections
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Modals */}
      <AddLinkNaturalSystemModal
        open={linkModalOpen}
        onOpenChange={setLinkModalOpen}
        linkedType="territory"
        linkedId={ns.territory_id ?? ""}
        defaultTerritoryId={ns.territory_id ?? undefined}
      />

      <NsLiveConfigEditor
        open={configOpen}
        onOpenChange={setConfigOpen}
        naturalSystemId={id!}
        currentConfig={(ns as any).live_config}
      />
    </div>
  );
}
