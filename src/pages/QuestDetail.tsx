import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Zap, Users, Sparkles, Megaphone, BookOpen, MessageCircle, Trophy, Plus, Heart, CircleDot, Building2, UserPlus, Pencil, Send, Coins, CreditCard, Lock } from "lucide-react";
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
import { computeLevelFromXp } from "@/lib/xpCreditsConfig";

const updateIcons: Record<string, typeof Sparkles> = {
  MILESTONE: Sparkles,
  CALL_FOR_HELP: Megaphone,
  REFLECTION: BookOpen,
  GENERAL: MessageCircle,
};

export default function QuestDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: quest, isLoading } = useQuestById(id);
  const { data: participants } = useQuestParticipants(id);
  const { data: updates } = useQuestUpdates(id);
  const { data: questPods } = usePodsForQuest(id);
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { isFollowing, toggle: toggleFollow } = useFollow(FollowTargetType.QUEST, id!);

  const { data: creator } = usePublicProfile(quest?.created_by_user_id);

  const [updateOpen, setUpdateOpen] = useState(false);
  const [uTitle, setUTitle] = useState("");
  const [uContent, setUContent] = useState("");
  const [uType, setUType] = useState("GENERAL");
  const [uImageUrl, setUImageUrl] = useState<string | undefined>();
  const [uDraft, setUDraft] = useState(false);

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

  if (isLoading) return <PageShell><p>Loading…</p></PageShell>;
  if (!quest) return <PageShell><p>Quest not found.</p></PageShell>;
  if (quest.is_deleted && !checkIsGlobalAdmin(currentUser.email)) return <PageShell><p>This quest has been removed.</p></PageShell>;
  if (quest.is_draft && quest.created_by_user_id !== currentUser.id && !checkIsGlobalAdmin(currentUser.email)) return <PageShell><p>Quest not found.</p></PageShell>;

  const guild = quest.guilds;
  const topics = (quest.quest_topics || []).map((qt: any) => qt.topics).filter(Boolean);
  const territories = (quest.quest_territories || []).map((qt: any) => qt.territories).filter(Boolean);
  const isOwner = currentUser.id === quest.created_by_user_id;
  const isParticipant = (participants || []).some((qp: any) => qp.user_id === currentUser.id);
  const isCollaborator = (participants || []).some((qp: any) => qp.user_id === currentUser.id && (qp.role === "OWNER" || qp.role === "COLLABORATOR"));

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
    await supabase.from("quest_updates").insert({ quest_id: quest.id, author_id: currentUser.id, title: uTitle.trim(), content: uContent.trim(), image_url: uImageUrl || null, type: uType, is_draft: uDraft });
    qc.invalidateQueries({ queryKey: ["quest-updates", id] });
    setUpdateOpen(false); setUTitle(""); setUContent(""); setUType("GENERAL"); setUImageUrl(undefined); setUDraft(false);
    toast({ title: uDraft ? "Draft saved!" : "Update posted!" });
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

  const openEditQuest = () => { setEditTitle(quest.title); setEditDesc(quest.description || ""); setEditStatus(quest.status as QuestStatus); setEditCoverImageUrl(quest.cover_image_url ?? undefined); setEditOpen(true); };

  const saveEditQuest = async () => {
    await supabase.from("quests").update({ title: editTitle.trim() || quest.title, description: editDesc.trim() || null, status: editStatus as any, cover_image_url: editCoverImageUrl || null }).eq("id", quest.id);
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
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3 flex-wrap">
          {guild && <Link to={`/guilds/${guild.id}`} className="hover:text-primary transition-colors">{guild.name}</Link>}
          <span>·</span><span>by <Link to={`/users/${creator?.user_id}`} className="text-primary hover:underline">{creator?.name}</Link></span>
          {creator?.xp != null && <XpLevelBadge level={computeLevelFromXp(creator.xp)} compact />}
          <span>·</span>
          <Badge variant="outline" className="capitalize">{quest.status.toLowerCase().replace("_", " ")}</Badge>
          {quest.price_fiat > 0 && (
            <Badge className="bg-amber-500/10 text-amber-600 border-0"><CreditCard className="h-3 w-3 mr-1" /> Paid Quest — €{(quest.price_fiat / 100).toFixed(2)}</Badge>
          )}
          {quest.credit_reward > 0 && (
            <Badge className="bg-emerald-500/10 text-emerald-600 border-0"><Coins className="h-3 w-3 mr-1" /> Reward: {quest.credit_reward} Credits</Badge>
          )}
          {quest.monetization_type === "FREE" && quest.price_fiat === 0 && (
            <Badge variant="secondary" className="capitalize">Free</Badge>
          )}
          {quest.is_featured && <Badge className="bg-warning/10 text-warning border-0">Featured</Badge>}
        </div>
        <p className="text-muted-foreground max-w-2xl">{quest.description}</p>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {topics.map((t: any) => <Badge key={t.id} variant="secondary">{t.name}</Badge>)}
          {territories.map((t: any) => <Badge key={t.id} variant="outline">{t.name}</Badge>)}
        </div>

        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <Button size="sm" variant={isFollowing ? "outline" : "default"} onClick={toggleFollow}><Heart className={`h-4 w-4 mr-1 ${isFollowing ? "fill-current" : ""}`} />{isFollowing ? "Unfollow" : "Follow"}</Button>
          {!isParticipant && <Button size="sm" variant="outline" onClick={joinQuest}><UserPlus className="h-4 w-4 mr-1" /> Join Quest</Button>}
          <ReportButton targetType={ReportTargetType.QUEST} targetId={quest.id} />
          {isOwner && <Button size="sm" variant="outline" onClick={openEditQuest}><Pencil className="h-4 w-4 mr-1" /> Edit Quest</Button>}
          {isCollaborator && (
            <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
              <DialogTrigger asChild><Button size="sm" variant="outline"><Send className="h-4 w-4 mr-1" /> Post Update</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Post Quest Update</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                  <div><label className="text-sm font-medium mb-1 block">Type</label><Select value={uType} onValueChange={setUType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="GENERAL">General</SelectItem><SelectItem value="MILESTONE">Milestone</SelectItem><SelectItem value="CALL_FOR_HELP">Call for Help</SelectItem><SelectItem value="REFLECTION">Reflection</SelectItem></SelectContent></Select></div>
                  <div><label className="text-sm font-medium mb-1 block">Title</label><Input value={uTitle} onChange={e => setUTitle(e.target.value)} maxLength={120} /></div>
                  <div><label className="text-sm font-medium mb-1 block">Content</label><Textarea value={uContent} onChange={e => setUContent(e.target.value)} maxLength={1000} className="resize-none min-h-[100px]" /></div>
                  <ImageUpload label="Image (optional)" currentImageUrl={uImageUrl} onChange={setUImageUrl} aspectRatio="16/9" />
                  <div className="flex items-center justify-between"><label className="text-sm font-medium">Save as draft</label><Switch checked={uDraft} onCheckedChange={setUDraft} /></div>
                  <Button onClick={postUpdate} disabled={!uTitle.trim() || !uContent.trim()} className="w-full"><Send className="h-4 w-4 mr-1" /> {uDraft ? "Save Draft" : "Post Update"}</Button>
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
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Quest</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div><label className="text-sm font-medium mb-1 block">Title</label><Input value={editTitle} onChange={e => setEditTitle(e.target.value)} maxLength={120} /></div>
              <div><label className="text-sm font-medium mb-1 block">Description</label><Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} maxLength={500} className="resize-none" /></div>
              <ImageUpload label="Cover Image" currentImageUrl={editCoverImageUrl} onChange={setEditCoverImageUrl} aspectRatio="16/9" />
              <AttachmentUpload targetType={AttachmentTargetType.QUEST} targetId={quest.id} />
              <div><label className="text-sm font-medium mb-1 block">Status</label><Select value={editStatus} onValueChange={v => setEditStatus(v as QuestStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={QuestStatus.OPEN}>Open</SelectItem><SelectItem value={QuestStatus.IN_PROGRESS}>In Progress</SelectItem><SelectItem value={QuestStatus.COMPLETED}>Completed</SelectItem></SelectContent></Select></div>
              <Button onClick={saveEditQuest} className="w-full">Save Changes</Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="updates">Updates ({(updates || []).length})</TabsTrigger>
          <TabsTrigger value="pods"><CircleDot className="h-3.5 w-3.5 mr-1" /> Pods ({(questPods || []).length})</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="discussion">Discussion</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><Users className="h-4 w-4" /> Participants ({(participants || []).length})</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {(participants || []).map((p: any) => (
              <Link key={p.id} to={`/users/${p.user_id}`} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-primary/30 transition-all">
                <Avatar className="h-9 w-9"><AvatarImage src={p.user?.avatar_url} /><AvatarFallback>{p.user?.name?.[0]}</AvatarFallback></Avatar>
                <div><p className="text-sm font-medium">{p.user?.name}</p><div className="flex gap-1.5"><Badge variant="secondary" className="text-[10px] capitalize">{p.role.toLowerCase()}</Badge><Badge variant="outline" className="text-[10px] capitalize">{p.status.toLowerCase()}</Badge></div></div>
              </Link>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="updates" className="mt-6 space-y-4">
          {(updates || []).length === 0 && <p className="text-muted-foreground">No updates yet.</p>}
          {(updates || []).map((update: any, i: number) => {
            const Icon = updateIcons[update.type] || MessageCircle;
            return (
              <motion.div key={update.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <Badge variant="secondary" className="text-[10px] capitalize">{update.type.toLowerCase().replace(/_/g, " ")}</Badge>
                      <span className="text-muted-foreground text-xs">{formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}</span>
                    </div>
                    <h4 className="font-display font-semibold mt-1">{update.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{update.content}</p>
                    {update.image_url && <div className="mt-3 rounded-lg overflow-hidden border border-border max-w-lg"><img src={update.image_url} alt="" className="w-full h-auto" /></div>}
                    <div className="mt-2"><AttachmentList targetType={AttachmentTargetType.QUEST_UPDATE} targetId={update.id} /></div>
                  </div>
                </div>
                <div className="ml-12 pt-3 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Comments on this update</p>
                  <CommentThread targetType={CommentTargetType.QUEST_UPDATE} targetId={update.id} />
                </div>
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

        <TabsContent value="discussion" className="mt-6">
          <CommentThread targetType={CommentTargetType.QUEST} targetId={quest.id} />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
