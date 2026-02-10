import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Zap, Users, Sparkles, Megaphone, BookOpen, MessageCircle, Trophy, Plus, Heart, CircleDot, Building2, UserPlus, Pencil, Send } from "lucide-react";
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
import { CommentThread } from "@/components/CommentThread";
import { CommentTargetType, QuestUpdateType, QuestStatus, FollowTargetType, PodType, PodMemberRole, QuestParticipantRole, QuestParticipantStatus } from "@/types/enums";
import { useFollow } from "@/hooks/useFollow";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { useXP } from "@/hooks/useXP";
import {
  getQuestById, getTopicsForQuest, getTerritoriesForQuest,
  getParticipantsForQuest, getUpdatesForQuest, getPodsForQuest,
  getUserById, getGuildById, getCompanyById, users, achievements as allAchievements,
  pods as allPods, podMembers as allPodMembers, questParticipants, questUpdates,
  quests as allQuests,
} from "@/data/mock";
import type { Achievement, Pod, QuestUpdate, QuestParticipant } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { isAdmin as checkIsGlobalAdmin } from "@/lib/admin";

const updateIcons: Record<string, typeof Sparkles> = {
  [QuestUpdateType.MILESTONE]: Sparkles,
  [QuestUpdateType.CALL_FOR_HELP]: Megaphone,
  [QuestUpdateType.REFLECTION]: BookOpen,
  [QuestUpdateType.GENERAL]: MessageCircle,
};

