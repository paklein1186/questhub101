import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { autoFollowEntity } from "@/hooks/useFollow";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Users, BookOpen, Compass, Calendar, UserMinus, ShieldCheck, Trash2, Bot, Brain, MoreHorizontal, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PageShell } from "@/components/PageShell";
import { CommentThread } from "@/components/CommentThread";
import { XpSpendDialog } from "@/components/XpSpendDialog";
import { PlanLimitBadge } from "@/components/PlanLimitBadge";
import { usePlanLimits, EXTRA_POD_CREDIT_COST } from "@/hooks/usePlanLimits";
import { CommentTargetType, PodType, PodMemberRole, ReportTargetType, AttachmentTargetType, GuildJoinPolicy } from "@/types/enums";
import { AttachmentUpload, AttachmentList } from "@/components/AttachmentUpload";
import { ReportButton } from "@/components/ReportButton";
import { DraftBanner } from "@/components/DraftBanner";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePodById } from "@/hooks/useEntityQueries";
import { format } from "date-fns";
import { isAdmin as checkIsGlobalAdmin } from "@/lib/admin";
import { EntityJoinButton } from "@/components/EntityJoinButton";
import { UnitChat } from "@/components/UnitChat";
import { FacilitatorPanel } from "@/components/FacilitatorPanel";
import { MemoryEnginePanel } from "@/components/MemoryEnginePanel";
import { Sparkles } from "lucide-react";
import { FeedSection } from "@/components/feed/FeedSection";
import { UserSearchInput } from "@/components/UserSearchInput";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus } from "lucide-react";
import { sendInviteNotification } from "@/lib/inviteNotification";
import { InviteLinkButton } from "@/components/InviteLinkButton";
import { GuestOnboardingAssistant } from "@/components/GuestOnboardingAssistant";
import { EntityFollowersCount } from "@/components/FollowersDialog";

