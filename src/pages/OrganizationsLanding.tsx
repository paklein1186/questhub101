import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Building2, Landmark, GraduationCap, Heart, Leaf,
  Users, Target, Briefcase, Handshake, MapPin, Shield, Compass,
  Sparkles, Zap, Globe,
} from "lucide-react";
import logoImg from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { useAuth } from "@/hooks/useAuth";
import { GuestOnboardingAssistant } from "@/components/GuestOnboardingAssistant";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" as const } }),
};

const ORG_TYPES = [
  { icon: Landmark, label: "Public Sector", desc: "Government agencies, municipalities, public institutions" },
  { icon: Building2, label: "Corporations", desc: "Companies bringing innovation and resources to the ecosystem" },
  { icon: GraduationCap, label: "Academics & Research", desc: "Universities, labs, and research institutions" },
  { icon: Heart, label: "Foundations", desc: "Philanthropic organizations driving systemic change" },
  { icon: Leaf, label: "NGOs", desc: "Non-profits working on social and environmental impact" },
];

const STEPS = [
  { step: "01", title: "Create your profile", desc: "Add your organization details — or let AI scrape your website to auto-fill." },
  { step: "02", title: "AI maps your mission", desc: "We match your topics, territories, and causes to the ecosystem." },
  { step: "03", title: "Launch opportunities", desc: "Post quests, jobs, or calls for proposals to find aligned talent." },
  { step: "04", title: "Match with builders", desc: "Discover guilds, users, and pods aligned with your mission." },
];

const WHY_JOIN = [
  { icon: Users, title: "Access talent", desc: "Find skilled individuals and guilds aligned with your mission." },
  { icon: Target, title: "Launch calls for proposals", desc: "Create monetized quests open to the entire ecosystem." },
  { icon: Handshake, title: "Co-create with guilds", desc: "Partner with mission-driven communities." },
  { icon: MapPin, title: "Territorial impact", desc: "Strengthen your presence in specific territories." },
  { icon: Compass, title: "Discover innovations", desc: "Explore regenerative practices and new approaches." },
];

export default function OrganizationsLanding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [guestOpen, setGuestOpen] = useState(false);
  const [guestAction, setGuestAction] = useState("");

  useEffect(() => {
    if (user) return;
    const dismissed = localStorage.getItem("guestAssistantDismissed");
    if (dismissed) return;
    const timer = setTimeout(() => {
      setGuestAction("learn about the organization path");
      setGuestOpen(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, [user]);

  const handleGatedClick = (label: string, authRoute: string) => {
    if (user) navigate(authRoute);
    else { setGuestAction(label); setGuestOpen(true); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/welcome" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
            <img src={logoImg} alt="changethegame" className="h-6 w-6" /> changethegame
          </Link>
          <nav className="flex items-center gap-2">
            <Button size="sm" variant="ghost" asChild><Link to="/explore"><Compass className="h-4 w-4 mr-1" /> Explore</Link></Button>
            {user ? (
              <Button size="sm" asChild><Link to="/">Enter</Link></Button>
            ) : (
              <>
                <Button size="sm" variant="ghost" asChild><Link to="/login">Log in</Link></Button>
                <Button size="sm" asChild><Link to="/welcome">Sign up</Link></Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="container py-16 sm:py-24 md:py-32 text-center relative z-10 px-4">
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-medium">
              <Building2 className="h-3 w-3 mr-1" /> For Institutions & Organizations
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight max-w-4xl mx-auto leading-[1.1] px-2"
          >
            Institutions shaping the future with{" "}
            <span className="text-primary">regenerative collaboration.</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25, duration: 0.6 }}
            className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed"
          >
            Connect with innovators, territories and mission-driven builders across 45+ countries.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-8 flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button size="lg" className="gap-2" onClick={() => handleGatedClick("create an organization profile", "/onboarding?org=1")}>
              <Building2 className="h-4 w-4" /> Get Started
            </Button>
            <Button size="lg" variant="outline" className="gap-2" asChild>
              <Link to="/explore"><Compass className="h-4 w-4" /> Explore Ecosystem</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Why Join */}
      <section className="border-t border-border bg-muted/40">
        <div className="container py-16 md:py-24">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-12">Why join the ecosystem?</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {WHY_JOIN.map((item, i) => (
              <motion.div key={item.title} custom={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
                className="rounded-2xl border border-border bg-card p-6 text-center"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-border">
        <div className="container py-16 md:py-24">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-12">How it works</h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <motion.div key={s.step} custom={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
                className="relative"
              >
                <div className="text-5xl font-display font-black text-primary/10 mb-2">{s.step}</div>
                <h3 className="font-display font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Organization Types */}
      <section className="border-t border-border bg-muted/40">
        <div className="container py-16 md:py-24">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-4">Types of organizations</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-lg mx-auto">
            Whether public or private, large or small — there's a place for structured institutions.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {ORG_TYPES.map((t, i) => (
              <motion.div key={t.label} custom={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
                className="rounded-2xl border border-border bg-card p-5 text-center"
              >
                <t.icon className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-display font-semibold text-sm mb-1">{t.label}</h3>
                <p className="text-xs text-muted-foreground">{t.desc}</p>
              </motion.div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              If you're a <strong>DAO, collective, or community</strong>, consider creating a{" "}
              <Link to="/create/guild-info" className="text-primary font-medium hover:underline">Guild</Link> instead.
            </p>
          </div>
        </div>
      </section>

      {/* Governance & Transparency */}
      <section className="border-t border-border">
        <div className="container py-16 md:py-24 max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <Shield className="h-8 w-8 text-primary mx-auto mb-6" />
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-6">Governance & Transparency</h2>
            <div className="grid gap-4 sm:grid-cols-2 text-left">
              <div className="rounded-xl border border-border bg-card p-4">
                <Zap className="h-5 w-5 text-amber-500 mb-2" />
                <h3 className="font-semibold text-sm mb-1">XP — Reputation</h3>
                <p className="text-xs text-muted-foreground">Non-financial reputation earned through contributions. Unlocks governance rights.</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <Sparkles className="h-5 w-5 text-blue-500 mb-2" />
                <h3 className="font-semibold text-sm mb-1">Credits — Platform Currency</h3>
                <p className="text-xs text-muted-foreground">Internal currency for premium features, earned through sponsorship or conversion.</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <Globe className="h-5 w-5 text-emerald-500 mb-2" />
                <h3 className="font-semibold text-sm mb-1">Money — Real Transactions</h3>
                <p className="text-xs text-muted-foreground">Stripe-powered payments for quests, services, and events.</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <Shield className="h-5 w-5 text-purple-500 mb-2" />
                <h3 className="font-semibold text-sm mb-1">Open Collaboration</h3>
                <p className="text-xs text-muted-foreground">Reputation-based trust. Governance rights depend on XP and contribution history.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border bg-primary/5">
        <div className="container py-16 text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">Ready to join the ecosystem?</h2>
          <p className="text-muted-foreground mb-6">Create your organization profile and start collaborating.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" onClick={() => handleGatedClick("create an organization profile", "/onboarding?org=1")}>
              Get Started <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/explore">Explore the platform</Link>
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
