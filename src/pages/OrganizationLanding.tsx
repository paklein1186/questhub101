import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Building2, Landmark, GraduationCap, Heart, Leaf,
  Users, Target, Handshake, MapPin, Compass, Sparkles,
} from "lucide-react";
import logoImg from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { GuestOnboardingAssistant } from "@/components/GuestOnboardingAssistant";
import { LandingStatBar } from "@/components/landing/LandingStatBar";
import { LandingServicesSection } from "@/components/landing/LandingServicesSection";
import { LandingProgressionSection } from "@/components/landing/LandingProgressionSection";
import { usePiPanel } from "@/hooks/usePiPanel";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" as const } }),
};

const ORG_TYPES = [
  { icon: Landmark, key: "publicSector" },
  { icon: Building2, key: "corporations" },
  { icon: GraduationCap, key: "academics" },
  { icon: Heart, key: "foundations" },
  { icon: Leaf, key: "ngos" },
];

const STEPS = [
  { step: "01", key: "step1" },
  { step: "02", key: "step2" },
  { step: "03", key: "step3" },
  { step: "04", key: "step4" },
];

const WHY_JOIN = [
  { icon: Users, key: "talent" },
  { icon: Target, key: "proposals" },
  { icon: Handshake, key: "cocreate" },
  { icon: MapPin, key: "territorial" },
  { icon: Compass, key: "innovations" },
];

function useFeaturedQuests() {
  return useQuery({
    queryKey: ["org-landing-quests"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("quests")
        .select("id, title, description, reward_xp, is_featured")
        .eq("is_deleted", false).eq("is_draft", false).eq("is_featured", true)
        .in("quest_nature", ["ACTION", "PROJECT", "FUNDING", "PARTNERSHIP"])
        .order("created_at", { ascending: false }).limit(6);
      return (data ?? []) as any[];
    },
    staleTime: 300_000,
  });
}

