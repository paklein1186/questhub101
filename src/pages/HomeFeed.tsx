import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield, Compass, ArrowRight, Sparkles, Megaphone, Star, Trophy, Rss, Rocket,
  Zap, Plus, CalendarCheck, CircleDot, Users, Briefcase, Hash, MapPin,
  MessageSquare, Bot, ChevronRight, Clock, Video, Filter,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { PageShell } from "@/components/PageShell";
import {
  guilds, quests, questUpdates, achievements, follows, comments,
  getTopicsForGuild, getTerritoriesForGuild, getTopicsForQuest,
  getUserById, getQuestById, getGuildById, getPodById,
  guildMembers, questParticipants, podMembers, pods, bookings, services,
  userTopics, userTerritories, getTopicById, getTerritoryById,
  topicFeatures, hasBlockRelationship,
} from "@/data/mock";
import {
  QuestUpdateType, FollowTargetType, CommentTargetType, BookingStatus,
  TopicFeatureTargetType,
} from "@/types/enums";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAuth } from "@/hooks/useAuth";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { formatDistanceToNow } from "date-fns";

// ── Animation ──
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04 } }),
};

// ── Feed item type ──
type FeedItem = {
  type: "quest_update" | "achievement" | "quest" | "comment" | "guild" | "pod";
  id: string;
  createdAt: string;
  data: any;
};

const FEED_FILTERS = ["All", "Quests", "Guilds", "Pods", "Bookings", "XP/Achievements"] as const;
type FeedFilter = (typeof FEED_FILTERS)[number];

const ITEMS_PER_PAGE = 8;

