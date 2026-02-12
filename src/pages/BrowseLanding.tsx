import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Compass, Users, Target, Briefcase,
  Star, Heart, Layers, BookOpen, Award, Sparkles,
} from "lucide-react";
import logoImg from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" as const } }),
};

function useFeaturedQuests() {
  return useQuery({
    queryKey: ["browse-landing-quests"],
    queryFn: async () => {
      const { data } = await supabase
        .from("quests")
        .select("id, title, description, reward_xp, is_featured")
        .eq("is_deleted", false).eq("is_draft", false).eq("is_featured", true)
        .order("created_at", { ascending: false }).limit(3);
      return data ?? [];
    },
    staleTime: 300_000,
  });
}

function useFeaturedGroups() {
  return useQuery({
    queryKey: ["browse-landing-groups"],
    queryFn: async () => {
      const { data } = await supabase
        .from("guilds")
        .select("id, name, description, logo_url")
        .eq("is_deleted", false).eq("is_draft", false).eq("is_approved", true)
        .order("created_at", { ascending: false }).limit(3);
      return data ?? [];
    },
    staleTime: 300_000,
  });
}

function useTopics() {
  return useQuery({
    queryKey: ["browse-landing-topics"],
    queryFn: async () => {
      const { data } = await supabase.from("topics").select("id, name, slug").eq("is_deleted", false).order("name").limit(10);
      return data ?? [];
    },
    staleTime: 300_000,
  });
}