export default function OrganizationLanding() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openPiPanel } = usePiPanel();
  const [guestOpen, setGuestOpen] = useState(false);
  const [guestAction, setGuestAction] = useState("");
  const { data: quests, isLoading: questsLoading } = useFeaturedQuests();
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) return;
    const dismissed = localStorage.getItem("guestAssistantDismissed");
    if (dismissed) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setGuestAction("get guidance");
          setGuestOpen(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (triggerRef.current) observer.observe(triggerRef.current);
    return () => observer.disconnect();
  }, [user]);

  const handleGatedClick = (label: string, authRoute: string) => {
    if (user) navigate(authRoute);
    else { setGuestAction(label); setGuestOpen(true); }
  };

  const openPi = () => openPiPanel("global");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/welcome" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
            <img src={logoImg} alt="changethegame" className="h-6 w-6" /> changethegame
          </Link>
          <nav className="flex items-center gap-2">
            <Button size="sm" variant="ghost" asChild><Link to="/explore"><Compass className="h-4 w-4 mr-1" /> {t("landing.nav.explore", "Explore")}</Link></Button>
            {user ? (
              <Button size="sm" asChild><Link to="/">{t("landing.nav.enter", "Enter")}</Link></Button>
            ) : (
              <>
                <Button size="sm" variant="ghost" asChild><Link to="/login">{t("landing.nav.login", "Log in")}</Link></Button>
                <Button size="sm" asChild><Link to="/welcome">{t("landing.nav.signup", "Sign up")}</Link></Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="container py-16 sm:py-24 md:py-32 text-center relative z-10 px-4">
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-medium">
              <Building2 className="h-3 w-3 mr-1" /> {t("landing.org.hero.badge", "For Institutions & Organizations")}
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight max-w-4xl mx-auto leading-[1.1] px-2"
          >
            <span>{t("landing.org.hero.title1", "Institutions shaping the future with ")}</span>
            <span className="text-primary">{t("landing.org.hero.title2", "regenerative collaboration.")}</span>
            <span>{t("landing.org.hero.title3", "")}</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25, duration: 0.6 }}
            className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed"
          >
            {t("landing.org.hero.sub", "Connect with innovators, territories and mission-driven builders across 45+ countries.")}
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-8 flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button size="lg" className="gap-2" onClick={() => handleGatedClick("join as organization", "/onboarding/organization")}>
              <Building2 className="h-4 w-4" /> {t("landing.org.hero.cta1", "Create Organization Profile")}
            </Button>
            <Button size="lg" variant="outline" className="gap-2" asChild>
              <Link to="/organizations">{t("landing.org.hero.cta2", "Browse Organizations")}</Link>
            </Button>
          </motion.div>

          <div className="mt-8">
            <LandingStatBar />
          </div>
        </div>
      </section>

      {/* Who joins — Org Types */}
      <section ref={triggerRef} className="border-t border-border bg-muted/40">
        <div className="container py-16 md:py-24">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-4">
            {t("landing.org.types.title", "Types of organizations")}
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-lg mx-auto">
            {t("landing.org.types.sub", "Whether public or private, large or small — there's a place for structured institutions.")}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {ORG_TYPES.map((item, i) => (
              <motion.div key={item.key} custom={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
                className="rounded-2xl border border-border bg-card p-5 text-center"
              >
                <item.icon className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-display font-semibold text-sm mb-1">
                  {t(`landing.org.types.${item.key}.label`, item.key)}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t(`landing.org.types.${item.key}.desc`, "")}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border">
        <div className="container py-16 md:py-24">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-12">
            {t("landing.org.steps.title", "How it works")}
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <motion.div key={s.step} custom={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
                className="relative"
              >
                <div className="text-5xl font-display font-black text-primary/10 mb-2">{s.step}</div>
                <h3 className="font-display font-semibold text-lg mb-2">
                  {t(`landing.org.steps.${s.key}.title`, s.key)}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(`landing.org.steps.${s.key}.desc`, "")}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why organizations join */}
      <section className="border-t border-border bg-muted/40">
        <div className="container py-16 md:py-24">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-12">
            {t("landing.org.why.title", "Why join the ecosystem?")}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {WHY_JOIN.map((item, i) => (
              <motion.div key={item.key} custom={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
                className="rounded-2xl border border-border bg-card p-6 text-center"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-sm mb-1">
                  {t(`landing.org.why.${item.key}.title`, item.key)}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t(`landing.org.why.${item.key}.desc`, "")}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Quests */}
      <section className="border-t border-border">
        <div className="container py-16 md:py-24">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-3">
            {t("landing.org.quests.title", "Featured Opportunities")}
          </h2>
          <p className="text-muted-foreground text-center mb-10 max-w-lg mx-auto">
            {t("landing.org.quests.sub", "Explore quests from organizations across the ecosystem.")}
          </p>
          {questsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0,1,2].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}
            </div>
          ) : quests && quests.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {quests.map((q, i) => (
                <motion.div key={q.id} custom={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
                  <Link to={`/quests/${q.id}`} className="block rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors">
                    <h3 className="font-display font-semibold text-sm mb-1 line-clamp-1">{q.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{q.description}</p>
                    {q.reward_xp > 0 && (
                      <Badge variant="secondary" className="text-[10px]">{q.reward_xp} XP</Badge>
                    )}
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* Featured Services */}
      <section className="border-t border-border bg-muted/40">
        <div className="container py-16 md:py-24">
          <LandingServicesSection
            titleKey="landing.org.services.title"
            subtitleKey="landing.org.services.sub"
          />
        </div>
      </section>

      {/* Progression */}
      <LandingProgressionSection persona="browse" />

      {/* Pi Invite */}
      <section className="border-t border-border bg-muted/40">
        <div className="container py-16 md:py-24 text-center max-w-xl mx-auto">
          <Sparkles className="h-10 w-10 text-primary mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold mb-3">
            {t("landing.org.piCta.title", "Need guidance?")}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t("landing.org.piCta.sub", "Our AI assistant can help you find the right path for your organization.")}
          </p>
          <Button size="lg" className="gap-2"
            onClick={() => !user ? (setGuestAction("get guidance for my organization"), setGuestOpen(true)) : openPi()}>
            <Sparkles className="h-4 w-4" /> {t("landing.org.piCta.btn", "Talk to Pi")}
          </Button>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border bg-primary/5">
        <div className="container py-16 text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">
            {t("landing.org.cta.title", "Ready to join the ecosystem?")}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t("landing.org.cta.sub", "Create your organization profile and start collaborating.")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" onClick={() => handleGatedClick("join as organization", "/onboarding/organization")}>
              {t("landing.org.cta.cta1", "Create Organization Profile")} <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/explore">{t("landing.org.cta.cta2", "Explore the platform")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
      <CookieConsentBanner />
      <GuestOnboardingAssistant open={guestOpen} onOpenChange={setGuestOpen} actionLabel={guestAction} />
    </div>
  );
}
