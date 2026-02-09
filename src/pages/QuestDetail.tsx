import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Zap, Users, Sparkles, Megaphone, BookOpen, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/PageShell";
import { CommentThread } from "@/components/CommentThread";
import { CommentTargetType, QuestUpdateType } from "@/types/enums";
import {
  getQuestById, getTopicsForQuest, getTerritoriesForQuest,
  getParticipantsForQuest, getUpdatesForQuest,
  getUserById, getGuildById,
} from "@/data/mock";
import { formatDistanceToNow } from "date-fns";

const updateIcons: Record<string, typeof Sparkles> = {
  [QuestUpdateType.MILESTONE]: Sparkles,
  [QuestUpdateType.CALL_FOR_HELP]: Megaphone,
  [QuestUpdateType.REFLECTION]: BookOpen,
  [QuestUpdateType.GENERAL]: MessageCircle,
};

export default function QuestDetail() {
  const { id } = useParams<{ id: string }>();
  const quest = getQuestById(id!);
  if (!quest) return <PageShell><p>Quest not found.</p></PageShell>;

  const guild = getGuildById(quest.guildId);
  const creator = getUserById(quest.createdByUserId);
  const topics = getTopicsForQuest(quest.id);
  const territories = getTerritoriesForQuest(quest.id);
  const participants = getParticipantsForQuest(quest.id);
  const updates = getUpdatesForQuest(quest.id);

  return (
    <PageShell>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to="/quests"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Quests</Link>
      </Button>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
          <h1 className="font-display text-3xl font-bold">{quest.title}</h1>
          <span className="flex items-center gap-1.5 text-lg font-bold text-primary">
            <Zap className="h-5 w-5" /> {quest.rewardXp} XP
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Link to={`/guilds/${guild?.id}`} className="hover:text-primary transition-colors">{guild?.name}</Link>
          <span>·</span>
          <span>by {creator?.name}</span>
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
      </motion.div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="updates">Updates ({updates.length})</TabsTrigger>
          <TabsTrigger value="discussion">Discussion</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" /> Participants ({participants.length})
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {participants.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={p.user?.avatarUrl} />
                  <AvatarFallback>{p.user?.name?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{p.user?.name}</p>
                  <div className="flex gap-1.5">
                    <Badge variant="secondary" className="text-[10px] capitalize">{p.role.toLowerCase()}</Badge>
                    <Badge variant="outline" className="text-[10px] capitalize">{p.status.toLowerCase()}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="updates" className="mt-6 space-y-4">
          {updates.length === 0 && <p className="text-muted-foreground">No updates yet.</p>}
          {updates.map((update, i) => {
            const author = getUserById(update.authorId);
            const Icon = updateIcons[update.type] || MessageCircle;
            return (
              <motion.div
                key={update.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card p-5 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={author?.avatarUrl} />
                    <AvatarFallback>{author?.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{author?.name}</span>
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <Badge variant="secondary" className="text-[10px] capitalize">{update.type.toLowerCase().replace(/_/g, " ")}</Badge>
                      <span className="text-muted-foreground text-xs">
                        {formatDistanceToNow(new Date(update.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <h4 className="font-display font-semibold mt-1">{update.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{update.content}</p>
                  </div>
                </div>
                {/* Embedded comments for this QuestUpdate */}
                <div className="ml-12 pt-3 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Comments on this update</p>
                  <CommentThread targetType={CommentTargetType.QUEST_UPDATE} targetId={update.id} />
                </div>
              </motion.div>
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
