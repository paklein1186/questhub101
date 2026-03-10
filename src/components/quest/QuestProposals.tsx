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
import { ThumbsUp, Send, Coins, Plus, Check, X, ArrowUp, TrendingDown, MessageSquare, CreditCard, ExternalLink, Lightbulb } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CommentThread } from "@/components/CommentThread";
import { CommentTargetType } from "@/types/enums";
import { formatDistanceToNow } from "date-fns";
import { ProposalEvaluator } from "./ProposalEvaluator";
import { QuestNeedsManager } from "./QuestNeedsManager";

interface QuestProposalsProps {
  questId: string;
  questOwnerId: string;
  questStatus: string;
  missionBudgetMin?: number | null;
  missionBudgetMax?: number | null;
  paymentType?: string;
}

export function QuestProposals({
  questId, questOwnerId, questStatus,
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

  // Campaigns
  const { data: campaigns = [] } = useQuery({
    queryKey: ["quest-campaigns", questId],
    queryFn: async () => {
      const { data } = await supabase
        .from("quest_campaigns" as any)
        .select("*")
        .eq("quest_id", questId)
        .order("created_at", { ascending: false }) as any;
      return data ?? [];
    },
  });

  // Funding entries (linked to campaigns or legacy)
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
  const [propCurrency, setPropCurrency] = useState<"CREDITS" | "FIAT" | "BOTH">("CREDITS");
  const [propFiatAmount, setPropFiatAmount] = useState("");

  const submitProposal = async () => {
    if (!propTitle.trim() || !currentUser.id) return;
    await (supabase.from("quest_proposals" as any) as any).insert({
      quest_id: questId,
      proposer_type: "USER",
      proposer_id: currentUser.id,
      title: propTitle.trim(),
      description: propDesc.trim() || null,
      requested_credits: propCurrency !== "FIAT" ? (Number(propCredits) || 0) : 0,
      requested_fiat: propCurrency !== "CREDITS" ? (Number(propFiatAmount) || 0) : 0,
      requested_currency: propCurrency,
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
    setPropOpen(false); setPropTitle(""); setPropDesc(""); setPropCredits(""); setPropCurrency("CREDITS"); setPropFiatAmount("");
    toast({ title: "Contribution submitted! +3 XP" });
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
    // Grant credits to proposer
    await grantCredits(proposal.proposer_id, {
      type: CREDIT_TX_TYPES.EARNED_ACTION,
      amount: proposal.requested_credits,
      source: "QUEST_PROPOSAL_ACCEPTED",
      relatedEntityType: "Quest",
      relatedEntityId: questId,
    }, true);

    // Update proposal status
    await (supabase.from("quest_proposals" as any) as any)
      .update({ status: "ACCEPTED" }).eq("id", proposal.id);

    // XP for proposer
    await grantXp(proposal.proposer_id, {
      type: XP_EVENT_TYPES.PROPOSAL_ACCEPTED,
      relatedEntityType: "Quest",
      relatedEntityId: questId,
    }, true);

    // CTG emission is handled by the DB trigger on contribution_logs INSERT — no manual RPC needed.

    // Single consolidated notification for proposal acceptance
    await supabase.from("notifications").insert({
      user_id: proposal.proposer_id,
      type: "QUEST_PROPOSAL_ACCEPTED",
      title: "Proposal accepted!",
      body: `Your proposal "${proposal.title}" was accepted. +${proposal.requested_credits} Credits · +20 XP`,
      related_entity_type: "QUEST",
      related_entity_id: questId,
      deep_link_url: `/quests/${questId}`,
    });

    qc.invalidateQueries({ queryKey: ["quest-proposals", questId] });
    qc.invalidateQueries({ queryKey: ["quest", questId] });
    toast({ title: "Proposal accepted", description: `${proposal.requested_credits} $CTG transferred.` });
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

  const fundQuest = async (amount: number, campaign?: any) => {
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

    // Update campaign raised_amount if campaign provided
    if (campaign) {
      await supabase.from("quest_campaigns" as any).update({
        raised_amount: (campaign.raised_amount ?? 0) + amount,
      } as any).eq("id", campaign.id);
    }

    // Fetch quest title for activity log
    const { data: questRow } = await supabase.from("quests").select("title").eq("id", questId).maybeSingle();

    // Log activity
    await supabase.from("activity_log").insert({
      actor_user_id: currentUser.id,
      action_type: "quest_funded",
      target_type: "quest",
      target_id: questId,
      target_name: questRow?.title ?? "Quest",
      metadata: { amount },
    });

    // Notify quest owner
    if (currentUser.id !== questOwnerId) {
      await supabase.from("notifications").insert({
        user_id: questOwnerId,
        type: "QUEST_FUNDED_CREDITS",
        title: "Quest funded!",
        body: `${currentUser.name || "Someone"} added ${amount} $CTG to your quest.`,
        related_entity_type: "QUEST",
        related_entity_id: questId,
        deep_link_url: `/quests/${questId}`,
      });
    }

    qc.invalidateQueries({ queryKey: ["quest-funding", questId] });
    qc.invalidateQueries({ queryKey: ["quest-campaigns", questId] });
    qc.invalidateQueries({ queryKey: ["quest", questId] });
    qc.invalidateQueries({ queryKey: ["profile-data"] });
    qc.invalidateQueries({ queryKey: ["plan-limits"] });
    setFundOpen(false); setFundAmount("");
    toast({ title: `+${amount} $CTG added to quest pot` });
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
      {/* ── Quest Needs ────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="font-display font-semibold flex items-center gap-2 text-sm">
          <Lightbulb className="h-4 w-4 text-primary" /> What this quest needs
        </h3>
        <QuestNeedsManager questId={questId} questOwnerId={questOwnerId} readOnly />
      </div>

      {/* ── Funding Campaigns ──────────────────────────── */}
      {(campaigns as any[]).length > 0 ? (
        <div className="space-y-3">
          <h3 className="font-display font-semibold flex items-center gap-2">
            <Coins className="h-4 w-4 text-primary" /> Funding Campaigns
          </h3>
          {(campaigns as any[]).map((campaign: any) => {
            const pct = campaign.goal_amount > 0 ? Math.min(100, Math.round((campaign.raised_amount / campaign.goal_amount) * 100)) : 0;
            const isActive = campaign.status === "ACTIVE";
            const unit = campaign.type === "FIAT" ? (campaign.currency || "€") : "🟩 Tokens";
            return (
              <div key={campaign.id} className={`rounded-xl border bg-card p-5 ${campaign.status === "CANCELLED" ? "border-destructive/30 opacity-70" : "border-border"}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{campaign.title || "Untitled campaign"}</span>
                    <Badge variant="outline" className={`text-xs ${campaign.status === "ACTIVE" ? "bg-green-500/10 text-green-700 border-green-500/30" : campaign.status === "COMPLETED" ? "bg-blue-500/10 text-blue-700 border-blue-500/30" : "bg-orange-500/10 text-orange-700 border-orange-500/30"}`}>
                      {campaign.status}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">{campaign.type === "FIAT" ? `Fiat (${campaign.currency || "€"})` : "🟩 $CTG"}</Badge>
                  </div>
                  <span className="text-lg font-bold text-primary">
                    {campaign.raised_amount} / {campaign.goal_amount} {unit}
                  </span>
                </div>
                {campaign.goal_amount > 0 && (
                  <div className="space-y-1 mb-3">
                    <Progress value={pct} className="h-2.5" />
                    <p className="text-xs text-muted-foreground text-right">{pct}% funded</p>
                  </div>
                )}
                {/* Contribute button (only for active credit campaigns) */}
                {isActive && currentUser.id && campaign.type === "CREDITS" && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5 mr-1" /> Contribute</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Contribute $CTG to "{campaign.title}"</DialogTitle></DialogHeader>
                      <div className="space-y-4 mt-2">
                        <div className="flex gap-2">
                          {[5, 10, 20, 50].map(v => (
                            <Button key={v} variant="outline" size="sm" onClick={() => setFundAmount(String(v))}>{v}</Button>
                          ))}
                        </div>
                        <Input type="number" placeholder="Custom amount" value={fundAmount} onChange={e => setFundAmount(e.target.value)} min={1} />
                        <Button onClick={() => fundQuest(Number(fundAmount) || 0, campaign)} disabled={!fundAmount || Number(fundAmount) <= 0} className="w-full">
                          <Coins className="h-4 w-4 mr-1" /> Contribute {fundAmount || 0} $CTG
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
                {isActive && campaign.type === "FIAT" && (
                  <p className="text-xs text-muted-foreground mt-2 italic">Fiat contributions are processed via Stripe checkout.</p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-5 text-center">
          <p className="text-sm text-muted-foreground">No funding campaigns configured yet. The quest owner can create campaigns in <span className="font-medium text-foreground">Settings → Fundraising</span>.</p>
        </div>
      )}

      {/* ── Proposals list ────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <Send className="h-4 w-4" /> Contributions ({proposals.length})
        </h3>
        {canSubmitProposal && (
          <Dialog open={propOpen} onOpenChange={setPropOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Submit Contribution</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Submit a Contribution</DialogTitle></DialogHeader>
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
                  <label className="text-sm font-medium mb-1 block">Payment Currency</label>
                  <Select value={propCurrency} onValueChange={(v) => setPropCurrency(v as "CREDITS" | "FIAT" | "BOTH")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CREDITS">🟩 $CTG only</SelectItem>
                      <SelectItem value="FIAT">Fiat (€) only</SelectItem>
                      <SelectItem value="BOTH">$CTG + Fiat (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {propCurrency !== "FIAT" && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Requested Credits</label>
                    <Input type="number" value={propCredits} onChange={e => setPropCredits(e.target.value)} min={0} placeholder="0" />
                    <p className="text-xs text-muted-foreground mt-1">Credits from the quest pot</p>
                  </div>
                )}
                {propCurrency !== "CREDITS" && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Requested Amount (€)</label>
                    <Input type="number" value={propFiatAmount} onChange={e => setPropFiatAmount(e.target.value)} min={0} placeholder="0" />
                    <p className="text-xs text-muted-foreground mt-1">Payment link will be activated upon admin approval</p>
                  </div>
                )}
                <Button onClick={submitProposal} disabled={!propTitle.trim()} className="w-full">
                  <Send className="h-4 w-4 mr-1" /> Submit Contribution
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
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {proposal.requested_credits > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <Coins className="h-3 w-3 mr-1" /> {proposal.requested_credits} Credits
                      </Badge>
                    )}
                    {(proposal.requested_fiat > 0) && (
                      <Badge variant="secondary" className="text-xs">
                        <CreditCard className="h-3 w-3 mr-1" /> €{proposal.requested_fiat}
                      </Badge>
                    )}
                    {proposal.requested_currency && (
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {{ CREDITS: "$CTG tokens", FIAT: "Coins (€)", BOTH: "$CTG + Fiat" }[proposal.requested_currency as string] ?? proposal.requested_currency}
                      </Badge>
                    )}
                    {/* Payment link — only active when accepted and fiat requested */}
                    {proposal.status === "ACCEPTED" && proposal.requested_fiat > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs text-primary"
                        onClick={() => {
                          toast({ title: "Payment link", description: `Fiat payment of €${proposal.requested_fiat} has been validated by the quest admin.` });
                        }}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" /> Payment Link
                      </Button>
                    )}
                    {proposal.status === "PENDING" && proposal.requested_fiat > 0 && (
                      <span className="text-[10px] text-muted-foreground italic">Payment link activates on approval</span>
                    )}
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
                      title="Accept proposal"
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
