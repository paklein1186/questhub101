import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import DOMPurify from "dompurify";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { OCUFeatureGate } from "./OCUFeatureGate";
import { ContractAiAssistant } from "./ContractAiAssistant";
import { FileText, Check, X, Clock, ChevronDown, Plus, AlertTriangle, Pencil, Info, Sparkles } from "lucide-react";

import { computeVoteWeights, GOVERNANCE_MODELS, type GovernanceModel } from "@/lib/governanceWeights";
import { formatDistanceToNow, format } from "date-fns";

// ── Types ─────────────────────────────────────────────────────
interface Props {
  quest: any;
  isAdmin: boolean;
  onEnableOCU?: () => void;
}

const STATUS_KEYS: Record<string, { key: string; className: string }> = {
  draft: { key: "contract.status.draft", className: "bg-muted text-muted-foreground border-border" },
  pending_signatures: { key: "contract.status.pendingSignatures", className: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  active: { key: "contract.status.active", className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
  amended: { key: "contract.status.amended", className: "bg-primary/10 text-primary border-primary/30" },
};

function getDefaultTemplate(t: TFunction, questName: string, guildName: string, fmvRate: number) {
  return `<h2>${t("contract.template.heading", { questName })}</h2>
<p><strong>${t("contract.template.guildLabel")}</strong> ${guildName || "—"} &nbsp;|&nbsp; <strong>${t("contract.template.dateLabel")}</strong> ${format(new Date(), "PPP")}</p>
<hr/>
<h3>${t("contract.template.scopeTitle")}</h3>
<p>${t("contract.template.scopeBody")}</p>

<h3>${t("contract.template.valuationTitle")}</h3>
<p>${t("contract.template.valuationBody", { fmvRate })}</p>

<h3>${t("contract.template.externalSpendingTitle")}</h3>
<p>${t("contract.template.externalSpendingBody")}</p>

<h3>${t("contract.template.deliverablesTitle")}</h3>
<p>${t("contract.template.deliverablesBody")}</p>

<h3>${t("contract.template.disputeTitle")}</h3>
<p>${t("contract.template.disputeBody")}</p>

<h3>${t("contract.template.exitTitle")}</h3>
<p>${t("contract.template.exitBody")}</p>`;
}

/** Contract bodies are stored either as { html } or as a raw HTML/text string. */
function getContractHtml(content: any): string {
  if (!content) return "";
  if (typeof content === "string") {
    const trimmed = content.trim();
    if (!trimmed) return "";
    return /<[a-z][\s\S]*>/i.test(trimmed)
      ? trimmed
      : trimmed.split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`).join("");
  }
  if (typeof content.html === "string") return content.html;
  if (typeof content.text === "string") return getContractHtml(content.text);
  return "";
}


// ── Main Component ────────────────────────────────────────────
export function ContractTab({ quest, isAdmin, onEnableOCU }: Props) {
  const { t } = useTranslation();
  const currentUser = useCurrentUser();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [editorOpen, setEditorOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);


  const [contractTitle, setContractTitle] = useState(t("contract.defaultTitle"));
  const [contractBody, setContractBody] = useState("");
  const [selectedSignatories, setSelectedSignatories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [declineNote, setDeclineNote] = useState("");
  const [declineOpen, setDeclineOpen] = useState(false);

  const [amendOpen, setAmendOpen] = useState(false);
  const [amendBody, setAmendBody] = useState("");
  const [amendSubmitting, setAmendSubmitting] = useState(false);

  // ── Data queries ──
  const { data: contract, isLoading } = useQuery({
    queryKey: ["quest-contract", quest.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("quest_contracts")
        .select("*")
        .eq("quest_id", quest.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: signatories = [] } = useQuery({
    queryKey: ["contract-signatories", contract?.id],
    enabled: !!contract?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("contract_signatories")
        .select("*")
        .eq("contract_id", contract!.id);
      if (!data || data.length === 0) return [];
      const userIds = data.map((s) => s.user_id);
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, name, avatar_url")
        .in("user_id", userIds);
      const pm = new Map((profiles ?? []).map((p) => [p.user_id, p]));
      return data.map((s) => ({ ...s, profile: pm.get(s.user_id) }));
    },
  });

  const { data: amendments = [] } = useQuery({
    queryKey: ["contract-amendments", contract?.id],
    enabled: !!contract?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("contract_amendments")
        .select("*")
        .eq("contract_id", contract!.id)
        .order("amendment_number", { ascending: true });
      return data ?? [];
    },
  });

  const { data: amendmentVotes = [] } = useQuery({
    queryKey: ["amendment-votes", contract?.id],
    enabled: !!contract?.id && amendments.length > 0,
    queryFn: async () => {
      const ids = amendments.map((a) => a.id);
      const { data } = await supabase
        .from("amendment_votes")
        .select("*")
        .in("amendment_id", ids);
      return data ?? [];
    },
  });

  const { data: questMembers = [] } = useQuery({
    queryKey: ["quest-members-for-contract", quest.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("quest_participants" as any)
        .select("user_id")
        .eq("quest_id", quest.id);
      if (!data || data.length === 0) return [];
      const userIds = (data as any[]).map((d) => d.user_id);
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, name, avatar_url")
        .in("user_id", userIds);
      return profiles ?? [];
    },
  });

  const { data: guild } = useQuery({
    queryKey: ["guild-for-contract", quest.guild_id],
    enabled: !!quest.guild_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("guilds")
        .select("name, fmv_rate_per_half_day")
        .eq("id", quest.guild_id)
        .single();
      return data;
    },
  });

  const fmvRate = (guild as any)?.fmv_rate_per_half_day ?? 200;

  // ── Handlers ──
  const handleOpenEditor = () => {
    setIsEditing(false);
    setContractTitle(t("contract.defaultTitle"));
    setContractBody(getDefaultTemplate(t, quest.title, (guild as any)?.name ?? "", fmvRate));
    setSelectedSignatories([]);
    setEditorOpen(true);
  };

  const handleOpenEditExisting = () => {
    if (!contract) return;
    setIsEditing(true);
    setContractTitle(contract.title ?? t("contract.defaultTitle"));
    setContractBody(getContractHtml(contract.content));
    setSelectedSignatories([]);
    setEditorOpen(true);
  };

  /** A quest member who joined later can co-sign the existing contract. */
  const handleJoinAsSignatory = async () => {
    if (!contract) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("contract_signatories").insert({
        contract_id: contract.id,
        user_id: currentUser.id,
      });
      if (error) throw error;
      toast({ title: t("contract.toast.joinedContract"), description: t("contract.toast.joinedContractDesc") });
      qc.invalidateQueries({ queryKey: ["contract-signatories"] });
    } catch (e: any) {
      toast({ title: t("contract.toast.error"), description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveContract = async () => {
    if (!contractBody.trim()) return;
    setSaving(true);
    try {
      if (isEditing && contract) {
        const { error } = await supabase
          .from("quest_contracts")
          .update({ title: contractTitle, content: { html: contractBody } } as any)
          .eq("id", contract.id);
        if (error) throw error;
        toast({ title: t("contract.toast.contractUpdated") });
        qc.invalidateQueries({ queryKey: ["quest-contract", quest.id] });
        setEditorOpen(false);
        return;
      }
      const status = selectedSignatories.length > 0 ? "pending_signatures" : "draft";
      const { data: newContract, error } = await supabase
        .from("quest_contracts")
        .insert({
          quest_id: quest.id,
          title: contractTitle,
          content: { html: contractBody },
          status,
          created_by: currentUser.id,
        } as any)
        .select()
        .single();
      if (error) throw error;

      // Insert signatories
      if (selectedSignatories.length > 0 && newContract) {
        await supabase.from("contract_signatories").insert(
          selectedSignatories.map((uid) => ({
            contract_id: newContract.id,
            user_id: uid,
          }))
        );

        // Notify signatories
        for (const uid of selectedSignatories) {
          await supabase.from("notifications" as any).insert({
            user_id: uid,
            type: "contract_signature_request",
            title: `Contract signature requested`,
            message: `You've been asked to sign the contract for "${quest.title}"`,
            link: `/quests/${quest.id}?tab=contract`,
            is_read: false,
          });
        }
      }

      toast({ title: t("contract.toast.contractCreated") });
      qc.invalidateQueries({ queryKey: ["quest-contract", quest.id] });
      qc.invalidateQueries({ queryKey: ["contract-signatories"] });
      setEditorOpen(false);
    } catch (e: any) {
      toast({ title: t("contract.toast.error"), description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };


  const handleSign = async () => {
    if (!contract) return;
    setSaving(true);
    try {
      await supabase
        .from("contract_signatories")
        .update({ signed_at: new Date().toISOString() })
        .eq("contract_id", contract.id)
        .eq("user_id", currentUser.id);

      // Check if all signed
      const { data: allSigs } = await supabase
        .from("contract_signatories")
        .select("signed_at, rejected_at")
        .eq("contract_id", contract.id);

      const allSigned = (allSigs ?? []).every((s) => s.signed_at !== null);
      if (allSigned) {
        await supabase
          .from("quest_contracts")
          .update({ status: "active" })
          .eq("id", contract.id);
      }

      toast({ title: t("contract.toast.contractSigned") });
      qc.invalidateQueries({ queryKey: ["quest-contract", quest.id] });
      qc.invalidateQueries({ queryKey: ["contract-signatories"] });
    } catch (e: any) {
      toast({ title: t("contract.toast.error"), description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDecline = async () => {
    if (!contract) return;
    setSaving(true);
    try {
      await supabase
        .from("contract_signatories")
        .update({ rejected_at: new Date().toISOString(), rejection_note: declineNote || null })
        .eq("contract_id", contract.id)
        .eq("user_id", currentUser.id);

      // Notify admin
      if (quest.created_by_user_id) {
        await supabase.from("notifications" as any).insert({
          user_id: quest.created_by_user_id,
          type: "contract_declined",
          title: "Contract signature declined",
          message: `A signatory declined the contract for "${quest.title}"`,
          link: `/quests/${quest.id}?tab=contract`,
          is_read: false,
        });
      }

      toast({ title: t("contract.toast.contractDeclined") });
      qc.invalidateQueries({ queryKey: ["quest-contract", quest.id] });
      qc.invalidateQueries({ queryKey: ["contract-signatories"] });
      setDeclineOpen(false);
      setDeclineNote("");
    } catch (e: any) {
      toast({ title: t("contract.toast.error"), description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleProposeAmendment = async () => {
    if (!contract || !amendBody.trim()) return;
    setAmendSubmitting(true);
    try {
      const nextNum = amendments.length + 1;
      await supabase.from("contract_amendments").insert({
        contract_id: contract.id,
        amendment_number: nextNum,
        content: { html: amendBody },
        proposed_by: currentUser.id,
        status: "proposed",
      });

      // Notify signatories
      for (const sig of signatories) {
        if (sig.user_id !== currentUser.id) {
          await supabase.from("notifications" as any).insert({
            user_id: sig.user_id,
            type: "amendment_proposed",
            title: `Amendment #${nextNum} proposed`,
            message: `A new amendment has been proposed for the contract in "${quest.title}"`,
            link: `/quests/${quest.id}?tab=contract`,
            is_read: false,
          });
        }
      }

      toast({ title: t("contract.toast.amendmentProposed", { number: nextNum }) });
      qc.invalidateQueries({ queryKey: ["contract-amendments", contract.id] });
      setAmendOpen(false);
      setAmendBody("");
    } catch (e: any) {
      toast({ title: t("contract.toast.error"), description: e.message, variant: "destructive" });
    } finally {
      setAmendSubmitting(false);
    }
  };

  const handleAmendmentVote = async (amendmentId: string, vote: "accept" | "reject") => {
    try {
      // Compute weights for this vote
      const { raw_weight, applied_weight, model } = await computeVoteWeights(quest.guild_id, currentUser.id);

      await supabase.from("amendment_votes").insert({
        amendment_id: amendmentId,
        user_id: currentUser.id,
        vote,
      });

      // Check consensus
      const amendment = amendments.find((a) => a.id === amendmentId);
      const { data: votes } = await supabase
        .from("amendment_votes")
        .select("vote, user_id")
        .eq("amendment_id", amendmentId);

      const totalSignatories = signatories.length;
      const accepts = (votes ?? []).filter((v) => v.vote === "accept").length;
      const rejects = (votes ?? []).filter((v) => v.vote === "reject").length;

      // For pure_pct model, check if guild has amendment_weighted_threshold enabled
      const featuresConfig = typeof quest.features_config === "object" && quest.features_config
        ? quest.features_config : {};
      const ocuConfig = (featuresConfig as any)?.ocu ?? {};
      const useWeightedThreshold = model === "pure_pct" && ocuConfig.amendment_weighted_threshold;

      let isAccepted = false;
      let isRejected = false;

      if (useWeightedThreshold) {
        // Weighted threshold: >50% of applied_weight
        const acceptUserIds = (votes ?? []).filter((v) => v.vote === "accept").map((v) => v.user_id);
        let totalW = 0;
        let acceptW = 0;
        for (const sig of signatories) {
          const w = await computeVoteWeights(quest.guild_id, sig.user_id);
          totalW += w.applied_weight;
          if (acceptUserIds.includes(sig.user_id)) acceptW += w.applied_weight;
        }
        isAccepted = totalW > 0 && (acceptW / totalW) > 0.5;
        isRejected = rejects > 0 && !isAccepted;
      } else {
        // Unanimous consensus
        isRejected = rejects > 0;
        isAccepted = !isRejected && accepts >= totalSignatories;
      }

      if (isRejected) {
        // Rejected
        await supabase
          .from("contract_amendments")
          .update({ status: "rejected", resolved_at: new Date().toISOString() })
          .eq("id", amendmentId);

        // Create discussion thread
        await supabase.from("posts" as any).insert({
          quest_id: quest.id,
          author_id: currentUser.id,
          title: `Amendment dispute: Amendment #${amendment?.amendment_number}`,
          content: `Amendment #${amendment?.amendment_number} was rejected. Discussion needed.`,
          type: "discussion",
        });

        toast({ title: t("contract.toast.amendmentRejected"), description: t("contract.toast.amendmentRejectedDesc") });
      } else if (isAccepted) {
        // All accepted
        await supabase
          .from("contract_amendments")
          .update({ status: "accepted", resolved_at: new Date().toISOString() })
          .eq("id", amendmentId);

        // Update contract content and status
        if (amendment && contract) {
          const newContent = (amendment.content as any)?.html ?? "";
          const existingHtml = (contract.content as any)?.html ?? "";
          await supabase
            .from("quest_contracts")
            .update({
              content: { html: existingHtml + "\n<hr/>\n<p><em>Amendment #" + amendment.amendment_number + " (accepted):</em></p>\n" + newContent },
              status: "amended",
            })
            .eq("id", contract.id);
        }
        toast({ title: t("contract.toast.amendmentAccepted") });
      } else {
        toast({ title: t("contract.toast.voteRecorded") });
      }

      qc.invalidateQueries({ queryKey: ["contract-amendments", contract?.id] });
      qc.invalidateQueries({ queryKey: ["amendment-votes", contract?.id] });
      qc.invalidateQueries({ queryKey: ["quest-contract", quest.id] });
    } catch (e: any) {
      toast({ title: t("contract.toast.error"), description: e.message, variant: "destructive" });
    }
  };

  const mySig = signatories.find((s) => s.user_id === currentUser?.id);
  const canSign = mySig && !mySig.signed_at && !mySig.rejected_at;
  const isQuestMember = questMembers.some((m: any) => m.user_id === currentUser?.id);
  // Late joiners: quest members who are not yet signatories can opt into the contract.
  const canJoinAsSignatory = !!contract && !mySig && (isQuestMember || isAdmin) && contract.status !== "draft";
  const canEditContract = !!contract && contract.created_by === currentUser?.id && (contract.status === "draft" || contract.status === "pending_signatures");
  const contractStatus = STATUS_KEYS[contract?.status ?? "draft"] ?? STATUS_KEYS.draft;


  return (
    <OCUFeatureGate quest={quest} isAdmin={isAdmin} onEnable={onEnableOCU}>
      <div className="space-y-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("contract.loading")}</p>
        ) : !contract ? (
          /* ── Empty state ── */
          <div className="rounded-xl border border-dashed border-border p-10 text-center space-y-3">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
            <h3 className="font-display font-semibold">{t("contract.noContractTitle")}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {t("contract.noContractDescription")}
            </p>
            {isAdmin && (
              <Button onClick={handleOpenEditor} className="gap-1.5">
                <Plus className="h-4 w-4" /> {t("contract.createContract")}
              </Button>
            )}
          </div>
        ) : (
          /* ── Contract viewer ── */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="font-display font-semibold text-sm">{contract.title}</h3>
                <Badge variant="outline" className={`text-[10px] ${contractStatus.className}`}>
                  {t(contractStatus.key)}
                </Badge>
              </div>
              <div className="flex gap-1.5">
                {canEditContract && (
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleOpenEditExisting}>
                    <Pencil className="h-3 w-3" /> {t("contract.edit")}
                  </Button>
                )}
                {contract.status !== "draft" && (
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setAmendOpen(true)}>
                    <Pencil className="h-3 w-3" /> {t("contract.proposeAmendmentButton")}
                  </Button>
                )}
              </div>

            </div>

            {/* Contract body */}
            <div
              className="prose prose-sm dark:prose-invert max-w-none rounded-lg border border-border bg-card p-4"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(getContractHtml(contract.content)) }}
            />


            {/* ── Signatories ── */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("contract.signatories")}</h4>
              <div className="space-y-1.5">
                {signatories.map((sig: any) => (
                  <div key={sig.id} className="flex items-center gap-2 text-sm">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={sig.profile?.avatar_url} />
                      <AvatarFallback className="text-[10px]">{sig.profile?.name?.[0] ?? "?"}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-xs">{sig.profile?.name ?? t("contract.unknown")}</span>
                    {sig.signed_at ? (
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30 gap-0.5">
                        <Check className="h-2.5 w-2.5" /> {t("contract.signedOn", { date: format(new Date(sig.signed_at), "MMM d") })}
                      </Badge>
                    ) : sig.rejected_at ? (
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-700 border-red-500/30 gap-0.5">
                          <X className="h-2.5 w-2.5" /> {t("contract.declined")}
                        </Badge>
                        {sig.rejection_note && (
                          <span className="text-[10px] text-muted-foreground italic">"{sig.rejection_note}"</span>
                        )}
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/30 gap-0.5">
                        <Clock className="h-2.5 w-2.5" /> {t("contract.pending")}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>

              {/* Sign / Decline buttons */}
              {canSign && (
                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="h-8 text-xs gap-1" onClick={handleSign} disabled={saving}>
                    <Check className="h-3 w-3" /> {t("contract.signContract")}
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setDeclineOpen(true)}>
                    <X className="h-3 w-3" /> {t("contract.decline")}
                  </Button>
                </div>
              )}

              {/* Late joiners can add themselves as signatory */}
              {canJoinAsSignatory && (
                <div className="pt-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={handleJoinAsSignatory} disabled={saving}>
                    <Plus className="h-3 w-3" /> {t("contract.joinAsSignatory")}
                  </Button>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {t("contract.joinAsSignatoryHint")}
                  </p>
                </div>
              )}

            </div>

            {/* ── Amendments ── */}
            {amendments.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("contract.amendmentHistory")}</h4>
                {amendments.map((a: any) => {
                  const aVotes = amendmentVotes.filter((v) => v.amendment_id === a.id);
                  const myVote = aVotes.find((v) => v.user_id === currentUser?.id);
                  const isSignatory = signatories.some((s: any) => s.user_id === currentUser?.id);
                  const aStatus = a.status === "accepted"
                    ? { key: "contract.status.accepted", className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" }
                    : a.status === "rejected"
                    ? { key: "contract.status.rejected", className: "bg-red-500/10 text-red-700 border-red-500/30" }
                    : { key: "contract.status.proposed", className: "bg-amber-500/10 text-amber-700 border-amber-500/30" };

                  return (
                    <Collapsible key={a.id}>
                      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left text-xs p-2 rounded-md hover:bg-muted/50 transition-colors">
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{t("contract.amendmentNumber", { number: a.amendment_number })}</span>
                        <Badge variant="outline" className={`text-[10px] ${aStatus.className}`}>{t(aStatus.key)}</Badge>
                        <span className="text-muted-foreground ml-auto">{formatDistanceToNow(new Date(a.proposed_at), { addSuffix: true })}</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="px-2 pb-2">
                        <div
                          className="prose prose-sm dark:prose-invert max-w-none rounded border border-border bg-muted/30 p-3 mt-1"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize((a.content as any)?.html ?? "") }}
                        />
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {t("contract.votes", {
                            accept: aVotes.filter((v) => v.vote === "accept").length,
                            reject: aVotes.filter((v) => v.vote === "reject").length,
                          })}
                        </div>
                        {a.status === "proposed" && isSignatory && !myVote && (
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" className="h-7 text-xs gap-1" onClick={() => handleAmendmentVote(a.id, "accept")}>
                              <Check className="h-3 w-3" /> {t("contract.accept")}
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleAmendmentVote(a.id, "reject")}>
                              <X className="h-3 w-3" /> {t("contract.reject")}
                            </Button>
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Editor Dialog ── */}
        <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-sm">{isEditing ? t("contract.editDialogTitle") : t("contract.createDialogTitle")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium">{t("contract.titleLabel")}</label>
                <Input
                  value={contractTitle}
                  onChange={(e) => setContractTitle(e.target.value)}
                  className="h-8 text-sm mt-1"
                />
              </div>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-medium">{t("contract.bodyLabel")}</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setAiOpen(true)}
                  >
                    <Sparkles className="h-3 w-3" /> {t("contract.askAiToComplete")}
                  </Button>
                </div>
                <Textarea
                  value={contractBody}
                  onChange={(e) => setContractBody(e.target.value)}
                  className="text-xs mt-1 font-mono min-h-[300px]"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {t("contract.aiAssistantHint")}
                </p>
              </div>


              {/* Signatory selection */}
              {!isEditing && (
              <div>
                <label className="text-xs font-medium">{t("contract.signatoriesSelectLabel")}</label>
                <p className="text-[10px] text-muted-foreground mb-2">{t("contract.signatoriesSelectHint")}</p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {questMembers.map((m: any) => (
                    <label key={m.user_id} className="flex items-center gap-2 text-xs cursor-pointer">
                      <Checkbox
                        checked={selectedSignatories.includes(m.user_id)}
                        onCheckedChange={(checked) => {
                          setSelectedSignatories((prev) =>
                            checked ? [...prev, m.user_id] : prev.filter((id) => id !== m.user_id)
                          );
                        }}
                      />
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={m.avatar_url} />
                        <AvatarFallback className="text-[8px]">{m.name?.[0]}</AvatarFallback>
                      </Avatar>
                      {m.name}
                    </label>
                  ))}
                  {questMembers.length === 0 && (
                    <p className="text-[10px] text-muted-foreground">{t("contract.noQuestMembers")}</p>
                  )}
                </div>
              </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setEditorOpen(false)}>{t("contract.cancel")}</Button>
                <Button size="sm" onClick={handleSaveContract} disabled={saving}>
                  {saving ? t("contract.saving") : isEditing ? t("contract.saveChanges") : selectedSignatories.length > 0 ? t("contract.saveAndSendForSignatures") : t("contract.saveAsDraft")}
                </Button>
              </div>

            </div>
          </DialogContent>
        </Dialog>

        {/* ── AI interview assistant ── */}
        <ContractAiAssistant
          open={aiOpen}
          onOpenChange={setAiOpen}
          mode={isEditing ? "edit" : "create"}
          draftHtml={contractBody}
          context={{
            questTitle: quest.title,
            questDescription: quest.description,
            hostName: (guild as any)?.name ?? "",
            members: questMembers.map((m: any) => m.name).filter(Boolean).join(", "),
            fmvRate,
            budget: quest.credit_budget ?? undefined,
            governance: (guild as any)?.governance_model ?? undefined,
          }}
          onApply={({ title, html }) => {
            if (html) setContractBody(html);
            if (title && !isEditing) setContractTitle(title);
          }}
        />


        {/* ── Decline Dialog ── */}
        <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-sm">{t("contract.declineDialogTitle")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">{t("contract.declineOptionalHint")}</p>
              <Textarea
                value={declineNote}
                onChange={(e) => setDeclineNote(e.target.value)}
                placeholder={t("contract.declineReasonPlaceholder")}
                className="text-xs"
                rows={3}
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeclineOpen(false)}>{t("contract.cancel")}</Button>
                <Button variant="destructive" size="sm" className="flex-1" onClick={handleDecline} disabled={saving}>
                  {saving ? t("contract.declining") : t("contract.decline")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Amendment Dialog ── */}
        <Dialog open={amendOpen} onOpenChange={setAmendOpen}>
          <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-sm">{t("contract.proposeAmendmentTitle")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {t("contract.proposeAmendmentHint")}
              </p>
              <Textarea
                value={amendBody}
                onChange={(e) => setAmendBody(e.target.value)}
                placeholder={t("contract.amendmentPlaceholder")}
                className="text-xs font-mono min-h-[200px]"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setAmendOpen(false)}>{t("contract.cancel")}</Button>
                <Button size="sm" onClick={handleProposeAmendment} disabled={amendSubmitting || !amendBody.trim()}>
                  {amendSubmitting ? t("contract.submitting") : t("contract.proposeAmendmentButton")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </OCUFeatureGate>
  );
}
