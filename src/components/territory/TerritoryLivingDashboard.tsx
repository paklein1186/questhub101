import { Link } from "react-router-dom";
import {
  Leaf, Activity, Coins, Shield,
  TreePine, Droplets, Bug, Mountain, Sprout,
  ArrowRight, TrendingUp, TrendingDown, Minus,
  Users, Swords, CheckCircle2, BarChart3,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  useEcosystemHealth,
  useStewardshipActivity,
  useFundingData,
} from "@/hooks/useLivingDashboard";
import { useTerritoryOtgStewards, useTerritoryOtgGraph } from "@/hooks/useTerritoryOtg";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface Props {
  territoryId: string;
  territoryName: string;
}

/* ─── Health status helpers ─── */
const healthColor = (v: number) =>
  v < 30 ? "text-destructive" : v < 60 ? "text-warning" : v < 80 ? "text-accent" : "text-success";

const healthBg = (v: number) =>
  v < 30 ? "bg-destructive/10" : v < 60 ? "bg-warning/10" : v < 80 ? "bg-accent/10" : "bg-success/10";

const healthLabel = (v: number) =>
  v < 30 ? "Critical" : v < 60 ? "Stressed" : v < 80 ? "Stable" : "Thriving";

const systemIcon: Record<string, typeof TreePine> = {
  river: Droplets,
  wetland: Droplets,
  forest: TreePine,
  soil_system: Mountain,
  pollinator_network: Bug,
  species_guild: Sprout,
  other: Leaf,
};

const systemLabel: Record<string, string> = {
  river: "River",
  wetland: "Wetland",
  forest: "Forest",
  soil_system: "Soil System",
  pollinator_network: "Pollinator Network",
  species_guild: "Species Guild",
  other: "Other",
};

