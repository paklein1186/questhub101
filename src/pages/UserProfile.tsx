import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Zap, Star, MapPin, Hash, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageShell } from "@/components/PageShell";
import { CommentThread } from "@/components/CommentThread";
import { CommentTargetType } from "@/types/enums";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { useXP } from "@/hooks/useXP";
import {
  getUserById, achievements as allAchievements, userTopics, userTerritories,
  getTopicById, getTerritoryById, getQuestById, quests,
} from "@/data/mock";
import type { Achievement } from "@/types";
import { formatDistanceToNow } from "date-fns";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const user = getUserById(id!);
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const [achievementsState, setAchievementsState] = useState<Achievement[]>(
    () => allAchievements.filter((a) => a.userId === id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newQuestId, setNewQuestId] = useState("none");

  if (!user) return <PageShell><p>User not found.</p></PageShell>;

  const topics = userTopics.filter((ut) => ut.userId === user.id).map((ut) => getTopicById(ut.topicId)!).filter(Boolean);
  const territories = userTerritories.filter((ut) => ut.userId === user.id).map((ut) => getTerritoryById(ut.territoryId)!).filter(Boolean);
  const isOwnProfile = currentUser.id === user.id;

  const createAchievement = () => {
    if (!newTitle.trim()) return;
    const ach: Achievement = {
      id: `a-${Date.now()}`,
      userId: user.id,
      questId: newQuestId === "none" ? "" : newQuestId,
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    setAchievementsState((prev) => [ach, ...prev]);
    allAchievements.push(ach); // also push to global so feed picks it up
    setNewTitle("");
    setNewDesc("");
    setNewQuestId("none");
    setCreateOpen(false);
    toast({ title: "Achievement created!" });
  };

  return (
    <PageShell>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
      </Button>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-5 mb-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user.avatarUrl} />
            <AvatarFallback className="text-2xl">{user.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-display text-3xl font-bold">{user.name}</h1>
            {user.headline && <p className="text-muted-foreground">{user.headline}</p>}
            <div className="flex items-center gap-3 mt-2">
              <Badge variant="secondary" className="capitalize">{user.role.toLowerCase().replace("_", " ")}</Badge>
              <span className="flex items-center gap-1 text-sm font-semibold text-primary">
                <Zap className="h-4 w-4" /> {user.xp} XP
              </span>
              <span className="text-sm text-muted-foreground">CI: {user.contributionIndex}</span>
            </div>
          </div>
        </div>
        {user.bio && <p className="text-muted-foreground max-w-2xl mb-4">{user.bio}</p>}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {topics.map((t) => (
            <Badge key={t.id} variant="secondary" className="text-xs"><Hash className="h-3 w-3 mr-0.5" />{t.name}</Badge>
          ))}
          {territories.map((t) => (
            <Badge key={t.id} variant="outline" className="text-xs"><MapPin className="h-3 w-3 mr-0.5" />{t.name}</Badge>
          ))}
        </div>
      </motion.div>

      {/* Achievements */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <Star className="h-5 w-5 text-warning" /> Achievements ({achievementsState.length})
          </h2>
          {isOwnProfile && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> New Achievement</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Achievement</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Title</label>
                    <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Community Champion" maxLength={100} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Description</label>
                    <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="What did you accomplish?" maxLength={300} className="resize-none" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Linked Quest (optional)</label>
                    <Select value={newQuestId} onValueChange={setNewQuestId}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No quest</SelectItem>
                        {quests.map((q) => <SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={createAchievement} disabled={!newTitle.trim()} className="w-full">Create</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
        {achievementsState.length === 0 && <p className="text-sm text-muted-foreground">No achievements yet.</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {achievementsState.map((a) => {
            const quest = a.questId ? getQuestById(a.questId) : null;
            return (
              <Link
                key={a.id}
                to={`/achievements/${a.id}`}
                className="rounded-lg border border-border bg-card p-4 hover:border-warning/30 hover:shadow-sm transition-all block"
              >
                <div className="flex items-start gap-3">
                  <Star className="h-5 w-5 text-warning mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-display font-semibold">{a.title}</h4>
                    {a.description && <p className="text-sm text-muted-foreground mt-0.5">{a.description}</p>}
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      {quest && <Badge variant="secondary" className="text-[10px]">{quest.title}</Badge>}
                      <span>{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Wall */}
      <section>
        <h2 className="font-display text-lg font-semibold mb-3">Wall</h2>
        <CommentThread targetType={CommentTargetType.USER} targetId={user.id} />
      </section>
    </PageShell>
  );
}
