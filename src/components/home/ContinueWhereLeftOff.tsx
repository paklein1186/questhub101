import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, FileEdit, CircleDot, Inbox, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
      const [unfinishedQuests, draftServices, draftCourses, activePods, pendingApps] = await Promise.all([
        supabase.from("quest_participants").select("quest_id, quests(id, title, status)")
          .eq("user_id", userId).eq("status", "active").limit(5),
        supabase.from("services").select("id, title").eq("provider_user_id", userId)
          .eq("is_draft", true).eq("is_deleted", false).limit(5),
        supabase.from("courses").select("id, title").eq("owner_user_id", userId)
          .eq("is_published", false).eq("is_deleted", false).limit(5),
        supabase.from("pod_members").select("pod_id, pods(id, name, type)")
          .eq("user_id", userId).limit(5),
        supabase.from("guild_applications").select("id, guild_id, guilds(name), status")
          .eq("applicant_user_id", userId).eq("status", "PENDING").limit(5),
      ]);

      const items: { id: string; title: string; type: string; icon: string; route: string }[] = [];

      (unfinishedQuests.data ?? []).forEach((q: any) => {
        if (q.quests && q.quests.status !== "COMPLETED") {
          items.push({ id: q.quest_id, title: q.quests.title, type: "Quest", icon: "quest", route: `/quests/${q.quest_id}` });
        }
      });
      (draftServices.data ?? []).forEach((s: any) => {
        items.push({ id: s.id, title: s.title, type: "Draft Service", icon: "draft", route: `/services/${s.id}` });
      });
      (draftCourses.data ?? []).forEach((c: any) => {
        items.push({ id: c.id, title: c.title, type: "Draft Course", icon: "draft", route: `/courses/${c.id}` });
      });
      (activePods.data ?? []).forEach((p: any) => {
        if (p.pods) items.push({ id: p.pod_id, title: p.pods.name, type: "Pod", icon: "pod", route: `/pods/${p.pod_id}` });
      });
      (pendingApps.data ?? []).forEach((a: any) => {
        items.push({ id: a.id, title: a.guilds?.name || "Application", type: "Pending Application", icon: "pending", route: `/guilds/${a.guild_id}` });
      });

      return items.slice(0, 6);
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  if (!data || data.length === 0) return null;

  const iconMap: Record<string, any> = { quest: Clock, draft: FileEdit, pod: CircleDot, pending: Inbox };

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
                  <Badge variant="secondary" className="text-[10px]">{item.type}</Badge>
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
