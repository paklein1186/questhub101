import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Shield, Compass, CircleDot, BookOpen, Briefcase, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04 } }),
};

interface Props {
  userId: string;
  userTopicIds: string[];
  userTerritoryIds: string[];
}

export function YourUniverse({ userId, userTopicIds, userTerritoryIds }: Props) {
  const { data } = useQuery({
    queryKey: ["your-universe", userId, userTopicIds, userTerritoryIds],
    queryFn: async () => {
      const [questsRes, guildsRes, podsRes, coursesRes, usersRes, servicesRes] = await Promise.all([
        // Quests matching user's topics
        supabase.from("quests").select("id, title, description, reward_xp, status, quest_topics(topic_id), guilds(name)")
          .eq("is_deleted", false).eq("is_draft", false)
          .in("status", ["OPEN", "IN_PROGRESS"])
          .order("created_at", { ascending: false }).limit(20),
        // Guilds
        supabase.from("guilds").select("id, name, logo_url, type, guild_topics(topic_id, topics(name))")
          .eq("is_deleted", false).eq("is_approved", true).eq("is_draft", false)
          .order("created_at", { ascending: false }).limit(10),
        // Pods
        supabase.from("pods").select("id, name, type, topic_id, start_date")
          .eq("is_deleted", false).eq("is_draft", false)
          .order("created_at", { ascending: false }).limit(10),
        // Courses
        supabase.from("courses").select("id, title, level, is_free, cover_image_url, course_topics(topic_id)")
          .eq("is_deleted", false).eq("is_published", true)
          .order("created_at", { ascending: false }).limit(10),
        // Users to follow
        supabase.from("profiles_public").select("user_id, name, avatar_url, headline, xp")
          .neq("user_id", userId)
          .order("xp", { ascending: false }).limit(6),
        // Services
        supabase.from("services").select("id, title, duration_minutes, price_amount, price_currency")
          .eq("is_deleted", false).eq("is_active", true).eq("is_draft", false)
          .neq("provider_user_id", userId)
          .order("created_at", { ascending: false }).limit(6),
      ]);

      // Score quests by topic overlap
      const scoredQuests = (questsRes.data ?? []).map((q: any) => {
        const qTopicIds = (q.quest_topics ?? []).map((qt: any) => qt.topic_id);
        const score = qTopicIds.filter((id: string) => userTopicIds.includes(id)).length;
        return { ...q, score };
      }).sort((a: any, b: any) => b.score - a.score).slice(0, 4);

      // Score guilds
      const scoredGuilds = (guildsRes.data ?? []).map((g: any) => {
        const gTopicIds = (g.guild_topics ?? []).map((gt: any) => gt.topic_id);
        const score = gTopicIds.filter((id: string) => userTopicIds.includes(id)).length;
        return { ...g, score };
      }).sort((a: any, b: any) => b.score - a.score).slice(0, 3);

      // Score pods
      const scoredPods = (podsRes.data ?? []).map((p: any) => ({
        ...p,
        score: p.topic_id && userTopicIds.includes(p.topic_id) ? 1 : 0,
      })).sort((a: any, b: any) => b.score - a.score).slice(0, 3);

      // Score courses
      const scoredCourses = (coursesRes.data ?? []).map((c: any) => {
        const cTopicIds = (c.course_topics ?? []).map((ct: any) => ct.topic_id);
        const score = cTopicIds.filter((id: string) => userTopicIds.includes(id)).length;
        return { ...c, score };
      }).sort((a: any, b: any) => b.score - a.score).slice(0, 3);

      return {
        quests: scoredQuests,
        guilds: scoredGuilds,
        pods: scoredPods,
        courses: scoredCourses,
        users: usersRes.data ?? [],
        services: servicesRes.data ?? [],
      };
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  if (!data) return null;

  const hasContent = data.quests.length > 0 || data.guilds.length > 0 || data.courses.length > 0 || data.services.length > 0;
  if (!hasContent) return null;

  return (
    <section className="space-y-6">
      <h2 className="font-display text-xl font-semibold flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" /> Your Universe
      </h2>

      {/* Quests */}
      {data.quests.length > 0 && (
        <SubSection title="Recommended Quests" icon={Compass} viewAllLink="/explore?tab=quests">
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
            {data.quests.map((quest: any, i: number) => (
              <motion.div key={quest.id} custom={i} variants={fadeUp} initial="hidden" animate="show"
                className="min-w-[240px] max-w-[280px] snap-start shrink-0">
                <Link to={`/quests/${quest.id}`}
                  className="block rounded-xl border border-border bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all h-full">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-primary/10 text-primary border-0 text-xs">{quest.reward_xp} XP</Badge>
                    <Badge variant="outline" className="text-[10px] capitalize">{quest.status.toLowerCase()}</Badge>
                  </div>
                  <h4 className="font-display font-semibold text-sm mb-1 line-clamp-1">{quest.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">{quest.description}</p>
                  {quest.guilds?.name && <span className="text-[11px] text-muted-foreground mt-1 block">{quest.guilds.name}</span>}
                </Link>
              </motion.div>
            ))}
          </div>
        </SubSection>
      )}

      {/* Guilds */}
      {data.guilds.length > 0 && (
        <SubSection title="Guilds for you" icon={Shield} viewAllLink="/explore?tab=guilds">
          <div className="grid gap-3 sm:grid-cols-3">
            {data.guilds.map((guild: any, i: number) => {
              const topics = (guild.guild_topics ?? []).map((gt: any) => gt.topics).filter(Boolean);
              return (
                <motion.div key={guild.id} custom={i} variants={fadeUp} initial="hidden" animate="show">
                  <Link to={`/guilds/${guild.id}`}
                    className="block rounded-xl border border-border bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-3 mb-2">
                      <img src={guild.logo_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${guild.name}`}
                        className="h-9 w-9 rounded-lg" alt="" />
                      <div className="min-w-0">
                        <h4 className="font-display font-semibold text-sm truncate">{guild.name}</h4>
                        <span className="text-xs text-muted-foreground capitalize">{guild.type.toLowerCase()}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {topics.slice(0, 2).map((t: any) => <Badge key={t.name} variant="secondary" className="text-[10px]">{t.name}</Badge>)}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </SubSection>
      )}

      {/* Pods & Courses row */}
      <div className="grid gap-6 md:grid-cols-2">
        {data.pods.length > 0 && (
          <SubSection title="Pods" icon={CircleDot} viewAllLink="/explore?tab=pods">
            <div className="space-y-2">
              {data.pods.map((pod: any, i: number) => (
                <motion.div key={pod.id} custom={i} variants={fadeUp} initial="hidden" animate="show">
                  <Link to={`/pods/${pod.id}`}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-all">
                    <CircleDot className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{pod.name}</p>
                      <Badge variant="outline" className="text-[10px] capitalize">{pod.type.toLowerCase().replace("_", " ")}</Badge>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </SubSection>
        )}

        {data.courses.length > 0 && (
          <SubSection title="Courses" icon={BookOpen} viewAllLink="/explore?tab=courses">
            <div className="space-y-2">
              {data.courses.map((course: any, i: number) => (
                <motion.div key={course.id} custom={i} variants={fadeUp} initial="hidden" animate="show">
                  <Link to={`/courses/${course.id}`}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-all">
                    <BookOpen className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{course.title}</p>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-[10px] capitalize">{course.level}</Badge>
                        {course.is_free && <Badge variant="secondary" className="text-[10px]">Free</Badge>}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </SubSection>
        )}
      </div>

      {/* Users to follow */}
      {data.users.length > 0 && (
        <SubSection title="People to follow" icon={Users} viewAllLink="/explore?tab=users">
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
            {data.users.map((u: any, i: number) => (
              <motion.div key={u.user_id} custom={i} variants={fadeUp} initial="hidden" animate="show"
                className="min-w-[160px] snap-start shrink-0">
                <Link to={`/users/${u.user_id}`}
                  className="flex flex-col items-center rounded-xl border border-border bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all text-center">
                  <Avatar className="h-10 w-10 mb-2">
                    <AvatarImage src={u.avatar_url ?? undefined} />
                    <AvatarFallback>{(u.name || "?")[0]}</AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-medium truncate w-full">{u.name}</p>
                  {u.headline && <p className="text-[10px] text-muted-foreground truncate w-full">{u.headline}</p>}
                </Link>
              </motion.div>
            ))}
          </div>
        </SubSection>
      )}

      {/* Services */}
      {data.services.length > 0 && (
        <SubSection title="Services you might need" icon={Briefcase} viewAllLink="/explore?tab=services">
          <div className="grid gap-3 sm:grid-cols-3">
            {data.services.map((svc: any, i: number) => (
              <motion.div key={svc.id} custom={i} variants={fadeUp} initial="hidden" animate="show">
                <Link to={`/services/${svc.id}`}
                  className="block rounded-xl border border-border bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all">
                  <h4 className="font-display font-semibold text-sm mb-1 truncate">{svc.title}</h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {svc.duration_minutes && <span>{svc.duration_minutes} min</span>}
                    <span>{!svc.price_amount ? "Free" : `€${svc.price_amount}`}</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </SubSection>
      )}
    </section>
  );
}

function SubSection({ title, icon: Icon, viewAllLink, children }: {
  title: string; icon: any; viewAllLink: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          <Icon className="h-4 w-4" /> {title}
        </h3>
        <Button variant="ghost" size="sm" asChild>
          <Link to={viewAllLink}>View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
        </Button>
      </div>
      {children}
    </div>
  );
}