export default function HomeFeed() {
  const currentUser = useCurrentUser();
  const { user: authUser } = useAuth();
  const { percentage, isComplete, completedCount, totalSteps } = useOnboardingProgress();
  const [feedFilter, setFeedFilter] = useState<FeedFilter>("All");
  const [feedPage, setFeedPage] = useState(1);

  // ── Derived data ──
  const myFollows = follows.filter((f) => f.followerId === currentUser.id);
  const followedUserIds = new Set(myFollows.filter((f) => f.targetType === FollowTargetType.USER).map((f) => f.targetId));
  const followedGuildIds = new Set(myFollows.filter((f) => f.targetType === FollowTargetType.GUILD).map((f) => f.targetId));
  const followedQuestIds = new Set(myFollows.filter((f) => f.targetType === FollowTargetType.QUEST).map((f) => f.targetId));

  const myGuildIds = guildMembers.filter((gm) => gm.userId === currentUser.id).map((gm) => gm.guildId);
  const myQuestIds = questParticipants.filter((qp) => qp.userId === currentUser.id).map((qp) => qp.questId);
  const myPodIds = podMembers.filter((pm) => pm.userId === currentUser.id).map((pm) => pm.podId);
  const myTopicIds = userTopics.filter((ut) => ut.userId === currentUser.id).map((ut) => ut.topicId);
  const myTerritoryIds = userTerritories.filter((ut) => ut.userId === currentUser.id).map((ut) => ut.territoryId);
  const ownsQuests = quests.some((q) => q.createdByUserId === currentUser.id);

  // ── Build unified feed ──
  const feedItems = useMemo(() => {
    const items: FeedItem[] = [];

    // Quest updates from followed quests + my quests
    const relevantQuestIds = new Set([...followedQuestIds, ...myQuestIds]);
    questUpdates
      .filter((qu) => relevantQuestIds.has(qu.questId) && !hasBlockRelationship(currentUser.id, qu.authorId))
      .forEach((qu) => items.push({ type: "quest_update", id: qu.id, createdAt: qu.createdAt, data: qu }));

    // Achievements from followed users
    achievements
      .filter((a) => followedUserIds.has(a.userId))
      .forEach((a) => items.push({ type: "achievement", id: a.id, createdAt: a.createdAt, data: a }));

    // My own achievements
    achievements
      .filter((a) => a.userId === currentUser.id && !items.some((i) => i.id === a.id))
      .forEach((a) => items.push({ type: "achievement", id: a.id, createdAt: a.createdAt, data: a }));

    // Comments on user's content (quests, quest updates)
    comments
      .filter((c) => {
        if (hasBlockRelationship(currentUser.id, c.authorId)) return false;
        if (c.targetType === CommentTargetType.QUEST && myQuestIds.includes(c.targetId)) return true;
        if (c.targetType === CommentTargetType.USER && c.targetId === currentUser.id) return true;
        return false;
      })
      .forEach((c) => items.push({ type: "comment", id: c.id, createdAt: c.createdAt, data: c }));

    // Quests from followed guilds and my guilds
    const relevantGuildIds = new Set([...followedGuildIds, ...myGuildIds]);
    quests
      .filter((q) => relevantGuildIds.has(q.guildId) && !q.isDraft)
      .forEach((q) => items.push({ type: "quest", id: q.id, createdAt: "2025-01-20T00:00:00Z", data: q }));

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items;
  }, [currentUser.id]);

  // ── Filter feed ──
  const filteredFeed = useMemo(() => {
    if (feedFilter === "All") return feedItems;
    if (feedFilter === "Quests") return feedItems.filter((i) => i.type === "quest" || i.type === "quest_update");
    if (feedFilter === "Guilds") return feedItems.filter((i) => i.type === "guild");
    if (feedFilter === "Pods") return feedItems.filter((i) => i.type === "pod");
    if (feedFilter === "Bookings") return []; // no booking feed items yet
    if (feedFilter === "XP/Achievements") return feedItems.filter((i) => i.type === "achievement");
    return feedItems;
  }, [feedFilter, feedItems]);

  const paginatedFeed = filteredFeed.slice(0, feedPage * ITEMS_PER_PAGE);
  const hasMoreFeed = paginatedFeed.length < filteredFeed.length;

  // ── Recommendations based on topics/territories ──
  const suggestedQuests = useMemo(() => {
    return quests
      .filter((q) => q.isFeatured || getTopicsForQuest(q.id).some((t) => myTopicIds.includes(t.id)))
      .filter((q) => !myQuestIds.includes(q.id))
      .slice(0, 4);
  }, []);

  const suggestedGuilds = useMemo(() => {
    return guilds
      .filter((g) => g.isApproved && !myGuildIds.includes(g.id))
      .slice(0, 3);
  }, []);

  const suggestedServices = useMemo(() => {
    return services
      .filter((s) => s.isActive && s.providerUserId !== currentUser.id)
      .slice(0, 3);
  }, []);

  // ── Today's top quests ──
  const topQuests = useMemo(() => {
    return [...quests]
      .filter((q) => !q.isDraft)
      .sort((a, b) => b.rewardXp - a.rewardXp)
      .slice(0, 5);
  }, []);

  // ── My active pods ──
  const myPods = useMemo(() => {
    return myPodIds.map((id) => getPodById(id)).filter(Boolean).slice(0, 5);
  }, []);

  // ── Upcoming bookings ──
  const myBookings = useMemo(() => {
    return bookings
      .filter((b) => b.requesterId === currentUser.id || b.providerUserId === currentUser.id)
      .filter((b) => b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.REQUESTED)
      .sort((a, b) => new Date(a.startDateTime || "").getTime() - new Date(b.startDateTime || "").getTime())
      .slice(0, 3);
  }, []);

  // ── XP this week (mock) ──
  const xpThisWeek = 45;

  // ── Featured topics/territories ──
  const featuredTopicContent = useMemo(() => {
    return myTopicIds.flatMap((topicId) => {
      const features = topicFeatures.filter((tf) => tf.topicId === topicId);
      return features.map((tf) => ({
        ...tf,
        topic: getTopicById(topicId),
        entity:
          tf.targetType === TopicFeatureTargetType.QUEST
            ? getQuestById(tf.targetId)
            : tf.targetType === TopicFeatureTargetType.GUILD
              ? getGuildById(tf.targetId)
              : null,
      }));
    }).filter((f) => f.entity).slice(0, 4);
  }, []);

  // ── Render helpers ──
  const updateTypeIcon: Record<string, typeof Sparkles> = {
    [QuestUpdateType.MILESTONE]: Sparkles,
    [QuestUpdateType.CALL_FOR_HELP]: Megaphone,
  };

  return (
    <PageShell>
      <div className="max-w-5xl mx-auto space-y-8">

        {/* ═══════════════ 1. PERSONAL HEADER ═══════════════ */}
        <motion.section initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={currentUser.avatarUrl} />
              <AvatarFallback className="text-xl">{currentUser.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold">
                Welcome back, <span className="text-primary">{currentUser.name.split(" ")[0]}</span>
              </h1>
              <p className="text-sm text-muted-foreground capitalize">{currentUser.role.toLowerCase().replace("_", " ")}</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <StatCard icon={Zap} label="XP" value={currentUser.xp} accent />
            <StatCard icon={Star} label="Contribution" value={currentUser.contributionIndex} />
            <StatCard icon={Shield} label="Guilds" value={myGuildIds.length} />
            <StatCard icon={Compass} label="Quests" value={myQuestIds.length} />
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" asChild><Link to="/explore?tab=quests"><Plus className="h-3.5 w-3.5 mr-1" /> Create Quest</Link></Button>
            <Button size="sm" variant="outline" asChild><Link to="/explore?tab=services"><CalendarCheck className="h-3.5 w-3.5 mr-1" /> Book a Session</Link></Button>
            <Button size="sm" variant="outline" asChild><Link to="/explore?tab=pods"><CircleDot className="h-3.5 w-3.5 mr-1" /> Start a Pod</Link></Button>
            <Button size="sm" variant="outline" asChild><Link to="/explore?tab=guilds"><Shield className="h-3.5 w-3.5 mr-1" /> Join a Guild</Link></Button>
            {ownsQuests && (
              <Button size="sm" variant="outline" asChild><Link to="/work"><Rss className="h-3.5 w-3.5 mr-1" /> Add Quest Update</Link></Button>
            )}
          </div>
        </motion.section>

        {/* Onboarding banner */}
        {!isComplete && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-primary/20 bg-primary/5 p-5"
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

        <Separator />

        {/* ═══════════════ 2. ACTIVITY FEED ═══════════════ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold flex items-center gap-2">
              <Rss className="h-5 w-5 text-primary" /> Activity Feed
            </h2>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {FEED_FILTERS.map((f) => (
              <Button key={f} size="sm" variant={feedFilter === f ? "default" : "outline"}
                onClick={() => { setFeedFilter(f); setFeedPage(1); }}
                className="text-xs h-7"
              >
                {f}
              </Button>
            ))}
          </div>

          {/* Feed items */}
          <div className="space-y-3">
            {paginatedFeed.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">No activity to show for this filter. Follow quests, guilds, and users to populate your feed.</p>
            )}
            {paginatedFeed.map((item, i) => (
              <FeedItemCard key={`${item.type}-${item.id}`} item={item} index={i} updateTypeIcon={updateTypeIcon} />
            ))}
          </div>

          {hasMoreFeed && (
            <div className="mt-4 text-center">
              <Button variant="outline" size="sm" onClick={() => setFeedPage((p) => p + 1)}>
                Load more
              </Button>
            </div>
          )}
        </section>

        <Separator />

        {/* ═══════════════ 3. RECOMMENDED FOR YOU ═══════════════ */}
        <section>
          <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Recommended for You
          </h2>

          {/* Suggested quests */}
          {suggestedQuests.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Quests</h3>
                <Button variant="ghost" size="sm" asChild><Link to="/explore?tab=quests">View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {suggestedQuests.map((quest, i) => {
                  const guild = getGuildById(quest.guildId);
                  return (
                    <motion.div key={quest.id} custom={i} variants={fadeUp} initial="hidden" animate="show">
                      <Link to={`/quests/${quest.id}`} className="block rounded-xl border border-border bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-display font-semibold text-sm">{quest.title}</h4>
                          <Badge className="bg-primary/10 text-primary border-0 text-xs">{quest.rewardXp} XP</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{quest.description}</p>
                        <span className="text-[11px] text-muted-foreground">{guild?.name}</span>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Suggested guilds */}
          {suggestedGuilds.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Guilds</h3>
                <Button variant="ghost" size="sm" asChild><Link to="/explore?tab=guilds">View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {suggestedGuilds.map((guild, i) => {
                  const topics = getTopicsForGuild(guild.id);
                  return (
                    <motion.div key={guild.id} custom={i} variants={fadeUp} initial="hidden" animate="show">
                      <Link to={`/guilds/${guild.id}`} className="block rounded-xl border border-border bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all">
                        <div className="flex items-center gap-3 mb-2">
                          <img src={guild.logoUrl} className="h-9 w-9 rounded-lg" alt="" />
                          <div>
                            <h4 className="font-display font-semibold text-sm">{guild.name}</h4>
                            <span className="text-xs text-muted-foreground capitalize">{guild.type.toLowerCase()}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {topics.slice(0, 2).map((t) => <Badge key={t.id} variant="secondary" className="text-[10px]">{t.name}</Badge>)}
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Suggested services */}
          {suggestedServices.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Services</h3>
                <Button variant="ghost" size="sm" asChild><Link to="/explore?tab=services">View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {suggestedServices.map((svc, i) => {
                  const provider = svc.providerUserId ? getUserById(svc.providerUserId) : null;
                  return (
                    <motion.div key={svc.id} custom={i} variants={fadeUp} initial="hidden" animate="show">
                      <Link to={`/services/${svc.id}`} className="block rounded-xl border border-border bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all">
                        <h4 className="font-display font-semibold text-sm mb-1">{svc.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{svc.durationMinutes} min</span>
                          <span>{!svc.priceAmount ? "Free" : `€${svc.priceAmount}`}</span>
                        </div>
                        {provider && <span className="text-[11px] text-muted-foreground mt-1 block">{provider.name}</span>}
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <Separator />

        {/* ═══════════════ 4. TODAY'S TOP QUESTS (carousel) ═══════════════ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold flex items-center gap-2">
              <Compass className="h-5 w-5 text-primary" /> Top Quests
            </h2>
            <Button variant="ghost" size="sm" asChild><Link to="/explore?tab=quests">View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
            {topQuests.map((quest, i) => {
              const guild = getGuildById(quest.guildId);
              return (
                <motion.div key={quest.id} custom={i} variants={fadeUp} initial="hidden" animate="show"
                  className="min-w-[260px] max-w-[300px] snap-start shrink-0"
                >
                  <Link to={`/quests/${quest.id}`} className="block rounded-xl border border-border bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all h-full">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-primary/10 text-primary border-0 text-xs">{quest.rewardXp} XP</Badge>
                      <Badge variant="outline" className="text-[10px] capitalize">{quest.status.toLowerCase().replace("_", " ")}</Badge>
                    </div>
                    <h4 className="font-display font-semibold text-sm mb-1">{quest.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{quest.description}</p>
                    <span className="text-[11px] text-muted-foreground">{guild?.name}</span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ═══════════════ 5. ACTIVE PODS ═══════════════ */}
        {myPods.length > 0 && (
          <>
            <Separator />
            <section>
              <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
                <CircleDot className="h-5 w-5 text-primary" /> Your Active Pods
              </h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {myPods.map((pod, i) => (
                  <motion.div key={pod!.id} custom={i} variants={fadeUp} initial="hidden" animate="show">
                    <Link to={`/pods/${pod!.id}`} className="block rounded-xl border border-border bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all">
                      <h4 className="font-display font-semibold text-sm mb-1">{pod!.name}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{pod!.description}</p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Badge variant="outline" className="text-[10px] capitalize">{pod!.type.toLowerCase().replace("_", " ")}</Badge>
                        {pod!.startDate && <span>Started {formatDistanceToNow(new Date(pod!.startDate), { addSuffix: true })}</span>}
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ═══════════════ 6. UPCOMING BOOKINGS ═══════════════ */}
        <Separator />
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-primary" /> Upcoming Bookings
            </h2>
            <Button variant="ghost" size="sm" asChild><Link to="/me/bookings">View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button>
          </div>
          {myBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming bookings.</p>
          ) : (
            <div className="space-y-3">
              {myBookings.map((bk, i) => {
                const svc = services.find((s) => s.id === bk.serviceId);
                const isProvider = bk.providerUserId === currentUser.id;
                return (
                  <motion.div key={bk.id} custom={i} variants={fadeUp} initial="hidden" animate="show">
                    <Link to={`/bookings/${bk.id}`} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:shadow-sm transition-all">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Video className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-display font-semibold text-sm">{svc?.title || "Session"}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {bk.startDateTime && <span>{new Date(bk.startDateTime).toLocaleDateString()}</span>}
                            <Badge variant="outline" className="text-[10px] capitalize">{bk.status.toLowerCase()}</Badge>
                            {isProvider && <Badge variant="secondary" className="text-[10px]">Provider</Badge>}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* ═══════════════ 7. XP & ACHIEVEMENTS ═══════════════ */}
        <Separator />
        <section>
          <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-warning" /> XP & Achievements
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">XP Balance</span>
                <span className="flex items-center gap-1 text-lg font-bold text-primary"><Zap className="h-5 w-5" /> {currentUser.xp}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                <span>This week</span>
                <span className="font-semibold text-foreground">+{xpThisWeek} XP</span>
              </div>
              <Button size="sm" variant="outline" asChild className="w-full"><Link to="/me/xp">View XP history</Link></Button>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Recent Achievements</span>
                <Badge variant="secondary">{achievements.filter((a) => a.userId === currentUser.id).length}</Badge>
              </div>
              {achievements.filter((a) => a.userId === currentUser.id).slice(0, 2).map((ach) => (
                <Link key={ach.id} to={`/achievements/${ach.id}`} className="flex items-center gap-2 mb-2 hover:text-primary transition-colors">
                  <Star className="h-4 w-4 text-warning shrink-0" />
                  <span className="text-sm truncate">{ach.title}</span>
                </Link>
              ))}
              <Button size="sm" variant="outline" asChild className="w-full mt-2"><Link to={`/users/${currentUser.id}`}>View all achievements</Link></Button>
            </div>
          </div>
        </section>

        {/* ═══════════════ 8. FEATURED HOUSES & TERRITORIES ═══════════════ */}
        {featuredTopicContent.length > 0 && (
          <>
            <Separator />
            <section>
              <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
                <Hash className="h-5 w-5 text-primary" /> Featured in Your Houses
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {featuredTopicContent.map((feat, i) => (
                  <motion.div key={feat.id} custom={i} variants={fadeUp} initial="hidden" animate="show">
                    <Link
                      to={feat.targetType === TopicFeatureTargetType.QUEST ? `/quests/${feat.targetId}` : `/guilds/${feat.targetId}`}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:shadow-sm hover:border-primary/30 transition-all"
                    >
                      <div className="h-10 w-10 rounded-lg bg-accent/30 flex items-center justify-center shrink-0">
                        {feat.targetType === TopicFeatureTargetType.QUEST ? <Compass className="h-5 w-5 text-primary" /> : <Shield className="h-5 w-5 text-primary" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-display font-semibold text-sm truncate">
                          {(feat.entity as any)?.title || (feat.entity as any)?.name}
                        </h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">{feat.topic?.name}</Badge>
                          <Badge variant="outline" className="text-[10px] capitalize">{feat.targetType.toLowerCase()}</Badge>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ═══════════════ 9. AI AGENTS ═══════════════ */}
        <Separator />
        <section>
          <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" /> AI Agents
          </h2>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap gap-2 mb-4">
              {myTopicIds.slice(0, 3).map((tid) => {
                const topic = getTopicById(tid);
                return topic ? (
                  <Badge key={tid} variant="secondary" className="text-xs">
                    <Bot className="h-3 w-3 mr-1" /> {topic.name} Agent
                  </Badge>
                ) : null;
              })}
              {myTerritoryIds.slice(0, 2).map((tid) => {
                const terr = getTerritoryById(tid);
                return terr ? (
                  <Badge key={tid} variant="outline" className="text-xs">
                    <MapPin className="h-3 w-3 mr-1" /> {terr.name} Agent
                  </Badge>
                ) : null;
              })}
            </div>
            <Button size="sm" variant="outline">
              <Sparkles className="h-3.5 w-3.5 mr-1" /> Suggest next quest for me
            </Button>
          </div>
        </section>

      </div>
    </PageShell>
  );
}

// ── Stat Card ──
function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${accent ? "bg-primary/10" : "bg-muted"}`}>
        <Icon className={`h-4.5 w-4.5 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      </div>
      <div>
        <p className="text-lg font-bold leading-tight">{value}</p>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

// ── Feed Item Card ──
function FeedItemCard({ item, index, updateTypeIcon }: { item: FeedItem; index: number; updateTypeIcon: Record<string, any> }) {
  if (item.type === "quest_update") {
    const qu = item.data;
    const author = getUserById(qu.authorId);
    const quest = getQuestById(qu.questId);
    const Icon = updateTypeIcon[qu.type];
    return (
      <motion.div custom={index} variants={fadeUp} initial="hidden" animate="show"
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
          <Link to={`/quests/${qu.questId}`} className="font-display font-medium text-sm hover:text-primary transition-colors">{qu.title}</Link>
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
    return (
      <motion.div custom={index} variants={fadeUp} initial="hidden" animate="show">
        <Link to={`/achievements/${ach.id}`} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:shadow-sm hover:border-warning/30 transition-all">
          <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
            <Star className="h-5 w-5 text-warning" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <Avatar className="h-5 w-5"><AvatarImage src={user?.avatarUrl} /><AvatarFallback>{user?.name?.[0]}</AvatarFallback></Avatar>
              <span className="font-medium">{user?.name}</span>
              <Badge variant="secondary" className="text-[10px]">Achievement</Badge>
            </div>
            <p className="font-display font-semibold text-sm mt-0.5">{ach.title}</p>
          </div>
          <span className="text-[11px] text-muted-foreground shrink-0">{formatDistanceToNow(new Date(ach.createdAt), { addSuffix: true })}</span>
        </Link>
      </motion.div>
    );
  }

  if (item.type === "comment") {
    const c = item.data;
    const author = getUserById(c.authorId);
    return (
      <motion.div custom={index} variants={fadeUp} initial="hidden" animate="show"
        className="flex items-start gap-4 rounded-xl border border-border bg-card p-4"
      >
        <Avatar className="h-9 w-9 mt-0.5">
          <AvatarImage src={author?.avatarUrl} />
          <AvatarFallback>{author?.name?.[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{author?.name}</span>
            <Badge variant="secondary" className="text-[10px]">Comment</Badge>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{c.content}</p>
          <span className="text-[11px] text-muted-foreground mt-1 block">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
        </div>
      </motion.div>
    );
  }

  // quest
  const q = item.data;
  const guild = getGuildById(q.guildId);
  return (
    <motion.div custom={index} variants={fadeUp} initial="hidden" animate="show">
      <Link to={`/quests/${q.id}`} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:shadow-sm hover:border-primary/30 transition-all">
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
}
