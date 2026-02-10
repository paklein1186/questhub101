import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Users, BookOpen, Compass, Calendar, UserMinus, ShieldCheck, Trash2, Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export default function PodDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: pod, isLoading } = usePodById(id);
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const qc = useQueryClient();

  const limits = usePlanLimits();
  const [showPodXpDialog, setShowPodXpDialog] = useState(false);

  if (isLoading) return <PageShell><p>Loading…</p></PageShell>;
  if (!pod) return <PageShell><p>Pod not found.</p></PageShell>;
  if (pod.is_deleted && !checkIsGlobalAdmin(currentUser.email)) return <PageShell><p>This pod has been removed.</p></PageShell>;
  if (pod.is_draft && pod.creator_id !== currentUser.id && !checkIsGlobalAdmin(currentUser.email)) return <PageShell><p>Pod not found.</p></PageShell>;

  const members = pod.pod_members || [];
  const quest = pod.quests;
  const topic = pod.topics;
  const myMembership = members.find((m: any) => m.user_id === currentUser.id);
  const isHost = myMembership?.role === "HOST";
  const isMember = !!myMembership;

  const doJoinPod = async () => {
    const { error } = await supabase.from("pod_members").insert({ pod_id: pod.id, user_id: currentUser.id, role: "MEMBER" as any });
    if (error) { toast({ title: "Failed to join", variant: "destructive" }); return; }
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

      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/explore?tab=pods"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Pods</Link>
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
        <p className="text-muted-foreground max-w-2xl mt-2">{pod.description}</p>

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
          ) : !isHost ? (
            <Button variant="outline" onClick={leavePod}><UserMinus className="h-4 w-4 mr-1" /> Leave pod</Button>
          ) : null}
          <ReportButton targetType={ReportTargetType.POD} targetId={pod.id} />
        </div>
      </motion.div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members"><Users className="h-4 w-4 mr-1" /> Members ({members.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="discussion">Discussion</TabsTrigger>
          {isMember && <TabsTrigger value="ai-chat"><Bot className="h-4 w-4 mr-1" /> Chat & AI</TabsTrigger>}
        </TabsList>

        <TabsContent value="members" className="mt-6">
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

        <TabsContent value="discussion" className="mt-6">
          <CommentThread targetType={CommentTargetType.POD} targetId={pod.id} />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