export default function BrowseLanding() {
  const { data: quests = [], isLoading: loadingQuests } = useFeaturedQuests();
  const { data: groups = [], isLoading: loadingGroups } = useFeaturedGroups();
  const { data: topics = [], isLoading: loadingTopics } = useTopics();

  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── Nav ─── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/welcome" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
            <img src={logoImg} alt="changethegame" className="h-6 w-6" /> changethegame
          </Link>
          <nav className="flex items-center gap-2">
            <Button size="sm" variant="ghost" asChild>
              <Link to="/explore"><Compass className="h-4 w-4 mr-1" /> Explore</Link>
            </Button>
            <Button size="sm" variant="ghost" asChild><Link to="/login">Log in</Link></Button>
            <Button size="sm" asChild><Link to="/signup">Sign up</Link></Button>
          </nav>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="container py-20 md:py-32 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-medium">
              <Compass className="h-3 w-3 mr-1" /> Discover · Connect · Contribute
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto leading-[1.1]"
          >
            A network for{" "}
            <span className="text-primary">changemakers,</span>{" "}
            <span className="text-accent">creators,</span>{" "}
            builders.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.6 }}
            className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed"
          >
            Browse quests, communities, and services — see if this is the right place for you.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-8 flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button size="lg" asChild className="gap-2">
              <Link to="/explore"><Compass className="h-4 w-4" /> Browse Everything</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="gap-2">
              <Link to="/signup"><Sparkles className="h-4 w-4" /> Create an Account</Link>
            </Button>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }} className="mt-4">
            <Button variant="link" asChild className="text-muted-foreground text-sm">
              <Link to="/welcome">← Choose a different path</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ─── What you'll find ─── */}
      <section className="border-t border-border bg-muted/40">
        <div className="container py-16 md:py-24">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-12">What you'll find here</h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { icon: Target, title: "Quests & Missions", text: "Open projects and challenges you can contribute to — from impact missions to creative experiments." },
              { icon: Users, title: "Communities & Groups", text: "Guilds, circles, traditional organisations — find your people and collaborate." },
              { icon: Briefcase, title: "Services & Skills", text: "Book expertise or offer your own — from consulting to creative skill sessions." },
            ].map((card, i) => (
              <motion.div key={card.title} custom={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
                className="rounded-2xl border border-border bg-card p-8 text-center"
              >
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <card.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{card.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{card.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Featured content ─── */}
      <section className="border-t border-border">
        <div className="container py-16 md:py-24">
          <div className="grid gap-12 lg:grid-cols-2">
            {/* Quests */}
            <div>
              <h2 className="font-display text-xl font-bold mb-1 flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" /> Featured Quests
              </h2>
              <p className="text-sm text-muted-foreground mb-5">Open projects waiting for contributors.</p>
              <div className="space-y-3">
                {loadingQuests ? (
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
                ) : quests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No featured quests yet.</p>
                ) : (
                  quests.map((q, i) => (
                    <motion.div key={q.id} custom={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
                      <Link to={`/quests/${q.id}`} className="block rounded-xl border border-border bg-card p-4 hover:shadow-sm hover:border-primary/30 transition-all">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-display font-semibold text-sm">{q.title}</h3>
                          <Badge className="bg-primary/10 text-primary border-0 text-xs">{q.reward_xp} XP</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{q.description}</p>
                      </Link>
                    </motion.div>
                  ))
                )}
              </div>
              <Button variant="ghost" size="sm" asChild className="mt-4">
                <Link to="/explore">See all quests <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
              </Button>
            </div>

            {/* Groups */}
            <div>
              <h2 className="font-display text-xl font-bold mb-1 flex items-center gap-2">
                <Layers className="h-5 w-5 text-accent" /> Communities
              </h2>
              <p className="text-sm text-muted-foreground mb-5">Active guilds, circles, and organisations.</p>
              <div className="space-y-3">
                {loadingGroups ? (
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
                ) : groups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No communities yet.</p>
                ) : (
                  groups.map((g, i) => (
                    <motion.div key={g.id} custom={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
                      <Link to={`/guilds/${g.id}`} className="block rounded-xl border border-border bg-card p-4 hover:shadow-sm hover:border-accent/30 transition-all">
                        <div className="flex items-center gap-3">
                          {g.logo_url ? (
                            <img src={g.logo_url} alt={g.name} className="h-10 w-10 rounded-xl object-cover" />
                          ) : (
                            <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                              <Users className="h-5 w-5 text-accent" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-display font-semibold text-sm">{g.name}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-1">{g.description}</p>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))
                )}
              </div>
              <Button variant="ghost" size="sm" asChild className="mt-4">
                <Link to="/explore">See all communities <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Houses / Topics ─── */}
      <section className="border-t border-border bg-muted/40">
        <div className="container py-16 md:py-24 text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">Topic Houses</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Browse thematic communities shaping the future.
          </p>
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {loadingTopics ? (
              Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-24 rounded-full" />)
            ) : (
              topics.map((t, i) => (
                <motion.div key={t.id} custom={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
                  <Link to={`/topics/${t.slug}`}>
                    <Badge variant="secondary" className="px-3 py-1.5 text-sm hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer">
                      {t.name}
                    </Badge>
                  </Link>
                </motion.div>
              ))
            )}
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/explore/houses">Browse all Houses <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
          </Button>
        </div>
      </section>

      {/* ─── Trust ─── */}
      <section className="border-t border-border">
        <div className="container py-16 md:py-24 text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">Trust & Learning</h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-10">
            Your contributions build a visible reputation — no résumé needed.
          </p>
          <div className="grid gap-6 sm:grid-cols-3 max-w-3xl mx-auto">
            {[
              { icon: Star, title: "XP & Contribution", desc: "Earn experience points for every quest and service you contribute to." },
              { icon: Award, title: "Achievements", desc: "Unlock badges for milestones — your track record speaks for itself." },
              { icon: BookOpen, title: "Pods", desc: "Small learning & action groups that keep you accountable and connected." },
            ].map((item, i) => (
              <motion.div key={item.title} custom={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <item.icon className="h-6 w-6 text-primary mx-auto mb-3" />
                <h3 className="font-display font-semibold text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="border-t border-border bg-primary/5">
        <div className="container py-16 text-center">
          <Heart className="h-8 w-8 text-primary mx-auto mb-4" />
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">Ready to join?</h2>
          <p className="text-muted-foreground mb-6">Create your account and start contributing.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild>
              <Link to="/signup">Create your account <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/welcome">← Back to persona selector</Link>
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
      <CookieConsentBanner />
    </div>
  );
}
