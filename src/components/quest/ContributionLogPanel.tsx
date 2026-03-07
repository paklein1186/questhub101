import { useQuestContributions, useLogContribution, type ContributionType } from "@/hooks/useContributionLog";
import { useGuildWeights, DEFAULT_TASK_TYPES, useValuePieActions, useQuestValuePie } from "@/hooks/useValuePie";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  CheckCircle2, Clock, FileText, Shield, Star, Plus, ChevronDown, ChevronUp, Zap, Award, BookOpen, Scale, Eye
} from "lucide-react";
import { useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { ValuePieChart } from "./ValuePieChart";

interface Props {
  questId: string;
  questOwnerId: string;
  guildId?: string | null;
  questBudgetGamebTokens?: number;
  guildPercent?: number;
  territoryPercent?: number;
  ctgPercent?: number;
  valuePieCalculated?: boolean;
}

const TYPE_LABELS: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  subtask_completed: { label: "Subtask", icon: CheckCircle2, color: "text-emerald-600" },
  quest_completed: { label: "Quest", icon: Award, color: "text-primary" },
  proposal_accepted: { label: "Proposal", icon: Star, color: "text-amber-500" },
  review_given: { label: "Review", icon: BookOpen, color: "text-blue-500" },
  documentation: { label: "Docs", icon: FileText, color: "text-indigo-500" },
  mentorship: { label: "Mentorship", icon: Shield, color: "text-purple-500" },
  governance_vote: { label: "Vote", icon: Zap, color: "text-orange-500" },
  ecological_annotation: { label: "Ecology", icon: Star, color: "text-green-600" },
  insight: { label: "Insight", icon: Zap, color: "text-cyan-500" },
  debugging: { label: "Debug", icon: FileText, color: "text-red-500" },
  other: { label: "Other", icon: FileText, color: "text-muted-foreground" },
};

const CONTRIBUTION_OPTIONS: { value: ContributionType; label: string }[] = [
  { value: "documentation", label: "Documentation" },
  { value: "review_given", label: "Review / Feedback" },
  { value: "mentorship", label: "Mentorship" },
  { value: "insight", label: "Insight / Idea" },
  { value: "debugging", label: "Debugging / Fix" },
  { value: "ecological_annotation", label: "Ecological annotation" },
  { value: "other", label: "Other contribution" },
];

