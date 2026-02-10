import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Rss, Compass, Shield, Hash, MapPin, ArrowRight, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04 } }),
};

export function ThisWeekInEcosystem() {
  const { data } = useQuery({
    queryKey: ["this-week-ecosystem"],
    queryFn: async () => {
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      const [featuredQuests, highlightedGuilds, topics, territories] = await Promise.all([
        // Featured / recent quests
        supabase.from("quests").select("id, title, reward_xp, status, is_featured, guilds(name)")
          .eq("is_deleted", false).eq("is_draft", false)
          .gte("created_at", weekAgo)
          .order("is_featured", { ascending: false })
          .order("reward_xp", { ascending: false })
          .limit(4),
        // Recently active guilds (recently created or with recent members)
        supabase.from("guilds").select("id, name, logo_url, type")
          .eq("is_deleted", false).eq("is_approved", true).eq("is_draft", false)
          .order("created_at", { ascending: false }).limit(4),
        // Featured houses (topics with stewards)
        supabase.from("topics").select("id, name, slug, topic_stewards(id)")
          .eq("is_deleted", false)
          .order("name").limit(6),
        // Trending territories
        supabase.from("territories").select("id, name, level")
          .eq("is_deleted", false)
          .order("name").limit(4),
      ]);

      return {
        quests: featuredQuests.data ?? [],
        guilds: highlightedGuilds.data ?? [],
        topics: (topics.data ?? []).filter((t: any) => (t.topic_stewards ?? []).length > 0).slice(0, 4),
        territories: territories.data ?? [],
      };
    },
    staleTime: 120_000,
  });

  if (!data) return null;
  const hasContent = data.quests.length > 0 || data.guilds.length > 0;
  if (!hasContent) return null;

  return (
    <section className="space-y-6">
      <h2 className="font-display text-xl font-semibold flex items-center gap-2">
        <Rss className="h-5 w-5 text-primary" /> This week in the ecosystem
      </h2>

      {/* Featured Quests */}
      {data.quests.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Compass className="h-4 w-4" /> Curated Quests
            </h3>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/explore?tab=quests">View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.quests.map((q: any, i: number) => (
              <motion.div key={q.id} custom={i} variants={fadeUp} initial="hidden" animate="show">
                <Link to={`/quests/${q.id}`}
                  className="block rounded-xl border border-border bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all h-full">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-primary/10 text-primary border-0 text-xs">{q.reward_xp} XP</Badge>
                    {q.is_featured && <Star className="h-3.5 w-3.5 text-warning" />}
                  </div>
                  <h4 className="font-display font-semibold text-sm line-clamp-2 mb-1">{q.title}</h4>
                  {q.guilds?.name && <span className="text-[10px] text-muted-foreground">{q.guilds.name}</span>}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Highlighted Guilds */}
      {data.guilds.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Shield className="h-4 w-4" /> Highlighted Guilds
            </h3>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/explore?tab=guilds">View all <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
            {data.guilds.map((g: any, i: number) => (
              <motion.div key={g.id} custom={i} variants={fadeUp} initial="hidden" animate="show"
                className="min-w-[200px] snap-start shrink-0">
                <Link to={`/guilds/${g.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-all">
                  <img src={g.logo_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${g.name}`}
                    className="h-9 w-9 rounded-lg shrink-0" alt="" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{g.name}</p>
                    <span className="text-[10px] text-muted-foreground capitalize">{g.type.toLowerCase()}</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Houses & Territories */}
      <div className="grid gap-6 md:grid-cols-2">
        {data.topics.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-3">
              <Hash className="h-4 w-4" /> Featured Houses
            </h3>
            <div className="flex flex-wrap gap-2">
              {data.topics.map((t: any) => (
                <Link key={t.id} to={`/topics/${t.slug}`}>
                  <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors">
                    {t.name}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        )}
        {data.territories.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-3">
              <MapPin className="h-4 w-4" /> Trending Territories
            </h3>
            <div className="flex flex-wrap gap-2">
              {data.territories.map((t: any) => (
                <Badge key={t.id} variant="outline" className="text-xs">
                  <MapPin className="h-3 w-3 mr-1" /> {t.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
