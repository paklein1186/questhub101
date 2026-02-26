import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Leaf, Activity, Coins, Shield, Plus,
  TreePine, Droplets, Bug, Mountain, Sprout, Microscope,
  Users, Swords, Link2,
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
import { AddLinkNaturalSystemModal } from "@/components/living/AddLinkNaturalSystemModal";
import { EnvironmentalDataOverview } from "@/components/territory/EnvironmentalDataOverview";
import { TerritoryPrecisionSettings } from "@/components/territory/TerritoryPrecisionSettings";

interface Props {
  territoryId: string;
  territoryName: string;
}

/* ─── Health helpers ─── */
const healthColor = (v: number) =>
  v < 30 ? "text-destructive" : v < 60 ? "text-warning" : v < 80 ? "text-accent" : "text-success";
const healthBg = (v: number) =>
  v < 30 ? "bg-destructive/10" : v < 60 ? "bg-warning/10" : v < 80 ? "bg-accent/10" : "bg-success/10";
const healthLabel = (v: number) =>
  v < 30 ? "Critical" : v < 60 ? "Stressed" : v < 80 ? "Stable" : "Thriving";

/* ─── Card wrapper ─── */
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

/* ════════════════════════════════════════════════════════════════
   NATURAL SYSTEM CARD (for listing)
   ════════════════════════════════════════════════════════════════ */
const KINGDOM_ICONS: Record<string, React.ReactNode> = {
  plants: <TreePine className="h-3.5 w-3.5" />,
  animals: <Bug className="h-3.5 w-3.5" />,
  fungi_lichens: <Sprout className="h-3.5 w-3.5" />,
  microorganisms: <Microscope className="h-3.5 w-3.5" />,
  multi_species_guild: <Leaf className="h-3.5 w-3.5" />,
};

