import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Sparkles, Palette, Music, Users, Compass,
  Feather, Star, Heart, Briefcase,
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
import { HOUSES_OF_ART } from "@/lib/personaLabels";
import { GuestOnboardingAssistant } from "@/components/GuestOnboardingAssistant";
import { LandingStatBar } from "@/components/landing/LandingStatBar";
import { LandingProgressionSection } from "@/components/landing/LandingProgressionSection";
import { LandingServicesSection } from "@/components/landing/LandingServicesSection";
import { usePiPanel } from "@/hooks/usePiPanel";
import { useTranslation } from "react-i18next";

/* ─── animation helpers ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" as const } }),
};

/* ─── hooks ─── */
function useFeaturedCreations() {
  return useQuery({
    queryKey: ["creative-landing-featured"],
    queryFn: async () => {
      const { data } = await supabase
        .from("quests")
        .select("id, title, description, reward_xp, is_featured")
        .eq("is_deleted", false)
        .eq("is_draft", false)
        .eq("is_featured", true)
        .in("quest_nature", ["SERVICE", "EVENT", "RESOURCE", "LEARNING"])
        .order("created_at", { ascending: false })
        .limit(6);
      return data ?? [];
    },
    staleTime: 300_000,
  });
}

function useFeaturedCircles() {
  return useQuery({
    queryKey: ["creative-landing-circles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("guilds")
        .select("id, name, description, logo_url")
        .eq("is_deleted", false)
        .eq("is_draft", false)
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(3);
      return data ?? [];
    },
    staleTime: 300_000,
  });
}

function useFeaturedServices() {
  return useQuery({
    queryKey: ["creative-landing-services"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("services")
        .select("id, title, description, price_amount, price_currency")
        .eq("is_deleted", false)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(3);
      return (data ?? []) as any[];
    },
    staleTime: 300_000,
  });
}