export default function QuestDetail() {
  const { id } = useParams<{ id: string }>();
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const { awardXp } = useXP();
  const { isFollowing, toggle: toggleFollow } = useFollow(FollowTargetType.QUEST, id!);
  const [, forceUpdate] = useState(0);
  const rerender = () => forceUpdate(n => n + 1);

  const [achOpen, setAchOpen] = useState(false);
  const [achUserId, setAchUserId] = useState("");
  const [achTitle, setAchTitle] = useState("");
  const [achDesc, setAchDesc] = useState("");
  const [achImageUrl, setAchImageUrl] = useState<string | undefined>();

  const [podOpen, setPodOpen] = useState(false);
  const [podName, setPodName] = useState("");
  const [podDesc, setPodDesc] = useState("");
  const [podStart, setPodStart] = useState("");
  const [podEnd, setPodEnd] = useState("");
  const [podImageUrl, setPodImageUrl] = useState<string | undefined>();

  const [updateOpen, setUpdateOpen] = useState(false);
  const [uTitle, setUTitle] = useState("");
  const [uContent, setUContent] = useState("");
  const [uType, setUType] = useState<QuestUpdateType>(QuestUpdateType.GENERAL);
  const [uImageUrl, setUImageUrl] = useState<string | undefined>();

  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStatus, setEditStatus] = useState<QuestStatus>(QuestStatus.OPEN);
  const [editCoverImageUrl, setEditCoverImageUrl] = useState<string | undefined>();

  const quest = getQuestById(id!);
  if (!quest) return <PageShell><p>Quest not found.</p></PageShell>;

  const guild = getGuildById(quest.guildId);
  const company = quest.companyId ? getCompanyById(quest.companyId) : null;
  const creator = getUserById(quest.createdByUserId);
  const topics = getTopicsForQuest(quest.id);
  const territories = getTerritoriesForQuest(quest.id);
  const participants = getParticipantsForQuest(quest.id);
  const updates = getUpdatesForQuest(quest.id);
  const questPods = getPodsForQuest(quest.id);
  const isOwner = currentUser.id === quest.createdByUserId;
  const isParticipant = questParticipants.some(qp => qp.questId === quest.id && qp.userId === currentUser.id);
  const isCollaborator = questParticipants.some(qp => qp.questId === quest.id && qp.userId === currentUser.id && (qp.role === QuestParticipantRole.OWNER || qp.role === QuestParticipantRole.COLLABORATOR));

  const createAchievement = () => {
    if (!achTitle.trim() || !achUserId) return;
    const ach: Achievement = { id: `a-${Date.now()}`, userId: achUserId, questId: quest.id, title: achTitle.trim(), description: achDesc.trim() || undefined, imageUrl: achImageUrl, createdAt: new Date().toISOString() };
    allAchievements.push(ach); awardXp(achUserId, "ACHIEVEMENT_RECEIVED");
    setAchTitle(""); setAchDesc(""); setAchUserId(""); setAchImageUrl(undefined); setAchOpen(false);
    toast({ title: "Achievement created!" });
  };

  const createPod = () => {
    if (!podName.trim()) return;
    const pod: Pod = { id: `pod-${Date.now()}`, name: podName.trim(), description: podDesc.trim(), imageUrl: podImageUrl, type: PodType.QUEST_POD, questId: quest.id, creatorId: currentUser.id, startDate: podStart || undefined, endDate: podEnd || undefined, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    allPods.push(pod); allPodMembers.push({ id: `pm-${Date.now()}`, podId: pod.id, userId: currentUser.id, role: PodMemberRole.HOST, joinedAt: new Date().toISOString() });
    setPodOpen(false); setPodName(""); setPodDesc(""); setPodStart(""); setPodEnd(""); setPodImageUrl(undefined);
    rerender(); toast({ title: "Pod created!" });
  };

  const postUpdate = () => {
    if (!uTitle.trim() || !uContent.trim()) return;
    const update: QuestUpdate = { id: `qu-${Date.now()}`, questId: quest.id, authorId: currentUser.id, title: uTitle.trim(), content: uContent.trim(), imageUrl: uImageUrl, type: uType, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    questUpdates.push(update);
    setUpdateOpen(false); setUTitle(""); setUContent(""); setUType(QuestUpdateType.GENERAL); setUImageUrl(undefined);
    rerender(); toast({ title: "Update posted!" });
  };

  const joinQuest = () => {
    questParticipants.push({ id: `qp-${Date.now()}`, questId: quest.id, userId: currentUser.id, role: QuestParticipantRole.COLLABORATOR, status: QuestParticipantStatus.ACCEPTED });
    rerender(); toast({ title: "Joined quest!" });
  };

  const openEditQuest = () => { setEditTitle(quest.title); setEditDesc(quest.description || ""); setEditStatus(quest.status); setEditCoverImageUrl(quest.coverImageUrl); setEditOpen(true); };

  const saveEditQuest = () => {
    const q = allQuests.find(q => q.id === quest.id);
    if (q) { q.title = editTitle.trim() || q.title; q.description = editDesc.trim() || undefined; q.status = editStatus; q.coverImageUrl = editCoverImageUrl; }
    setEditOpen(false); rerender(); toast({ title: "Quest updated" });
  };

  return (
    <PageShell>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/explore?tab=quests"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Quests</Link>
      </Button>

      {quest.coverImageUrl && (
        <div className="w-full h-48 md:h-64 rounded-xl overflow-hidden mb-6">
          <img src={quest.coverImageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
          <h1 className="font-display text-3xl font-bold">{quest.title}</h1>
          <span className="flex items-center gap-1.5 text-lg font-bold text-primary"><Zap className="h-5 w-5" /> {quest.rewardXp} XP</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3 flex-wrap">
          <Link to={`/guilds/${guild?.id}`} className="hover:text-primary transition-colors">{guild?.name}</Link>
          <span>·</span><span>by {creator?.name}</span>
          {company && <><span>·</span><Link to={`/companies/${company.id}`} className="flex items-center gap-1 hover:text-primary transition-colors"><Building2 className="h-3.5 w-3.5" /> {company.name}</Link></>}
          <span>·</span>
          <Badge variant="outline" className="capitalize">{quest.status.toLowerCase().replace("_", " ")}</Badge>
          <Badge variant="secondary" className="capitalize">{quest.monetizationType.toLowerCase()}</Badge>
          {quest.isFeatured && <Badge className="bg-warning/10 text-warning border-0">Featured</Badge>}
        </div>
        <p className="text-muted-foreground max-w-2xl">{quest.description}</p>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {topics.map((t) => <Badge key={t.id} variant="secondary">{t.name}</Badge>)}
          {territories.map((t) => <Badge key={t.id} variant="outline">{t.name}</Badge>)}
        </div>

        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <Button size="sm" variant={isFollowing ? "outline" : "default"} onClick={toggleFollow}><Heart className={`h-4 w-4 mr-1 ${isFollowing ? "fill-current" : ""}`} />{isFollowing ? "Unfollow" : "Follow"}</Button>
          {!isParticipant && <Button size="sm" variant="outline" onClick={joinQuest}><UserPlus className="h-4 w-4 mr-1" /> Join Quest</Button>}
          {isOwner && (
            <>
              <Button size="sm" variant="outline" onClick={openEditQuest}><Pencil className="h-4 w-4 mr-1" /> Edit Quest</Button>
              <Dialog open={achOpen} onOpenChange={setAchOpen}>
                <DialogTrigger asChild><Button size="sm" variant="outline"><Trophy className="h-4 w-4 mr-1" /> Award Achievement</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Award Achievement</DialogTitle></DialogHeader>
                  <div className="space-y-4 mt-2">
                    <div><label className="text-sm font-medium mb-1 block">Award to</label><Select value={achUserId} onValueChange={setAchUserId}><SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger><SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select></div>
                    <div><label className="text-sm font-medium mb-1 block">Title</label><Input value={achTitle} onChange={e => setAchTitle(e.target.value)} placeholder="e.g. Data Pipeline Hero" maxLength={100} /></div>
                    <div><label className="text-sm font-medium mb-1 block">Description</label><Textarea value={achDesc} onChange={e => setAchDesc(e.target.value)} maxLength={300} className="resize-none" /></div>
                    <ImageUpload label="Badge Image (optional)" currentImageUrl={achImageUrl} onChange={setAchImageUrl} aspectRatio="1/1" description="Square badge icon" />
                    <Button onClick={createAchievement} disabled={!achTitle.trim() || !achUserId} className="w-full"><Trophy className="h-4 w-4 mr-1" /> Award</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
          {isCollaborator && (
            <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
              <DialogTrigger asChild><Button size="sm" variant="outline"><Send className="h-4 w-4 mr-1" /> Post Update</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Post Quest Update</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                  <div><label className="text-sm font-medium mb-1 block">Type</label><Select value={uType} onValueChange={v => setUType(v as QuestUpdateType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={QuestUpdateType.GENERAL}>General</SelectItem><SelectItem value={QuestUpdateType.MILESTONE}>Milestone</SelectItem><SelectItem value={QuestUpdateType.CALL_FOR_HELP}>Call for Help</SelectItem><SelectItem value={QuestUpdateType.REFLECTION}>Reflection</SelectItem></SelectContent></Select></div>
                  <div><label className="text-sm font-medium mb-1 block">Title</label><Input value={uTitle} onChange={e => setUTitle(e.target.value)} maxLength={120} /></div>
                  <div><label className="text-sm font-medium mb-1 block">Content</label><Textarea value={uContent} onChange={e => setUContent(e.target.value)} maxLength={1000} className="resize-none min-h-[100px]" /></div>
                  <ImageUpload label="Image (optional)" currentImageUrl={uImageUrl} onChange={setUImageUrl} aspectRatio="16/9" description="Attach a screenshot or photo" />
                  <Button onClick={postUpdate} disabled={!uTitle.trim() || !uContent.trim()} className="w-full"><Send className="h-4 w-4 mr-1" /> Post Update</Button>
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
              <div><label className="text-sm font-medium mb-1 block">Status</label><Select value={editStatus} onValueChange={v => setEditStatus(v as QuestStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={QuestStatus.OPEN}>Open</SelectItem><SelectItem value={QuestStatus.IN_PROGRESS}>In Progress</SelectItem><SelectItem value={QuestStatus.COMPLETED}>Completed</SelectItem></SelectContent></Select></div>
              <Button onClick={saveEditQuest} className="w-full">Save Changes</Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="updates">Updates ({updates.length})</TabsTrigger>
          <TabsTrigger value="pods"><CircleDot className="h-3.5 w-3.5 mr-1" /> Pods ({questPods.length})</TabsTrigger>
          <TabsTrigger value="discussion">Discussion</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <h3 className="font-display font-semibold mb-3 flex items-center gap-2"><Users className="h-4 w-4" /> Participants ({participants.length})</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {participants.map((p) => (
              <Link key={p.id} to={`/users/${p.userId}`} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-primary/30 transition-all">
                <Avatar className="h-9 w-9"><AvatarImage src={p.user?.avatarUrl} /><AvatarFallback>{p.user?.name?.[0]}</AvatarFallback></Avatar>
                <div><p className="text-sm font-medium">{p.user?.name}</p><div className="flex gap-1.5"><Badge variant="secondary" className="text-[10px] capitalize">{p.role.toLowerCase()}</Badge><Badge variant="outline" className="text-[10px] capitalize">{p.status.toLowerCase()}</Badge></div></div>
              </Link>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="updates" className="mt-6 space-y-4">
          {updates.length === 0 && <p className="text-muted-foreground">No updates yet.</p>}
          {updates.map((update, i) => {
            const author = getUserById(update.authorId);
            const Icon = updateIcons[update.type] || MessageCircle;
            return (
              <motion.div key={update.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <Avatar className="h-9 w-9"><AvatarImage src={author?.avatarUrl} /><AvatarFallback>{author?.name?.[0]}</AvatarFallback></Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{author?.name}</span><Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <Badge variant="secondary" className="text-[10px] capitalize">{update.type.toLowerCase().replace(/_/g, " ")}</Badge>
                      <span className="text-muted-foreground text-xs">{formatDistanceToNow(new Date(update.createdAt), { addSuffix: true })}</span>
                    </div>
                    <h4 className="font-display font-semibold mt-1">{update.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{update.content}</p>
                    {update.imageUrl && <div className="mt-3 rounded-lg overflow-hidden border border-border max-w-lg"><img src={update.imageUrl} alt="" className="w-full h-auto" /></div>}
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
          {questPods.length === 0 && <p className="text-muted-foreground">No pods yet. Create one above!</p>}
          {questPods.map((pod) => {
            const memberCount = allPodMembers.filter((pm) => pm.podId === pod.id).length;
            return (
              <Link key={pod.id} to={`/pods/${pod.id}`} className="block rounded-lg border border-border bg-card hover:border-primary/30 transition-all overflow-hidden">
                {pod.imageUrl && <div className="h-28 w-full"><img src={pod.imageUrl} alt="" className="w-full h-full object-cover" /></div>}
                <div className="p-4">
                  <div className="flex items-center justify-between"><h4 className="font-display font-semibold">{pod.name}</h4><span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> {memberCount}</span></div>
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{pod.description}</p>
                </div>
              </Link>
            );
          })}
        </TabsContent>

        <TabsContent value="discussion" className="mt-6">
          <CommentThread targetType={CommentTargetType.QUEST} targetId={quest.id} />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
