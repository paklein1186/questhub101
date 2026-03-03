import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Compass, Users, Target, Briefcase,
  Shield, Star, Heart, Layers, MapPin, TrendingUp,
} from "lucide-react";
import logoImg from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { useAuth } from "@/hooks/useAuth";
import { GuestOnboardingAssistant } from "@/components/GuestOnboardingAssistant";
import { LandingStatBar } from "@/components/landing/LandingStatBar";
import { LandingProgressionSection } from "@/components/landing/LandingProgressionSection";
import { LandingServicesSection } from "@/components/landing/LandingServicesSection";
import { usePiPanel } from "@/context/PiPanelContext";
import { useTranslation } from "react-i18next";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" as const } }),
};

function useFeaturedMissions() {
  return useQuery({
    queryKey: ["impact-landing-missions"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("quests")
        .select("id, title, description, reward_xp, is_featured")
        .eq("is_deleted", false)
        .eq("is_draft", false)
        .eq("is_featured", true)
        .in("quest_type", ["ACTION", "PROJECT", "PARTNERSHIP", "FUNDING"])
        .order("created_at", { ascending: false })
        .limit(3);
      return (data ?? []) as any[];
    },
    staleTime: 300_000,
  });
}

function useFeaturedGuilds() {
  return useQuery({
    queryKey: ["impact-landing-guilds"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("guilds")
        .select("id, name, description, logo_url")
        .eq("is_deleted", false)
        .eq("is_draft", false)
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(3);
      return (data ?? []) as any[];
    },
    staleTime: 300_000,
  });
}