function useUserHouses(userId: string | undefined) {
  return useQuery({
    queryKey: ["creative-landing-user-houses", userId],
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

/* ─── page ─── */
export default function CreativeLanding() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openPiPanel } = usePiPanel();
  const { data: creations = [], isLoading: loadingCreations } = useFeaturedCreations();
  const { data: circles = [], isLoading: loadingCircles } = useFeaturedCircles();
  const { data: services = [], isLoading: loadingServices } = useFeaturedServices();
  const { data: userHouses = [] } = useUserHouses(user?.id);
  const [guestOpen, setGuestOpen] = useState(false);
  const [guestAction, setGuestAction] = useState("");
  const triggerRef = useRef<HTMLDivElement>(null);

  // Force creative theme on this page regardless of persona
  useEffect(() => {
    document.body.classList.add("creative-universe");
    return () => {
      document.body.classList.remove("creative-universe");
    };
  }, []);

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

  const houseEntries = Object.values(HOUSES_OF_ART);

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
              <Link to="/explore"><Compass className="h-4 w-4 mr-1" /> Wander</Link>
            </Button>
            {user ? (
              <Button size="sm" asChild>
                <Link to="/">Enter</Link>
              </Button>
            ) : (
              <>
                <Button size="sm" variant="ghost" asChild>
                  <Link to="/login">Log in</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/welcome">Sign up</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/8 via-accent/5 to-transparent pointer-events-none" />
        <div className="container py-20 md:py-32 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-medium">
              <Sparkles className="h-3 w-3 mr-1" /> {t("landing.creative.hero.badge")}
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto leading-[1.1]"
          >
            {t("landing.creative.hero.title1")}{" "}
            <span className="text-primary">{t("landing.creative.hero.title2")}</span>{" "}
            <span className="text-accent">{t("landing.creative.hero.title3")}</span>{" "}
            {t("landing.creative.hero.title4")}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.6 }}
            className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed"
          >
            {t("landing.creative.hero.sub")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-8 flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button size="lg" className="gap-2" onClick={() => handleGatedClick("begin a creation", "/quests/new")}>
              <Feather className="h-4 w-4" /> {t("landing.creative.hero.cta1")}
            </Button>
            <Button size="lg" variant="outline" className="gap-2" onClick={() => handleGatedClick("offer a skill session", "/services/new")}>
              <Palette className="h-4 w-4" /> {t("landing.creative.hero.cta2")}
            </Button>
            <Button size="lg" variant="outline" className="gap-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground" onClick={() => handleGatedClick("join a circle or studio", "/explore")}>
              <Users className="h-4 w-4" /> {t("landing.creative.hero.cta3")}
            </Button>
          </motion.div>

          <LandingStatBar />

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>
            <button
              onClick={() => !user ? (setGuestAction("get creative guidance"), setGuestOpen(true)) : openPiPanel()}
              className="mt-5 text-sm text-muted-foreground italic hover:text-foreground transition-colors"
            >
              {t("landing.creative.hero.piLink")} <Sparkles className="h-3.5 w-3.5 ml-1 inline" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ─── What You Can Do Here ─── */}
      <section className="border-t border-border bg-muted/40">
        <div className="container py-16 md:py-24">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-12">What you can do here</h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { icon: Feather, title: "Launch a Creation", text: "Start a story, project, journey, performance, or experiment.", action: "launch a creation", route: "/quests/new" },
              { icon: Palette, title: "Share Your Craft", text: "Teach, jam, mentor, or offer skill sessions.", action: "share your craft", route: "/services/new" },
              { icon: Users, title: "Find Your Circle", text: "Join studios, collectives, ensembles, Houses of Art.", action: "find your circle", route: "/explore" },
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

      {/* ─── Meet Your Muse ─── */}
      <section ref={triggerRef} className="border-t border-border">
        <div className="container py-16 md:py-24">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-2xl md:text-3xl font-bold text-center mb-3"
          >
            {t("landing.creative.muse.title")}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-center text-muted-foreground mb-12 max-w-xl mx-auto"
          >
            {t("landing.creative.muse.sub")}
          </motion.p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Object.entries(HOUSES_OF_ART).map(([slug, house], i) => (
              <motion.div
                key={slug}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
              >
                <Link
                  to={`/topics/${slug}`}
                  className="block rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-primary/30 transition-all"
                >
                  <p className="text-2xl mb-2">{house.icon}</p>
                  <h3 className="font-semibold text-foreground">{house.creativeLabel}</h3>
                  <p className="text-xs text-primary font-medium mt-0.5">{house.museName}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{house.museDescription}</p>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Button variant="outline" asChild>
              <Link to="/explore/houses">
                {t("landing.creative.muse.discover")} <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ─── Your Houses ─── */}
      {userHouses.length > 0 && (
        <section className="border-t border-border">
          <div className="container py-16 md:py-24 text-center">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">Your artistic constellation</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Your Houses shape the world you see across changethegame.
            </p>
            <div className="flex flex-wrap gap-3 justify-center mb-8">
              {userHouses.map((house, i) => {
                const slug = house.slug || house.name.toLowerCase().replace(/\s+/g, "-");
                const artHouse = HOUSES_OF_ART[slug];
                return (
                  <motion.div key={house.id} custom={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
                    <Link to={`/topics/${slug}`}>
                      <Badge
                        variant="secondary"
                        className="px-4 py-2 text-sm hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer gap-2"
                      >
                        {artHouse && <span>{artHouse.icon}</span>}
                        {artHouse ? artHouse.creativeLabel : house.name}
                      </Badge>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/explore/houses">Explore your Houses <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
            </Button>
          </div>
        </section>
      )}

      {/* ─── Houses of Art overview (for visitors without houses) ─── */}
      {userHouses.length === 0 && (
        <section className="border-t border-border">
          <div className="container py-16 md:py-24 text-center">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">Houses of Art</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Seven creative Houses to shape your journey and find kindred spirits.
            </p>
            <div className="flex flex-wrap gap-3 justify-center mb-8">
              {houseEntries.map((house, i) => (
                <motion.div key={house.creativeLabel} custom={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
                  <Badge variant="secondary" className="px-4 py-2 text-sm gap-2">
                    <span>{house.icon}</span>
                    {house.creativeLabel}
                  </Badge>
                </motion.div>
              ))}
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/explore/houses">Explore the Houses <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
            </Button>
          </div>
        </section>
      )}

      {/* ─── Featured Creations, Circles & Services ─── */}
      <section className="border-t border-border bg-muted/40">
        <div className="container py-16 md:py-24">
          <div className="grid gap-12 lg:grid-cols-3">
            {/* Creations */}
            <div>
              <h2 className="font-display text-xl font-bold mb-1 flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" /> Featured Creations
              </h2>
              <p className="text-sm text-muted-foreground mb-5">Open creative quests waiting for your spark.</p>
              <div className="space-y-3">
                {loadingCreations ? (
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
                ) : creations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No featured creations yet — be the first!</p>
                ) : (
                  creations.slice(0, 3).map((q, i) => (
                    <motion.div key={q.id} custom={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
                      <Link
                        to={`/quests/${q.id}`}
                        className="block rounded-xl border border-border bg-card p-4 hover:shadow-sm hover:border-primary/30 transition-all"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-display font-semibold text-sm">{q.title}</h3>
                          <Badge className="bg-primary/10 text-primary border-0 text-xs">{q.reward_xp} Resonance</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{q.description}</p>
                      </Link>
                    </motion.div>
                  ))
                )}
              </div>
              <Button variant="ghost" size="sm" asChild className="mt-4">
                <Link to="/explore">See all Creations <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
              </Button>
            </div>

            {/* Circles */}
            <div>
              <h2 className="font-display text-xl font-bold mb-1 flex items-center gap-2">
                <Music className="h-5 w-5 text-accent" /> Circles & Studios
              </h2>
              <p className="text-sm text-muted-foreground mb-5">Creative collectives to co-create with.</p>
              <div className="space-y-3">
                {loadingCircles ? (
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
                ) : circles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No circles yet — start one!</p>
                ) : (
                  circles.map((g, i) => (
                    <motion.div key={g.id} custom={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
                      <Link
                        to={`/guilds/${g.id}`}
                        className="block rounded-xl border border-border bg-card p-4 hover:shadow-sm hover:border-accent/30 transition-all"
                      >
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
                <Link to="/explore">See all Circles <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
              </Button>
            </div>

            {/* Services */}
            <div>
              <h2 className="font-display text-xl font-bold mb-1 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" /> {t("landing.creative.sessions.title")}
              </h2>
              <p className="text-sm text-muted-foreground mb-5">{t("landing.creative.sessions.sub")}</p>
              <div className="space-y-3">
                {loadingServices ? (
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
                ) : services.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("landing.services.empty")}</p>
                ) : (
                  services.map((s: any, i: number) => (
                    <motion.div key={s.id} custom={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
                      <Link
                        to={`/services/${s.id}`}
                        className="block rounded-xl border border-border bg-card p-4 hover:shadow-sm hover:border-primary/30 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-display font-semibold text-sm line-clamp-1">{s.title}</h3>
                          {s.price_amount != null && (
                            <Badge variant="secondary" className="shrink-0 text-xs">
                              {s.price_amount} {s.price_currency || "€"}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>
                      </Link>
                    </motion.div>
                  ))
                )}
              </div>
              <Button variant="ghost" size="sm" asChild className="mt-4">
                <Link to="/services">See all Sessions <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Monetize Your Practice ─── */}
      <section className="border-t border-border">
        <div className="container py-16 md:py-24 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-2xl md:text-3xl font-bold mb-10"
          >
            {t("landing.creative.monetize.title")}
          </motion.h2>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            {[
              t("landing.creative.monetize.step1"),
              t("landing.creative.monetize.step2"),
              t("landing.creative.monetize.step3"),
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                  {i + 1}
                </div>
                <span className="text-sm font-medium text-foreground">{step}</span>
                {i < 2 && <ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block" />}
              </motion.div>
            ))}
          </div>

          <div className="mt-8">
            <Button asChild>
              <Link to="/services/new">
                {t("landing.creative.monetize.step1")} <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ─── Why This Place Exists ─── */}
      <section className="border-t border-border">
        <div className="container py-16 md:py-24 text-center max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Heart className="h-8 w-8 text-primary mx-auto mb-6" />
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-6">{t("landing.creative.manifesto.title")}</h2>
            <p className="text-muted-foreground leading-relaxed text-lg">
              {t("landing.creative.manifesto.p1")}
            </p>
            <p className="text-muted-foreground leading-relaxed text-lg mt-4">
              {t("landing.creative.manifesto.p2")}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── Progression ─── */}
      <LandingProgressionSection persona="creative" />

      {/* ─── Final CTA ─── */}
      <section className="border-t border-border bg-primary/5">
        <div className="container py-16 text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">{t("landing.creative.cta.title")}</h2>
          <p className="text-muted-foreground mb-6">{t("landing.creative.cta.sub")}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild>
              <Link to="/welcome">{t("landing.creative.cta.btn1")} <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/explore">{t("landing.creative.cta.btn2")}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <SiteFooter />
      <CookieConsentBanner />
      <GuestOnboardingAssistant open={guestOpen} onOpenChange={setGuestOpen} actionLabel={guestAction} />
    </div>
  );
}
