import { useQuestContributions, useLogContribution } from "@/hooks/useContributionLog";
import { useGuildWeights, DEFAULT_TASK_TYPES, useValuePieActions, useQuestValuePie } from "@/hooks/useValuePie";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  CheckCircle2, Clock, FileText, Shield, Star, Plus, ChevronDown, ChevronUp, Zap, Award, BookOpen, Scale, Eye, Paperclip
} from "lucide-react";
import { useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { ValuePieChart } from "./ValuePieChart";
import { EvidenceUploader } from "@/components/ocu/EvidenceUploader";
import { useQuery } from "@tanstack/react-query";

// ── Contribution type enum (matches DB enum) ──
type ContributionTypeEnum =
  | "TIME" | "EXPENSES" | "SUPPLIES" | "EQUIPMENT" | "FACILITIES"
  | "SALES" | "ROYALTY" | "FINDERS_FEE" | "OTHER";

const CONTRIBUTION_TYPES = [
  { value: "TIME" as const, label: "Time", icon: "⏱", desc: "Half-days of work" },
  { value: "EXPENSES" as const, label: "Expenses", icon: "💸", desc: "Out-of-pocket costs" },
  { value: "SUPPLIES" as const, label: "Supplies", icon: "🗂", desc: "Materials consumed" },
  { value: "EQUIPMENT" as const, label: "Equipment", icon: "🚛", desc: "Equipment use value" },
  { value: "FACILITIES" as const, label: "Facilities", icon: "🏢", desc: "Space or server rental" },
  { value: "SALES" as const, label: "Sales", icon: "💰", desc: "Revenue generated" },
  { value: "ROYALTY" as const, label: "Royalty", icon: "🎤", desc: "IP or licensing value" },
  { value: "FINDERS_FEE" as const, label: "Finder's Fee", icon: "👁", desc: "Referral or introduction" },
  { value: "OTHER" as const, label: "Other", icon: "🌂", desc: "Other agreed value" },
] as const;

// Legacy type labels for display of old contributions
const LEGACY_TYPE_LABELS: Record<string, { label: string; icon: typeof FileText; color: string }> = {
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

const DIFFICULTY_OPTIONS = [
  { value: "STANDARD", label: "Standard", multiplier: 1.0 },
  { value: "COMPLEX", label: "Complex", multiplier: 1.5 },
  { value: "EXPERT", label: "Expert", multiplier: 2.0 },
  { value: "EXCEPTIONAL", label: "Exceptional", multiplier: 3.0 },
] as const;

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

interface Props {
  questId: string;
  questOwnerId: string;
  guildId?: string | null;
  territoryId?: string | null;
  questCoinBudget?: number;
  guildPercent?: number;
  territoryPercent?: number;
  ctgPercent?: number;
  valuePieCalculated?: boolean;
  isCoHost?: boolean;
  isGuildAdmin?: boolean;
}

// ── Step 5: Type badge & summary line components ──
function ContributionTypeBadge({ type }: { type: string }) {
  const cfg = CONTRIBUTION_TYPES.find((t) => t.value === type);
  if (cfg) {
    return (
      <Badge variant="outline" className="text-[10px] gap-1">
        {cfg.icon} {cfg.label}
      </Badge>
    );
  }
  // Legacy fallback
  const legacy = LEGACY_TYPE_LABELS[type] ?? LEGACY_TYPE_LABELS.other;
  const LIcon = legacy.icon;
  return (
    <Badge variant="outline" className={`text-[10px] gap-0.5 ${legacy.color}`}>
      <LIcon className="h-2.5 w-2.5" />
      {legacy.label}
    </Badge>
  );
}

function ContributionSummaryLine({ log }: { log: any }) {
  const input = log.fmv_input as any;
  if (!input) {
    // Legacy contribution without fmv_input
    if (log.half_days > 0) return <>{log.half_days} half-day{log.half_days !== 1 ? "s" : ""}</>;
    if (log.hours_logged > 0) return <>{log.hours_logged}h logged</>;
    return null;
  }
  switch (log.contribution_type) {
    case "TIME":
      return <>{input.half_days} half-day{input.half_days !== 1 ? "s" : ""} · {input.difficulty ?? "STANDARD"}</>;
    case "EXPENSES":
    case "SUPPLIES":
    case "ROYALTY":
    case "OTHER":
      return <>€{Number(input.amount_eur || 0).toFixed(2)} · {input.description || "—"}</>;
    case "EQUIPMENT":
    case "FACILITIES":
      return <>€{Number(input.amount_eur || 0).toFixed(2)} · {input.period_days}d · {input.description || "—"}</>;
    case "SALES":
      return <>€{Number(input.deal_value_eur || 0).toFixed(2)} deal · {input.commission_pct}% commission</>;
    case "FINDERS_FEE":
      return <>€{Number(input.deal_value_eur || 0).toFixed(2)} deal · {input.finders_pct}% finder's fee</>;
    default:
      return null;
  }
}

export function ContributionLogPanel({
  questId,
  questOwnerId,
  guildId,
  territoryId,
  questCoinBudget = 0,
  guildPercent = 10,
  territoryPercent = 5,
  ctgPercent = 5,
  valuePieCalculated = false,
  isCoHost = false,
  isGuildAdmin = false,
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

  // ── Step 1: Contribution type state ──
  const [contribType, setContribType] = useState<ContributionTypeEnum>("TIME");

  // Form state — TIME fields
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formHours, setFormHours] = useState("");
  const [formTaskType, setFormTaskType] = useState<string>("general");
  const [formBaseUnits, setFormBaseUnits] = useState("");
  const [halfDays, setHalfDays] = useState("1");
  const [difficulty, setDifficulty] = useState<string>("STANDARD");
  const [submitting, setSubmitting] = useState(false);

  // Form state — Cash-type fields
  const [amountEur, setAmountEur] = useState(0);
  const [periodDays, setPeriodDays] = useState(1);
  const [dealValueEur, setDealValueEur] = useState(0);
  const [commissionPct, setCommissionPct] = useState(10);
  const [description, setDescription] = useState("");

  // Evidence state
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);

  // Fetch guild config for cash_multiplier and commission defaults
  const { data: guildConfig } = useQuery({
    queryKey: ["guild-config-contrib", guildId],
    queryFn: async () => {
      if (!guildId) return null;
      const { data } = await supabase
        .from("guilds")
        .select("fmv_rate_per_half_day, cash_multiplier, sales_commission_default_pct, evidence_required_override")
        .eq("id", guildId)
        .single();
      return data;
    },
    enabled: !!guildId,
  });

  const fmvRate = (guildConfig as any)?.fmv_rate_per_half_day ?? 200;
  const cashMultiplier = (guildConfig as any)?.cash_multiplier ?? 2.0;
  const defaultCommissionPct = (guildConfig as any)?.sales_commission_default_pct ?? 10;
  const guildEvidenceOverride = (guildConfig as any)?.evidence_required_override;

  const evidenceRequired = useMemo(() => {
    const typeRequires = ["EXPENSES", "SUPPLIES", "EQUIPMENT"].includes(contribType);
    if (guildEvidenceOverride === false) return false;
    if (guildEvidenceOverride === true) return true;
    return typeRequires;
  }, [contribType, guildEvidenceOverride]);

  const isOwner = currentUser.id === questOwnerId;
  const canVerify = isOwner || isCoHost || isGuildAdmin;

  // Build weight map from guild weights
  const weightMap = useMemo(() => {
    const m = new Map<string, number>();
    guildWeights.forEach((w) => m.set(w.task_type, w.weight_factor));
    DEFAULT_TASK_TYPES.forEach((t) => {
      if (!m.has(t)) m.set(t, 1.0);
    });
    return m;
  }, [guildWeights]);

  const effectiveTaskType = advancedMode ? formTaskType : "general";
  const effectiveBaseUnits = advancedMode ? (parseFloat(formBaseUnits) || 0) : (parseFloat(formHours) || 0);
  const currentWeight = weightMap.get(effectiveTaskType) ?? 1.0;
  const weightedUnits = Math.round(effectiveBaseUnits * currentWeight * 100) / 100;

  const simpleEstimatedTokens = useMemo(() => {
    if (!questCoinBudget || questCoinBudget <= 0) return null;
    const totalGuildWU = contributions.reduce((s, c) => s + (Number((c as any).weighted_units) || 0), 0) + weightedUnits;
    if (totalGuildWU <= 0) return null;
    const overheadPct = (guildPercent + territoryPercent + ctgPercent) / 100;
    const pool = questCoinBudget * (1 - overheadPct);
    return Math.round((weightedUnits / totalGuildWU) * pool * 100) / 100;
  }, [questCoinBudget, contributions, weightedUnits, guildPercent, territoryPercent, ctgPercent]);

  // ── FMV preview computation (client-side preview only) ──
  const fmvPreview = useMemo(() => {
    const diffMult = DIFFICULTY_OPTIONS.find((d) => d.value === difficulty)?.multiplier ?? 1.0;
    const hd = Math.max(0.5, parseFloat(halfDays) || 0.5);
    switch (contribType) {
      case "TIME":
        return hd * fmvRate * diffMult;
      case "EXPENSES":
      case "SUPPLIES":
      case "EQUIPMENT":
      case "FACILITIES":
        return amountEur * cashMultiplier;
      case "SALES":
        return dealValueEur * commissionPct / 100;
      case "FINDERS_FEE":
        return dealValueEur * commissionPct / 100;
      case "ROYALTY":
      case "OTHER":
        return amountEur;
      default:
        return 0;
    }
  }, [contribType, halfDays, difficulty, fmvRate, amountEur, cashMultiplier, dealValueEur, commissionPct]);

  // ── Step 4: Build fmv_input payload ──
  function buildFmvInput(): Record<string, any> {
    switch (contribType) {
      case "TIME": return { half_days: Math.max(0.5, parseFloat(halfDays) || 0.5), difficulty };
      case "EXPENSES": return { amount_eur: amountEur, description };
      case "SUPPLIES": return { amount_eur: amountEur, description };
      case "EQUIPMENT": return { amount_eur: amountEur, description, period_days: periodDays };
      case "FACILITIES": return { amount_eur: amountEur, description, period_days: periodDays };
      case "SALES": return { deal_value_eur: dealValueEur, commission_pct: commissionPct, deal_description: description };
      case "ROYALTY": return { amount_eur: amountEur, description };
      case "FINDERS_FEE": return { deal_value_eur: dealValueEur, finders_pct: commissionPct, deal_description: description };
      case "OTHER": return { amount_eur: amountEur, description };
    }
  }

  const handleSubmit = async () => {
    if (!formTitle.trim()) return;
    setSubmitting(true);

    const userId = currentUser.id;
    if (!userId) { setSubmitting(false); return; }

    const parsedHalfDays = Math.max(0.5, parseFloat(halfDays) || 0.5);

    await supabase
      .from("contribution_logs" as any)
      .insert({
        user_id: userId,
        quest_id: questId,
        guild_id: guildId ?? null,
        contribution_type: contribType,
        fmv_input: buildFmvInput(),
        evidence_url: evidenceUrl ?? null,
        title: formTitle.trim(),
        description: (contribType === "TIME" ? formDescription.trim() : description.trim()) || null,
        hours_logged: contribType === "TIME" ? (formHours ? parseFloat(formHours) : parsedHalfDays * 4) : null,
        half_days: contribType === "TIME" ? parsedHalfDays : null,
        difficulty: contribType === "TIME" ? difficulty : null,
        task_type: effectiveTaskType,
        base_units: effectiveBaseUnits,
        weight_factor: currentWeight,
        weighted_units: weightedUnits,
        ip_licence: "CC-BY-SA",
        status: "pending",
        // fmv_value is computed server-side by trg_contribution_fmv
      } as any);

    resetForm();
    setShowForm(false);
    setSubmitting(false);
    window.dispatchEvent(new Event("contribution-logged"));
  };

  const resetForm = () => {
    setFormTitle("");
    setFormDescription("");
    setFormHours("");
    setFormBaseUnits("");
    setFormTaskType("general");
    setHalfDays("1");
    setDifficulty("STANDARD");
    setAmountEur(0);
    setPeriodDays(1);
    setDealValueEur(0);
    setCommissionPct(defaultCommissionPct);
    setDescription("");
    setEvidenceUrl(null);
    setContribType("TIME");
  };

  const handleDistribute = async () => {
    if (distributing) return;
    setDistributing(true);
    const guildAmt = Math.round(questCoinBudget * (guildPercent / 100) * 100) / 100;
    const territoryAmt = Math.round(questCoinBudget * (territoryPercent / 100) * 100) / 100;
    const ctgAmt = Math.round(questCoinBudget * (ctgPercent / 100) * 100) / 100;
    const contributorPool = Math.round((questCoinBudget - guildAmt - territoryAmt - ctgAmt) * 100) / 100;
    await calculateAndDistribute({
      questId,
      contributorPoolTokens: contributorPool,
      guildId: guildId ?? null,
      guildTokens: guildAmt,
      territoryId: territoryId ?? undefined,
      territoryTokens: territoryAmt,
      ctgTokens: ctgAmt,
    });
    setDistributing(false);
  };

  // Aggregate stats
  const totalXp = contributions.reduce((s, c) => s + c.xp_earned, 0);
  const totalWeightedUnits = contributions.reduce((s, c) => s + (Number((c as any).weighted_units) || 0), 0);
  const uniqueContributors = new Set(contributions.map((c) => c.user_id)).size;

  // Preview simulation
  const previewData = useMemo(() => {
    if (totalWeightedUnits === 0 || questCoinBudget <= 0) return [];
    const guildAmt = Math.round(questCoinBudget * (guildPercent / 100) * 100) / 100;
    const territoryAmt = Math.round(questCoinBudget * (territoryPercent / 100) * 100) / 100;
    const ctgAmt = Math.round(questCoinBudget * (ctgPercent / 100) * 100) / 100;
    const pool = Math.round((questCoinBudget - guildAmt - territoryAmt - ctgAmt) * 100) / 100;
    const byContributor = new Map<string, { wu: number; name: string }>();
    contributions.forEach((c) => {
      const wu = Number((c as any).weighted_units) || 0;
      const existing = byContributor.get(c.user_id);
      if (existing) { existing.wu += wu; }
      else { byContributor.set(c.user_id, { wu, name: c.profile?.name || "Unknown" }); }
    });
    return Array.from(byContributor.entries()).map(([uid, { wu, name }]) => {
      const sharePct = totalWeightedUnits > 0 ? wu / totalWeightedUnits : 0;
      return { userId: uid, name, wu, sharePct, tokens: Math.round(sharePct * pool * 100) / 100 };
    }).sort((a, b) => b.wu - a.wu);
  }, [contributions, totalWeightedUnits, questCoinBudget, guildPercent, territoryPercent, ctgPercent]);

  const previewContributorPool = useMemo(() => {
    const guildAmt = Math.round(questCoinBudget * (guildPercent / 100) * 100) / 100;
    const territoryAmt = Math.round(questCoinBudget * (territoryPercent / 100) * 100) / 100;
    const ctgAmt = Math.round(questCoinBudget * (ctgPercent / 100) * 100) / 100;
    return Math.round((questCoinBudget - guildAmt - territoryAmt - ctgAmt) * 100) / 100;
  }, [questCoinBudget, guildPercent, territoryPercent, ctgPercent]);

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
          {isOwner && contributions.length > 0 && questCoinBudget > 0 && (
            valuePieCalculated ? (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" disabled>
                <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Distributed ✓
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 border-emerald-500/30 text-emerald-600"
                onClick={() => setShowPreviewDialog(true)}
              >
                <Eye className="h-3 w-3" /> Preview distribution
              </Button>
            )
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

          {/* ═══ LOG FORM ═══ */}
          {showForm && (
            <div className="rounded-lg border border-border bg-card p-3 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-foreground">New contribution</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] text-muted-foreground"
                  onClick={() => setAdvancedMode(!advancedMode)}
                >
                  {advancedMode ? "Simple mode ↑" : "Advanced mode ↓"}
                </Button>
              </div>

              {/* ── Step 1: Contribution type chip row ── */}
              <div className="overflow-x-auto -mx-1 px-1 pb-1">
                <div className="flex gap-1.5 min-w-max">
                  {CONTRIBUTION_TYPES.map((ct) => (
                    <button
                      key={ct.value}
                      type="button"
                      onClick={() => setContribType(ct.value)}
                      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors whitespace-nowrap ${
                        contribType === ct.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-muted-foreground border-border hover:border-primary/40"
                      }`}
                      title={ct.desc}
                    >
                      <span>{ct.icon}</span>
                      <span>{ct.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <Input
                placeholder="What did you contribute?"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="h-8 text-sm"
              />

              {/* ── Step 2: Type-adaptive input fields ── */}

              {/* TIME */}
              {contribType === "TIME" && (
                <>
                  {!advancedMode && (
                    <>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          placeholder="Half-days"
                          value={halfDays}
                          onChange={(e) => setHalfDays(e.target.value)}
                          className="w-28 h-8 text-sm"
                          step="0.5"
                          min="0.5"
                        />
                        <span className="text-xs text-muted-foreground">half-days</span>
                      </div>
                      {/* Difficulty picker */}
                      <div className="grid grid-cols-4 gap-1">
                        {DIFFICULTY_OPTIONS.map((d) => (
                          <button
                            key={d.value}
                            type="button"
                            onClick={() => setDifficulty(d.value)}
                            className={`rounded-md border p-1.5 text-[10px] text-center transition-colors ${
                              difficulty === d.value
                                ? "border-primary bg-primary/10 text-primary font-semibold"
                                : "border-border bg-card text-muted-foreground hover:border-primary/40"
                            }`}
                          >
                            {d.label} ×{d.multiplier}
                          </button>
                        ))}
                      </div>
                      {/* FMV preview */}
                      <p className="text-xs text-muted-foreground">
                        FMV: {halfDays} hd × €{fmvRate} × {DIFFICULTY_OPTIONS.find((d) => d.value === difficulty)?.multiplier ?? 1}x ={" "}
                        <span className="font-medium text-primary">€{fmvPreview.toFixed(2)}</span>
                      </p>
                      {/* Hours */}
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          placeholder="Hours"
                          value={formHours}
                          onChange={(e) => setFormHours(e.target.value)}
                          className="w-28 h-8 text-sm"
                          step="0.25"
                          min="0"
                        />
                        <span className="text-xs text-muted-foreground">hours (optional)</span>
                      </div>
                    </>
                  )}

                  {advancedMode && (
                    <>
                      <Textarea
                        placeholder="Details (optional)"
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        rows={2}
                        className="text-sm"
                      />
                      <div className="flex gap-2 items-center">
                        <Input
                          type="number"
                          placeholder="Half-days"
                          value={halfDays}
                          onChange={(e) => setHalfDays(e.target.value)}
                          className="w-28 h-8 text-sm"
                          step="0.5"
                          min="0.5"
                        />
                        <span className="text-xs text-muted-foreground">half-days</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {DIFFICULTY_OPTIONS.map((d) => (
                          <button
                            key={d.value}
                            type="button"
                            onClick={() => setDifficulty(d.value)}
                            className={`rounded-md border p-1.5 text-[10px] text-center transition-colors ${
                              difficulty === d.value
                                ? "border-primary bg-primary/10 text-primary font-semibold"
                                : "border-border bg-card text-muted-foreground hover:border-primary/40"
                            }`}
                          >
                            {d.label} ×{d.multiplier}
                          </button>
                        ))}
                      </div>
                      {/* Task type grid */}
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
                          <Input type="number" placeholder="e.g. hours" value={formBaseUnits} onChange={(e) => setFormBaseUnits(e.target.value)} className="h-8 text-sm" step="0.25" min="0" />
                        </div>
                        <div className="w-24">
                          <label className="text-[10px] text-muted-foreground block mb-0.5">Hours</label>
                          <Input type="number" placeholder="Hours" value={formHours} onChange={(e) => setFormHours(e.target.value)} className="h-8 text-sm" step="0.25" min="0" />
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
                      <p className="text-xs text-muted-foreground">
                        FMV: {halfDays} hd × €{fmvRate} × {DIFFICULTY_OPTIONS.find((d) => d.value === difficulty)?.multiplier ?? 1}x ={" "}
                        <span className="font-medium text-primary">€{fmvPreview.toFixed(2)}</span>
                      </p>
                    </>
                  )}
                </>
              )}

              {/* EXPENSES, SUPPLIES, ROYALTY, OTHER */}
              {["EXPENSES", "SUPPLIES", "ROYALTY", "OTHER"].includes(contribType) && (
                <>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-0.5">Amount (€)</label>
                    <Input
                      type="number"
                      value={amountEur || ""}
                      onChange={(e) => setAmountEur(parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm max-w-[160px]"
                      min={0}
                      step={0.01}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-0.5">Description</label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                      className="text-sm"
                      placeholder={
                        contribType === "EXPENSES" ? "What was purchased? For what purpose?" :
                        contribType === "SUPPLIES" ? "What materials? Consumed or transferred?" :
                        contribType === "ROYALTY" ? "What IP or rights? Pre-negotiated terms?" :
                        "Describe the contribution and how you calculated the value."
                      }
                    />
                  </div>
                  {["EXPENSES", "SUPPLIES"].includes(contribType) && (
                    <p className="text-xs text-muted-foreground">
                      FMV = €{amountEur.toFixed(2)} × {cashMultiplier}× multiplier ={" "}
                      <span className="font-medium text-primary">€{(amountEur * cashMultiplier).toFixed(2)}</span>
                      <span className="ml-1 text-[10px]">(Slicing Pie cash-equivalent standard)</span>
                    </p>
                  )}
                  {contribType === "ROYALTY" && (
                    <p className="text-xs text-muted-foreground">
                      FMV = <span className="font-medium text-primary">€{amountEur.toFixed(2)}</span>
                    </p>
                  )}
                  {contribType === "OTHER" && (
                    <p className="text-xs text-muted-foreground">
                      FMV = <span className="font-medium text-primary">€{amountEur.toFixed(2)}</span>
                    </p>
                  )}
                </>
              )}

              {/* EQUIPMENT, FACILITIES */}
              {["EQUIPMENT", "FACILITIES"].includes(contribType) && (
                <>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-0.5">
                      Value (€) — {contribType === "EQUIPMENT" ? "depreciated asset value" : "market rental rate"}
                    </label>
                    <Input
                      type="number"
                      value={amountEur || ""}
                      onChange={(e) => setAmountEur(parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm max-w-[160px]"
                      min={0}
                      step={0.01}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-0.5">Duration (days)</label>
                    <Input
                      type="number"
                      value={periodDays}
                      onChange={(e) => setPeriodDays(parseInt(e.target.value) || 1)}
                      className="h-8 text-sm max-w-[100px]"
                      min={1}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-0.5">Description</label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    FMV = €{amountEur.toFixed(2)} × {cashMultiplier}× ={" "}
                    <span className="font-medium text-primary">€{(amountEur * cashMultiplier).toFixed(2)}</span>
                    {contribType === "EQUIPMENT" && " (depreciated value for this period)"}
                  </p>
                </>
              )}

              {/* SALES, FINDERS_FEE */}
              {["SALES", "FINDERS_FEE"].includes(contribType) && (
                <>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-0.5">Deal value (€)</label>
                    <Input
                      type="number"
                      value={dealValueEur || ""}
                      onChange={(e) => setDealValueEur(parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm max-w-[160px]"
                      min={0}
                      step={0.01}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-0.5">
                      {contribType === "SALES" ? "Commission %" : "Finder's fee %"}
                    </label>
                    <Input
                      type="number"
                      value={commissionPct}
                      onChange={(e) => setCommissionPct(parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm max-w-[100px]"
                      min={0}
                      max={100}
                      step={0.5}
                      placeholder={String(defaultCommissionPct)}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-0.5">Deal description</label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                      className="text-sm"
                      placeholder="What deal? Who is the counterpart? When did it close?"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    FMV = €{dealValueEur.toFixed(2)} × {commissionPct}% ={" "}
                    <span className="font-medium text-primary">€{(dealValueEur * commissionPct / 100).toFixed(2)}</span>
                  </p>
                </>
              )}

              {/* ── Step 3: Evidence upload ── */}
              {evidenceRequired && (
                <div className="rounded-lg border-2 border-dashed border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/20 p-4 space-y-2">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <Paperclip className="h-4 w-4 text-amber-600" />
                    Receipt or evidence required
                    <span className="text-xs text-muted-foreground font-normal ml-1">
                      (peer review cannot approve without this)
                    </span>
                  </p>
                  {evidenceUrl ? (
                    <div className="flex items-center gap-2 text-sm text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      File uploaded
                      <button onClick={() => setEvidenceUrl(null)} className="text-xs text-muted-foreground ml-2 underline">
                        Remove
                      </button>
                    </div>
                  ) : (
                    <EvidenceUploader
                      onUpload={(url) => setEvidenceUrl(url)}
                      questId={questId}
                      accept="image/*,application/pdf"
                      maxSizeMb={10}
                    />
                  )}
                </div>
              )}

              {/* Submit */}
              <div className="flex gap-2 items-center justify-end">
                <Button variant="ghost" size="sm" className="h-7" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
                <Button
                  size="sm"
                  className="h-7"
                  onClick={handleSubmit}
                  disabled={!formTitle.trim() || submitting || (evidenceRequired && !evidenceUrl)}
                >
                  Log contribution
                </Button>
              </div>
            </div>
          )}

          {/* ═══ Contribution List (Step 5) ═══ */}
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading contributions…</p>
          ) : contributions.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No contributions logged yet.</p>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-1.5">
                {contributions.map((c) => {
                  const wu = Number((c as any).weighted_units) || 0;
                  const fmv = Number((c as any).fmv_value) || 0;
                  const evUrl = (c as any).evidence_url;
                  return (
                    <div key={c.id} className="flex items-start gap-2 rounded-md border border-border bg-card p-2 group">
                      <Avatar className="h-7 w-7 mt-0.5">
                        <AvatarImage src={c.profile?.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[10px]">{c.profile?.name?.[0] ?? "?"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-medium truncate">{c.profile?.name}</span>
                          <ContributionTypeBadge type={c.contribution_type} />
                          {c.status === "verified" && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[10px]">✓ Verified</Badge>
                          )}
                          {c.status === "logged" && (Date.now() - new Date(c.created_at).getTime()) / 86400000 >= 14 && (
                            <Badge variant="outline" className="text-amber-600 border-amber-400 text-[10px]">⏳ Auto-verified soon</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{c.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap text-[10px] text-muted-foreground">
                          <ContributionSummaryLine log={c} />
                          {fmv > 0 && (
                            <span className="font-medium text-primary">→ FMV: €{fmv.toFixed(2)}</span>
                          )}
                          {wu > 0 && (
                            <span className="text-emerald-600 font-medium">{wu} wu</span>
                          )}
                          {c.xp_earned > 0 && (
                            <span className="text-primary font-medium">+{c.xp_earned} XP</span>
                          )}
                          {evUrl && (
                            <a
                              href={evUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-0.5"
                            >
                              <Paperclip className="h-2.5 w-2.5" /> Evidence
                            </a>
                          )}
                          <span>
                            {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      {canVerify && c.status === "logged" && (
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

          {/* Value Pie */}
          <ValuePieChart questId={questId} />

          <p className="text-[10px] text-muted-foreground">
            All contributions are attributed under CC-BY-SA. $CTG token rewards are distributed proportionally to weighted contribution units.
          </p>
        </>
      )}

      {/* Distribution Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Scale className="h-4 w-4 text-emerald-600" /> Value Pie Preview
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-muted/50 p-2">
                <p className="text-muted-foreground">Total budget</p>
                <p className="font-bold text-emerald-600">{questCoinBudget} 🟩</p>
              </div>
              <div className="rounded-md bg-muted/50 p-2">
                <p className="text-muted-foreground">Contributor pool</p>
                <p className="font-bold text-emerald-600">{previewContributorPool} 🟩</p>
              </div>
              <div className="rounded-md bg-muted/50 p-2">
                <p className="text-muted-foreground">Guild ({guildPercent}%)</p>
                <p className="font-medium">{Math.round(questCoinBudget * (guildPercent / 100) * 100) / 100}</p>
              </div>
              <div className="rounded-md bg-muted/50 p-2">
                <p className="text-muted-foreground">Territory ({territoryPercent}%) + CTG ({ctgPercent}%)</p>
                <p className="font-medium">{Math.round(questCoinBudget * ((territoryPercent + ctgPercent) / 100) * 100) / 100}</p>
              </div>
            </div>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              <div className="grid grid-cols-[1fr_auto_auto] gap-2 text-[10px] text-muted-foreground font-medium border-b border-border pb-1">
                <span>Contributor</span>
                <span className="text-right">Share %</span>
                <span className="text-right">🟡 $CTG</span>
              </div>
              {previewData.map((p) => (
                <div key={p.userId} className="grid grid-cols-[1fr_auto_auto] gap-2 text-xs items-center">
                  <span className="truncate">{p.name}</span>
                  <span className="text-right text-muted-foreground">{(p.sharePct * 100).toFixed(1)}%</span>
                  <span className="text-right font-medium text-emerald-600">{p.tokens}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground italic">
              These amounts are estimates based on current contributions.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowPreviewDialog(false)}>Cancel</Button>
            <Button
              size="sm"
              className="gap-1"
              onClick={async () => {
                setShowPreviewDialog(false);
                await handleDistribute();
              }}
              disabled={distributing}
            >
              <Scale className="h-3 w-3" /> {distributing ? "Distributing $CTG…" : "Confirm and distribute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
