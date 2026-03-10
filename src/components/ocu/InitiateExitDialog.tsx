import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, AlertTriangle } from "lucide-react";

interface Contributor {
  userId: string;
  name: string;
  avatarUrl: string | null;
  fmv: number;
  pct: number;
}

interface GuildExitSettings {
  exit_good_leaver_fmv_pct: number;
  exit_graceful_fmv_pct: number;
  exit_bad_leaver_fmv_pct: number;
  exit_bad_leaver_decision: string;
  abandonment_threshold_days: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contributor: Contributor;
  quest: any;
  guildSettings: GuildExitSettings;
  allContributors: Contributor[];
  isAbandonment?: boolean;
  activeContractId?: string | null;
}

type ExitTypeOption = "voluntary" | "graceful_withdrawal" | "involuntary_cause" | "involuntary_no_cause";

const EXIT_OPTIONS: { value: ExitTypeOption; label: string; emoji: string; desc: string }[] = [
  { value: "voluntary", label: "Voluntary", emoji: "🟢", desc: "Contributor chose to leave" },
  { value: "graceful_withdrawal", label: "Graceful Withdrawal", emoji: "🌿", desc: "Leaves with a formal handover commitment" },
  { value: "involuntary_cause", label: "Involuntary (for cause)", emoji: "🔴", desc: "Removed due to misconduct or contract breach" },
  { value: "involuntary_no_cause", label: "Involuntary (no cause)", emoji: "🟡", desc: "Removed for operational reasons, no fault" },
];

function getSettlementPct(exitType: ExitTypeOption | "abandonment", settings: GuildExitSettings): number {
  switch (exitType) {
    case "voluntary": return settings.exit_good_leaver_fmv_pct;
    case "graceful_withdrawal": return settings.exit_graceful_fmv_pct;
    case "involuntary_cause": return settings.exit_bad_leaver_fmv_pct;
    case "involuntary_no_cause": return settings.exit_good_leaver_fmv_pct;
    case "abandonment": return settings.exit_bad_leaver_fmv_pct;
    default: return 0;
  }
}

function getLeaverClass(exitType: ExitTypeOption | "abandonment"): "good" | "graceful" | "bad" {
  switch (exitType) {
    case "voluntary": return "good";
    case "graceful_withdrawal": return "graceful";
    case "involuntary_cause": return "bad";
    case "involuntary_no_cause": return "good";
    case "abandonment": return "bad";
  }
}

