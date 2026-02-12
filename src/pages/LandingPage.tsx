import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, UserPlus, Compass, Shield, Users, Briefcase,
  Lightbulb, Target, Handshake, Star, BookOpen, Award, Layers,
  Sprout, MapPin, Building2, ChevronRight,
} from "lucide-react";
import logoImg from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { LandingAIGuide } from "@/components/home/LandingAIGuide";
import { SiteFooter } from "@/components/SiteFooter";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
};

const steps = [
  { icon: UserPlus, title: "Create your profile", desc: "Choose your topics (Houses) and territories to shape your experience." },
  { icon: Compass, title: "Join or create quests", desc: "Find meaningful missions and form pods to collaborate on impact projects." },
  { icon: Handshake, title: "Connect with guilds & peers", desc: "Join guilds, follow companies, and grow your regenerative network." },
  { icon: Briefcase, title: "Offer your expertise", desc: "List services, get booked, and earn XP for your contributions." },
];

const personas = [
  {
    icon: Lightbulb,
    title: "Gamechangers",
    subtitle: "Consultants, facilitators, practitioners",
    points: ["Find meaningful missions aligned with your values", "Share knowledge and build your reputation", "Earn XP and track your contribution index"],
    cta: "Sign up as Gamechanger",
    href: "/signup?role=gamechanger",
    accent: "primary",
  },
  {
    icon: Shield,
    title: "Ecosystem Builders",
    subtitle: "Guilds, networks, third spaces",
    points: ["Structure quests and coordinate action", "Host pods for peer learning groups", "Curate a vibrant learning network"],
    cta: "Create a guild",
    href: "/signup?role=ecosystem",
    accent: "accent",
  },
  {
    icon: Building2,
    title: "Companies & Institutions",
    subtitle: "Organisations with impact ambitions",
    points: ["Post impact quests to find collaborators", "Book experts for your projects", "Support territories and build credibility"],
    cta: "Post a quest as a company",
    href: "/signup",
    accent: "warning",
  },
];

function useFeaturedQuests() {
  return useQuery({
    queryKey: ["landing-featured-quests"],
    queryFn: async () => {
      const { data } = await supabase
        .from("quests")
        .select("id, title, description, reward_xp, is_featured")
        .eq("is_deleted", false)
        .eq("is_draft", false)
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(3);
      return data ?? [];
    },
    staleTime: 300_000,
  });
}

function useLandingTopics() {
  return useQuery({
    queryKey: ["landing-topics"],
    queryFn: async () => {
      const { data } = await supabase
        .from("topics")
        .select("id, name, slug")
        .eq("is_deleted", false)
        .order("name")
        .limit(8);
      return data ?? [];
    },
    staleTime: 300_000,
  });
}

