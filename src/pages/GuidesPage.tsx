import { PageShell } from "@/components/PageShell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Rocket,
  BookOpen,
  AlertCircle,
  LifeBuoy,
  Sparkles,
  Users,
  MapPin,
  GraduationCap,
  ShieldCheck,
  BriefcaseBusiness,
  Compass,
  Swords,
  Wrench,
  MessageCircleQuestion,
} from "lucide-react";
import { useEffect, useState } from "react";

const sections = [
  { id: "quickstart", label: "Quickstart", icon: Rocket },
  { id: "indepth", label: "In‑depth Guides", icon: BookOpen },
  { id: "troubleshooting", label: "Troubleshooting", icon: AlertCircle },
  { id: "help", label: "Ask for Help", icon: LifeBuoy },
] as const;

const quickstartItems = [
  {
    title: "How to create your profile",
    icon: Users,
    text: "Set your name, picture, bio, creative mediums or roles, and choose your preferred notification channel (WhatsApp / Telegram / Email). Save once and you're ready.",
  },
  {
    title: "How to launch a quest",
    icon: Swords,
    text: "Go to Explore → Quests → Create. Add a title, description, images, and choose whether it belongs to a Guild/Company or to you.",
  },
  {
    title: "How to join a guild",
    icon: Users,
    text: "Visit any guild page and click Join or Apply. Some guilds accept instantly, others require a short application.",
  },
  {
    title: "How to offer a service",
    icon: BriefcaseBusiness,
    text: "Open Profile → Services. Set your pricing, availability, and what you teach or provide.",
  },
  {
    title: "How to use AI agents",
    icon: Sparkles,
    text: "Anywhere you see the ✨ icon, the AI can help write bios, launch quests, generate ideas, or guide onboarding.",
  },
];

const indepthItems = [
  {
    title: "XP, credits & contribution index",
    icon: Compass,
    text: "XP tracks participation and creativity. Credits allow boosts and unlocks. Contribution Index measures long‑term activity.",
  },
  {
    title: "Pods and collaboration tools",
    icon: Users,
    text: "Pods are small groups for collaboration or jams. They include chat, notes, calls, and a shared calendar.",
  },
  {
    title: "Guild governance",
    icon: ShieldCheck,
    text: "Guilds have admins, core members, guests, and approval systems. Admins manage membership and events.",
  },
  {
    title: "Territory activation",
    icon: MapPin,
    text: "Territories surface events near you. Join more than one if you travel or belong to multiple communities.",
  },
  {
    title: "Courses & learning modules",
    icon: GraduationCap,
    text: "Courses include lessons, files, or videos. Some are free, others paid. Users can also create courses.",
  },
  {
    title: "How AI works and where data goes",
    icon: ShieldCheck,
    text: "AI only uses the data you choose to share (profile, quests, sessions, interactions). Private messages are never read.",
  },
];

const troubleshootingItems = [
  {
    title: "I can't create a quest",
    icon: Wrench,
    text: "Check you're logged in and fields are filled. Try refreshing.",
  },
  {
    title: "My guild doesn't display properly",
    icon: Wrench,
    text: "Your application may still be pending, or visibility is restricted.",
  },
  {
    title: "My company isn't attached",
    icon: Wrench,
    text: "Go to Profile → Companies and attach/create. Some require admin approval.",
  },
  {
    title: "Bookings don't open",
    icon: Wrench,
    text: "Ensure slots exist. Try switching device or browser.",
  },
  {
    title: "Notifications don't appear",
    icon: Wrench,
    text: "Enable notifications in Settings → Notifications and check your channel link.",
  },
];

export default function GuidesPage() {
  const [activeSection, setActiveSection] = useState("quickstart");

  useEffect(() => {
    const handleScroll = () => {
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 120) setActiveSection(s.id);
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <PageShell>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground font-display">
            Guides &amp; Support
          </h1>
          <p className="mt-2 text-muted-foreground text-lg">
            Everything you need to get started, learn, and grow.
          </p>
        </div>

        <div className="flex gap-8">
          {/* Sidebar navigation — hidden on mobile */}
          <nav className="hidden lg:block w-48 shrink-0 sticky top-24 self-start space-y-1">
            {sections.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeSection === s.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {s.label}
                </button>
              );
            })}
          </nav>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-12">
            {/* Section 1 — Quickstart */}
            <section id="quickstart">
              <div className="flex items-center gap-2 mb-4">
                <Rocket className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">Quickstart Guides</h2>
              </div>
              <Accordion type="multiple" className="space-y-2">
                {quickstartItems.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <AccordionItem
                      key={i}
                      value={`qs-${i}`}
                      className="border rounded-lg px-4 bg-card"
                    >
                      <AccordionTrigger className="hover:no-underline gap-3">
                        <span className="flex items-center gap-2 text-left font-medium">
                          <Icon className="h-4 w-4 text-primary shrink-0" />
                          {item.title}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground leading-relaxed pl-6">
                        {item.text}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </section>

            {/* Section 2 — In-depth */}
            <section id="indepth">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">In‑depth Guides</h2>
              </div>
              <Accordion type="multiple" className="space-y-2">
                {indepthItems.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <AccordionItem
                      key={i}
                      value={`id-${i}`}
                      className="border rounded-lg px-4 bg-card"
                    >
                      <AccordionTrigger className="hover:no-underline gap-3">
                        <span className="flex items-center gap-2 text-left font-medium">
                          <Icon className="h-4 w-4 text-primary shrink-0" />
                          {item.title}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground leading-relaxed pl-6">
                        {item.text}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </section>

            {/* Section 3 — Troubleshooting */}
            <section id="troubleshooting">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <h2 className="text-xl font-semibold text-foreground">Troubleshooting</h2>
              </div>
              <Accordion type="multiple" className="space-y-2">
                {troubleshootingItems.map((item, i) => (
                  <AccordionItem
                    key={i}
                    value={`ts-${i}`}
                    className="border rounded-lg px-4 bg-card"
                  >
                    <AccordionTrigger className="hover:no-underline gap-3">
                      <span className="flex items-center gap-2 text-left font-medium">
                        <MessageCircleQuestion className="h-4 w-4 text-destructive shrink-0" />
                        {item.title}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed pl-6">
                      {item.text}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>

            {/* Section 4 — Ask for Help */}
            <section id="help" className="pb-16">
              <div className="flex items-center gap-2 mb-4">
                <LifeBuoy className="h-5 w-5 text-accent" />
                <h2 className="text-xl font-semibold text-foreground">Ask for Help</h2>
              </div>
              <div className="rounded-lg border bg-card p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <p className="text-muted-foreground flex-1">
                  Stuck? The team will support you personally.
                </p>
                <Button asChild>
                  <Link to="/contact">Contact Support</Link>
                </Button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
