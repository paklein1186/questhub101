import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Filter, Plus, BookOpen, Compass } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import {
  pods, podMembers, topics, quests,
  getUserById, getQuestById, getTopicById,
} from "@/data/mock";
import { PodType, PodMemberRole } from "@/types/enums";
import type { Pod } from "@/types";
import { formatDistanceToNow } from "date-fns";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06 } }),
};

export default function PodsList() {
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [topicFilter, setTopicFilter] = useState("ALL");
  const [questFilter, setQuestFilter] = useState("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newType, setNewType] = useState<string>(PodType.STUDY_POD);
  const [newTopicId, setNewTopicId] = useState("none");
  const [newQuestId, setNewQuestId] = useState("none");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [podsState, setPodsState] = useState<Pod[]>(pods);

  let filtered = [...podsState];
  if (typeFilter !== "ALL") filtered = filtered.filter((p) => p.type === typeFilter);
  if (topicFilter !== "ALL") filtered = filtered.filter((p) => p.topicId === topicFilter);
  if (questFilter !== "ALL") filtered = filtered.filter((p) => p.questId === questFilter);

  const createPod = () => {
    if (!newName.trim()) return;
    const pod: Pod = {
      id: `pod-${Date.now()}`,
      name: newName.trim(),
      description: newDesc.trim(),
      type: newType as PodType,
      questId: newType === PodType.QUEST_POD && newQuestId !== "none" ? newQuestId : undefined,
      topicId: newType === PodType.STUDY_POD && newTopicId !== "none" ? newTopicId : undefined,
      creatorId: currentUser.id,
      startDate: newStart || undefined,
      endDate: newEnd || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    pods.push(pod);
    podMembers.push({ id: `pm-${Date.now()}`, podId: pod.id, userId: currentUser.id, role: PodMemberRole.HOST, joinedAt: new Date().toISOString() });
    setPodsState([...pods]);
    setCreateOpen(false);
    setNewName(""); setNewDesc(""); setNewTopicId("none"); setNewQuestId("none"); setNewStart(""); setNewEnd("");
    toast({ title: "Pod created!" });
  };

  return (
    <PageShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Pods</h1>
          <p className="text-muted-foreground mt-1">Small collaboration groups around quests and topics.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Create Pod</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Create a Pod</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Name</label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Pod name" maxLength={100} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="What is this pod about?" maxLength={500} className="resize-none" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Type</label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PodType.QUEST_POD}>Quest Pod</SelectItem>
                    <SelectItem value={PodType.STUDY_POD}>Study Pod</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newType === PodType.QUEST_POD && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Quest</label>
                  <Select value={newQuestId} onValueChange={setNewQuestId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No quest</SelectItem>
                      {quests.map((q) => <SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {newType === PodType.STUDY_POD && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Topic</label>
                  <Select value={newTopicId} onValueChange={setNewTopicId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No topic</SelectItem>
                      {topics.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Start date</label>
                  <Input type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">End date</label>
                  <Input type="date" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
                </div>
              </div>
              <Button onClick={createPod} disabled={!newName.trim()} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]"><Filter className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            <SelectItem value={PodType.QUEST_POD}>Quest Pod</SelectItem>
            <SelectItem value={PodType.STUDY_POD}>Study Pod</SelectItem>
          </SelectContent>
        </Select>
        <Select value={topicFilter} onValueChange={setTopicFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Topic" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All topics</SelectItem>
            {topics.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={questFilter} onValueChange={setQuestFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Quest" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All quests</SelectItem>
            {quests.map((q) => <SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Pod list */}
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((pod, i) => {
          const creator = getUserById(pod.creatorId);
          const quest = pod.questId ? getQuestById(pod.questId) : null;
          const topic = pod.topicId ? getTopicById(pod.topicId) : null;
          const memberCount = podMembers.filter((pm) => pm.podId === pod.id).length;
          return (
            <motion.div key={pod.id} custom={i} variants={fadeUp} initial="hidden" animate="show">
              <Link
                to={`/pods/${pod.id}`}
                className="block rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-primary/30 transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  {pod.type === PodType.QUEST_POD
                    ? <Compass className="h-4 w-4 text-primary" />
                    : <BookOpen className="h-4 w-4 text-primary" />}
                  <Badge variant="secondary" className="text-[10px] capitalize">{pod.type.replace("_", " ").toLowerCase()}</Badge>
                  <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1"><Users className="h-3 w-3" /> {memberCount}</span>
                </div>
                <h3 className="font-display font-semibold text-lg">{pod.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{pod.description}</p>
                <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-muted-foreground">
                  {quest && <Badge variant="outline" className="text-[10px]">{quest.title}</Badge>}
                  {topic && <Badge variant="secondary" className="text-[10px]">{topic.name}</Badge>}
                  <span>by {creator?.name}</span>
                  <span>· {formatDistanceToNow(new Date(pod.createdAt), { addSuffix: true })}</span>
                </div>
              </Link>
            </motion.div>
          );
        })}
        {filtered.length === 0 && <p className="text-muted-foreground col-span-full">No pods match your filters.</p>}
      </div>
    </PageShell>
  );
}
