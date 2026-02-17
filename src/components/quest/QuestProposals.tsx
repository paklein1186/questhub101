import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useXpCredits } from "@/hooks/useXpCredits";
import { useToast } from "@/hooks/use-toast";
import { XP_EVENT_TYPES, CREDIT_TX_TYPES } from "@/lib/xpCreditsConfig";
import { calculateCommission, type CommissionRule } from "@/lib/commissionCalc";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ThumbsUp, Send, Coins, Plus, Check, X, ArrowUp, TrendingDown, MessageSquare } from "lucide-react";
import { CommentThread } from "@/components/CommentThread";
import { CommentTargetType } from "@/types/enums";
import { formatDistanceToNow } from "date-fns";
import { ProposalEvaluator } from "./ProposalEvaluator";

interface QuestProposalsProps {
  questId: string;
  questOwnerId: string;
  escrowCredits: number;
  fundingGoalCredits?: number | null;
  allowFundraising: boolean;
  questStatus: string;
  missionBudgetMin?: number | null;
  missionBudgetMax?: number | null;
  paymentType?: string;
}

export function QuestProposals({
  questId, questOwnerId, escrowCredits, fundingGoalCredits, allowFundraising, questStatus,
  missionBudgetMin, missionBudgetMax, paymentType,
}: QuestProposalsProps) {
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { grantXp, grantCredits, spendCredits } = useXpCredits();
  const { plan } = usePlanLimits();
  const isOwner = currentUser.id === questOwnerId;

  // Commission rules for payout estimates
  const { data: commissionRules = [] } = useQuery({
    queryKey: ["commission-rules"],
    queryFn: async () => {
      const { data } = await supabase
        .from("commission_rules" as any)
        .select("*")
        .eq("is_active", true)
        .order("sort_order") as any;
      return (data ?? []) as CommissionRule[];
    },
  });

  // Proposals
  const { data: proposals = [] } = useQuery({
    queryKey: ["quest-proposals", questId],
    queryFn: async () => {
      const { data } = await supabase
        .from("quest_proposals" as any)
        .select("*")
        .eq("quest_id", questId)
        .order("upvotes_count", { ascending: false }) as any;
      return data ?? [];
    },
  });

  // My upvotes
  const { data: myUpvotes = [] } = useQuery({
    queryKey: ["my-proposal-upvotes", questId, currentUser.id],
    queryFn: async () => {
      if (!currentUser.id) return [];
      const { data } = await supabase
        .from("quest_proposal_upvotes" as any)
        .select("proposal_id")
        .eq("user_id", currentUser.id) as any;
      return (data ?? []).map((u: any) => u.proposal_id);
    },
    enabled: !!currentUser.id,
  });

  // Funding
  const { data: funding = [] } = useQuery({
    queryKey: ["quest-funding", questId],
    queryFn: async () => {
      const { data } = await supabase
        .from("quest_funding" as any)
        .select("*")
        .eq("quest_id", questId)
        .eq("status", "PAID")
        .order("created_at", { ascending: false }) as any;
      return data ?? [];
    },
  });

  // Funder profiles
  const funderIds = [...new Set((funding as any[]).map((f: any) => f.funder_user_id).filter(Boolean))];
  const { data: funderProfiles = [] } = useQuery({
    queryKey: ["funder-profiles", funderIds.join(",")],
    queryFn: async () => {
      if (!funderIds.length) return [];
      const { data } = await supabase.from("profiles_public").select("user_id, name, avatar_url").in("user_id", funderIds);
      return data ?? [];
    },
    enabled: funderIds.length > 0,
  });
  const funderMap = Object.fromEntries(funderProfiles.map((p: any) => [p.user_id, p]));

  // Proposer profiles
  const proposerIds = proposals.filter((p: any) => p.proposer_type === "USER").map((p: any) => p.proposer_id);
  const { data: proposerProfiles = [] } = useQuery({
    queryKey: ["proposer-profiles", proposerIds.join(",")],
    queryFn: async () => {
      if (!proposerIds.length) return [];
      const { data } = await supabase.from("profiles_public").select("user_id, name, avatar_url").in("user_id", proposerIds);
      return data ?? [];
    },
    enabled: proposerIds.length > 0,
  });

  const profileMap = Object.fromEntries(proposerProfiles.map((p: any) => [p.user_id, p]));

  // ── Submit Proposal ─────────────────────────────────────
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [propOpen, setPropOpen] = useState(false);
  const [propTitle, setPropTitle] = useState("");
  const [propDesc, setPropDesc] = useState("");
  const [propCredits, setPropCredits] = useState("");

  const submitProposal = async () => {
    if (!propTitle.trim() || !currentUser.id) return;
    await (supabase.from("quest_proposals" as any) as any).insert({
      quest_id: questId,
      proposer_type: "USER",
      proposer_id: currentUser.id,
      title: propTitle.trim(),
      description: propDesc.trim() || null,
      requested_credits: Number(propCredits) || 0,
      status: "PENDING",
    });

    // XP
    await grantXp(currentUser.id, {
      type: XP_EVENT_TYPES.PROPOSAL_SUBMITTED,
      relatedEntityType: "Quest",
      relatedEntityId: questId,
    }, true);

    // Notify quest owner
    await supabase.from("notifications").insert({
      user_id: questOwnerId,
      type: "QUEST_PROPOSAL_SUBMITTED",
      title: "New proposal on your quest",
      body: `${currentUser.name || "Someone"} submitted a proposal: "${propTitle.trim()}"`,
      related_entity_type: "QUEST",
      related_entity_id: questId,
      deep_link_url: `/quests/${questId}`,
    });

    qc.invalidateQueries({ queryKey: ["quest-proposals", questId] });
    setPropOpen(false); setPropTitle(""); setPropDesc(""); setPropCredits("");
    toast({ title: "Proposal submitted! +3 XP" });
  };

  // ── Upvote toggle ─────────────────────────────────────
  const toggleUpvote = async (proposalId: string) => {
    if (!currentUser.id) return;
    const hasUpvoted = myUpvotes.includes(proposalId);
    if (hasUpvoted) {
      await (supabase.from("quest_proposal_upvotes" as any) as any)
        .delete().eq("proposal_id", proposalId).eq("user_id", currentUser.id);
      await (supabase.from("quest_proposals" as any) as any)
        .update({ upvotes_count: Math.max(0, (proposals.find((p: any) => p.id === proposalId)?.upvotes_count ?? 1) - 1) })
        .eq("id", proposalId);
    } else {
      await (supabase.from("quest_proposal_upvotes" as any) as any)
        .insert({ proposal_id: proposalId, user_id: currentUser.id });
      await (supabase.from("quest_proposals" as any) as any)
        .update({ upvotes_count: (proposals.find((p: any) => p.id === proposalId)?.upvotes_count ?? 0) + 1 })
        .eq("id", proposalId);
    }
    qc.invalidateQueries({ queryKey: ["quest-proposals", questId] });
    qc.invalidateQueries({ queryKey: ["my-proposal-upvotes", questId] });
  };

  // ── Accept proposal ───────────────────────────────────
  const acceptProposal = async (proposal: any) => {
    if (escrowCredits < proposal.requested_credits) {
      toast({ title: "Not enough Credits in pot", description: `Need ${proposal.requested_credits} but pot has ${escrowCredits}.`, variant: "destructive" });
      return;
    }
    // Grant credits to proposer
    await grantCredits(proposal.proposer_id, {
      type: CREDIT_TX_TYPES.EARNED_ACTION,
      amount: proposal.requested_credits,
      source: "QUEST_PROPOSAL_ACCEPTED",
      relatedEntityType: "Quest",
      relatedEntityId: questId,
    }, true);

    // Decrease escrow
    await supabase.from("quests").update({
      escrow_credits: escrowCredits - proposal.requested_credits,
      status: "ACTIVE" as any,
    }).eq("id", questId);

    // Update proposal status
    await (supabase.from("quest_proposals" as any) as any)
      .update({ status: "ACCEPTED" }).eq("id", proposal.id);

    // XP for proposer
    await grantXp(proposal.proposer_id, {
      type: XP_EVENT_TYPES.PROPOSAL_ACCEPTED,
      relatedEntityType: "Quest",
      relatedEntityId: questId,
    }, true);

    // Notify proposer
    await supabase.from("notifications").insert({
      user_id: proposal.proposer_id,
      type: "QUEST_PROPOSAL_ACCEPTED",
      title: "Proposal accepted!",
      body: `Your proposal "${proposal.title}" was accepted. +${proposal.requested_credits} Credits`,
      related_entity_type: "QUEST",
      related_entity_id: questId,
      deep_link_url: `/quests/${questId}`,
    });

    qc.invalidateQueries({ queryKey: ["quest-proposals", questId] });
    qc.invalidateQueries({ queryKey: ["quest", questId] });
    toast({ title: "Proposal accepted", description: `${proposal.requested_credits} Credits transferred.` });
  };

  // ── Decline proposal ──────────────────────────────────
  const declineProposal = async (proposal: any) => {
    await (supabase.from("quest_proposals" as any) as any)
      .update({ status: "REJECTED" }).eq("id", proposal.id);
    await supabase.from("notifications").insert({
      user_id: proposal.proposer_id,
      type: "QUEST_PROPOSAL_REJECTED",
      title: "Proposal declined",
      body: `Your proposal "${proposal.title}" was not accepted.`,
      related_entity_type: "QUEST",
      related_entity_id: questId,
      deep_link_url: `/quests/${questId}`,
    });
    qc.invalidateQueries({ queryKey: ["quest-proposals", questId] });
    toast({ title: "Proposal declined" });
  };

  // ── Fund quest ────────────────────────────────────────
  const [fundOpen, setFundOpen] = useState(false);
  const [fundAmount, setFundAmount] = useState("");

  const fundQuest = async (amount: number) => {
    if (!currentUser.id || amount <= 0) return;
    const ok = await spendCredits(currentUser.id, {
      type: CREDIT_TX_TYPES.SPENT_FEATURE,
      amount,
      source: "QUEST_FUNDING",
      relatedEntityType: "Quest",
      relatedEntityId: questId,
    });
    if (!ok) return;

    await (supabase.from("quest_funding" as any) as any).insert({
      quest_id: questId,
      funder_user_id: currentUser.id,
      type: "CREDITS",
      amount,
      status: "PAID",
    });

    await supabase.from("quests").update({
      escrow_credits: escrowCredits + amount,
    }).eq("id", questId);

    // Notify quest owner
    if (currentUser.id !== questOwnerId) {
      await supabase.from("notifications").insert({
        user_id: questOwnerId,
        type: "QUEST_FUNDED_CREDITS",
        title: "Quest funded!",
        body: `${currentUser.name || "Someone"} added ${amount} Credits to your quest.`,
        related_entity_type: "QUEST",
        related_entity_id: questId,
        deep_link_url: `/quests/${questId}`,
      });
    }

    qc.invalidateQueries({ queryKey: ["quest-funding", questId] });
    qc.invalidateQueries({ queryKey: ["quest", questId] });
    qc.invalidateQueries({ queryKey: ["profile-data"] });
    qc.invalidateQueries({ queryKey: ["plan-limits"] });
    setFundOpen(false); setFundAmount("");
    toast({ title: `+${amount} Credits added to quest pot` });
  };

  // ── Sort proposals ────────────────────────────────────
  const sorted = [...proposals].sort((a: any, b: any) => {
    const order = { ACCEPTED: 0, PENDING: 1, REJECTED: 2, WITHDRAWN: 3 };
    const diff = (order[a.status as keyof typeof order] ?? 9) - (order[b.status as keyof typeof order] ?? 9);
    if (diff !== 0) return diff;
    return (b.upvotes_count ?? 0) - (a.upvotes_count ?? 0);
  });

  const canSubmitProposal = currentUser.id && (questStatus === "OPEN_FOR_PROPOSALS" || questStatus === "OPEN");
  const pendingProposals = proposals.filter((p: any) => p.status === "PENDING");

  return (
    <div className="space-y-6">
      {/* ── Funding progress ──────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display font-semibold flex items-center gap-2">
            <Coins className="h-4 w-4 text-primary" /> Credits Pot
          </h3>
          <span className="text-lg font-bold text-primary">
            {escrowCredits}{fundingGoalCredits ? ` / ${fundingGoalCredits}` : ""} Credits
          </span>
        </div>

        {/* Progress bar — always show if there's a goal, or if there's any escrow */}
        {fundingGoalCredits && fundingGoalCredits > 0 ? (
          <div className="space-y-1 mb-3">
            <Progress value={Math.min(100, (escrowCredits / fundingGoalCredits) * 100)} className="h-2.5" />
            <p className="text-xs text-muted-foreground text-right">
              {Math.min(100, Math.round((escrowCredits / fundingGoalCredits) * 100))}% funded
            </p>
          </div>
        ) : escrowCredits > 0 ? (
          <div className="mb-3">
            <Progress value={100} className="h-2.5" />
            <p className="text-xs text-muted-foreground mt-1">No funding goal set</p>
          </div>
        ) : null}

        {/* Contributors list */}
        {funding.length > 0 && (
          <div className="mb-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{funding.length} contributor{funding.length !== 1 ? "s" : ""}</p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {(funding as any[]).map((f: any) => {
                const fProfile = funderMap[f.funder_user_id];
                return (
                  <div key={f.id} className="flex items-center gap-2 text-sm">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={fProfile?.avatar_url} />
                      <AvatarFallback className="text-[10px]">{fProfile?.name?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm truncate flex-1">{fProfile?.name || "Anonymous"}</span>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      +{f.amount} Credits
                    </Badge>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          {allowFundraising && currentUser.id && (
            <Dialog open={fundOpen} onOpenChange={setFundOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5 mr-1" /> Fund this quest</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Fund Quest with Credits</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="flex gap-2">
                    {[5, 10, 20, 50].map(v => (
                      <Button key={v} variant="outline" size="sm" onClick={() => setFundAmount(String(v))}>{v}</Button>
                    ))}
                  </div>
                  <Input type="number" placeholder="Custom amount" value={fundAmount} onChange={e => setFundAmount(e.target.value)} min={1} />
                  <Button onClick={() => fundQuest(Number(fundAmount) || 0)} disabled={!fundAmount || Number(fundAmount) <= 0} className="w-full">
                    <Coins className="h-4 w-4 mr-1" /> Fund {fundAmount || 0} Credits
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* ── Proposals list ────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <Send className="h-4 w-4" /> Proposals ({proposals.length})
        </h3>
        {canSubmitProposal && (
          <Dialog open={propOpen} onOpenChange={setPropOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Submit Proposal</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Submit a Proposal</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Title *</label>
                  <Input value={propTitle} onChange={e => setPropTitle(e.target.value)} maxLength={120} placeholder="What you propose to do" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Description</label>
                  <Textarea value={propDesc} onChange={e => setPropDesc(e.target.value)} maxLength={1000} className="resize-none min-h-[80px]" placeholder="Explain your approach…" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Requested Credits</label>
                  <Input type="number" value={propCredits} onChange={e => setPropCredits(e.target.value)} min={0} placeholder="0" />
                  <p className="text-xs text-muted-foreground mt-1">Credits you'd like from the quest pot</p>
                </div>
                <Button onClick={submitProposal} disabled={!propTitle.trim()} className="w-full">
                  <Send className="h-4 w-4 mr-1" /> Submit Proposal
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {sorted.length === 0 && <p className="text-muted-foreground text-sm">No proposals yet.</p>}

      {/* AI Evaluator – only visible to quest owner */}
      {isOwner && pendingProposals.length > 0 && (
        <ProposalEvaluator
          questId={questId}
          proposalTitles={Object.fromEntries(proposals.map((p: any) => [p.id, p.title]))}
        />
      )}

      <div className="space-y-3">
        {sorted.map((proposal: any) => {
          const profile = profileMap[proposal.proposer_id];
          const hasUpvoted = myUpvotes.includes(proposal.id);
          const isPending = proposal.status === "PENDING";
          const statusColor = proposal.status === "ACCEPTED" ? "bg-emerald-500/10 text-emerald-600" :
            proposal.status === "REJECTED" ? "bg-destructive/10 text-destructive" :
            proposal.status === "WITHDRAWN" ? "bg-muted text-muted-foreground" : "";

          return (
            <div key={proposal.id} className={`rounded-lg border bg-card p-4 ${proposal.status === "ACCEPTED" ? "border-emerald-500/30" : "border-border"}`}>
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback>{profile?.name?.[0] || "?"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{profile?.name || "User"}</span>
                    <Badge variant={isPending ? "outline" : "secondary"} className={statusColor}>
                      {proposal.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(proposal.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <h4 className="font-semibold mt-1">{proposal.title}</h4>
                  {proposal.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{proposal.description}</p>}
                  <div className="flex items-center gap-3 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      <Coins className="h-3 w-3 mr-1" /> {proposal.requested_credits} Credits requested
                    </Badge>
                    <Button
                      variant={hasUpvoted ? "default" : "ghost"}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => toggleUpvote(proposal.id)}
                      disabled={!currentUser.id}
                    >
                      <ArrowUp className="h-3.5 w-3.5 mr-0.5" /> {proposal.upvotes_count}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground hover:text-primary"
                      onClick={() => setExpandedComments(expandedComments === proposal.id ? null : proposal.id)}
                    >
                      <MessageSquare className="h-3.5 w-3.5 mr-0.5" /> Discuss
                    </Button>
                  </div>
                </div>
                {isOwner && isPending && (
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-emerald-600 hover:bg-emerald-500/10"
                      onClick={() => acceptProposal(proposal)}
                      disabled={escrowCredits < proposal.requested_credits}
                      title={escrowCredits < proposal.requested_credits ? "Not enough Credits in pot" : "Accept proposal"}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-destructive hover:bg-destructive/10"
                      onClick={() => declineProposal(proposal)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
              {expandedComments === proposal.id && (
                <div className="mt-3 pt-3 border-t border-border">
                  <CommentThread targetType={CommentTargetType.QUEST_PROPOSAL} targetId={proposal.id} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