export default function LandingPage() {
  const { data: sampleQuests = [], isLoading: loadingQuests } = useFeaturedQuests();
  const { data: sampleTopics = [], isLoading: loadingTopics } = useLandingTopics();

  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── Nav ─── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 font-display text-lg font-bold tracking-tight group">
            <img src={logoImg} alt="changethegame" className="h-7 w-7 transition-transform group-hover:scale-110 group-hover:rotate-6" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">changethegame</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button size="sm" variant="ghost" asChild>
              <Link to="/explore"><Compass className="h-4 w-4 mr-1" /> Explore</Link>
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <Link to="/login">Log in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/signup">Sign up</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="container py-20 md:py-32 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-medium">
              <Sprout className="h-3 w-3 mr-1" /> Regeneration · Impact · Community
            </Badge>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto leading-[1.1]"
          >
            Human-powered.{" "}
            <span className="text-primary">AI-augmented.</span>{" "}
            <span className="text-accent">Game-changing.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.6 }}
            className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto"
          >
            Discover quests, join guilds, and share your expertise in a regenerative ecosystem built for changemakers.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-8 flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button size="lg" asChild className="gap-2">
              <Link to="/signup?role=gamechanger"><Lightbulb className="h-4 w-4" /> Join as a Gamechanger</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="gap-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground">
              <Link to="/signup?role=ecosystem"><Shield className="h-4 w-4" /> Join as an Ecosystem Builder</Link>
            </Button>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }} className="mt-4">
            <Button variant="link" asChild className="text-muted-foreground">
              <Link to="/explore">Explore first <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="border-t border-border bg-muted/40">
        <div className="container py-16 md:py-24">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-12">How it works</h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <motion.div key={step.title} custom={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
                className="flex flex-col items-center text-center"
              >
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Step {i + 1}</p>
                <h3 className="font-display font-semibold text-lg mb-1">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── For whom? ─── */}
      <section className="border-t border-border">
        <div className="container py-16 md:py-24">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-4">Who is it for?</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">
            Whether you're a practitioner, a network facilitator, or a company with impact ambitions — there's a place for you.
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {personas.map((p, i) => (
              <motion.div key={p.title} custom={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
                className="rounded-2xl border border-border bg-card p-6 flex flex-col"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`h-10 w-10 rounded-xl bg-${p.accent}/10 flex items-center justify-center`}>
                    <p.icon className={`h-5 w-5 text-${p.accent}`} />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold">{p.title}</h3>
                    <p className="text-xs text-muted-foreground">{p.subtitle}</p>
                  </div>
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      {pt}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link to={p.href}>{p.cta} <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Quests & Houses teaser ─── */}
      <section className="border-t border-border bg-muted/40">
        <div className="container py-16 md:py-24">
          <div className="grid gap-12 lg:grid-cols-2">
            {/* Featured quests */}
            <div>
              <h2 className="font-display text-xl font-bold mb-1 flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" /> Featured Quests
              </h2>
              <p className="text-sm text-muted-foreground mb-5">Open missions waiting for your contribution.</p>
              <div className="space-y-3">
                {loadingQuests ? (
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
                ) : sampleQuests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No featured quests yet.</p>
                ) : (
                  sampleQuests.map((q, i) => (
                    <motion.div key={q.id} custom={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
                      <Link to={`/quests/${q.id}`}
                        className="block rounded-xl border border-border bg-card p-4 hover:shadow-sm hover:border-primary/30 transition-all"
                      >
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

            {/* Topic houses */}
            <div>
              <h2 className="font-display text-xl font-bold mb-1 flex items-center gap-2">
                <Layers className="h-5 w-5 text-accent" /> Topic Houses
              </h2>
              <p className="text-sm text-muted-foreground mb-5">Browse thematic communities shaping the future.</p>
              <div className="flex flex-wrap gap-2">
                {loadingTopics ? (
                  Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-24 rounded-full" />)
                ) : (
                  sampleTopics.map((t, i) => (
                    <motion.div key={t.id} custom={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
                      <Link to={`/topics/${t.slug}`}>
                        <Badge variant="secondary" className="px-3 py-1.5 text-sm hover:bg-accent/10 hover:text-accent transition-colors cursor-pointer">
                          {t.name}
                        </Badge>
                      </Link>
                    </motion.div>
                  ))
                )}
              </div>
              <Button variant="ghost" size="sm" asChild className="mt-6">
                <Link to="/explore">Browse all topics <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── AI Guide ─── */}
      <LandingAIGuide />

      {/* ─── Trust & learning ─── */}
      <section className="border-t border-border">
        <div className="container py-16 md:py-24 text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">Trust & Learning</h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-10">
            Your contributions build a visible reputation — no résumé needed.
          </p>
          <div className="grid gap-6 sm:grid-cols-3 max-w-3xl mx-auto">
            {[
              { icon: Star, title: "XP & Contribution Index", desc: "Earn experience points for every quest you complete and service you deliver." },
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
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">Ready to make an impact?</h2>
          <p className="text-muted-foreground mb-6">Join a growing network of changemakers across territories.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild>
              <Link to="/signup">Create your account <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/explore">Explore the platform</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <SiteFooter />

      <CookieConsentBanner />
    </div>
  );
}