function NsCard({ ns }: { ns: TerritoryNaturalSystem }) {
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
              {healthLabel(ns.health_index)}
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

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════ */
export function TerritoryLivingDashboard({ territoryId, territoryName }: Props) {
  const { data: dashboard, isLoading: dLoading } = useTerritoryLivingDashboard(territoryId);
  const { data: systems, isLoading: sLoading } = useTerritoryNaturalSystems(territoryId);
  const [modalOpen, setModalOpen] = useState(false);

  const d = dashboard;

  return (
    <div className="space-y-8">
      {/* ═══ A. BIOREGIONAL DASHBOARD ═══ */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
            <Leaf className="h-5 w-5 text-success" /> Bioregional Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">
            Ecosystem health, stewardship & funding for {territoryName}
          </p>
        </div>

        {dLoading ? (
          <div className="grid gap-5 md:grid-cols-2">
            <CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton />
          </div>
        ) : d ? (
          <div className="grid gap-5 md:grid-cols-2">
            {/* ── Card 1: Ecosystem Health ── */}
            <DashCard icon={Leaf} title="Ecosystem Health" accent="bg-success/15 text-success">
              {d.natural_systems_count === 0 ? (
                <p className="text-sm text-muted-foreground">No natural systems registered yet.</p>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <div className="relative h-16 w-16 shrink-0">
                      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                        <circle cx="18" cy="18" r="15.9" fill="none" className="stroke-muted" strokeWidth="3" />
                        <circle
                          cx="18" cy="18" r="15.9" fill="none"
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
                      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive" /> Critical: {d.critical_systems_count}</span>
                      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning" /> Stressed: {d.stressed_systems_count}</span>
                      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent" /> Stable: {d.stable_systems_count}</span>
                      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-success" /> Thriving: {d.thriving_systems_count}</span>
                    </div>
                  </div>
                  {/* By-type bar */}
                  {Object.keys(d.natural_systems_by_type).length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-medium text-muted-foreground">By ecosystem type</p>
                      {Object.entries(d.natural_systems_by_type).map(([type, count]) => (
                        <div key={type} className="flex items-center gap-2">
                          <span className="text-[11px] w-28 truncate text-muted-foreground">
                            {SYSTEM_TYPE_LABELS[type as keyof typeof SYSTEM_TYPE_LABELS] || type}
                          </span>
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-success/60 transition-all"
                              style={{ width: `${(count / d.natural_systems_count) * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-medium text-foreground w-6 text-right">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </DashCard>

            {/* ── Card 2: Stewardship Activity ── */}
            <DashCard icon={Activity} title="Stewardship Activity" accent="bg-primary/15 text-primary">
              <p className="text-[11px] text-muted-foreground -mt-2">Last 30 days</p>
              <div className="grid grid-cols-2 gap-4">
                <Stat label="Eco Quests" value={d.eco_quests_last_30d} />
                <Stat
                  label="Completed"
                  value={d.eco_quests_completed_last_30d}
                  sub={d.eco_quests_last_30d > 0
                    ? `${Math.round((d.eco_quests_completed_last_30d / d.eco_quests_last_30d) * 100)}% rate`
                    : undefined}
                />
                <Stat label="Unique Stewards" value={d.unique_stewards_last_30d} />
                <Stat label="Active Guilds" value={d.active_guilds_last_30d} />
              </div>
              {d.eco_quests_last_30d > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Completion rate</span>
                    <span className="font-medium">
                      {Math.round((d.eco_quests_completed_last_30d / d.eco_quests_last_30d) * 100)}%
                    </span>
                  </div>
                  <Progress
                    value={Math.round((d.eco_quests_completed_last_30d / d.eco_quests_last_30d) * 100)}
                    className="h-2"
                  />
                </div>
              )}
            </DashCard>

            {/* ── Card 3: Funding & Energy ── */}
            <DashCard icon={Coins} title="Funding & Energy" accent="bg-warning/15 text-warning">
              <p className="text-[11px] text-muted-foreground -mt-2">Last 90 days</p>
              <div className="grid grid-cols-2 gap-4">
                <Stat label="Credits Budgeted" value={`${d.credits_budgeted_last_90d} ¢`} />
                <Stat label="Credits Spent" value={`${d.credits_spent_last_90d} ¢`} />
                <Stat label="XP Earned" value={d.xp_from_eco_quests_last_90d} />
                <Stat label="Biopoints" value={d.biopoints_distributed_last_90d} />
              </div>
              {d.credits_budgeted_last_90d > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Budget utilization</span>
                    <span className="font-medium">
                      {Math.round((d.credits_spent_last_90d / d.credits_budgeted_last_90d) * 100)}%
                    </span>
                  </div>
                  <Progress
                    value={Math.round((d.credits_spent_last_90d / d.credits_budgeted_last_90d) * 100)}
                    className="h-2"
                  />
                </div>
              )}
            </DashCard>

            {/* ── Card 4: Trust & Governance ── */}
            <DashCard icon={Shield} title="Trust & Governance" accent="bg-secondary/15 text-secondary">
              {/* Top steward users */}
              {d.top_steward_users.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" /> Top Steward Users
                  </p>
                  {d.top_steward_users.slice(0, 3).map((u, i) => (
                    <div key={u.user_id} className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2">
                      <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{u.display_name || "—"}</p>
                        <p className="text-[10px] text-muted-foreground">{u.eco_quests_count} eco-quests</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] py-0 shrink-0">
                        {u.total_steward_weight} trust
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* Top steward guilds */}
              {d.top_steward_guilds.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                    <Swords className="h-3 w-3" /> Top Steward Guilds
                  </p>
                  {d.top_steward_guilds.slice(0, 3).map((g, i) => (
                    <div key={g.guild_id} className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2">
                      <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                      <p className="text-xs font-medium text-foreground truncate flex-1">{g.name || "—"}</p>
                      <Badge variant="outline" className="text-[10px] py-0 shrink-0">
                        {g.total_steward_weight} trust
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {d.top_steward_users.length === 0 && d.top_steward_guilds.length === 0 && (
                <p className="text-xs text-muted-foreground">No stewardship trust edges yet.</p>
              )}

              {/* Mini OTG graph preview */}
              {d.mini_otg_graph && d.mini_otg_graph.nodes.length > 1 && (
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                  <p className="text-[11px] font-medium text-muted-foreground text-center">Trust Network</p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {d.mini_otg_graph.nodes.slice(0, 12).map((node) => {
                      const emoji =
                        node.type === "territory" ? "🌍" :
                        node.type === "natural_system" ? "🌿" :
                        node.type === "profile" ? "👤" : "⚔️";
                      const bg =
                        node.type === "territory" ? "bg-primary/20 ring-2 ring-primary/30" :
                        node.type === "natural_system" ? "bg-success/15" : "bg-secondary/15";
                      return (
                        <div key={node.id} className="flex flex-col items-center gap-0.5">
                          <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-xs", bg)}>
                            {emoji}
                          </div>
                          <span className="text-[8px] text-muted-foreground max-w-[50px] truncate text-center">
                            {node.type}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">
                    {d.mini_otg_graph.nodes.length} nodes · {d.mini_otg_graph.edges.length} connections
                  </p>
                </div>
              )}
            </DashCard>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Could not load dashboard data.</p>
        )}
      </div>

      {/* ═══ A2. ENVIRONMENTAL DATA OVERVIEW ═══ */}
      <EnvironmentalDataOverview territoryId={territoryId} territoryName={territoryName} />

      {/* ═══ A3. PRECISION SETTINGS ═══ */}
      <TerritoryPrecisionSettings territoryId={territoryId} />

      {/* ═══ B. LIVING SYSTEMS LISTING ═══ */}
      <div className="space-y-4">
          <div>
            <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
              <TreePine className="h-5 w-5 text-success" /> Living Systems in this Territory
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Natural systems registered in {territoryName}
            </p>
          </div>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add / Link
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
            {systems.map((ns) => (
              <NsCard key={ns.id} ns={ns} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Leaf className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No natural systems registered yet.</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Register your first
            </Button>
          </div>
        )}
      </div>

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
