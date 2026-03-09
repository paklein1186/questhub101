import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Leaf, Plus, TreePine, Droplets, Mountain, Sprout, Bug, Microscope, Link2,
  Database, RefreshCw, Trophy, AlertCircle, ChevronDown, ChevronUp,
  Shield, Target, TrendingUp, TrendingDown, Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useLinkedNaturalSystems } from "@/hooks/useNaturalSystems";
import type { LinkedNaturalSystem, NsLinkType } from "@/types/naturalSystems";
import { KINGDOM_LABELS, SYSTEM_TYPE_LABELS } from "@/types/naturalSystems";
import { AddLinkNaturalSystemModal } from "./AddLinkNaturalSystemModal";
import {
  useQuestEcoImpactRules,
  useCreateEcoImpactRule,
  useDeleteEcoImpactRule,
  useQuestEcoImpactEvents,
  useEvaluateEcoImpact,
} from "@/hooks/useEcoImpact";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

/* ─── Constants ─── */
const KINGDOM_ICONS: Record<string, React.ReactNode> = {
  plants: <TreePine className="h-3.5 w-3.5" />,
  animals: <Bug className="h-3.5 w-3.5" />,
  fungi_lichens: <Sprout className="h-3.5 w-3.5" />,
  microorganisms: <Microscope className="h-3.5 w-3.5" />,
  multi_species_guild: <Leaf className="h-3.5 w-3.5" />,
};

const healthColor = (v: number) =>
  v < 30 ? "text-destructive" : v < 60 ? "text-warning" : v < 80 ? "text-accent" : "text-success";
const healthLabel = (v: number) =>
  v < 30 ? "Critical" : v < 60 ? "Stressed" : v < 80 ? "Stable" : "Thriving";

const INDICATOR_OPTIONS = [
  { value: "forest_cover", label: "Forest Cover" },
  { value: "carbon_stock", label: "Carbon Stock" },
  { value: "forest_change_rate", label: "Forest Change Rate" },
  { value: "disturbances_index", label: "Disturbances Index" },
];

const COMPARISON_OPTIONS = [
  { value: "INCREASE", label: "Increases" },
  { value: "DECREASE", label: "Decreases" },
  { value: "ABOVE", label: "Goes above" },
  { value: "BELOW", label: "Goes below" },
];

const REWARD_OPTIONS = [
  { value: "XP", label: "⭐ XP (reputation)", icon: TrendingUp },
  { value: "CTG", label: "🌱 $CTG (contribution token)", icon: Leaf },
  { value: "BADGE", label: "🏅 Badge (milestone)", icon: Trophy },
];

const REWARD_LABELS: Record<string, string> = {
  XP: "⭐ XP", CTG: "🌱 $CTG", BADGE: "🏅 Badge",
};

const PERIOD_OPTIONS = [
  { value: "ON_COMPLETE", label: "On quest complete" },
  { value: "AFTER_3_MONTHS", label: "After 3 months" },
  { value: "AFTER_1_YEAR", label: "After 1 year" },
];

/* ─── Living System Card (enhanced for quests) ─── */
function QuestNaturalSystemCard({ system }: { system: LinkedNaturalSystem }) {
  const navigate = useNavigate();
  const health = system.health_index ?? 0;
  const externalData = (system as any).external_data_links as Record<string, unknown> | null;

  return (
    <Card
      className="overflow-hidden hover:border-primary/30 transition-all cursor-pointer"
      onClick={() => navigate(`/natural-systems/${system.id}`)}
    >
      <div className="flex">
        {system.picture_url && (
          <div className="w-20 h-full shrink-0">
            <img src={system.picture_url} alt={system.name} className="w-full h-full object-cover" loading="lazy" />
          </div>
        )}
        <CardContent className="p-3 flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <h4 className="font-display font-semibold text-sm truncate flex-1">{system.name}</h4>
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 shrink-0", healthColor(health))}>
              {healthLabel(health)}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-[10px] gap-1 py-0">
              {KINGDOM_ICONS[system.kingdom] || <Leaf className="h-3 w-3" />}
              {KINGDOM_LABELS[system.kingdom]}
            </Badge>
            <Badge variant="secondary" className="text-[10px] py-0">
              {SYSTEM_TYPE_LABELS[system.system_type]}
            </Badge>
          </div>
          {/* Mini indicators */}
          {externalData && Object.keys(externalData).length > 0 && (
            <div className="flex gap-2 text-[10px] text-muted-foreground flex-wrap">
              {externalData.forest_cover != null && (
                <span className="flex items-center gap-0.5">
                  <TreePine className="h-2.5 w-2.5" />
                  <span className="font-medium text-foreground">{String(externalData.forest_cover)}%</span> cover
                </span>
              )}
              {externalData.carbon_stock != null && (
                <span className="flex items-center gap-0.5">
                  <Database className="h-2.5 w-2.5" />
                  <span className="font-medium text-foreground">{String(externalData.carbon_stock)}</span> tC/ha
                </span>
              )}
            </div>
          )}
          <Progress value={health} className="h-1" />
        </CardContent>
      </div>
    </Card>
  );
}