export function InitiateExitDialog({
  open, onOpenChange, contributor, quest, guildSettings, allContributors, isAbandonment, activeContractId,
}: Props) {
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [step, setStep] = useState(1);
  const [exitType, setExitType] = useState<ExitTypeOption>(isAbandonment ? "involuntary_cause" : "voluntary");
  const [handoverNote, setHandoverNote] = useState("");
  const [exitNote, setExitNote] = useState("");
  const [blockReEntry, setBlockReEntry] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const effectiveExitType = isAbandonment ? "abandonment" as const : exitType;
  const settlementPct = getSettlementPct(effectiveExitType, guildSettings);
  const settlementAmount = Math.round(contributor.fmv * (settlementPct / 100) * 100) / 100;
  const leaverClass = getLeaverClass(effectiveExitType);
  const needsVote = (effectiveExitType === "involuntary_cause" || effectiveExitType === "abandonment") &&
    (guildSettings.exit_bad_leaver_decision === "vote" || guildSettings.exit_bad_leaver_decision === "mediation_then_vote");

  // Compute redistribution
  const remaining = allContributors.filter(c => c.userId !== contributor.userId);
  const remainingTotalFmv = remaining.reduce((s, c) => s + c.fmv, 0);
  const redistribution = remaining.map(c => ({
    user_id: c.userId,
    old_pct: c.pct,
    new_pct: remainingTotalFmv > 0 ? (c.fmv / remainingTotalFmv) * 100 : 0,
  }));

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const exitRecord = {
        quest_id: quest.id,
        user_id: contributor.userId,
        exit_type: effectiveExitType,
        leaver_class: leaverClass,
        exit_initiated_by: currentUser.id,
        fmv_at_exit: contributor.fmv,
        pct_at_exit: contributor.pct,
        settlement_pct: needsVote ? 0 : settlementPct,
        settlement_amount: needsVote ? 0 : settlementAmount,
        settlement_status: "pending",
        handover_committed: exitType === "graceful_withdrawal",
        handover_note: exitType === "graceful_withdrawal" ? handoverNote : null,
        redistribution_snapshot: {
          removed_fmv: contributor.fmv,
          removed_pct: contributor.pct,
          redistributed_to: redistribution,
        },
        exit_note: exitNote || null,
        re_entry_allowed: !blockReEntry,
      };

      const { data: exitData, error: exitError } = await supabase
        .from("contributor_exits" as any)
        .insert(exitRecord as any)
        .select("id")
        .single();

      if (exitError) throw exitError;
      const exitId = (exitData as any).id;

      // Log to activity_log
      await supabase.from("activity_log").insert({
        actor_user_id: currentUser.id,
        action_type: "ocu_exit",
        target_type: "quest",
        target_id: quest.id,
        target_name: quest.title,
        metadata: {
          exit_id: exitId,
          exit_type: effectiveExitType,
          leaver_class: leaverClass,
          settlement: needsVote ? "pending_vote" : settlementAmount,
          contributor_name: contributor.name,
        },
      });

      // Notify the contributor
      await supabase.from("notifications" as any).insert({
        user_id: contributor.userId,
        type: "ocu_exit",
        title: `Exit from quest: ${quest.title}`,
        body: needsVote
          ? "An exit process has been initiated. A governance vote will determine the settlement."
          : `Your exit has been processed. Settlement: 🟡 ${settlementAmount} (${settlementPct}% of FMV).`,
        action_url: `/quests/${quest.id}`,
        entity_type: "quest",
        entity_id: quest.id,
      } as any);

      // If needs vote, create decision_poll
      if (needsVote) {
        // If mediation first, create discussion thread
        if (guildSettings.exit_bad_leaver_decision === "mediation_then_vote") {
          await supabase.from("posts" as any).insert({
            title: `Exit mediation: ${contributor.name}`,
            content: `${currentUser.name || "An admin"} has initiated an exit process for ${contributor.name}. A mediation period of 7 days is open before the classification vote.`,
            entity_type: "quest",
            entity_id: quest.id,
            author_id: currentUser.id,
            post_type: "discussion",
          } as any);
        }

        // Create decision poll
        await supabase.from("decision_polls" as any).insert({
          title: `Leaver classification: ${contributor.name}`,
          description: `${currentUser.name || "An admin"} initiated an exit. Vote to classify this contributor.`,
          guild_id: quest.guild_id,
          quest_id: quest.id,
          created_by: currentUser.id,
          options: [
            `Good leaver (${guildSettings.exit_good_leaver_fmv_pct}% settlement)`,
            `Graceful (${guildSettings.exit_graceful_fmv_pct}% — only if handover offered)`,
            `Bad leaver (${guildSettings.exit_bad_leaver_fmv_pct}% settlement)`,
          ],
          closes_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          metadata: { type: "exit_classification", exit_id: exitId },
        } as any);
      }

      // Auto-propose contract amendment if active contract
      if (activeContractId) {
        // Get latest amendment number
        const { data: amendments } = await supabase
          .from("contract_amendments")
          .select("amendment_number")
          .eq("contract_id", activeContractId)
          .order("amendment_number", { ascending: false })
          .limit(1);

        const nextNum = ((amendments?.[0] as any)?.amendment_number ?? 0) + 1;

        await supabase.from("contract_amendments").insert({
          contract_id: activeContractId,
          amendment_number: nextNum,
          content: {
            type: "signatory_removal",
            removed_user_id: contributor.userId,
            removed_user_name: contributor.name,
            reason: effectiveExitType,
          },
          proposed_by: currentUser.id,
          status: "proposed",
        });
      }

      toast({ title: "Exit initiated", description: `${contributor.name} has been exited from this quest.` });
      qc.invalidateQueries({ queryKey: ["quest-pie", quest.id] });
      qc.invalidateQueries({ queryKey: ["contributor-exits", quest.id] });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Failed to initiate exit", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Initiate Exit — {contributor.name}
          </DialogTitle>
          <DialogDescription>
            {isAbandonment ? "This contributor has been flagged for abandonment." : "Process a contributor exit from this quest."}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Exit Type */}
        {step === 1 && !isAbandonment && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Exit type</Label>
            <RadioGroup value={exitType} onValueChange={(v) => setExitType(v as ExitTypeOption)} className="space-y-2">
              {EXIT_OPTIONS.map(opt => (
                <div key={opt.value} className="flex items-start gap-2 rounded-md border border-border p-2.5 cursor-pointer hover:bg-muted/30">
                  <RadioGroupItem value={opt.value} id={opt.value} className="mt-0.5" />
                  <label htmlFor={opt.value} className="cursor-pointer flex-1">
                    <span className="text-sm font-medium">{opt.emoji} {opt.label}</span>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </label>
                </div>
              ))}
            </RadioGroup>

            {exitType === "graceful_withdrawal" && (
              <div>
                <Label className="text-sm font-medium mb-1 block">Handover commitment *</Label>
                <Textarea
                  value={handoverNote}
                  onChange={(e) => setHandoverNote(e.target.value)}
                  placeholder="What the contributor agrees to hand over or complete…"
                  rows={3}
                />
              </div>
            )}

            <Button
              className="w-full"
              onClick={() => setStep(2)}
              disabled={exitType === "graceful_withdrawal" && !handoverNote.trim()}
            >
              Next: Settlement Preview
            </Button>
          </div>
        )}

        {/* Step 2: Settlement Preview */}
        {(step === 2 || (step === 1 && isAbandonment)) && (
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={contributor.avatarUrl ?? undefined} />
                  <AvatarFallback>{contributor.name?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{contributor.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {isAbandonment ? "Abandonment exit" : EXIT_OPTIONS.find(o => o.value === exitType)?.label}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">FMV at exit:</span>
                  <p className="font-medium text-primary">🟡 {contributor.fmv}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Current pie %:</span>
                  <p className="font-medium">{contributor.pct.toFixed(1)}%</p>
                </div>
              </div>

              {needsVote ? (
                <div className="rounded bg-amber-500/10 border border-amber-500/30 p-2 text-xs">
                  <p className="font-medium text-amber-700">A governance vote will determine the leaver classification.</p>
                  <p className="text-muted-foreground mt-1">Settlement will be calculated after the vote resolves.</p>
                </div>
              ) : (
                <div className="rounded bg-muted p-2">
                  <p className="text-xs text-muted-foreground">Settlement</p>
                  <p className="font-bold text-sm">{settlementPct}% = 🟡 {settlementAmount}</p>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Their slice ({contributor.pct.toFixed(1)}%) will be redistributed proportionally to remaining contributors.
              </p>
            </div>

            {/* Contract warning */}
            {activeContractId && (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-amber-700">Active contract detected</p>
                  <p className="text-muted-foreground mt-0.5">
                    A contract amendment will be auto-proposed to remove this contributor from the signatory list.
                  </p>
                </div>
              </div>
            )}

            <Button className="w-full" onClick={() => setStep(isAbandonment ? 3 : 3)}>
              Next: Confirm
            </Button>
            {!isAbandonment && (
              <Button variant="ghost" className="w-full" onClick={() => setStep(1)}>Back</Button>
            )}
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium mb-1 block">Exit note (visible to contributor)</Label>
              <Textarea
                value={exitNote}
                onChange={(e) => setExitNote(e.target.value)}
                placeholder="Optional note…"
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="block-reentry"
                checked={blockReEntry}
                onCheckedChange={(v) => setBlockReEntry(!!v)}
              />
              <label htmlFor="block-reentry" className="text-xs text-muted-foreground cursor-pointer">
                Prevent this contributor from re-joining this quest
              </label>
            </div>

            <Button
              className="w-full"
              onClick={handleConfirm}
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Finalise Exit
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setStep(2)}>Back</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
