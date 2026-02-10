import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Compass, ArrowRight, Sparkles, Megaphone, Star, Trophy, Rss, Rocket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { PageShell } from "@/components/PageShell";
import {
  guilds, quests, questUpdates, achievements, follows,
  getTopicsForGuild, getTerritoriesForGuild,
  getUserById, getQuestById, getGuildById,
} from "@/data/mock";
import { QuestUpdateType, FollowTargetType } from "@/types/enums";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { formatDistanceToNow } from "date-fns";

const updateTypeIcon: Record<string, typeof Sparkles> = {
  [QuestUpdateType.MILESTONE]: Sparkles,
  [QuestUpdateType.CALL_FOR_HELP]: Megaphone,
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06 } }),
};

export default function HomeFeed() {
  const currentUser = useCurrentUser();
  const { percentage, isComplete, completedCount, totalSteps } = useOnboardingProgress();
  const myFollows = follows.filter((f) => f.followerId === currentUser.id);
  const followedUserIds = new Set(myFollows.filter((f) => f.targetType === FollowTargetType.USER).map((f) => f.targetId));
  const followedGuildIds = new Set(myFollows.filter((f) => f.targetType === FollowTargetType.GUILD).map((f) => f.targetId));
  const followedQuestIds = new Set(myFollows.filter((f) => f.targetType === FollowTargetType.QUEST).map((f) => f.targetId));

  type FeedItem = { type: "quest_update" | "achievement" | "quest"; id: string; createdAt: string; data: any };
  const feedItems: FeedItem[] = [];

  questUpdates
    .filter((qu) => followedQuestIds.has(qu.questId))
    .forEach((qu) => feedItems.push({ type: "quest_update", id: qu.id, createdAt: qu.createdAt, data: qu }));

  achievements
    .filter((a) => followedUserIds.has(a.userId))
    .forEach((a) => feedItems.push({ type: "achievement", id: a.id, createdAt: a.createdAt, data: a }));

  quests
    .filter((q) => followedGuildIds.has(q.guildId))
    .forEach((q) => feedItems.push({ type: "quest", id: q.id, createdAt: "2025-01-20T00:00:00Z", data: q }));

  feedItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const suggestedGuilds = guilds.filter((g) => g.isApproved).slice(0, 3);
  const suggestedQuests = quests.filter((q) => q.isFeatured);
  const recentAchievements = [...achievements].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 4);

  return (
    <PageShell>
      {/* Onboarding Banner */}
      {!isComplete && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-xl border border-primary/20 bg-primary/5 p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Rocket className="h-6 w-6 text-primary" />
              <div>
                <h3 className="font-display font-semibold text-sm">Complete your setup</h3>
                <p className="text-xs text-muted-foreground">{completedCount} of {totalSteps} steps done</p>
              </div>
            </div>
            <Button size="sm" asChild>
              <Link to="/me/onboarding">View checklist <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </div>
          <Progress value={percentage} className="h-2" />
        </motion.div>
      )}

      {/* Hero */}
      <section className="mb-12">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-4xl md:text-5xl font-bold tracking-tight"
        >
          Your <span className="text-primary">Quest</span> Feed
        </motion.h1>
        <p className="mt-2 text-muted-foreground max-w-xl">Discover guilds, join quests, and track the latest updates from your community.</p>
      </section>

      {/* From what you follow */}
      {feedItems.length > 0 && (
        <section className="mb-12">
          <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
            <Rss className="h-5 w-5 text-primary" /> From people, guilds and quests you follow
          </h2>
          <div className="space-y-3">
            {feedItems.slice(0, 8).map((item, i) => {
              if (item.type === "quest_update") {
                const qu = item.data;
                const author = getUserById(qu.authorId);
                const quest = getQuestById(qu.questId);
                const Icon = updateTypeIcon[qu.type];
                return (
                  <motion.div key={`qu-${item.id}`} custom={i} variants={fadeUp} initial="hidden" animate="show"
                    className="flex items-start gap-4 rounded-xl border border-border bg-card p-4"
                  >
                    <Avatar className="h-9 w-9 mt-0.5">
                      <AvatarImage src={author?.avatarUrl} />
                      <AvatarFallback>{author?.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{author?.name}</span>
                        {Icon && <Icon className="h-3.5 w-3.5 text-warning" />}
                        <Badge variant="secondary" className="text-[10px]">Quest Update</Badge>
                      </div>
                      <Link to={`/quests/${qu.questId}`} className="font-display font-medium text-sm hover:text-primary transition-colors">
                        {qu.title}
                      </Link>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{qu.content}</p>
                      <span className="text-[11px] text-muted-foreground mt-1 block">
                        {quest?.title} · {formatDistanceToNow(new Date(qu.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </motion.div>
                );
              }
              if (item.type === "achievement") {
                const ach = item.data;
                const user = getUserById(ach.userId);
                const quest = ach.questId ? getQuestById(ach.questId) : null;
                return (
                  <motion.div key={`ach-${item.id}`} custom={i} variants={fadeUp} initial="hidden" animate="show">
                    <Link to={`/achievements/${ach.id}`}
                      className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:shadow-sm hover:border-warning/30 transition-all"
                    >
                      <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                        <Star className="h-5 w-5 text-warning" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={user?.avatarUrl} />
                            <AvatarFallback>{user?.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{user?.name}</span>
                          <Badge variant="secondary" className="text-[10px]">Achievement</Badge>
                        </div>
                        <p className="font-display font-semibold text-sm mt-0.5">{ach.title}</p>
                        {quest && <p className="text-xs text-muted-foreground">{quest.title}</p>}
                      </div>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(ach.createdAt), { addSuffix: true })}
                      </span>
                    </Link>
                  </motion.div>
                );
              }
              const q = item.data;
              const guild = getGuildById(q.guildId);
              return (
                <motion.div key={`q-${item.id}`} custom={i} variants={fadeUp} initial="hidden" animate="show">
                  <Link to={`/quests/${q.id}`}
                    className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:shadow-sm hover:border-primary/30 transition-all"
                  >
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Compass className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{guild?.name}</span>
                        <Badge variant="secondary" className="text-[10px]">New Quest</Badge>
                      </div>
                      <p className="font-display font-semibold text-sm mt-0.5">{q.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{q.description}</p>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-0 shrink-0">{q.rewardXp} XP</Badge>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* Suggested Guilds */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Suggested Guilds
          </h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/explore?tab=guilds">View all <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {suggestedGuilds.map((guild, i) => {
            const topics = getTopicsForGuild(guild.id);
            const terrs = getTerritoriesForGuild(guild.id);
            return (
              <motion.div key={guild.id} custom={i} variants={fadeUp} initial="hidden" animate="show">
                <Link
                  to={`/guilds/${guild.id}`}
                  className="block rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-primary/30 transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <img src={guild.logoUrl} className="h-10 w-10 rounded-lg" alt="" />
                    <div>
                      <h3 className="font-display font-semibold group-hover:text-primary transition-colors">{guild.name}</h3>
                      <span className="text-xs text-muted-foreground capitalize">{guild.type.toLowerCase()}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{guild.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {topics.map((t) => <Badge key={t.id} variant="secondary" className="text-xs">{t.name}</Badge>)}
                    {terrs.map((t) => <Badge key={t.id} variant="outline" className="text-xs">{t.name}</Badge>)}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Featured Quests */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" /> Featured Quests
          </h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/explore?tab=quests">Marketplace <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {suggestedQuests.map((quest, i) => {
            const guild = guilds.find((g) => g.id === quest.guildId);
            return (
              <motion.div key={quest.id} custom={i} variants={fadeUp} initial="hidden" animate="show">
                <Link
                  to={`/quests/${quest.id}`}
                  className="block rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-primary/30 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-display font-semibold">{quest.title}</h3>
                    <Badge className="bg-primary/10 text-primary border-0">{quest.rewardXp} XP</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{quest.description}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{guild?.name}</span>
                    <Badge variant="outline" className="capitalize">{quest.status.toLowerCase().replace("_", " ")}</Badge>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Recent Achievements */}
      {recentAchievements.length > 0 && (
        <section className="mb-12">
          <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-warning" /> Recent Achievements
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {recentAchievements.map((ach, i) => {
              const user = getUserById(ach.userId);
              const quest = getQuestById(ach.questId);
              return (
                <motion.div key={ach.id} custom={i} variants={fadeUp} initial="hidden" animate="show">
                  <Link
                    to={`/achievements/${ach.id}`}
                    className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:shadow-sm hover:border-warning/30 transition-all"
                  >
                    <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                      <Star className="h-5 w-5 text-warning" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={user?.avatarUrl} />
                          <AvatarFallback>{user?.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user?.name}</span>
                      </div>
                      <p className="font-display font-semibold text-sm mt-0.5">{ach.title}</p>
                      {quest && <p className="text-xs text-muted-foreground">{quest.title}</p>}
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(ach.createdAt), { addSuffix: true })}
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* Latest Updates */}
      <section>
        <h2 className="font-display text-xl font-semibold mb-4">Suggested for you — Latest Quest Updates</h2>
        <div className="space-y-3">
          {[...questUpdates].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 4).map((update, i) => {
            const author = getUserById(update.authorId);
            const quest = quests.find((q) => q.id === update.questId);
            const Icon = updateTypeIcon[update.type];
            return (
              <motion.div
                key={update.id}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                animate="show"
                className="flex items-start gap-4 rounded-xl border border-border bg-card p-4"
              >
                <Avatar className="h-9 w-9 mt-0.5">
                  <AvatarImage src={author?.avatarUrl} />
                  <AvatarFallback>{author?.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{author?.name}</span>
                    {Icon && <Icon className="h-3.5 w-3.5 text-warning" />}
                    <Badge variant="secondary" className="text-[10px] capitalize">{update.type.toLowerCase().replace(/_/g, " ")}</Badge>
                  </div>
                  <Link to={`/quests/${update.questId}`} className="font-display font-medium text-sm hover:text-primary transition-colors">
                    {update.title}
                  </Link>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{update.content}</p>
                  <span className="text-[11px] text-muted-foreground mt-1 block">
                    {quest?.title} · {formatDistanceToNow(new Date(update.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>
    </PageShell>
  );
}
