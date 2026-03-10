import { useQuestContributions, useLogContribution } from "@/hooks/useContributionLog";
import { useValuePieActions } from "@/hooks/useValuePie";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  CheckCircle2, FileText, Shield, Star, Plus, ChevronDown, ChevronUp, Zap, Award, BookOpen, Scale, Eye, Paperclip
} from "lucide-react";
import { useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { ValuePieChart } from "./ValuePieChart";
import { LogContributionDialog } from "@/components/ocu/LogContributionDialog";

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

// ── Type badge & summary line components ──
function ContributionTypeBadge({ type }: { type: string }) {
  const cfg = CONTRIBUTION_TYPES.find((t) => t.value === type);
  if (cfg) {
    return (
      <Badge variant="outline" className="text-[10px] gap-1">
        {cfg.icon} {cfg.label}
      </Badge>
    );
  }
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
  const { verifyContribution } = useLogContribution();
  const { calculateAndDistribute } = useValuePieActions();

  const [expanded, setExpanded] = useState(true);
  const [distributing, setDistributing] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showOCUModal, setShowOCUModal] = useState(false);

  const isOwner = currentUser.id === questOwnerId;
  const canVerify = isOwner || isCoHost || isGuildAdmin;

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
          Contributions
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
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowOCUModal(true)}>
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

          {/* ═══ Contribution List ═══ */}
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
            All contributions are attributed under CC-BY-SA.
            🟩 Coins are distributed proportionally via the OCU pie.
            🌱 $CTG is emitted per contribution to the commons.
          </p>
        </>
      )}

      {/* OCU Log Contribution Modal */}
      <LogContributionDialog
        open={showOCUModal}
        onOpenChange={setShowOCUModal}
        questId={questId}
        guildId={guildId}
        territoryId={territoryId}
      />

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