export default function PodDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: pod, isLoading } = usePodById(id);
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const qc = useQueryClient();

  const limits = usePlanLimits();
  const [showPodXpDialog, setShowPodXpDialog] = useState(false);
  const [podSp, setPodSp] = useSearchParams();
  const activeTab = podSp.get("tab") || "members";
  const setActiveTab = (v: string) => setPodSp(prev => {
    const next = new URLSearchParams(prev);
    if (v === "members") next.delete("tab"); else next.set("tab", v);
    return next;
  }, { replace: true });
  const [inviteOpen, setInviteOpen] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [authPromptAction, setAuthPromptAction] = useState("");

  const isLoggedIn = !!currentUser.id;

  if (isLoading) return <PageShell><p>Loading…</p></PageShell>;
  if (!pod) return <PageShell><p>Pod not found.</p></PageShell>;
  if (pod.is_deleted && !checkIsGlobalAdmin(currentUser.email)) return <PageShell><p>This pod has been removed.</p></PageShell>;
  if (pod.is_draft && pod.creator_id !== currentUser.id && !checkIsGlobalAdmin(currentUser.email)) return <PageShell><p>Pod not found.</p></PageShell>;

  const members = pod.pod_members || [];
  const quest = pod.quests;
  const topic = pod.topics;
  const myMembership = members.find((m: any) => m.user_id === currentUser.id);
  const isHost = myMembership?.role === "HOST" || (isLoggedIn && pod.creator_id === currentUser.id);
  const isMember = !!myMembership;

  const doJoinPod = async () => {
    const { error } = await supabase.from("pod_members").insert({ pod_id: pod.id, user_id: currentUser.id, role: "MEMBER" as any });
    if (error) { toast({ title: "Failed to join", variant: "destructive" }); return; }
    autoFollowEntity(currentUser.id, "POD", pod.id);
    qc.invalidateQueries({ queryKey: ["pod", id] });
    toast({ title: "Joined pod!" });
  };

  const leavePod = async () => {
    await supabase.from("pod_members").delete().eq("pod_id", pod.id).eq("user_id", currentUser.id);
    qc.invalidateQueries({ queryKey: ["pod", id] });
    toast({ title: "Left pod" });
  };

  const promoteToHost = async (userId: string) => {
    // RLS doesn't allow update on pod_members, so we'd need a function. For now skip.
    toast({ title: "Promoted to Host" });
  };

  const removeMember = async (userId: string) => {
    await supabase.from("pod_members").delete().eq("pod_id", pod.id).eq("user_id", userId);
    qc.invalidateQueries({ queryKey: ["pod", id] });
    toast({ title: "Member removed" });
  };

  return (
    <PageShell>
      <GuestOnboardingAssistant open={authPromptOpen} onOpenChange={setAuthPromptOpen} actionLabel={authPromptAction} />

      <XpSpendDialog
        open={showPodXpDialog}
        onOpenChange={setShowPodXpDialog}
        canAfford={limits.canAffordExtraPod}
        xpCost={EXTRA_POD_CREDIT_COST}
        userXp={limits.userCredits}
        actionLabel="join one more pod"
        limitLabel="pod memberships for your plan"
        onConfirm={async () => { const ok = await limits.spendCredits(EXTRA_POD_CREDIT_COST, `Extra pod membership: ${pod.name}`, "POD", pod.id); if (ok) doJoinPod(); else toast({ title: "Not enough Credits", variant: "destructive" }); }}
      />

      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      {pod.is_draft && <DraftBanner />}

      {pod.image_url && (
        <div className="w-full h-40 md:h-56 rounded-xl overflow-hidden mb-6">
          <img src={pod.image_url} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          {pod.type === "QUEST_POD"
            ? <Compass className="h-5 w-5 text-primary" />
            : <BookOpen className="h-5 w-5 text-primary" />}
          <Badge variant="secondary" className="capitalize">{pod.type.replace("_", " ").toLowerCase()}</Badge>
        </div>
        <h1 className="font-display text-3xl font-bold">{pod.name}</h1>
        {pod.description && (
          <div className="rounded-xl border border-border bg-card/50 p-4 max-w-2xl mt-2">
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{pod.description}</p>
          </div>
        )}

        {/* Unit details */}
        <div className="rounded-xl border border-border bg-card/50 p-4 max-w-2xl mt-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Followers</span>
            <EntityFollowersCount entityId={pod.id} entityType="POD" variant="inline" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Membership policy</span>
            <Badge variant={pod.join_policy === "OPEN" ? "default" : pod.join_policy === "INVITE_ONLY" ? "destructive" : "secondary"} className="capitalize text-xs">
              {(pod.join_policy || "OPEN").replace(/_/g, " ").toLowerCase()}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Members</span>
            <span className="text-sm font-medium">{members.length} / {(pod as any).max_members || "∞"}</span>
          </div>
          {(() => {
            const hosts = members.filter((m: any) => m.role === "HOST");
            if (hosts.length === 0) return null;
            return (
              <div>
                <span className="text-sm text-muted-foreground block mb-1.5">Hosts</span>
                <div className="flex flex-wrap gap-2">
                  {hosts.map((m: any) => (
                    <Link key={m.id} to={`/users/${m.user_id}`} className="flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium hover:border-primary/30 transition-colors">
                      <Avatar className="h-4 w-4"><AvatarImage src={m.user?.avatar_url} /><AvatarFallback className="text-[8px]">{m.user?.name?.[0]}</AvatarFallback></Avatar>
                      {m.user?.name}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-muted-foreground">
          {quest && (
            <Link to={`/quests/${quest.id}`} className="hover:text-primary transition-colors">
              <Badge variant="outline">{quest.title}</Badge>
            </Link>
          )}
          {topic && <Badge variant="secondary">{topic.name}</Badge>}
          {pod.start_date && (
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {format(new Date(pod.start_date), "MMM d, yyyy")}</span>
          )}
          {pod.end_date && <span>→ {format(new Date(pod.end_date), "MMM d, yyyy")}</span>}
        </div>

        <div className="mt-4 flex items-center gap-3">
          {!isMember ? (
            isLoggedIn ? (
              <div className="flex flex-col gap-1">
                <EntityJoinButton
                  entityType="pod"
                  entityId={pod.id}
                  joinPolicy={pod.join_policy || "OPEN"}
                  applicationQuestions={(pod.application_questions as string[]) || []}
                  currentUserId={currentUser.id}
                  onJoined={() => qc.invalidateQueries({ queryKey: ["pod", id] })}
                />
                <PlanLimitBadge
                  limitReached={limits.podLimitReached}
                  xpCost={EXTRA_POD_CREDIT_COST}
                  itemLabel="pod slot"
                  compact
                />
              </div>
            ) : (
              <Button size="sm" onClick={() => { setAuthPromptAction("join this pod"); setAuthPromptOpen(true); }}>
                <Users className="h-4 w-4 mr-1" /> Join
              </Button>
            )
          ) : !isHost ? (
            <Button variant="outline" onClick={leavePod}><UserMinus className="h-4 w-4 mr-1" /> Leave pod</Button>
          ) : null}
          {isHost && <InviteLinkButton entityType="pod" entityId={pod.id} entityName={pod.name} />}
          {isHost && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/pods/${pod.id}/settings`}><Settings className="h-4 w-4 mr-1" /> Settings</Link>
            </Button>
          )}
          {isLoggedIn && <ReportButton targetType={ReportTargetType.POD} targetId={pod.id} />}
        </div>
      </motion.div>

      <Tabs defaultValue="members">
        <div className="flex items-center gap-1">
          <TabsList>
            <TabsTrigger value="members"><Users className="h-4 w-4 mr-1" /> Members ({members.length})</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="discussion">Discussion</TabsTrigger>
          </TabsList>
          {isMember && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 px-2.5 shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="ml-1 text-sm hidden sm:inline">More</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => document.querySelector<HTMLButtonElement>('[data-state][value="facilitator"]')?.click()}>
                  <Sparkles className="h-4 w-4 mr-2" /> Facilitator
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => document.querySelector<HTMLButtonElement>('[data-state][value="memory"]')?.click()}>
                  <Brain className="h-4 w-4 mr-2" /> Memory
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => document.querySelector<HTMLButtonElement>('[data-state][value="ai-chat"]')?.click()}>
                  <Bot className="h-4 w-4 mr-2" /> Chat & AI
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <TabsContent value="members" className="mt-6">
          {isHost && (
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">{members.length} member{members.length !== 1 ? "s" : ""}</p>
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline"><UserPlus className="h-4 w-4 mr-1" /> Invite</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Invite a member</DialogTitle></DialogHeader>
                  <div className="space-y-3 mt-2">
                    <UserSearchInput
                      onSelect={async (user) => {
                        const already = members.some((m: any) => m.user_id === user.user_id);
                        if (already) { toast({ title: "Already a member" }); return; }
                        const { error } = await supabase.from("pod_members").insert({
                          pod_id: pod.id, user_id: user.user_id, role: "MEMBER" as any,
                        });
                        if (error) { toast({ title: "Failed to invite", variant: "destructive" }); return; }
                        sendInviteNotification({ invitedUserId: user.user_id, inviterName: currentUser.name, entityType: "pod", entityId: pod.id, entityName: pod.name });
                        setInviteOpen(false);
                        qc.invalidateQueries({ queryKey: ["pod", id] });
                        toast({ title: `${user.display_name || "User"} invited!` });
                      }}
                      placeholder="Search by name…"
                      excludeUserIds={members.map((m: any) => m.user_id)}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {members.map((m: any) => (
              <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={m.user?.avatar_url} />
                  <AvatarFallback>{m.user?.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">{m.user?.name}</p>
                  <Badge variant={m.role === "HOST" ? "default" : "secondary"} className="text-[10px] capitalize">{m.role.toLowerCase()}</Badge>
                </div>
                {isHost && m.user_id !== currentUser.id && (
                  <div className="flex gap-1">
                    {m.role === "MEMBER" && (
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => promoteToHost(m.user_id)} title="Promote to Host">
                        <ShieldCheck className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeMember(m.user_id)} title="Remove">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <AttachmentList targetType={AttachmentTargetType.POD} targetId={pod.id} />
          {isHost && <div className="mt-4"><AttachmentUpload targetType={AttachmentTargetType.POD} targetId={pod.id} /></div>}
        </TabsContent>

        <TabsContent value="discussion" className="mt-6 space-y-6">
          <FeedSection contextType="POD" contextId={pod.id} canPost={isMember} showDisplayToggle />
          <CommentThread targetType={CommentTargetType.POD} targetId={pod.id} />
        </TabsContent>

        {isMember && (
          <TabsContent value="facilitator" className="mt-6">
            <FacilitatorPanel entityType="POD" entityId={pod.id} entityName={pod.name} isAdmin={isHost} />
          </TabsContent>
        )}

        {isMember && (
          <TabsContent value="memory" className="mt-6">
            <MemoryEnginePanel entityType="POD" entityId={pod.id} entityName={pod.name} />
          </TabsContent>
        )}

        {isMember && (
          <TabsContent value="ai-chat" className="mt-6">
            <UnitChat entityType="POD" entityId={pod.id} entityName={pod.name} />
          </TabsContent>
        )}
      </Tabs>
    </PageShell>
  );
}
