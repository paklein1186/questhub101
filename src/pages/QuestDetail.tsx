import { useParams, Link, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Zap, Users, Sparkles, Megaphone, BookOpen, MessageCircle, Trophy, Plus, Heart, CircleDot, Building2, UserPlus, Pencil, Send, Coins, CreditCard, Lock, ListChecks, FileText, Bot, Brain, MoreHorizontal, TrendingDown, Handshake } from "lucide-react";
import { CommissionEstimator } from "@/components/quest/CommissionEstimator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageShell } from "@/components/PageShell";
import { ImageUpload } from "@/components/ImageUpload";
import { AttachmentUpload, AttachmentList } from "@/components/AttachmentUpload";
import { CommentThread } from "@/components/CommentThread";
import { CommentTargetType, QuestUpdateType, QuestStatus, FollowTargetType, ReportTargetType, AttachmentTargetType } from "@/types/enums";
import { ReportButton } from "@/components/ReportButton";
import { DraftBanner } from "@/components/DraftBanner";
import { useFollow } from "@/hooks/useFollow";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useQuestById, useQuestParticipants, useQuestUpdates, usePodsForQuest, usePublicProfile } from "@/hooks/useEntityQueries";
import { formatDistanceToNow } from "date-fns";
import { isAdmin as checkIsGlobalAdmin } from "@/lib/admin";
import { XpLevelBadge } from "@/components/XpLevelBadge";
import { FeedSection } from "@/components/feed/FeedSection";
import { computeLevelFromXp } from "@/lib/xpCreditsConfig";
import { QuestSubtasks } from "@/components/guild/QuestSubtasks";
import { QuestProposals } from "@/components/quest/QuestProposals";
import { UnitChat } from "@/components/UnitChat";
import { MatchmakerPanel } from "@/components/MatchmakerPanel";
import { MemoryEnginePanel } from "@/components/MemoryEnginePanel";
import { FundraisingAIPanel } from "@/components/FundraisingAIPanel";
import { AIWriterButton } from "@/components/AIWriterButton";
import { useResolvedQuestHosts } from "@/hooks/useQuestHosts";
import { QuestHostsDisplay, QuestCoHostsManager } from "@/components/quest/QuestCoHosts";
import { PublicExploreCTA } from "@/components/PublicExploreCTA";
import { GuestOnboardingAssistant } from "@/components/GuestOnboardingAssistant";
import { UserSearchInput } from "@/components/UserSearchInput";
import { sendInviteNotification } from "@/lib/inviteNotification";
import { InviteLinkButton } from "@/components/InviteLinkButton";

const updateIcons: Record<string, typeof Sparkles> = {
  MILESTONE: Sparkles,
  CALL_FOR_HELP: Megaphone,
  REFLECTION: BookOpen,
  GENERAL: MessageCircle,
};