/* ─── Add Rule Dialog ─── */
function AddEcoImpactRuleDialog({ questId, systems }: { questId: string; systems: LinkedNaturalSystem[] }) {
  const [open, setOpen] = useState(false);
  const currentUser = useCurrentUser();
  const createRule = useCreateEcoImpactRule();
  const { toast } = useToast();

  const [nsId, setNsId] = useState("");
  const [indicator, setIndicator] = useState("forest_cover");
  const [comparison, setComparison] = useState("INCREASE");
  const [targetVal, setTargetVal] = useState("0");
  const [rewardType, setRewardType] = useState("XP");
  const [rewardAmount, setRewardAmount] = useState("50");
  const [period, setPeriod] = useState("ON_COMPLETE");

  const handleCreate = async () => {
    try {
      await createRule.mutateAsync({
        quest_id: questId,
        natural_system_id: nsId || null,
        target_indicator: indicator,
        comparison_type: comparison,
        target_value: comparison === "BETWEEN" ? [0, Number(targetVal)] : Number(targetVal),
        reward_type: rewardType,
        reward_amount: Number(rewardAmount),
        evaluation_period: period,
        created_by_user_id: currentUser.id!,
      });
      toast({ title: "Eco-impact rule created!" });
      setOpen(false);
    } catch {
      toast({ title: "Failed to create rule", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-xs">
          <Target className="h-3 w-3 mr-1" /> Add Impact Rule
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">New Eco-Impact Rule</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {/* Living System */}
          <div>
            <label className="text-xs font-medium">Living System</label>
            <Select value={nsId} onValueChange={setNsId}>
              <SelectTrigger className="text-xs"><SelectValue placeholder="Select a system" /></SelectTrigger>
              <SelectContent>
                {systems.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Indicator */}
          <div>
            <label className="text-xs font-medium">When indicator</label>
            <Select value={indicator} onValueChange={setIndicator}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {INDICATOR_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Comparison */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium">Condition</label>
              <Select value={comparison} onValueChange={setComparison}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMPARISON_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(comparison === "ABOVE" || comparison === "BELOW") && (
              <div className="w-24">
                <label className="text-xs font-medium">Value</label>
                <Input type="number" value={targetVal} onChange={(e) => setTargetVal(e.target.value)} className="text-xs" />
              </div>
            )}
          </div>
          {/* Reward */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium">Reward</label>
              <Select value={rewardType} onValueChange={setRewardType}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REWARD_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-24">
              <label className="text-xs font-medium">Amount</label>
              <Input type="number" value={rewardAmount} onChange={(e) => setRewardAmount(e.target.value)} className="text-xs" />
            </div>
          </div>
          {/* Period */}
          <div>
            <label className="text-xs font-medium">Evaluation period</label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCreate} disabled={createRule.isPending} className="w-full text-xs" size="sm">
            Create Rule
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main Component ─── */
interface QuestLivingTabProps {
  linkedType: NsLinkType;
  linkedId: string;
  defaultTerritoryId?: string;
  isOwner?: boolean;
}

export function QuestLivingTab({ linkedType, linkedId, defaultTerritoryId, isOwner }: QuestLivingTabProps) {
  const { data: systems, isLoading } = useLinkedNaturalSystems(linkedType, linkedId);
  const { data: rules } = useQuestEcoImpactRules(linkedId);
  const { data: events } = useQuestEcoImpactEvents(linkedId);
  const evaluateMutation = useEvaluateEcoImpact();
  const deleteRule = useDeleteEcoImpactRule();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [showRules, setShowRules] = useState(true);
  const [showTimeline, setShowTimeline] = useState(true);

  const handleEvaluate = async () => {
    try {
      await evaluateMutation.mutateAsync(linkedId);
      toast({ title: "Eco-impact rules evaluated!" });
    } catch {
      toast({ title: "Evaluation failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Ecosystems Involved ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-base flex items-center gap-2">
            <Leaf className="h-4 w-4 text-emerald-600" /> Ecosystems Involved
            {systems && <span className="text-muted-foreground font-normal text-sm">({systems.length})</span>}
          </h3>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Link System
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 rounded-xl border border-border bg-muted animate-pulse" />
            ))}
          </div>
        ) : systems && systems.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {systems.map((s) => <QuestNaturalSystemCard key={s.id} system={s} />)}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <Leaf className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No ecosystems linked to this quest yet.</p>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Link your first
            </Button>
          </div>
        )}
      </section>

      {/* ── Eco-Impact Rules ── */}
      {(isOwner || (rules && rules.length > 0)) && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <button onClick={() => setShowRules(!showRules)} className="flex items-center gap-2 group">
              <h3 className="font-display font-semibold text-base flex items-center gap-2 group-hover:text-primary transition-colors">
                <Target className="h-4 w-4 text-primary" /> Eco-Impact Rules
                {rules && <span className="text-muted-foreground font-normal text-sm">({rules.length})</span>}
              </h3>
              {showRules ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            <div className="flex gap-2">
              {isOwner && systems && systems.length > 0 && (
                <AddEcoImpactRuleDialog questId={linkedId} systems={systems} />
              )}
              <Button size="sm" variant="outline" className="text-xs" onClick={handleEvaluate} disabled={evaluateMutation.isPending}>
                <RefreshCw className={cn("h-3 w-3 mr-1", evaluateMutation.isPending && "animate-spin")} />
                Evaluate Now
              </Button>
            </div>
          </div>

          {showRules && rules && rules.length > 0 && (
            <div className="space-y-2">
              {rules.map((rule) => {
                const RewardIcon = REWARD_OPTIONS.find((r) => r.value === rule.reward_type)?.icon || Zap;
                return (
                  <Card key={rule.id} className={cn("overflow-hidden", rule.is_fulfilled && "opacity-60")}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <RewardIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">
                          When <span className="font-semibold">{rule.target_indicator.replace(/_/g, " ")}</span>{" "}
                          <span className="text-primary">{rule.comparison_type.toLowerCase()}</span>
                          {["ABOVE", "BELOW"].includes(rule.comparison_type) && (
                            <span className="font-semibold"> {String(rule.target_value)}</span>
                          )}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          → {rule.reward_amount} {REWARD_LABELS[rule.reward_type] ?? rule.reward_type} · {rule.evaluation_period.replace(/_/g, " ").toLowerCase()}
                        </p>
                      </div>
                      {rule.is_fulfilled ? (
                        <Badge className="text-[9px] bg-success/15 text-success border-success/30">✅ Fulfilled</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px]">Active</Badge>
                      )}
                      {isOwner && !rule.is_fulfilled && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteRule.mutate({ ruleId: rule.id, questId: linkedId })}
                        >
                          ×
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── Eco-Impact Timeline ── */}
      {events && events.length > 0 && (
        <section className="space-y-3">
          <button onClick={() => setShowTimeline(!showTimeline)} className="flex items-center gap-2 group">
            <h3 className="font-display font-semibold text-base flex items-center gap-2 group-hover:text-primary transition-colors">
              <Clock className="h-4 w-4 text-amber-600" /> Ecosystem Timeline
              <span className="text-muted-foreground font-normal text-sm">({events.length})</span>
            </h3>
            {showTimeline ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {showTimeline && (
            <div className="relative pl-6 space-y-3">
              <div className="absolute left-2.5 top-0 bottom-0 w-px bg-border" />
              {events.map((evt) => {
                const isPositive = ["INCREASE", "ABOVE"].includes(evt.reward_type);
                return (
                  <div key={evt.id} className="relative">
                    <div className={cn(
                      "absolute left-[-18px] top-1 h-5 w-5 rounded-full flex items-center justify-center",
                      isPositive ? "bg-success/20" : "bg-warning/20"
                    )}>
                      {isPositive ? <TrendingUp className="h-3 w-3 text-success" /> : <TrendingDown className="h-3 w-3 text-warning" />}
                    </div>
                    <Card className="overflow-hidden">
                      <CardContent className="p-3 space-y-1">
                        {evt.narrative_text && (
                          <p className="text-xs text-foreground leading-relaxed">{evt.narrative_text}</p>
                        )}
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <Badge variant="outline" className="text-[9px] py-0">
                            {evt.reward_amount} {evt.reward_type}
                          </Badge>
                          <span>{evt.indicator_name.replace(/_/g, " ")}</span>
                          <span>·</span>
                          <span>{formatDistanceToNow(new Date(evt.created_at), { addSuffix: true })}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── Impact stats ── */}
      {systems && systems.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="font-display font-semibold text-sm mb-3">Impact Summary</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center">
              <p className="text-xl font-bold text-primary">{systems.length}</p>
              <p className="text-[10px] text-muted-foreground">Ecosystems</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-emerald-600">
                {systems.reduce((s, ns) => s + (ns.health_index ?? 0), 0) > 0
                  ? Math.round(systems.reduce((s, ns) => s + (ns.health_index ?? 0), 0) / systems.length)
                  : "—"}
              </p>
              <p className="text-[10px] text-muted-foreground">Avg Health</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-primary">{rules?.length ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Impact Rules</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-amber-600">{rules?.filter((r) => r.is_fulfilled).length ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Fulfilled</p>
            </div>
          </div>
        </div>
      )}

      <AddLinkNaturalSystemModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        linkedType={linkedType}
        linkedId={linkedId}
        defaultTerritoryId={defaultTerritoryId}
      />
    </div>
  );
}
