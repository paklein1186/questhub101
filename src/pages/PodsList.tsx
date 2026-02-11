import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Plus, BookOpen, Compass, Loader2, CircleDot } from "lucide-react";
import { UnitCoverImage } from "@/components/UnitCoverImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isAdmin as checkIsGlobalAdmin } from "@/lib/admin";
import { PodType } from "@/types/enums";
import { formatDistanceToNow } from "date-fns";
import { usePods, useCreatePod, useTopics, useQuests } from "@/hooks/useSupabaseData";
import { ExploreFilters, ExploreFilterValues, defaultFilters } from "@/components/ExploreFilters";
import { useHouseFilter } from "@/hooks/useHouseFilter";
import { PublicExploreCTA } from "@/components/PublicExploreCTA";
import { approxCount } from "@/lib/publicMode";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06 } }),
};

export default function PodsList({ bare }: { bare?: boolean }) {
  const currentUser = useCurrentUser();
  const { session } = useAuth();
  const isLoggedIn = !!session;
  const { toast } = useToast();
  const [filters, setFilters] = useState<ExploreFilterValues>(defaultFilters);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newType, setNewType] = useState<string>(PodType.STUDY_POD);
  const [newTopicId, setNewTopicId] = useState("none");
  const [newQuestId, setNewQuestId] = useState("none");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newDraft, setNewDraft] = useState(false);

  const isAdm = checkIsGlobalAdmin(currentUser.email);
  const { data: podsData, isLoading } = usePods();
  const { data: topics } = useTopics();
  const { data: questsData } = useQuests();
  const createPodMut = useCreatePod();
  const hf = useHouseFilter();

  const allPods = podsData ?? [];
  const quests = questsData ?? [];

  const preFiltered = hf.applyHouseFilter(allPods, (p) =>
    p.topic_id ? [p.topic_id] : []
  );

  let filtered = preFiltered.filter((p) => {
    if (p.is_draft && !isAdm && p.creator_id !== currentUser.id) return false;
    return true;
  });
  if (filters.podType !== "all") filtered = filtered.filter((p) => p.type === filters.podType);
  if (filters.topicIds.length > 0) filtered = filtered.filter((p) => p.topic_id && filters.topicIds.includes(p.topic_id));

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createPodMut.mutateAsync({
        name: newName, description: newDesc, type: newType,
        questId: newType === PodType.QUEST_POD && newQuestId !== "none" ? newQuestId : undefined,
        topicId: newType === PodType.STUDY_POD && newTopicId !== "none" ? newTopicId : undefined,
        startDate: newStart || undefined, endDate: newEnd || undefined, isDraft: newDraft,
      });
      setCreateOpen(false);
      setNewName(""); setNewDesc(""); setNewTopicId("none"); setNewQuestId("none"); setNewStart(""); setNewEnd(""); setNewDraft(false);
      toast({ title: "Pod created!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <PageShell bare={bare}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Pods</h1>
          <p className="text-muted-foreground mt-1">Small collaboration groups around quests and topics.</p>
        </div>
        {isLoggedIn && (
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
                        {(topics ?? []).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
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
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Save as draft</label>
                  <Switch checked={newDraft} onCheckedChange={setNewDraft} />
                </div>
                <Button onClick={handleCreate} disabled={!newName.trim() || createPodMut.isPending} className="w-full">
                  {createPodMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Create
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!isLoggedIn && (
        <PublicExploreCTA
          message="Pods are collaboration groups. Log in to see details and join."
          className="mb-6"
        />
      )}

      <div className="mb-6">
        <ExploreFilters
          filters={filters}
          onChange={setFilters}
          config={{ showTopics: true, showPodType: true }}
          houseFilter={{
            active: hf.houseFilterActive,
            onToggle: hf.setHouseFilterActive,
            hasHouses: hf.hasHouses,
            topicNames: hf.topicNames,
            myTopicIds: hf.myTopicIds,
          }}
          universeMode={hf.universeMode}
          onUniverseModeChange={hf.setUniverseMode}
        />
      </div>

      {isLoading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((pod, i) => {
          const quest = (pod as any).quests;
          const topic = (pod as any).topics;
          const memberCount = (pod as any).pod_members?.length ?? 0;
          return (
            <motion.div key={pod.id} custom={i} variants={fadeUp} initial="hidden" animate="show">
              <Link to={isLoggedIn ? `/pods/${pod.id}` : "/login"} className="block rounded-xl border border-border bg-card overflow-hidden hover:shadow-md hover:border-primary/30 transition-all">
                <UnitCoverImage type="POD" imageUrl={pod.image_url} name={pod.name} height="h-28" />
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    {pod.type === PodType.QUEST_POD
                      ? <Compass className="h-4 w-4 text-primary" />
                      : <BookOpen className="h-4 w-4 text-primary" />}
                    <Badge variant="secondary" className="text-[10px] capitalize">{pod.type.replace("_", " ").toLowerCase()}</Badge>
                    <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1"><Users className="h-3 w-3" /> {isLoggedIn ? memberCount : `~${approxCount(memberCount)}`}</span>
                  </div>
                  <h3 className="font-display font-semibold text-lg">{pod.name}</h3>
                  {isLoggedIn ? (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{pod.description}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1 italic">Log in to see details</p>
                  )}
                  {isLoggedIn && (
                    <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-muted-foreground">
                      {quest && <Badge variant="outline" className="text-[10px]">{quest.title}</Badge>}
                      {topic && <Badge variant="secondary" className="text-[10px]">{topic.name}</Badge>}
                      <span>· {formatDistanceToNow(new Date(pod.created_at), { addSuffix: true })}</span>
                    </div>
                  )}
                </div>
              </Link>
            </motion.div>
          );
        })}
        {!isLoading && filtered.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">No pods match your filters.</p>
            {hf.houseFilterActive && (
              <Button variant="link" size="sm" className="mt-2" onClick={() => hf.setHouseFilterActive(false)}>
                Try showing all Houses
              </Button>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}
