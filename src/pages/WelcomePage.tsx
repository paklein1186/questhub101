import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles, Target, Blend, Compass,
  Palette, Shield, Feather, ArrowRight, Building2,
} from "lucide-react";
import logoImg from "@/assets/logo.png";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { LandingLanguageSwitcher } from "@/components/LandingLanguageSwitcher";
import { useTranslation } from "react-i18next";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: 0.15 + i * 0.1, duration: 0.55, ease: "easeOut" as const },
  }),
};

export default function WelcomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const personas = [
    {
      key: "creative",
      icon: Palette,
      emoji: "✨",
      title: t("landing.welcome.personas.creative.title"),
      subtitle: t("landing.welcome.personas.creative.subtitle"),
      tagline: t("landing.welcome.personas.creative.tagline"),
      path: "/landing/creative",
      gradient: "from-purple-500/15 to-pink-500/10",
      accentClass: "text-purple-500",
      borderHover: "hover:border-purple-400/50",
    },
    {
      key: "impact",
      icon: Shield,
      emoji: "🌍",
      title: t("landing.welcome.personas.impact.title"),
      subtitle: t("landing.welcome.personas.impact.subtitle"),
      tagline: t("landing.welcome.personas.impact.tagline"),
      path: "/landing/impact",
      gradient: "from-emerald-500/15 to-teal-500/10",
      accentClass: "text-emerald-500",
      borderHover: "hover:border-emerald-400/50",
    },
    {
      key: "hybrid",
      icon: Blend,
      emoji: "⚡",
      title: t("landing.welcome.personas.hybrid.title"),
      subtitle: t("landing.welcome.personas.hybrid.subtitle"),
      tagline: t("landing.welcome.personas.hybrid.tagline"),
      path: "/landing/hybrid",
      gradient: "from-amber-500/15 to-orange-500/10",
      accentClass: "text-amber-500",
      borderHover: "hover:border-amber-400/50",
    },
    {
      key: "organization",
      icon: Target,
      emoji: "🏛️",
      title: t("landing.welcome.personas.organization.title"),
      subtitle: t("landing.welcome.personas.organization.subtitle"),
      tagline: t("landing.welcome.personas.organization.tagline"),
      path: "/organizations",
      gradient: "from-blue-500/15 to-indigo-500/10",
      accentClass: "text-blue-500",
      borderHover: "hover:border-blue-400/50",
    },
    {
      key: "browse",
      icon: Compass,
      emoji: "🔭",
      title: t("landing.welcome.personas.browse.title"),
      subtitle: t("landing.welcome.personas.browse.subtitle"),
      tagline: t("landing.welcome.personas.browse.tagline"),
      path: "/landing/browse",
      gradient: "from-sky-500/15 to-blue-500/10",
      accentClass: "text-sky-500",
      borderHover: "hover:border-sky-400/50",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ─── Minimal nav ─── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
            <img src={logoImg} alt="changethegame" className="h-6 w-6" /> changethegame
          </div>
          <nav className="flex items-center gap-2">
            <LandingLanguageSwitcher />
            <button
              onClick={() => navigate("/login")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5"
            >
              {t("landing.welcome.login")}
            </button>
          </nav>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-3xl py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12 md:mb-16"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-5">
              <Sparkles className="h-3 w-3" />{t("landing.welcome.tagline")}
            </div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.15] mb-4">
              {t("landing.welcome.question")}
            </h1>
            <p className="text-muted-foreground text-lg max-w-md mx-auto leading-relaxed">
              {t("landing.welcome.sub")}
            </p>
          </motion.div>

          {/* ─── Persona cards ─── */}
          <div className="grid gap-4 sm:grid-cols-2">
            {personas.map((p, i) => (
              <motion.button
                key={p.key}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                animate="show"
                onClick={() => navigate(p.path)}
                className={`group relative text-left rounded-2xl border border-border bg-card p-6 transition-all duration-300 ${p.borderHover} hover:shadow-lg hover:-translate-y-0.5 cursor-pointer`}
              >
                {/* Gradient shimmer */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${p.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`h-11 w-11 rounded-xl bg-muted flex items-center justify-center text-xl`}>
                      {p.emoji}
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-base">{p.title}</h3>
                      <p className="text-xs text-muted-foreground">{p.subtitle}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                    {p.tagline}
                  </p>
                  <div className={`flex items-center gap-1 text-xs font-medium ${p.accentClass} opacity-0 group-hover:opacity-100 transition-opacity`}>
                    {t("landing.welcome.discover")} <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center text-xs text-muted-foreground mt-8"
          >
            {t("landing.welcome.changeLater")}
          </motion.p>
        </div>
      </section>

      <SiteFooter />
      <CookieConsentBanner />
    </div>
  );
}