const TASK_TYPE_ICONS = [
  { value: "research", emoji: "🔬", label: "Research" },
  { value: "facilitation", emoji: "🤝", label: "Facilitation" },
  { value: "coordination", emoji: "📅", label: "Coordination" },
  { value: "creative", emoji: "🎨", label: "Creative" },
  { value: "admin", emoji: "📋", label: "Admin" },
  { value: "risk", emoji: "⚡", label: "Risk" },
  { value: "development", emoji: "💻", label: "Development" },
  { value: "design", emoji: "✏️", label: "Design" },
  { value: "testing", emoji: "🧪", label: "Testing" },
  { value: "documentation", emoji: "📄", label: "Docs" },
] as const;
export function ContributionLogPanel({
  questId,
  questOwnerId,
  guildId,
  questBudgetGamebTokens = 0,
  guildPercent = 10,
  territoryPercent = 5,
  ctgPercent = 5,
  valuePieCalculated = false,
}: Props) {
  const currentUser = useCurrentUser();
  const { data: contributions = [], isLoading } = useQuestContributions(questId);
  const { logContribution, verifyContribution } = useLogContribution();
  const { data: guildWeights = [] } = useGuildWeights(guildId);
  const { calculateAndDistribute } = useValuePieActions();
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [distributing, setDistributing] = useState(false);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  // Form state
  const [formType, setFormType] = useState<ContributionType>("documentation");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formHours, setFormHours] = useState("");
  const [formTaskType, setFormTaskType] = useState<string>("general");
  const [formBaseUnits, setFormBaseUnits] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isOwner = currentUser.id === questOwnerId;

  // Build weight map from guild weights
  const weightMap = useMemo(() => {
    const m = new Map<string, number>();
    guildWeights.forEach((w) => m.set(w.task_type, w.weight_factor));
    DEFAULT_TASK_TYPES.forEach((t) => {
      if (!m.has(t)) m.set(t, 1.0);
    });
    return m;
  }, [guildWeights]);

  // In simple mode, auto-sync base_units = hours, task_type = "general"
  const effectiveTaskType = advancedMode ? formTaskType : "general";
  const effectiveBaseUnits = advancedMode ? (parseFloat(formBaseUnits) || 0) : (parseFloat(formHours) || 0);
  const currentWeight = weightMap.get(effectiveTaskType) ?? 1.0;
  const weightedUnits = Math.round(effectiveBaseUnits * currentWeight * 100) / 100;

  // Simple mode: estimated tokens
  const simpleEstimatedTokens = useMemo(() => {
    if (!questBudgetGamebTokens || questBudgetGamebTokens <= 0) return null;
    const totalGuildWU = contributions.reduce((s, c) => s + (Number((c as any).weighted_units) || 0), 0) + weightedUnits;
    if (totalGuildWU <= 0) return null;
    const overheadPct = (guildPercent + territoryPercent + ctgPercent) / 100;
    const pool = questBudgetGamebTokens * (1 - overheadPct);
    return Math.round((weightedUnits / totalGuildWU) * pool * 100) / 100;
  }, [questBudgetGamebTokens, contributions, weightedUnits, guildPercent, territoryPercent, ctgPercent]);

  const handleSubmit = async () => {
    if (!formTitle.trim()) return;
    setSubmitting(true);
    
    const userId = currentUser.id;
    if (!userId) { setSubmitting(false); return; }

    await supabase
      .from("contribution_logs" as any)
      .insert({
        user_id: userId,
        quest_id: questId,
        guild_id: guildId ?? null,
        contribution_type: formType,
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        hours_logged: formHours ? parseFloat(formHours) : null,
        task_type: effectiveTaskType,
        base_units: effectiveBaseUnits,
        weight_factor: currentWeight,
        weighted_units: weightedUnits,
        ip_licence: "CC-BY-SA",
      } as any);

    setFormTitle("");
    setFormDescription("");
    setFormHours("");
    setFormBaseUnits("");
    setFormTaskType("general");
    setShowForm(false);
    setSubmitting(false);
    window.dispatchEvent(new Event("contribution-logged"));
  };

  const handleDistribute = async () => {
    if (distributing) return;
    setDistributing(true);
    const guildAmt = Math.round(questBudgetGamebTokens * (guildPercent / 100) * 100) / 100;
    const territoryAmt = Math.round(questBudgetGamebTokens * (territoryPercent / 100) * 100) / 100;
    const ctgAmt = Math.round(questBudgetGamebTokens * (ctgPercent / 100) * 100) / 100;
    const contributorPool = Math.round((questBudgetGamebTokens - guildAmt - territoryAmt - ctgAmt) * 100) / 100;
    await calculateAndDistribute({
      questId,
      contributorPoolTokens: contributorPool,
      guildId: guildId ?? null,
      guildTokens: guildAmt,
      territoryId: undefined, // TODO: pass territory_id when available on quest props
      territoryTokens: territoryAmt,
      ctgTokens: ctgAmt,
    });
    setDistributing(false);
  };

  // Aggregate stats
  const totalXp = contributions.reduce((s, c) => s + c.xp_earned, 0);
  const totalWeightedUnits = contributions.reduce((s, c) => s + (Number((c as any).weighted_units) || 0), 0);
  const uniqueContributors = new Set(contributions.map((c) => c.user_id)).size;
  const verified = contributions.filter((c) => c.status === "verified").length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 font-display font-semibold text-sm hover:text-primary transition-colors"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          Proof of Contribution
          <Badge variant="secondary" className="text-xs">{contributions.length}</Badge>
        </button>

        <div className="flex gap-1.5">
          {isOwner && contributions.length > 0 && !valuePieCalculated && questBudgetGamebTokens > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 border-emerald-500/30 text-emerald-600"
              onClick={handleDistribute}
              disabled={distributing}
            >
              <Scale className="h-3 w-3" /> {distributing ? "Distributing…" : "Calculate Value Pie"}
            </Button>
          )}
          {currentUser.id && !valuePieCalculated && (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowForm(!showForm)}>
              <Plus className="h-3 w-3" /> Log contribution
            </Button>
          )}
        </div>
      </div>

      {expanded && (
        <>
          {/* Summary Stats */}
          {contributions.length > 0 && (
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="rounded-md bg-muted/50 p-2">
                <p className="text-lg font-bold text-primary">{uniqueContributors}</p>
                <p className="text-[10px] text-muted-foreground">Contributors</p>
              </div>
              <div className="rounded-md bg-muted/50 p-2">
                <p className="text-lg font-bold text-primary">{contributions.length}</p>
                <p className="text-[10px] text-muted-foreground">Contributions</p>
              </div>
              <div className="rounded-md bg-muted/50 p-2">
                <p className="text-lg font-bold text-primary">{totalXp}</p>
                <p className="text-[10px] text-muted-foreground">XP Earned</p>
              </div>
              <div className="rounded-md bg-emerald-500/5 p-2">
                <p className="text-lg font-bold text-emerald-600">{totalWeightedUnits}</p>
                <p className="text-[10px] text-muted-foreground">Weighted Units</p>
              </div>
            </div>
          )}

          {/* Log Form — Simple / Advanced */}
          {showForm && (
            <div className="rounded-lg border border-border bg-card p-3 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-foreground">Nouvelle contribution</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] text-muted-foreground"
                  onClick={() => setAdvancedMode(!advancedMode)}
                >
                  {advancedMode ? "Mode simple ↑" : "Mode avancé ↓"}
                </Button>
              </div>

              {/* Common fields: type dropdown, title */}
              <div className="flex gap-2">
                <Select value={formType} onValueChange={(v) => setFormType(v as ContributionType)}>
                  <SelectTrigger className="w-[160px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRIBUTION_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="What did you contribute?"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="flex-1 h-8 text-sm"
                />
              </div>

              {/* Simple mode: just hours */}
              {!advancedMode && (
                <>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      placeholder="Heures"
                      value={formHours}
                      onChange={(e) => setFormHours(e.target.value)}
                      className="w-28 h-8 text-sm"
                      step="0.25"
                      min="0"
                    />
                    <span className="text-xs text-muted-foreground">heures</span>
                  </div>
                  {parseFloat(formHours) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Pour cette guilde, {formHours}h = <span className="font-medium text-foreground">{weightedUnits}</span> weighted units ≈{" "}
                      <span className="font-medium text-emerald-600">
                        {simpleEstimatedTokens !== null ? `${simpleEstimatedTokens} GameB Tokens estimés` : "— GameB Tokens estimés"}
                      </span>
                    </p>
                  )}
                </>
              )}

              {/* Advanced mode: description, task type icon grid, base_units, weight preview */}
              {advancedMode && (
                <>
                  <Textarea
                    placeholder="Details (optional)"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />

                  {/* Task type icon grid */}
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Task Type</label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {TASK_TYPE_ICONS.map((tt) => (
                        <button
                          key={tt.value}
                          type="button"
                          onClick={() => setFormTaskType(tt.value)}
                          className={`flex flex-col items-center gap-0.5 rounded-md border p-1.5 text-[10px] transition-colors cursor-pointer ${
                            formTaskType === tt.value
                              ? "border-primary bg-primary/10 text-primary font-semibold"
                              : "border-border bg-card text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          <span className="text-sm">{tt.emoji}</span>
                          <span className="truncate w-full text-center">{tt.label}</span>
                          <span className="text-[9px] opacity-60">×{(weightMap.get(tt.value) ?? 1.0).toFixed(1)}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 items-end">
                    <div className="w-24">
                      <label className="text-[10px] text-muted-foreground block mb-0.5">Base Units</label>
                      <Input
                        type="number"
                        placeholder="e.g. hours"
                        value={formBaseUnits}
                        onChange={(e) => setFormBaseUnits(e.target.value)}
                        className="h-8 text-sm"
                        step="0.25"
                        min="0"
                      />
                    </div>
                    <div className="w-24">
                      <label className="text-[10px] text-muted-foreground block mb-0.5">Hours</label>
                      <Input
                        type="number"
                        placeholder="Hours"
                        value={formHours}
                        onChange={(e) => setFormHours(e.target.value)}
                        className="h-8 text-sm"
                        step="0.25"
                        min="0"
                      />
                    </div>
                    <div className="text-center px-2">
                      <label className="text-[10px] text-muted-foreground block mb-0.5">Weight</label>
                      <span className="text-sm font-medium">×{currentWeight.toFixed(1)}</span>
                    </div>
                    <div className="text-center px-2">
                      <label className="text-[10px] text-muted-foreground block mb-0.5">Weighted</label>
                      <span className="text-sm font-bold text-emerald-600">{weightedUnits}</span>
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-2 items-center justify-end">
                <Button variant="ghost" size="sm" className="h-7" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button size="sm" className="h-7" onClick={handleSubmit} disabled={!formTitle.trim() || submitting}>
                  Log
                </Button>
              </div>
            </div>
          )}

          {/* Contribution List */}
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading contributions…</p>
          ) : contributions.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No contributions logged yet.</p>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-1.5">
                {contributions.map((c) => {
                  const typeInfo = TYPE_LABELS[c.contribution_type] ?? TYPE_LABELS.other;
                  const Icon = typeInfo.icon;
                  const wu = Number((c as any).weighted_units) || 0;
                  const taskType = (c as any).task_type;
                  return (
                    <div key={c.id} className="flex items-start gap-2 rounded-md border border-border bg-card p-2 group">
                      <Avatar className="h-7 w-7 mt-0.5">
                        <AvatarImage src={c.profile?.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[10px]">{c.profile?.name?.[0] ?? "?"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-medium truncate">{c.profile?.name}</span>
                          <Badge variant="outline" className={`text-[10px] gap-0.5 ${typeInfo.color}`}>
                            <Icon className="h-2.5 w-2.5" />
                            {typeInfo.label}
                          </Badge>
                          {taskType && (
                            <Badge variant="secondary" className="text-[10px] capitalize">{taskType}</Badge>
                          )}
                          {c.status === "verified" && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[10px]">✓ Verified</Badge>
                          )}
                          {wu > 0 && (
                            <span className="text-[10px] text-emerald-600 font-medium">{wu} wu</span>
                          )}
                          {c.xp_earned > 0 && (
                            <span className="text-[10px] text-primary font-medium">+{c.xp_earned} XP</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{c.title}</p>
                        {c.hours_logged && (
                          <span className="text-[10px] text-muted-foreground">
                            <Clock className="h-2.5 w-2.5 inline mr-0.5" />{c.hours_logged}h
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground ml-2">
                          {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {isOwner && c.status === "logged" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] opacity-0 group-hover:opacity-100"
                          onClick={() => verifyContribution(c.id)}
                        >
                          Verify
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          {/* Value Pie Visualization */}
          <ValuePieChart questId={questId} />

          {/* IP Licence note */}
          <p className="text-[10px] text-muted-foreground">
            All contributions are attributed and licensed under CC-BY-SA by default. Your work is immutably recorded.
          </p>
        </>
      )}
    </div>
  );
}