export default function QuestDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { data: quest, isLoading } = useQuestById(id);
  const { data: participants } = useQuestParticipants(id);
  const { data: updates } = useQuestUpdates(id);
  const { data: questPods } = usePodsForQuest(id);
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { isFollowing, toggle: toggleFollow } = useFollow(FollowTargetType.QUEST, id!);

  const { data: creator } = usePublicProfile(quest?.created_by_user_id);
  const { data: resolvedHosts } = useResolvedQuestHosts(id);

  const [updateOpen, setUpdateOpen] = useState(false);
  const [uTitle, setUTitle] = useState("");
  const [uContent, setUContent] = useState("");
  const [uType, setUType] = useState("GENERAL");
  const [uImageUrl, setUImageUrl] = useState<string | undefined>();
  const [uDraft, setUDraft] = useState(false);
  const [uVisibility, setUVisibility] = useState("PUBLIC");
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "overview");
  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null);

  const [podOpen, setPodOpen] = useState(false);
  const [podName, setPodName] = useState("");
  const [podDesc, setPodDesc] = useState("");
  const [podStart, setPodStart] = useState("");
  const [podEnd, setPodEnd] = useState("");
  const [podImageUrl, setPodImageUrl] = useState<string | undefined>();

  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStatus, setEditStatus] = useState<QuestStatus>(QuestStatus.OPEN);
  const [editCoverImageUrl, setEditCoverImageUrl] = useState<string | undefined>();
  const [editCreditReward, setEditCreditReward] = useState("0");
  const [editPriceFiat, setEditPriceFiat] = useState("0");
  const [editCreditBudget, setEditCreditBudget] = useState("0");
  const [editAllowFundraising, setEditAllowFundraising] = useState(false);
  const [editFundingGoal, setEditFundingGoal] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [authPromptAction, setAuthPromptAction] = useState("");

  if (isLoading) return <PageShell><p>Loading…</p></PageShell>;
  if (!quest) return <PageShell><p>Quest not found.</p></PageShell>;
  if (quest.is_deleted && !checkIsGlobalAdmin(currentUser.email)) return <PageShell><p>This quest has been removed.</p></PageShell>;
  if (quest.is_draft && quest.created_by_user_id !== currentUser.id && !checkIsGlobalAdmin(currentUser.email)) return <PageShell><p>Quest not found.</p></PageShell>;

  const isLoggedIn = !!currentUser.id;
  const guild = quest.guilds;
  const topics = (quest.quest_topics || []).map((qt: any) => qt.topics).filter(Boolean);
  const territories = (quest.quest_territories || []).map((qt: any) => qt.territories).filter(Boolean);
  const isOwner = isLoggedIn && currentUser.id === quest.created_by_user_id;
  const isParticipant = isLoggedIn && (participants || []).some((qp: any) => qp.user_id === currentUser.id);
  const isCollaborator = isLoggedIn && (participants || []).some((qp: any) => qp.user_id === currentUser.id && (qp.role === "OWNER" || qp.role === "COLLABORATOR"));

  // Check if user is admin of a host or co-host entity
  const isHostAdmin = (() => {
    if (!resolvedHosts || resolvedHosts.length === 0) return false;
    // This is a simplified check; full check would query guild_members/company_members
    return false; // Host admin is checked via isOwner + isCollaborator for now
  })();
  const canPostUpdate = isOwner || isCollaborator || isHostAdmin;

  const isPaidQuest = quest && quest.price_fiat > 0;

  const joinQuest = async () => {
    if (isPaidQuest) {
      // Redirect to Stripe checkout for paid quests
      try {
        const { data, error } = await supabase.functions.invoke("create-checkout", {
          body: { quest_id: quest.id, price_fiat: quest.price_fiat, currency: quest.price_currency || "EUR" },
        });
        if (error) throw error;
        if (data?.url) {
          window.open(data.url, "_blank");
        }
      } catch (err: any) {
        toast({ title: "Payment error", description: err.message, variant: "destructive" });
      }
      return;
    }
    await supabase.from("quest_participants").insert({ quest_id: quest.id, user_id: currentUser.id, role: "COLLABORATOR", status: "ACCEPTED" });
    qc.invalidateQueries({ queryKey: ["quest-participants", id] });
    toast({ title: "Joined quest!" });
  };

  const postUpdate = async () => {
    if (!uTitle.trim() || !uContent.trim()) return;
    if (editingUpdateId) {
      await supabase.from("quest_updates").update({
        title: uTitle.trim(), content: uContent.trim(), image_url: uImageUrl || null, type: uType, is_draft: uDraft, visibility: uVisibility,
      } as any).eq("id", editingUpdateId);
    } else {
      await supabase.from("quest_updates").insert({
        quest_id: quest.id, author_id: currentUser.id, title: uTitle.trim(), content: uContent.trim(), image_url: uImageUrl || null, type: uType, is_draft: uDraft, visibility: uVisibility,
      } as any);
    }
    qc.invalidateQueries({ queryKey: ["quest-updates", id] });
    setUpdateOpen(false); setUTitle(""); setUContent(""); setUType("GENERAL"); setUImageUrl(undefined); setUDraft(false); setUVisibility("PUBLIC"); setEditingUpdateId(null);
    toast({ title: uDraft ? "Draft saved!" : editingUpdateId ? "Update edited!" : "Update posted!" });
  };

  const openEditUpdate = (update: any) => {
    setUTitle(update.title); setUContent(update.content || ""); setUType(update.type); setUImageUrl(update.image_url || undefined); setUDraft(update.is_draft); setUVisibility(update.visibility || "PUBLIC"); setEditingUpdateId(update.id); setUpdateOpen(true);
  };

  const deleteUpdate = async (updateId: string) => {
    await supabase.from("quest_updates").update({ is_deleted: true, deleted_at: new Date().toISOString() } as any).eq("id", updateId);
    qc.invalidateQueries({ queryKey: ["quest-updates", id] });
    toast({ title: "Update deleted" });
  };

  const togglePin = async (updateId: string, currentPinned: boolean) => {
    await supabase.from("quest_updates").update({ pinned: !currentPinned } as any).eq("id", updateId);
    qc.invalidateQueries({ queryKey: ["quest-updates", id] });
    toast({ title: currentPinned ? "Unpinned" : "Pinned!" });
  };

  const createPod = async () => {
    if (!podName.trim()) return;
    const { data: pod, error } = await supabase.from("pods").insert({ name: podName.trim(), description: podDesc.trim() || null, image_url: podImageUrl || null, type: "QUEST_POD" as any, quest_id: quest.id, creator_id: currentUser.id, start_date: podStart || null, end_date: podEnd || null }).select().single();
    if (error) { toast({ title: "Failed to create pod", variant: "destructive" }); return; }
    await supabase.from("pod_members").insert({ pod_id: pod.id, user_id: currentUser.id, role: "HOST" as any });
    qc.invalidateQueries({ queryKey: ["pods-for-quest", id] });
    setPodOpen(false); setPodName(""); setPodDesc(""); setPodStart(""); setPodEnd(""); setPodImageUrl(undefined);
    toast({ title: "Pod created!" });
  };

  const openEditQuest = () => { setEditTitle(quest.title); setEditDesc(quest.description || ""); setEditStatus(quest.status as QuestStatus); setEditCoverImageUrl(quest.cover_image_url ?? undefined); setEditCreditReward(String(quest.credit_reward ?? 0)); setEditPriceFiat(String(quest.price_fiat ?? 0)); setEditCreditBudget(String((quest as any).credit_budget ?? 0)); setEditAllowFundraising((quest as any).allow_fundraising ?? false); setEditFundingGoal(String((quest as any).funding_goal_credits ?? "")); setEditOpen(true); };

  const saveEditQuest = async () => {
    const fiat = Number(editPriceFiat) || 0;
    const credits = Number(editCreditReward) || 0;
    const monType = fiat > 0 ? "PAID" : credits > 0 ? "MIXED" : "FREE";
    await supabase.from("quests").update({
      title: editTitle.trim() || quest.title,
      description: editDesc.trim() || null,
      status: editStatus as any,
      cover_image_url: editCoverImageUrl || null,
      credit_reward: credits,
      price_fiat: fiat,
      monetization_type: monType as any,
      credit_budget: Number(editCreditBudget) || 0,
      allow_fundraising: editAllowFundraising,
      funding_goal_credits: editFundingGoal ? Number(editFundingGoal) : null,
    } as any).eq("id", quest.id);
    qc.invalidateQueries({ queryKey: ["quest", id] });
    setEditOpen(false); toast({ title: "Quest updated" });
  };

  return (
    <PageShell>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/explore?tab=quests"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Quests</Link>
      </Button>
      {quest.is_draft && <DraftBanner />}

      {quest.cover_image_url && (
        <div className="w-full h-48 md:h-64 rounded-xl overflow-hidden mb-6">
          <img src={quest.cover_image_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
          <h1 className="font-display text-3xl font-bold">{quest.title}</h1>
          <span className="flex items-center gap-1.5 text-lg font-bold text-primary"><Zap className="h-5 w-5" /> {quest.reward_xp} XP</span>
        </div>

        {/* Mission Budget & Economy Bar */}
        {((quest as any).mission_budget_min || (quest as any).mission_budget_max || quest.credit_reward > 0) && (
          <div className="rounded-lg border border-border bg-muted/30 p-4 mb-4 grid gap-3 md:grid-cols-3">
            {((quest as any).mission_budget_min || (quest as any).mission_budget_max) && (
              <div>
                <p className="text-xs text-muted-foreground font-medium">💰 Mission Budget</p>
                <p className="text-lg font-bold">
                  €{(quest as any).mission_budget_min ?? "—"} – €{(quest as any).mission_budget_max ?? "—"}
                </p>
                <p className="text-[10px] text-muted-foreground">Payment in euros • {(quest as any).payment_type || "INVOICE"}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground font-medium">🏆 XP Reward</p>
              <p className="text-lg font-bold text-primary">+{quest.reward_xp} XP</p>
            </div>
            {quest.credit_reward > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-medium">⚡ Credit Reward</p>
                <p className="text-lg font-bold text-primary">{quest.credit_reward} Credits</p>
              </div>
            )}
          </div>
        )}

        {/* Commission Preview for quest with budget */}
        {((quest as any).mission_budget_min || (quest as any).mission_budget_max) && (
          <div className="mb-4">
            <CommissionEstimator
              budgetMin={String((quest as any).mission_budget_min ?? 0)}
              budgetMax={String((quest as any).mission_budget_max ?? (quest as any).mission_budget_min ?? 0)}
              compact
            />
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3 flex-wrap">
          {/* Hosts display */}
          {resolvedHosts && resolvedHosts.length > 0 ? (
            <QuestHostsDisplay hosts={resolvedHosts} />
          ) : (
            guild && <Link to={`/guilds/${guild.id}`} className="hover:text-primary transition-colors">{guild.name}</Link>
          )}
          <span>·</span><span>by <Link to={`/users/${creator?.user_id}`} className="text-primary hover:underline">{creator?.name}</Link></span>
          {creator?.xp != null && <XpLevelBadge level={computeLevelFromXp(creator.xp)} compact />}
          <span>·</span>
          <Badge variant="outline" className="capitalize">{quest.status.toLowerCase().replace("_", " ")}</Badge>
          {quest.price_fiat > 0 && (
            <Badge className="bg-amber-500/10 text-amber-600 border-0"><CreditCard className="h-3 w-3 mr-1" /> Paid — €{(quest.price_fiat / 100).toFixed(2)}</Badge>
          )}
          {quest.monetization_type === "FREE" && quest.price_fiat === 0 && (
            <Badge variant="secondary" className="capitalize">Free</Badge>
          )}
          {quest.is_featured && <Badge className="bg-warning/10 text-warning border-0">Featured</Badge>}
          {(quest as any).is_boosted && <Badge className="bg-orange-500/10 text-orange-600 border-0">🔥 Boosted</Badge>}
        </div>
        {quest.description && (
          <div className="rounded-xl border border-border bg-card/50 p-4 max-w-2xl">
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{quest.description}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {topics.map((t: any) => <Badge key={t.id} variant="secondary">{t.name}</Badge>)}
          {territories.map((t: any) => <Badge key={t.id} variant="outline">{t.name}</Badge>)}
        </div>

        <GuestOnboardingAssistant open={authPromptOpen} onOpenChange={setAuthPromptOpen} actionLabel={authPromptAction} />

        <div className="flex items-center gap-3 mt-4 flex-wrap">
            <Button size="sm" variant={isFollowing ? "outline" : "default"} onClick={() => {
              if (!isLoggedIn) { setAuthPromptAction("follow this quest"); setAuthPromptOpen(true); return; }
              toggleFollow();
            }}><Heart className={`h-4 w-4 mr-1 ${isFollowing ? "fill-current" : ""}`} />{isFollowing ? "Unfollow" : "Follow"}</Button>
            {!isParticipant && (
              <Button size="sm" variant={isPaidQuest ? "default" : "outline"} onClick={() => {
                if (!isLoggedIn) { setAuthPromptAction("join this quest"); setAuthPromptOpen(true); return; }
                joinQuest();
              }}>
                {isPaidQuest ? <><Lock className="h-4 w-4 mr-1" /> Pay & Join — €{(quest.price_fiat / 100).toFixed(2)}</> : <><UserPlus className="h-4 w-4 mr-1" /> Join Quest</>}
              </Button>
            )}
            {isLoggedIn && <ReportButton targetType={ReportTargetType.QUEST} targetId={quest.id} />}
            {canPostUpdate && <InviteLinkButton entityType="quest" entityId={quest.id} entityName={quest.title} />}
            {isOwner && <Button size="sm" variant="outline" onClick={openEditQuest}><Pencil className="h-4 w-4 mr-1" /> Edit Quest</Button>}
            {canPostUpdate && (
              <Dialog open={updateOpen} onOpenChange={(open) => { setUpdateOpen(open); if (!open) { setEditingUpdateId(null); setUTitle(""); setUContent(""); setUType("GENERAL"); setUImageUrl(undefined); setUDraft(false); setUVisibility("PUBLIC"); } }}>
                <DialogTrigger asChild><Button size="sm" variant="outline"><Send className="h-4 w-4 mr-1" /> Post Update</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingUpdateId ? "Edit Quest Update" : "Post Quest Update"}</DialogTitle></DialogHeader>
                  <div className="space-y-4 mt-2">
                    <div><label className="text-sm font-medium mb-1 block">Type</label><Select value={uType} onValueChange={setUType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="GENERAL">General</SelectItem><SelectItem value="MILESTONE">Milestone</SelectItem><SelectItem value="CALL_FOR_HELP">Call for Help</SelectItem><SelectItem value="REFLECTION">Reflection</SelectItem></SelectContent></Select></div>
                    <div><label className="text-sm font-medium mb-1 block">Title</label><Input value={uTitle} onChange={e => setUTitle(e.target.value)} maxLength={120} /></div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-medium">Content</label>
                        <AIWriterButton
                          type="quest_update"
                          context={{ title: quest.title, updateType: uType, updateTitle: uTitle }}
                          currentText={uContent}
                          onAccept={(text, extra) => { setUContent(text); if (extra?.suggestedTitle && !uTitle.trim()) setUTitle(extra.suggestedTitle); }}
                        />
                      </div>
                      <Textarea value={uContent} onChange={e => setUContent(e.target.value)} maxLength={1000} className="resize-none min-h-[100px]" />
                    </div>
                    <ImageUpload label="Image (optional)" currentImageUrl={uImageUrl} onChange={setUImageUrl} aspectRatio="16/9" />
                    <div><label className="text-sm font-medium mb-1 block">Visibility</label>
                      <Select value={uVisibility} onValueChange={setUVisibility}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PUBLIC">Public — anyone can see</SelectItem>
                          <SelectItem value="FOLLOWERS">Followers only</SelectItem>
                          <SelectItem value="INTERNAL">Internal — hosts & members only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between"><label className="text-sm font-medium">Save as draft</label><Switch checked={uDraft} onCheckedChange={setUDraft} /></div>
                    <Button onClick={postUpdate} disabled={!uTitle.trim() || !uContent.trim()} className="w-full"><Send className="h-4 w-4 mr-1" /> {uDraft ? "Save Draft" : editingUpdateId ? "Save Changes" : "Post Update"}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            <Dialog open={podOpen} onOpenChange={setPodOpen}>
              <DialogTrigger asChild><Button size="sm" variant="outline"><CircleDot className="h-4 w-4 mr-1" /> Create Pod</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Pod</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                  <div><label className="text-sm font-medium mb-1 block">Pod name</label><Input value={podName} onChange={e => setPodName(e.target.value)} maxLength={100} /></div>
                  <div><label className="text-sm font-medium mb-1 block">Description</label><Textarea value={podDesc} onChange={e => setPodDesc(e.target.value)} maxLength={500} className="resize-none" /></div>
                  <ImageUpload label="Pod Image (optional)" currentImageUrl={podImageUrl} onChange={setPodImageUrl} aspectRatio="16/9" />
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-sm font-medium mb-1 block">Start date</label><Input type="date" value={podStart} onChange={e => setPodStart(e.target.value)} /></div>
                    <div><label className="text-sm font-medium mb-1 block">End date</label><Input type="date" value={podEnd} onChange={e => setPodEnd(e.target.value)} /></div>
                  </div>
                  <Button onClick={createPod} disabled={!podName.trim()} className="w-full">Create Pod</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit Quest</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div><label className="text-sm font-medium mb-1 block">Title</label><Input value={editTitle} onChange={e => setEditTitle(e.target.value)} maxLength={120} /></div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium">Description</label>
                  <AIWriterButton
                    type="quest_story"
                    context={{ title: editTitle, status: editStatus, creditReward: editCreditReward, creditBudget: editCreditBudget }}
                    currentText={editDesc}
                    onAccept={(text) => setEditDesc(text)}
                  />
                </div>
                <Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} maxLength={500} className="resize-none" />
              </div>
              <ImageUpload label="Cover Image" currentImageUrl={editCoverImageUrl} onChange={setEditCoverImageUrl} aspectRatio="16/9" />
              <AttachmentUpload targetType={AttachmentTargetType.QUEST} targetId={quest.id} />
              <div><label className="text-sm font-medium mb-1 block">Status</label>
                <Select value={editStatus} onValueChange={v => setEditStatus(v as QuestStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={QuestStatus.DRAFT}>Draft</SelectItem>
                    <SelectItem value={QuestStatus.OPEN}>Open</SelectItem>
                    <SelectItem value={QuestStatus.OPEN_FOR_PROPOSALS}>Open for Proposals</SelectItem>
                    <SelectItem value={QuestStatus.ACTIVE}>Active</SelectItem>
                    <SelectItem value={QuestStatus.IN_PROGRESS}>In Progress</SelectItem>
                    <SelectItem value={QuestStatus.COMPLETED}>Completed</SelectItem>
                    <SelectItem value={QuestStatus.CANCELLED}>Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium mb-1 block">Credit Reward</label><Input type="number" value={editCreditReward} onChange={e => setEditCreditReward(e.target.value)} min={0} /></div>
                <div><label className="text-sm font-medium mb-1 block">Fiat Price (€ cents)</label><Input type="number" value={editPriceFiat} onChange={e => setEditPriceFiat(e.target.value)} min={0} /></div>
              </div>
              <div className="rounded-lg border border-border p-3 space-y-3">
                <h4 className="text-sm font-semibold">Budget & Fundraising</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium mb-1 block">Credit Budget</label><Input type="number" value={editCreditBudget} onChange={e => setEditCreditBudget(e.target.value)} min={0} /><p className="text-xs text-muted-foreground mt-1">Credits committed to pot</p></div>
                  <div><label className="text-sm font-medium mb-1 block">Funding Goal</label><Input type="number" value={editFundingGoal} onChange={e => setEditFundingGoal(e.target.value)} min={0} placeholder="Optional" /><p className="text-xs text-muted-foreground mt-1">Target Credits amount</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="editFundraising" checked={editAllowFundraising} onCheckedChange={setEditAllowFundraising} />
                  <label htmlFor="editFundraising" className="text-sm font-medium">Allow community fundraising</label>
                </div>
              </div>
              <Button onClick={saveEditQuest} className="w-full">Save Changes</Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center gap-1">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {isLoggedIn && <TabsTrigger value="proposals">Proposals</TabsTrigger>}
            {isLoggedIn && <TabsTrigger value="subtasks">Subtasks</TabsTrigger>}
            <TabsTrigger value="updates">Updates ({(updates || []).length})</TabsTrigger>
            <TabsTrigger value="discussion">Discussion</TabsTrigger>
            {isLoggedIn && <TabsTrigger value="ai-chat"><Bot className="h-3.5 w-3.5 mr-1" /> Chat & AI</TabsTrigger>}
          </TabsList>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 px-2.5">
                <MoreHorizontal className="h-4 w-4" />
                <span className="ml-1 text-sm">More</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setActiveTab("pods")}>
                <CircleDot className="h-4 w-4 mr-2" /> Pods ({(questPods || []).length})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab("documents")}>
                <FileText className="h-4 w-4 mr-2" /> Documents
              </DropdownMenuItem>
              {isOwner && (
                <>
                  <DropdownMenuItem onClick={() => setActiveTab("matchmaker")}>
                    <Sparkles className="h-4 w-4 mr-2" /> Matchmaker
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("memory")}>
                    <Brain className="h-4 w-4 mr-2" /> Memory
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setActiveTab("fundraising-ai")}>
                    <Coins className="h-4 w-4 mr-2" /> Fundraising AI
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Co-hosts management */}
          {(quest.guild_id || quest.company_id) && resolvedHosts && (
            <QuestCoHostsManager
              questId={quest.id}
              primaryEntityType={quest.guild_id ? "GUILD" : quest.company_id ? "COMPANY" : undefined}
              primaryEntityId={quest.guild_id || quest.company_id || undefined}
              hosts={resolvedHosts}
              canManage={isOwner}
            />
          )}

          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> Participants ({(participants || []).length})</h3>
            {canPostUpdate && (
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline"><UserPlus className="h-4 w-4 mr-1" /> Invite</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Invite a participant</DialogTitle></DialogHeader>
                  <div className="space-y-3 mt-2">
                    <UserSearchInput
                      onSelect={async (user) => {
                        const already = (participants || []).some((p: any) => p.user_id === user.user_id);
                        if (already) { toast({ title: "Already a participant" }); return; }
                        const { error } = await supabase.from("quest_participants").insert({
                          quest_id: quest.id, user_id: user.user_id, role: "COLLABORATOR", status: "ACCEPTED",
                        });
                        if (error) { toast({ title: "Failed to invite", variant: "destructive" }); return; }
                        sendInviteNotification({ invitedUserId: user.user_id, inviterName: currentUser.name, entityType: "quest", entityId: quest.id, entityName: quest.title });
                        setInviteOpen(false);
                        qc.invalidateQueries({ queryKey: ["quest-participants", id] });
                        toast({ title: `${user.display_name || "User"} invited!` });
                      }}
                      placeholder="Search by name…"
                      excludeUserIds={(participants || []).map((p: any) => p.user_id)}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {(participants || []).map((p: any) => (
              <Link key={p.id} to={`/users/${p.user_id}`} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-primary/30 transition-all">
                <Avatar className="h-9 w-9"><AvatarImage src={p.user?.avatar_url} /><AvatarFallback>{p.user?.name?.[0]}</AvatarFallback></Avatar>
                <div><p className="text-sm font-medium">{p.user?.name}</p><div className="flex gap-1.5"><Badge variant="secondary" className="text-[10px] capitalize">{p.role.toLowerCase()}</Badge><Badge variant="outline" className="text-[10px] capitalize">{p.status.toLowerCase()}</Badge></div></div>
              </Link>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="proposals" className="mt-6">
          <QuestProposals
            questId={quest.id}
            questOwnerId={quest.created_by_user_id}
            escrowCredits={(quest as any).escrow_credits ?? 0}
            fundingGoalCredits={(quest as any).funding_goal_credits}
            allowFundraising={(quest as any).allow_fundraising ?? false}
            questStatus={quest.status}
            missionBudgetMin={(quest as any).mission_budget_min}
            missionBudgetMax={(quest as any).mission_budget_max}
            paymentType={(quest as any).payment_type}
          />
        </TabsContent>

        <TabsContent value="subtasks" className="mt-6">
          <QuestSubtasks
            questId={quest.id}
            questOwnerId={quest.created_by_user_id}
            guildId={quest.guild_id}
            canManage={isOwner || isCollaborator}
          />
        </TabsContent>

        <TabsContent value="updates" className="mt-6 space-y-4">
          {canPostUpdate && (
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Share progress, milestones, and calls-to-action with your community.</p>
              <Button size="sm" onClick={() => { setEditingUpdateId(null); setUTitle(""); setUContent(""); setUType("GENERAL"); setUImageUrl(undefined); setUDraft(false); setUVisibility("PUBLIC"); setUpdateOpen(true); }}>
                <Send className="h-4 w-4 mr-1" /> Create Update
              </Button>
            </div>
          )}
          {(updates || []).length === 0 && <div className="text-center py-10"><p className="text-muted-foreground">No updates yet.</p>{canPostUpdate && <p className="text-sm text-muted-foreground mt-1">Share your first progress update.</p>}</div>}
          {(updates || []).map((update: any, i: number) => {
            const Icon = updateIcons[update.type] || MessageCircle;
            const isUpdateAuthor = currentUser.id === update.author_id;
            const canEdit = isUpdateAuthor || isOwner;
            return (
              <motion.div key={update.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`rounded-xl border bg-card p-5 space-y-3 ${update.pinned ? "border-primary/40 bg-primary/5" : "border-border"}`}>
                <div className="flex items-start gap-3">
                  {update.author && (
                    <Link to={`/users/${update.author.user_id}`}>
                      <Avatar className="h-9 w-9"><AvatarImage src={update.author.avatar_url} /><AvatarFallback>{update.author.name?.[0]}</AvatarFallback></Avatar>
                    </Link>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm flex-wrap">
                      {update.author && <Link to={`/users/${update.author.user_id}`} className="font-medium hover:text-primary">{update.author.name}</Link>}
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <Badge variant="secondary" className="text-[10px] capitalize">{update.type.toLowerCase().replace(/_/g, " ")}</Badge>
                      {update.pinned && <Badge className="text-[10px] bg-primary/10 text-primary border-0">📌 Pinned</Badge>}
                      {update.visibility && update.visibility !== "PUBLIC" && (
                        <Badge variant="outline" className="text-[10px] capitalize">{update.visibility === "FOLLOWERS" ? "Followers" : "Internal"}</Badge>
                      )}
                      <span className="text-muted-foreground text-xs">{formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}</span>
                    </div>
                    <h4 className="font-display font-semibold mt-1">{update.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{update.content}</p>
                    {update.image_url && <div className="mt-3 rounded-lg overflow-hidden border border-border max-w-lg"><img src={update.image_url} alt="" className="w-full h-auto" /></div>}
                    <div className="mt-2"><AttachmentList targetType={AttachmentTargetType.QUEST_UPDATE} targetId={update.id} /></div>
                  </div>
                  {canEdit && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditUpdate(update)}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                        {isOwner && <DropdownMenuItem onClick={() => togglePin(update.id, update.pinned)}>{update.pinned ? "Unpin" : "📌 Pin"}</DropdownMenuItem>}
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteUpdate(update.id)}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                {update.comments_enabled !== false && (
                  <div className="ml-12 pt-3 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Comments on this update</p>
                    <CommentThread targetType={CommentTargetType.QUEST_UPDATE} targetId={update.id} />
                  </div>
                )}
              </motion.div>
            );
          })}
        </TabsContent>

        <TabsContent value="pods" className="mt-6 space-y-3">
          {(questPods || []).length === 0 && <p className="text-muted-foreground">No pods yet. Create one above!</p>}
          {(questPods || []).map((pod: any) => {
            const memberCount = (pod.pod_members || []).length;
            return (
              <Link key={pod.id} to={`/pods/${pod.id}`} className="block rounded-lg border border-border bg-card hover:border-primary/30 transition-all overflow-hidden">
                {pod.image_url && <div className="h-28 w-full"><img src={pod.image_url} alt="" className="w-full h-full object-cover" /></div>}
                <div className="p-4">
                  <div className="flex items-center justify-between"><h4 className="font-display font-semibold">{pod.name}</h4><span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> {memberCount}</span></div>
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{pod.description}</p>
                </div>
              </Link>
            );
          })}
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <AttachmentList targetType={AttachmentTargetType.QUEST} targetId={quest.id} />
          {isOwner && <div className="mt-4"><AttachmentUpload targetType={AttachmentTargetType.QUEST} targetId={quest.id} /></div>}
        </TabsContent>

        <TabsContent value="discussion" className="mt-6 space-y-6">
          <FeedSection contextType="QUEST" contextId={quest.id} canPost={isOwner || isParticipant} />
          <CommentThread targetType={CommentTargetType.QUEST} targetId={quest.id} />
        </TabsContent>

        {isOwner && (
          <TabsContent value="matchmaker" className="mt-6">
            <MatchmakerPanel matchType="quest" questId={quest.id} />
          </TabsContent>
        )}

        {isOwner && (
          <TabsContent value="memory" className="mt-6">
            <MemoryEnginePanel entityType="QUEST" entityId={quest.id} entityName={quest.title} guildId={quest.guild_id || undefined} />
          </TabsContent>
        )}

        {isOwner && (
          <TabsContent value="fundraising-ai" className="mt-6">
            <FundraisingAIPanel quest={{
              title: quest.title,
              description: quest.description,
              credit_budget: (quest as any).credit_budget ?? 0,
              credit_reward: quest.credit_reward,
              escrow_credits: (quest as any).escrow_credits ?? 0,
              funding_goal_credits: (quest as any).funding_goal_credits,
              price_fiat: quest.price_fiat,
              price_currency: quest.price_currency || "EUR",
              status: quest.status,
              allow_fundraising: (quest as any).allow_fundraising ?? false,
            }} />
          </TabsContent>
        )}

        <TabsContent value="ai-chat" className="mt-6">
          <UnitChat entityType="QUEST" entityId={quest.id} entityName={quest.title} />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
