import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Users, BookOpen, Compass, Calendar, UserPlus, UserMinus, ShieldCheck, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageShell } from "@/components/PageShell";
import { CommentThread } from "@/components/CommentThread";
import { CommentTargetType, PodType, PodMemberRole } from "@/types/enums";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import {
  getPodById, getMembersForPod, getQuestById, getTopicById, podMembers,
} from "@/data/mock";
import type { PodMember } from "@/types";
import { format } from "date-fns";

export default function PodDetail() {
  const { id } = useParams<{ id: string }>();
  const pod = getPodById(id!);
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const [, forceUpdate] = useState(0);
  const rerender = () => forceUpdate((n) => n + 1);

  if (!pod) return <PageShell><p>Pod not found.</p></PageShell>;

  const members = getMembersForPod(pod.id);
  const quest = pod.questId ? getQuestById(pod.questId) : null;
  const topic = pod.topicId ? getTopicById(pod.topicId) : null;
  const myMembership = members.find((m) => m.userId === currentUser.id);
  const isHost = myMembership?.role === PodMemberRole.HOST;
  const isMember = !!myMembership;

  const joinPod = () => {
    podMembers.push({ id: `pm-${Date.now()}`, podId: pod.id, userId: currentUser.id, role: PodMemberRole.MEMBER, joinedAt: new Date().toISOString() });
    rerender();
    toast({ title: "Joined pod!" });
  };

  const leavePod = () => {
    const idx = podMembers.findIndex((pm) => pm.podId === pod.id && pm.userId === currentUser.id);
    if (idx !== -1) podMembers.splice(idx, 1);
    rerender();
    toast({ title: "Left pod" });
  };

  const promoteToHost = (userId: string) => {
    const pm = podMembers.find((m) => m.podId === pod.id && m.userId === userId);
    if (pm) pm.role = PodMemberRole.HOST;
    rerender();
    toast({ title: "Promoted to Host" });
  };

  const removeMember = (userId: string) => {
    const idx = podMembers.findIndex((m) => m.podId === pod.id && m.userId === userId);
    if (idx !== -1) podMembers.splice(idx, 1);
    rerender();
    toast({ title: "Member removed" });
  };

  return (
    <PageShell>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/pods"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Pods</Link>
      </Button>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          {pod.type === PodType.QUEST_POD
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
          {pod.startDate && (
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {format(new Date(pod.startDate), "MMM d, yyyy")}</span>
          )}
          {pod.endDate && <span>→ {format(new Date(pod.endDate), "MMM d, yyyy")}</span>}
        </div>

        <div className="mt-4">
          {!isMember ? (
            <Button onClick={joinPod}><UserPlus className="h-4 w-4 mr-1" /> Join pod</Button>
          ) : !isHost ? (
            <Button variant="outline" onClick={leavePod}><UserMinus className="h-4 w-4 mr-1" /> Leave pod</Button>
          ) : null}
        </div>
      </motion.div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members"><Users className="h-4 w-4 mr-1" /> Members ({members.length})</TabsTrigger>
          <TabsTrigger value="discussion">Discussion</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-6">
          <div className="grid gap-3 md:grid-cols-2">
            {getMembersForPod(pod.id).map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={m.user?.avatarUrl} />
                  <AvatarFallback>{m.user?.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">{m.user?.name}</p>
                  <Badge variant={m.role === PodMemberRole.HOST ? "default" : "secondary"} className="text-[10px] capitalize">{m.role.toLowerCase()}</Badge>
                </div>
                {isHost && m.userId !== currentUser.id && (
                  <div className="flex gap-1">
                    {m.role === PodMemberRole.MEMBER && (
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => promoteToHost(m.userId)} title="Promote to Host">
                        <ShieldCheck className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeMember(m.userId)} title="Remove">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="discussion" className="mt-6">
          <CommentThread targetType={CommentTargetType.POD} targetId={pod.id} />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
