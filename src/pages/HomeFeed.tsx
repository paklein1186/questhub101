import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield, Compass, ArrowRight, Sparkles, Star, Trophy, Rss, Rocket,
  Zap, Plus, CalendarCheck, CircleDot, Users, Hash, MapPin,
  Bot, ChevronRight, Clock, Video, Filter, Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { PageShell } from "@/components/PageShell";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAuth } from "@/hooks/useAuth";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04 } }),
};

// ── Data hooks ──

function useHomeFeedData(userId: string) {
  return useQuery({
    queryKey: ["home-feed-data", userId],
    queryFn: async () => {
      if (!userId) return null;

      const [
        guildMembersRes, questParticipantsRes, podMembersRes,
        topicsRes, territoriesRes, achievementsRes,
        bookingsRes, topQuestsRes, suggestedGuildsRes,
        suggestedServicesRes,
      ] = await Promise.all([
        supabase.from("guild_members").select("guild_id").eq("user_id", userId),
        supabase.from("quest_participants").select("quest_id").eq("user_id", userId),
        supabase.from("pod_members").select("pod_id, pods(id, name, description, type, start_date)").eq("user_id", userId),
        supabase.from("user_topics").select("topic_id, topics(id, name)").eq("user_id", userId),
        supabase.from("user_territories").select("territory_id, territories(id, name)").eq("user_id", userId),
        supabase.from("achievements").select("id, title, created_at, user_id").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
        supabase.from("bookings").select("id, status, start_date_time, service_id, provider_user_id, requester_id, services(title)")
          .or(`requester_id.eq.${userId},provider_user_id.eq.${userId}`)
          .in("status", ["CONFIRMED", "REQUESTED"])
          .eq("is_deleted", false)
          .order("start_date_time", { ascending: true })
          .limit(3),
        supabase.from("quests").select("id, title, description, reward_xp, status, guild_id, guilds(name)")
          .eq("is_deleted", false).eq("is_draft", false)
          .order("reward_xp", { ascending: false }).limit(5),
        supabase.from("guilds").select("id, name, logo_url, type, guild_topics(topic_id, topics(id, name))")
          .eq("is_deleted", false).eq("is_approved", true)
          .order("created_at", { ascending: false }).limit(3),
        supabase.from("services").select("id, title, duration_minutes, price_amount, provider_user_id")
          .eq("is_deleted", false).eq("is_active", true)
          .neq("provider_user_id", userId)
          .order("created_at", { ascending: false }).limit(3),
      ]);

      const myGuildIds = (guildMembersRes.data ?? []).map((m) => m.guild_id);
      const myQuestIds = (questParticipantsRes.data ?? []).map((m) => m.quest_id);
      const myPods = (podMembersRes.data ?? []).map((m: any) => m.pods).filter(Boolean);
      const myTopics = (topicsRes.data ?? []).map((r: any) => r.topics).filter(Boolean);
      const myTerritories = (territoriesRes.data ?? []).map((r: any) => r.territories).filter(Boolean);

      return {
        myGuildIds,
        myQuestIds,
        myPods,
        myTopics,
        myTerritories,
        achievements: achievementsRes.data ?? [],
        bookings: bookingsRes.data ?? [],
        topQuests: topQuestsRes.data ?? [],
        suggestedGuilds: (suggestedGuildsRes.data ?? []).filter((g) => !myGuildIds.includes(g.id)),
        suggestedServices: suggestedServicesRes.data ?? [],
      };
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export default function HomeFeed() {
  const currentUser = useCurrentUser();
  const { user: authUser } = useAuth();
  const { percentage, isComplete, completedCount, totalSteps } = useOnboardingProgress();

  const { data, isLoading } = useHomeFeedData(currentUser.id);

  const myGuildIds = data?.myGuildIds ?? [];
  const myQuestIds = data?.myQuestIds ?? [];
  const myPods = data?.myPods ?? [];
  const myTopics = data?.myTopics ?? [];
  const myTerritories = data?.myTerritories ?? [];
  const achievements = data?.achievements ?? [];
  const myBookings = data?.bookings ?? [];
  const topQuests = data?.topQuests ?? [];
  const suggestedGuilds = data?.suggestedGuilds ?? [];
  const suggestedServices = data?.suggestedServices ?? [];

  if (isLoading) {
    return (
      <PageShell>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="max-w-5xl mx-auto space-y-8">

        {/* ═══ 1. PERSONAL HEADER ═══ */}
        <motion.section initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={currentUser.avatarUrl} />
              <AvatarFallback className="text-xl">{currentUser.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold">
                Welcome back, <span className="text-primary">{(authUser?.name || currentUser.name).split(" ")[0]}</span>
              </h1>
              <p className="text-sm text-muted-foreground capitalize">{(authUser?.role || currentUser.role).toLowerCase().replace("_", " ")}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <StatCard icon={Zap} label="XP" value={currentUser.xp} accent />
            <StatCard icon={Star} label="Contribution" value={currentUser.contributionIndex} />
            <StatCard icon={Shield} label="Guilds" value={myGuildIds.length} />
            <StatCard icon={Compass} label="Quests" value={myQuestIds.length} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" asChild><Link to="/explore?tab=quests"><Plus className="h-3.5 w-3.5 mr-1" /> Create Quest</Link></Button>
            <Button size="sm" variant="outline" asChild><Link to="/explore?tab=services"><CalendarCheck className="h-3.5 w-3.5 mr-1" /> Book a Session</Link></Button>
            <Button size="sm" variant="outline" asChild><Link to="/explore?tab=pods"><CircleDot className="h-3.5 w-3.5 mr-1" /> Start a Pod</Link></Button>
            <Button size="sm" variant="outline" asChild><Link to="/explore?tab=guilds"><Shield className="h-3.5 w-3.5 mr-1" /> Join a Guild</Link></Button>
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

        {/* ═══ 2. RECOMMENDED ═══ */}
        <section>
          <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Recommended for You
          </h2>

          {suggestedGuilds.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Guilds</h3>
                <Button variant="ghost" size="sm" asChild><Link to="/explore?tab=guilds">View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {suggestedGuilds.map((guild: any, i: number) => {
                  const gTopics = (guild.guild_topics ?? []).map((gt: any) => gt.topics).filter(Boolean);
                  return (
                    <motion.div key={guild.id} custom={i} variants={fadeUp} initial="hidden" animate="show">
                      <Link to={`/guilds/${guild.id}`} className="block rounded-xl border border-border bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all">
                        <div className="flex items-center gap-3 mb-2">
                          <img src={guild.logo_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${guild.name}`} className="h-9 w-9 rounded-lg" alt="" />
                          <div>
                            <h4 className="font-display font-semibold text-sm">{guild.name}</h4>
                            <span className="text-xs text-muted-foreground capitalize">{guild.type.toLowerCase()}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {gTopics.slice(0, 2).map((t: any) => <Badge key={t.id} variant="secondary" className="text-[10px]">{t.name}</Badge>)}
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {suggestedServices.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">Services</h3>
                <Button variant="ghost" size="sm" asChild><Link to="/explore?tab=services">View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {suggestedServices.map((svc: any, i: number) => (
                  <motion.div key={svc.id} custom={i} variants={fadeUp} initial="hidden" animate="show">
                    <Link to={`/services/${svc.id}`} className="block rounded-xl border border-border bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all">
                      <h4 className="font-display font-semibold text-sm mb-1">{svc.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{svc.duration_minutes} min</span>
                        <span>{!svc.price_amount ? "Free" : `€${svc.price_amount}`}</span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </section>

        <Separator />

        {/* ═══ 3. TOP QUESTS ═══ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold flex items-center gap-2">
              <Compass className="h-5 w-5 text-primary" /> Top Quests
            </h2>
            <Button variant="ghost" size="sm" asChild><Link to="/explore?tab=quests">View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
            {topQuests.map((quest: any, i: number) => (
              <motion.div key={quest.id} custom={i} variants={fadeUp} initial="hidden" animate="show"
                className="min-w-[260px] max-w-[300px] snap-start shrink-0"
              >
                <Link to={`/quests/${quest.id}`} className="block rounded-xl border border-border bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all h-full">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-primary/10 text-primary border-0 text-xs">{quest.reward_xp} XP</Badge>
                    <Badge variant="outline" className="text-[10px] capitalize">{quest.status.toLowerCase().replace("_", " ")}</Badge>
                  </div>
                  <h4 className="font-display font-semibold text-sm mb-1">{quest.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{quest.description}</p>
                  <span className="text-[11px] text-muted-foreground">{quest.guilds?.name}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ═══ 4. ACTIVE PODS ═══ */}
        {myPods.length > 0 && (
          <>
            <Separator />
            <section>
              <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
                <CircleDot className="h-5 w-5 text-primary" /> Your Active Pods
              </h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {myPods.map((pod: any, i: number) => (
                  <motion.div key={pod.id} custom={i} variants={fadeUp} initial="hidden" animate="show">
                    <Link to={`/pods/${pod.id}`} className="block rounded-xl border border-border bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all">
                      <h4 className="font-display font-semibold text-sm mb-1">{pod.name}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{pod.description}</p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Badge variant="outline" className="text-[10px] capitalize">{pod.type.toLowerCase().replace("_", " ")}</Badge>
                        {pod.start_date && <span>Started {formatDistanceToNow(new Date(pod.start_date), { addSuffix: true })}</span>}
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ═══ 5. UPCOMING BOOKINGS ═══ */}
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
              {myBookings.map((bk: any, i: number) => {
                const isProvider = bk.provider_user_id === currentUser.id;
                return (
                  <motion.div key={bk.id} custom={i} variants={fadeUp} initial="hidden" animate="show">
                    <Link to={`/bookings/${bk.id}`} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:shadow-sm transition-all">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Video className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-display font-semibold text-sm">{bk.services?.title || "Session"}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {bk.start_date_time && <span>{new Date(bk.start_date_time).toLocaleDateString()}</span>}
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

        {/* ═══ 6. XP & ACHIEVEMENTS ═══ */}
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
              <Button size="sm" variant="outline" asChild className="w-full"><Link to="/me/xp">View XP history</Link></Button>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Recent Achievements</span>
                <Badge variant="secondary">{achievements.length}</Badge>
              </div>
              {achievements.slice(0, 2).map((ach: any) => (
                <Link key={ach.id} to={`/achievements/${ach.id}`} className="flex items-center gap-2 mb-2 hover:text-primary transition-colors">
                  <Star className="h-4 w-4 text-warning shrink-0" />
                  <span className="text-sm truncate">{ach.title}</span>
                </Link>
              ))}
              <Button size="sm" variant="outline" asChild className="w-full mt-2"><Link to={`/users/${currentUser.id}`}>View all achievements</Link></Button>
            </div>
          </div>
        </section>

        {/* ═══ 7. MY TOPICS/TERRITORIES ═══ */}
        {(myTopics.length > 0 || myTerritories.length > 0) && (
          <>
            <Separator />
            <section>
              <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
                <Hash className="h-5 w-5 text-primary" /> Your Houses & Territories
              </h2>
              <div className="flex flex-wrap gap-2">
                {myTopics.map((t: any) => (
                  <Link key={t.id} to={`/topics/${t.name?.toLowerCase().replace(/\s+/g, "-")}`}>
                    <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-accent/10">{t.name}</Badge>
                  </Link>
                ))}
                {myTerritories.map((t: any) => (
                  <Badge key={t.id} variant="outline" className="text-xs">
                    <MapPin className="h-3 w-3 mr-1" /> {t.name}
                  </Badge>
                ))}
              </div>
            </section>
          </>
        )}

      </div>
    </PageShell>
  );
}

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
