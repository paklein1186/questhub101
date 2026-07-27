import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Sparkles, Check, X, Map, Database, FileText,
  Eye, Rocket, HandHeart, Users, Bot, Radio, Repeat, Network,
  Quote, Building2, Landmark, Coins, Compass, UserRound, Leaf,
  ShieldCheck, GitBranch, Mail,
} from "lucide-react";
import logoImg from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { LandingLanguageSwitcher } from "@/components/LandingLanguageSwitcher";
import { LandingStatBar } from "@/components/landing/LandingStatBar";
import { LandingLivingMapSection } from "@/components/landing/LandingLivingMapSection";

import { useTranslation } from "react-i18next";

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.5, ease: "easeOut" as const },
  }),
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary mb-3">
      {children}
    </p>
  );
}

export default function HomeLanding() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const k = (s: string) => t(`landing.home.${s}`);

  const failures = [
    { icon: Map, t: k("problem.c1t"), d: k("problem.c1d") },
    { icon: Database, t: k("problem.c2t"), d: k("problem.c2d") },
    { icon: FileText, t: k("problem.c3t"), d: k("problem.c3d") },
  ];

  const pillars = [
    { icon: Eye, n: "01", t: k("pillars.p1t"), s: k("pillars.p1s"), d: k("pillars.p1d"), to: "/explore" },
    { icon: Rocket, n: "02", t: k("pillars.p2t"), s: k("pillars.p2s"), d: k("pillars.p2d"), to: "/explore/quests-info" },
    { icon: HandHeart, n: "03", t: k("pillars.p3t"), s: k("pillars.p3s"), d: k("pillars.p3d"), to: "/explore/people-info" },
    { icon: Users, n: "04", t: k("pillars.p4t"), s: k("pillars.p4s"), d: k("pillars.p4d"), to: "/explore/guilds-info" },
    { icon: Bot, n: "05", t: k("pillars.p5t"), s: k("pillars.p5s"), d: k("pillars.p5d"), to: "/agents" },
    { icon: Radio, n: "06", t: k("pillars.p6t"), s: k("pillars.p6s"), d: k("pillars.p6d"), to: "/territories" },
    { icon: Repeat, n: "07", t: k("pillars.p7t"), s: k("pillars.p7s"), d: k("pillars.p7d"), to: "/opportunities" },
    { icon: Network, n: "08", t: k("pillars.p8t"), s: k("pillars.p8s"), d: k("pillars.p8d"), to: "/explore" },
  ];

  const storySteps = [1, 2, 3, 4, 5].map((i) => ({
    t: k(`story.s${i}t`),
    d: k(`story.s${i}d`),
  }));

  const personas = [
    { icon: Building2, t: k("personas.a1t"), d: k("personas.a1d") },
    { icon: Landmark, t: k("personas.a2t"), d: k("personas.a2d") },
    { icon: Coins, t: k("personas.a3t"), d: k("personas.a3d") },
    { icon: Compass, t: k("personas.a4t"), d: k("personas.a4d") },
    { icon: UserRound, t: k("personas.a5t"), d: k("personas.a5d") },
    { icon: Leaf, t: k("personas.a6t"), d: k("personas.a6d") },
  ];


  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ─── Nav ─── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/home" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
            <img src={logoImg} alt="changethegame" className="h-6 w-6" /> changethegame
          </Link>
          <nav className="flex items-center gap-2">
            <LandingLanguageSwitcher />
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
              {k("nav.login")}
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => navigate("/welcome")}>
              {k("nav.cta")} <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* ─── Hero ─── */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
          <div className="container relative z-10 py-20 md:py-28 text-center px-4">
            <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
                <Sparkles className="h-3 w-3" /> {k("hero.badge")}
              </span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.08] max-w-4xl mx-auto"
            >
              {k("hero.title1")}{" "}
              <span className="text-primary">{k("hero.title2")}</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.6 }}
              className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            >
              {k("hero.sub")}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-9 flex flex-col sm:flex-row gap-3 justify-center"
            >
              <Button size="lg" className="gap-2" onClick={() => navigate("/welcome")}>
                {k("hero.cta1")} <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/explore">{k("hero.cta2")}</Link>
              </Button>
            </motion.div>
            <div className="mt-12">
              <LandingStatBar />
            </div>
          </div>
        </section>

        {/* ─── Problem ─── */}
        <section className="border-b border-border">
          <div className="container py-20 px-4">
            <div className="max-w-3xl">
              <SectionLabel>{k("problem.label")}</SectionLabel>
              <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight leading-tight">
                {k("problem.title")}
              </h2>
              <p className="mt-5 text-muted-foreground leading-relaxed">{k("problem.lead")}</p>
              <p className="mt-3 text-muted-foreground leading-relaxed">{k("problem.lead2")}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3 mt-10">
              {failures.map((f, i) => (
                <motion.div
                  key={f.t}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: "-60px" }}
                  className="rounded-2xl border border-border bg-card p-6"
                >
                  <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display font-semibold mb-1.5">{f.t}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.d}</p>
                </motion.div>
              ))}
            </div>

            <p className="mt-8 text-sm font-medium text-foreground/80 border-l-2 border-primary pl-4 max-w-2xl">
              {k("problem.result")}
            </p>
          </div>
        </section>

        {/* ─── Shift ─── */}
        <section className="border-b border-border bg-muted/30">
          <div className="container py-20 px-4">
            <div className="text-center max-w-2xl mx-auto">
              <SectionLabel>{k("shift.label")}</SectionLabel>
              <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">{k("shift.title")}</h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2 mt-12 max-w-4xl mx-auto">
              <div className="rounded-2xl border border-border bg-background/60 p-7">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{k("shift.aLabel")}</p>
                <h3 className="font-display text-2xl font-bold mb-3 text-muted-foreground">{k("shift.aTitle")}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{k("shift.aDesc")}</p>
              </div>
              <div className="rounded-2xl border-2 border-primary/40 bg-card p-7 shadow-sm">
                <p className="text-xs uppercase tracking-wider text-primary mb-2">{k("shift.bLabel")}</p>
                <h3 className="font-display text-2xl font-bold mb-3 text-primary">{k("shift.bTitle")}</h3>
                <p className="text-sm text-foreground/80 leading-relaxed">{k("shift.bDesc")}</p>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-8">{k("shift.note")}</p>
          </div>
        </section>

        {/* ─── Concept ─── */}
        <section className="border-b border-border">
          <div className="container py-20 px-4 grid gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <SectionLabel>{k("concept.label")}</SectionLabel>
              <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight leading-tight">
                {k("concept.title")}
              </h2>
              <p className="mt-5 text-muted-foreground leading-relaxed">{k("concept.lead")}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
                <h3 className="font-display font-semibold mb-4">{k("concept.areTitle")}</h3>
                <ul className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <li key={i} className="flex gap-2.5 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{k(`concept.are${i}`)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="font-display font-semibold mb-4 text-muted-foreground">{k("concept.notTitle")}</h3>
                <ul className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-muted-foreground">
                      <X className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{k(`concept.not${i}`)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Pillars / features ─── */}
        <section className="border-b border-border bg-muted/30">
          <div className="container py-20 px-4">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <SectionLabel>{k("pillars.label")}</SectionLabel>
              <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">{k("pillars.title")}</h2>
              <p className="mt-3 text-muted-foreground">{k("pillars.sub")}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {pillars.map((p, i) => (
                <motion.div
                  key={p.n}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: "-40px" }}
                >
                  <Link
                    to={p.to}
                    className="group block h-full rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <p.icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">{p.n}</span>
                    </div>
                    <h3 className="font-display text-lg font-bold uppercase tracking-tight">{p.t}</h3>
                    <p className="text-xs text-primary mb-2">{p.s}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{p.d}</p>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Living map + galleries ─── */}
        <LandingLivingMapSection />



        {/* ─── Personas ─── */}
        <section className="border-b border-border bg-muted/30">
          <div className="container py-20 px-4">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <SectionLabel>{k("personas.label")}</SectionLabel>
              <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">{k("personas.title")}</h2>
              <p className="mt-3 text-muted-foreground">{k("personas.sub")}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {personas.map((p, i) => (
                <motion.div
                  key={p.t}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: "-40px" }}
                  className="rounded-2xl border border-border bg-card p-6 flex gap-4"
                >
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-accent/50 text-foreground flex items-center justify-center">
                    <p.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold">{p.t}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-1">{p.d}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="text-center mt-10">
              <Button size="lg" className="gap-2" onClick={() => navigate("/welcome")}>
                {k("personas.cta")} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* ─── Story (example) ─── */}
        <section className="border-b border-border">
          <div className="container py-20 px-4">
            <div className="max-w-3xl">
              <SectionLabel>{k("story.label")}</SectionLabel>
              <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">{k("story.title")}</h2>
              <p className="mt-5 text-muted-foreground leading-relaxed">{k("story.lead")}</p>
              <p className="mt-3 text-muted-foreground leading-relaxed">{k("story.lead2")}</p>
              <p className="mt-3 text-muted-foreground leading-relaxed">{k("story.lead3")}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5 mt-10">
              {storySteps.map((s, i) => (
                <motion.div
                  key={s.t}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: "-40px" }}
                  className="relative rounded-2xl border border-border bg-card p-5"
                >
                  <span className="text-xs font-mono text-primary">{`0${i + 1}`}</span>
                  <h3 className="font-display font-semibold mt-2">{s.t}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{s.d}</p>
                </motion.div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {[k("story.tag1"), k("story.tag2"), k("story.tag3"), k("story.tag4")].map((tag) => (
                <span key={tag} className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>

            <figure className="mt-8 max-w-3xl rounded-2xl border border-primary/30 bg-primary/5 p-7">
              <Quote className="h-6 w-6 text-primary mb-3" />
              <blockquote className="text-lg leading-relaxed font-display">{k("story.quote")}</blockquote>
              <figcaption className="mt-4 text-sm text-muted-foreground">— {k("story.quoteAuthor")}</figcaption>
            </figure>

            <p className="mt-6 max-w-3xl text-sm text-muted-foreground border-l-2 border-primary pl-4">
              {k("story.credit")}
            </p>
          </div>
        </section>

        {/* ─── Governance ─── */}
        <section className="border-b border-border">
          <div className="container py-20 px-4">
            <div className="max-w-3xl">
              <SectionLabel>{k("governance.label")}</SectionLabel>
              <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">{k("governance.title")}</h2>
              <p className="mt-5 text-muted-foreground leading-relaxed">{k("governance.lead")}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 mt-10">
              {[k("governance.col1"), k("governance.col2"), k("governance.col3")].map((c) => (
                <div key={c} className="rounded-2xl border border-border bg-card p-6 text-center">
                  <ShieldCheck className="h-5 w-5 text-primary mx-auto mb-3" />
                  <h3 className="font-display font-semibold">{c}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{k("governance.colSub")}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-3 mt-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-6">
                  <span className="text-xs font-mono text-primary">{`0${i}`}</span>
                  <h3 className="font-display font-semibold mt-2">{k(`governance.pr${i}t`)}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-1.5">{k(`governance.pr${i}d`)}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-7 flex gap-4">
              <GitBranch className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="font-display font-semibold">{k("governance.openTitle")}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mt-1.5 max-w-2xl">
                  {k("governance.openDesc")}
                </p>
              </div>
            </div>
          </div>
        </section>




        {/* ─── Final CTA ─── */}
        <section>
          <div className="container py-20 px-4 text-center max-w-2xl mx-auto">
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">{k("final.title")}</h2>
            <p className="mt-3 text-lg text-primary">{k("final.sub")}</p>
            <p className="mt-5 text-muted-foreground leading-relaxed">{k("final.body")}</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" className="gap-2" onClick={() => navigate("/welcome")}>
                {k("final.cta1")} <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="gap-2" asChild>
                <a href="mailto:pa@changethegame.xyz">
                  <Mail className="h-4 w-4" /> {k("final.cta2")}
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
      <CookieConsentBanner />
    </div>
  );
}
