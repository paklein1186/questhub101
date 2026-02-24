import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, FileEdit, CircleDot, Inbox, ChevronRight, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05 } }),
};

interface Props { userId: string }

export function ContinueWhereLeftOff({ userId }: Props) {
  const { data } = useQuery({
    queryKey: ["continue-where-left", userId],
    queryFn: async () => {
      const [unfinishedQuests, draftServices, draftCourses, activePods, pendingApps, ownedQuests] = await Promise.all([
        supabase.from("quest_participants").select("quest_id, quests(id, title, status, cover_image_url, description)")
          .eq("user_id", userId).eq("status", "active").limit(5),
        supabase.from("services").select("id, title, cover_image_url, short_description").eq("provider_user_id", userId)
          .eq("is_draft", true).eq("is_deleted", false).limit(5),
        supabase.from("courses").select("id, title, cover_image_url, description").eq("owner_user_id", userId)
          .eq("is_published", false).eq("is_deleted", false).limit(5),
        supabase.from("pod_members").select("pod_id, pods(id, name, type, avatar_url, description)")
          .eq("user_id", userId).limit(5),
        supabase.from("guild_applications").select("id, guild_id, guilds(name, logo_url, description), status")
          .eq("applicant_user_id", userId).eq("status", "PENDING").limit(5),
        supabase.from("quests").select("id, title, status, cover_image_url, description")
          .eq("created_by_user_id", userId).eq("is_deleted", false)
          .in("status", ["OPEN", "ACTIVE", "IN_PROGRESS", "OPEN_FOR_PROPOSALS"])
          .limit(3),
      ]);

      const truncate = (s: string | null | undefined, max = 60) => {
        if (!s) return null;
        const clean = s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
        return clean.length > max ? clean.slice(0, max) + "…" : clean;
      };

      const items: { id: string; title: string; type: string; icon: string; route: string; imageUrl?: string | null; subtitle?: string | null }[] = [];

      (unfinishedQuests.data ?? []).forEach((q: any) => {
        if (q.quests && q.quests.status !== "COMPLETED") {
          items.push({ id: q.quest_id, title: q.quests.title, type: "Quest", icon: "quest", route: `/quests/${q.quest_id}`, imageUrl: q.quests.cover_image_url, subtitle: truncate(q.quests.description) });
        }
      });
      (draftServices.data ?? []).forEach((s: any) => {
        items.push({ id: s.id, title: s.title, type: "Draft Service", icon: "draft", route: `/services/${s.id}`, imageUrl: s.cover_image_url, subtitle: truncate(s.short_description) });
      });
      (draftCourses.data ?? []).forEach((c: any) => {
        items.push({ id: c.id, title: c.title, type: "Draft Course", icon: "draft", route: `/courses/${c.id}`, imageUrl: c.cover_image_url, subtitle: truncate(c.description) });
      });
      (activePods.data ?? []).forEach((p: any) => {
        if (p.pods) items.push({ id: p.pod_id, title: p.pods.name, type: "Pod", icon: "pod", route: `/pods/${p.pod_id}`, imageUrl: p.pods.avatar_url, subtitle: truncate(p.pods.description) });
      });
      (pendingApps.data ?? []).forEach((a: any) => {
        items.push({ id: a.id, title: a.guilds?.name || "Application", type: "Pending Application", icon: "pending", route: `/guilds/${a.guild_id}`, imageUrl: a.guilds?.logo_url, subtitle: truncate(a.guilds?.description) });
      });
      (ownedQuests.data ?? []).forEach((q: any) => {
        if (!items.some(it => it.id === `update-${q.id}`)) {
          items.push({ id: `update-${q.id}`, title: `Post update on "${q.title}"`, type: "Quest Update", icon: "update", route: `/quests/${q.id}?tab=updates`, imageUrl: q.cover_image_url, subtitle: truncate(q.description) });
        }
      });

      return items.slice(0, 6);
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  if (!data || data.length === 0) return null;

  const iconMap: Record<string, any> = { quest: Clock, draft: FileEdit, pod: CircleDot, pending: Inbox, update: Send };

  return (
    <section>
      <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" /> Continue where you left off
      </h2>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((item, i) => {
          const Icon = iconMap[item.icon] || Clock;
          return (
            <motion.div key={item.id} custom={i} variants={fadeUp} initial="hidden" animate="show">
              <Link to={item.route}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-primary/30 hover:shadow-sm transition-all group">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={item.imageUrl || undefined} className="object-cover" />
                      <AvatarFallback className="text-[7px] bg-muted text-muted-foreground">
                        {item.title?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <Badge variant="secondary" className="text-[10px]">{item.type}</Badge>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