function useUserHouses(userId: string | undefined) {
  return useQuery({
    queryKey: ["impact-landing-user-houses", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_topics")
        .select("topic_id, topics(id, name, slug)")
        .eq("user_id", userId!);
      return (data ?? []).map((r: any) => ({
        id: r.topic_id,
        name: r.topics?.name ?? "",
        slug: r.topics?.slug ?? "",
      }));
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}

function useFeaturedTerritories() {
  return useQuery({
    queryKey: ["impact-landing-territories"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("territories")
        .select("id, name")
        .limit(3);
      return (data ?? []) as any[];
    },
    staleTime: 300_000,
  });
}

export default function ImpactLanding() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { open: openPi } = usePiPanel();
  const { data: missions = [], isLoading: loadingMissions } = useFeaturedMissions();
  const { data: guilds = [], isLoading: loadingGuilds } = useFeaturedGuilds();
  const { data: userHouses = [] } = useUserHouses(user?.id);
  const { data: territories = [] } = useFeaturedTerritories();
  const [guestOpen, setGuestOpen] = useState(false);
  const [guestAction, setGuestAction] = useState("");

  const handleGatedClick = (label: string, authRoute: string) => {
    if (user) {
      navigate(authRoute);
    } else {
      setGuestAction(label);
      setGuestOpen(true);
    }
  };

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
              <Link to="/explore"><Compass className="h-4 w-4 mr-1" /> {t("nav.explore")}</Link>
            </Button>
            {user ? (
              <Button size="sm" asChild><Link to="/">{t("nav.home")}</Link></Button>
            ) : (
              <>
                <Button size="sm" variant="ghost" asChild><Link to="/login">{t("nav.login")}</Link></Button>
                <Button size="sm" asChild><Link to="/welcome">{t("nav.signup")}</Link></Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="container py-12 sm:py-20 md:py-32 text-center relative z-10 px-4">
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-medium">
              <Shield className="h-3 w-3 mr-1" /> {t("landing.impact.hero.badge")}
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight max-w-3xl mx-auto leading-[1.1] px-2"
          >
            {t("landing.impact.hero.title1")}{" "}
            <span className="text-primary">{t("landing.impact.hero.title2")}</span>{" "}
            <span className="text-accent">{t("landing.impact.hero.title3")}</span>{" "}
            {t("landing.impact.hero.title4")}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.6 }}
            className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed"
          >
            {t("landing.impact.hero.sub")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center px-4"
          >
            <Button size="lg" className="gap-2" onClick={() => handleGatedClick("start a mission", "/quests/new")}>
              <Target className="h-4 w-4" /> {t("landing.impact.hero.cta1")}
            </Button>
            <Button size="lg" variant="outline" className="gap-2" onClick={() => handleGatedClick("offer a service", "/services/new")}>
              <Briefcase className="h-4 w-4" /> {t("landing.impact.hero.cta2")}
            </Button>
            <Button size="lg" variant="outline" className="gap-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground" onClick={() => handleGatedClick("join a guild", "/explore")}>
              <Users className="h-4 w-4" /> {t("landing.impact.hero.cta3")}
            </Button>
          </motion.div>

          <LandingStatBar />

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="mt-5 text-sm text-muted-foreground italic hover:text-foreground transition-colors"
            onClick={() => {
              if (!user) {
                setGuestAction("get guidance");
                setGuestOpen(true);
              } else {
                openPi();
              }
            }}
          >
            {t("landing.impact.hero.piLink")}
          </motion.button>
        </div>
      </section>

      {/* ─── What You Can Do ─── */}
      <section className="border-t border-border bg-muted/40">
        <div className="container py-16 md:py-24">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-12">{t("landing.impact.whatYouCanDo")}</h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { icon: Target, title: t("landing.impact.cards.mission.title"), text: t("landing.impact.cards.mission.text"), action: "launch a mission", route: "/quests/new" },
              { icon: Briefcase, title: t("landing.impact.cards.service.title"), text: t("landing.impact.cards.service.text"), action: "offer expertise", route: "/services/new" },
              { icon: Users, title: t("landing.impact.cards.guild.title"), text: t("landing.impact.cards.guild.text"), action: "join a guild", route: "/explore" },
            ].map((card, i) => (
              <motion.div
                key={card.title}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                className="rounded-2xl border border-border bg-card p-8 text-center cursor-pointer hover:border-primary/30 transition-all"
                onClick={() => handleGatedClick(card.action, card.route)}
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

      {/* ─── Featured Territories ─── */}
      <section className="border-t border-border">
        <div className="container py-16 md:py-24 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-2xl md:text-3xl font-bold mb-3"
          >
            {t("landing.impact.territory.title")}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground mb-10 max-w-lg mx-auto"
          >
            {t("landing.impact.territory.sub")}
          </motion.p>
          <div className="flex flex-wrap gap-3 justify-center mb-8">
            {territories.map((terr: any, i: number) => (
              <motion.div key={terr.id} custom={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
                <Link to={`/territories/${terr.id}`}>
                  <Badge variant="secondary" className="px-4 py-2 text-sm hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer gap-1.5">
                    <MapPin className="h-3 w-3" />
                    {terr.name}
                  </Badge>
                </Link>
              </motion.div>
            ))}
          </div>
          <div className="flex justify-center">
            <Button variant="outline" size="sm" asChild>
              <Link to="/explore/territories">{t("common.seeMore")} <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ─── Your Houses ─── */}
      <section className="border-t border-border bg-muted/40">
        <div className="container py-16 md:py-24 text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">Your fields of impact</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            These Houses shape what appears in your Explore and Network views.
          </p>
          {userHouses.length > 0 ? (
            <div className="flex flex-wrap gap-3 justify-center mb-8">
              {userHouses.map((house, i) => {
                const slug = house.slug || house.name.toLowerCase().replace(/\s+/g, "-");
                return (
                  <motion.div key={house.id} custom={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
                    <Link to={`/topics/${slug}`}>
                      <Badge variant="secondary" className="px-4 py-2 text-sm hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer">
                        {house.name}
                      </Badge>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mb-8">
              Select your Houses during onboarding to personalise your experience.
            </p>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link to="/explore/houses">
              {userHouses.length > 0 ? "Manage your Houses" : "Discover Houses"} <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ─── Trust Graph Teaser ─── */}
      <section className="border-t border-border">
        <div className="container py-16 md:py-24 text-center max-w-2xl mx-auto">
          <TrendingUp className="h-8 w-8 text-primary mx-auto mb-4" />
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-2xl md:text-3xl font-bold mb-3"
          >
            {t("landing.impact.trust.title")}
          </motion.h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">{t("landing.impact.trust.sub")}</p>
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {(t("landing.impact.trust.dimensions", { returnObjects: true }) as string[]).map((dim: string) => (
              <Badge key={dim} variant="outline" className="text-xs">{dim}</Badge>
            ))}
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/about">{t("common.seeMore")} <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
          </Button>
        </div>
      </section>

      {/* ─── Featured Missions, Guilds & Services ─── */}
      <section className="border-t border-border bg-muted/40">
        <div className="container py-16 md:py-24">
          <div className="grid gap-12 lg:grid-cols-3">
            {/* Missions */}
            <div>
              <h2 className="font-display text-xl font-bold mb-1 flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" /> Featured Missions
              </h2>
              <p className="text-sm text-muted-foreground mb-5">Open missions waiting for your contribution.</p>
              <div className="space-y-3">
                {loadingMissions ? (
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
                ) : missions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No featured missions yet — launch one!</p>
                ) : (
                  missions.map((q: any, i: number) => (
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
                <Link to="/explore">See all Missions <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
              </Button>
            </div>

            {/* Guilds */}
            <div>
              <h2 className="font-display text-xl font-bold mb-1 flex items-center gap-2">
                <Layers className="h-5 w-5 text-accent" /> Active Guilds
              </h2>
              <p className="text-sm text-muted-foreground mb-5">Structured networks driving collective action.</p>
              <div className="space-y-3">
                {loadingGuilds ? (
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
                ) : guilds.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No guilds yet — start one!</p>
                ) : (
                  guilds.map((g: any, i: number) => (
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
                <Link to="/explore">See all Guilds <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
              </Button>
            </div>

            {/* Services */}
            <div>
              <h2 className="font-display text-xl font-bold mb-1 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" /> {t("landing.impact.services.title")}
              </h2>
              <p className="text-sm text-muted-foreground mb-5">{t("landing.impact.services.sub")}</p>
              <LandingServicesSection
                titleKey="landing.impact.services.title"
                subtitleKey="landing.impact.services.sub"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Why This Network Exists ─── */}
      <section className="border-t border-border">
        <div className="container py-16 md:py-24 text-center max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Heart className="h-8 w-8 text-primary mx-auto mb-6" />
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-6">{t("landing.impact.manifesto.title")}</h2>
            <p className="text-muted-foreground leading-relaxed text-lg">
              {t("landing.impact.manifesto.p1")}
            </p>
            <p className="text-muted-foreground leading-relaxed text-lg mt-4 font-medium">
              {t("landing.impact.manifesto.p2")}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── Progression ─── */}
      <LandingProgressionSection persona="impact" />

      {/* ─── Organization CTA ─── */}
      <section className="border-t border-border bg-muted/40">
        <div className="container py-16 md:py-24 text-center max-w-xl mx-auto">
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">{t("landing.impact.org.title")}</h2>
          <p className="text-muted-foreground mb-6">{t("landing.impact.org.sub")}</p>
          <Button size="lg" asChild>
            <Link to="/landing/org">{t("landing.impact.org.cta")} <ArrowRight className="h-4 w-4 ml-1" /></Link>
          </Button>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="border-t border-border bg-primary/5">
        <div className="container py-16 text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">{t("landing.impact.cta.title")}</h2>
          <p className="text-muted-foreground mb-6">{t("landing.impact.cta.sub")}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild>
              <Link to="/welcome">{t("landing.impact.cta.btn1")} <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/explore">{t("landing.impact.cta.btn2")}</Link>
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