/* ─── Dashboard Card wrapper ─── */
function DashCard({
  icon: Icon,
  title,
  accentClass,
  children,
  linkTo,
  linkLabel,
}: {
  icon: typeof Leaf;
  title: string;
  accentClass: string;
  children: React.ReactNode;
  linkTo?: string;
  linkLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex items-center gap-3">
        <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", accentClass)}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <h3 className="font-display text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="px-5 pb-5 space-y-4">{children}</div>
      {linkTo && (
        <Link
          to={linkTo}
          className="flex items-center gap-1.5 px-5 py-3 border-t border-border text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
        >
          {linkLabel ?? "See more"} <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

/* ─── Stat pill ─── */
function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="text-center">
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/70">{sub}</p>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   1. ECOSYSTEM HEALTH CARD
   ══════════════════════════════════════════════════════════════ */
function EcosystemHealthCard({ territoryId }: { territoryId: string }) {
  const { data, isLoading } = useEcosystemHealth(territoryId);

  if (isLoading) return <CardSkeleton />;
  if (!data || data.systems.length === 0) {
    return (
      <DashCard icon={Leaf} title="Ecosystem Health" accentClass="bg-success/15 text-success">
        <p className="text-sm text-muted-foreground">No natural systems registered yet.</p>
      </DashCard>
    );
  }

  return (
    <DashCard icon={Leaf} title="Ecosystem Health" accentClass="bg-success/15 text-success">
      {/* Top-line gauge */}
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0">
          <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" className="stroke-muted" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15.9" fill="none"
              className={cn(
                data.avgHealth < 30 ? "stroke-destructive" :
                data.avgHealth < 60 ? "stroke-warning" :
                data.avgHealth < 80 ? "stroke-accent" : "stroke-success"
              )}
              strokeWidth="3"
              strokeDasharray={`${data.avgHealth} ${100 - data.avgHealth}`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground">
            {data.avgHealth}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive" /> Critical: {data.critical}</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning" /> Stressed: {data.stressed}</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent" /> Stable: {data.stable}</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" /> Thriving: {data.thriving}</span>
        </div>
      </div>

      {/* System tiles */}
      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {data.systems.map((s) => {
          const SysIcon = systemIcon[s.type] || Leaf;
          return (
            <div key={s.id} className={cn("flex items-center gap-3 rounded-xl px-3 py-2", healthBg(s.health_index))}>
              <SysIcon className={cn("h-4 w-4 shrink-0", healthColor(s.health_index))} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{s.name}</p>
                <p className="text-[10px] text-muted-foreground">{systemLabel[s.type] || s.type}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Progress value={s.health_index} className="w-16 h-1.5" />
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", healthColor(s.health_index))}>
                  {healthLabel(s.health_index)}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </DashCard>
  );
}

/* ══════════════════════════════════════════════════════════════
   2. STEWARDSHIP ACTIVITY CARD
   ══════════════════════════════════════════════════════════════ */
function StewardshipCard({ territoryId }: { territoryId: string }) {
  const { data, isLoading } = useStewardshipActivity(territoryId);

  if (isLoading) return <CardSkeleton />;

  return (
    <DashCard icon={Activity} title="Stewardship Activity" accentClass="bg-primary/15 text-primary">
      <p className="text-[11px] text-muted-foreground -mt-2">Last 30 days</p>
      <div className="grid grid-cols-2 gap-4">
        <Stat label="Eco Quests Created" value={data?.ecoQuestsCreated ?? 0} />
        <Stat label="Completed" value={data?.ecoQuestsCompleted ?? 0} sub={`${data?.completionRate ?? 0}% rate`} />
        <Stat label="Unique Stewards" value={data?.uniqueStewards ?? 0} />
        <Stat label="Active Guilds" value={data?.activeGuilds ?? 0} />
      </div>
      {/* Mini completion bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Completion rate</span>
          <span className="font-medium">{data?.completionRate ?? 0}%</span>
        </div>
        <Progress value={data?.completionRate ?? 0} className="h-2" />
      </div>
    </DashCard>
  );
}

/* ══════════════════════════════════════════════════════════════
   3. FUNDING & CREDITS CARD
   ══════════════════════════════════════════════════════════════ */
function FundingCard({ territoryId }: { territoryId: string }) {
  const { data, isLoading } = useFundingData(territoryId);

  if (isLoading) return <CardSkeleton />;

  const maxAmount = Math.max(...(data?.bySystemType.map((s) => s.amount) ?? [1]), 1);

  return (
    <DashCard icon={Coins} title="Funding & Credits" accentClass="bg-warning/15 text-warning">
      <p className="text-[11px] text-muted-foreground -mt-2">Last 90 days</p>
      <div className="grid grid-cols-2 gap-4">
        <Stat label="Total Budgeted" value={`${data?.totalBudgeted ?? 0} ¢`} />
        <Stat label="Actually Paid" value={`${data?.totalPaid ?? 0} ¢`} />
      </div>

      {data && data.bySystemType.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-medium text-muted-foreground">By ecosystem type</p>
          {data.bySystemType.map((s) => (
            <div key={s.type} className="flex items-center gap-2">
              <span className="text-[11px] w-24 truncate text-muted-foreground">{systemLabel[s.type] || s.type}</span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-warning/70 transition-all"
                  style={{ width: `${(s.amount / maxAmount) * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-foreground w-10 text-right">{s.amount}</span>
            </div>
          ))}
        </div>
      )}

      {(!data || data.bySystemType.length === 0) && (
        <p className="text-xs text-muted-foreground">No ecological funding data yet.</p>
      )}
    </DashCard>
  );
}

/* ══════════════════════════════════════════════════════════════
   4. TRUST & GOVERNANCE CARD (enriched with names/avatars + mini graph)
   ══════════════════════════════════════════════════════════════ */
function TrustGovernanceCard({ territoryId }: { territoryId: string }) {
  const { data: stewards, isLoading: sLoading } = useTerritoryOtgStewards(territoryId, 5);
  const { data: graph, isLoading: gLoading } = useTerritoryOtgGraph(territoryId, 15);

  if (sLoading && gLoading) return <CardSkeleton />;

  const maxWeight = Math.max(...(stewards ?? []).map((s) => s.total_weight), 1);

  return (
    <DashCard icon={Shield} title="Trust & Governance" accentClass="bg-secondary/15 text-secondary">
      {stewards && stewards.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[11px] font-medium text-muted-foreground">Top Stewards (by trust weight)</p>
          {stewards.map((s, i) => (
            <div key={`${s.node_type}:${s.node_id}`} className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2">
              <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
              <Avatar className="h-7 w-7 shrink-0">
                {s.node_avatar && <AvatarImage src={s.node_avatar} alt={s.node_name ?? ""} />}
                <AvatarFallback className="text-[10px]">
                  {s.node_type === "profile" ? "👤" : "⚔️"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[9px] px-1 py-0 capitalize">{s.node_type}</Badge>
                  <span className="text-xs font-medium text-foreground truncate">{s.node_name ?? s.node_id.slice(0, 8)}</span>
                </div>
                {s.tags && s.tags.length > 0 && (
                  <div className="flex gap-1 mt-0.5">
                    {s.tags.slice(0, 3).map((t) => (
                      <span key={t} className="text-[9px] text-muted-foreground">#{t}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-secondary/70"
                    style={{ width: `${Math.min((s.total_weight / maxWeight) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium text-foreground w-8 text-right">{s.total_weight.toFixed(1)}</span>
                <span className="text-[9px] text-muted-foreground">({s.edge_count})</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No stewardship trust edges yet.</p>
      )}

      {/* Mini network visualization */}
      {graph && graph.nodes.length > 1 && (
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
          <p className="text-[11px] font-medium text-muted-foreground text-center">Trust Network</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {graph.nodes.slice(0, 8).map((node) => {
              const emoji = node.type === "territory" ? "🌍" : node.type === "natural_system" ? "🌿" : node.type === "profile" ? "👤" : "⚔️";
              const bg = node.is_center
                ? "bg-primary/20 ring-2 ring-primary/30"
                : node.type === "natural_system" ? "bg-success/15" : "bg-secondary/15";
              return (
                <div key={node.id} className="flex flex-col items-center gap-0.5">
                  <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-xs", bg)}>
                    {node.avatar ? (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={node.avatar} />
                        <AvatarFallback className="text-[10px]">{emoji}</AvatarFallback>
                      </Avatar>
                    ) : emoji}
                  </div>
                  <span className="text-[8px] text-muted-foreground max-w-[50px] truncate text-center">{node.name}</span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            {graph.nodes.length} nodes · {graph.edges.length} connections
          </p>
        </div>
      )}
    </DashCard>
  );
}

/* ─── Skeleton ─── */
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
      <div className="h-6 rounded bg-muted" />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN DASHBOARD
   ══════════════════════════════════════════════════════════════ */
export function TerritoryLivingDashboard({ territoryId, territoryName }: Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
          <Leaf className="h-5 w-5 text-success" />
          Living Territory Dashboard
        </h2>
        <p className="text-sm text-muted-foreground">
          Real-time ecosystem health, stewardship, funding & trust for {territoryName}
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <EcosystemHealthCard territoryId={territoryId} />
        <StewardshipCard territoryId={territoryId} />
        <FundingCard territoryId={territoryId} />
        <TrustGovernanceCard territoryId={territoryId} />
      </div>
    </div>
  );
}
