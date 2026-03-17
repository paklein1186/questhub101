import { useState, useMemo, useRef } from "react";
import { Search, MessageSquare, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/PageShell";
import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/* ─── FAQ Data ─── */
interface FaqItem {
  q: string;
  a: string[];
}
interface FaqSection {
  id: string;
  emoji: string;
  title: string;
  items: FaqItem[];
}

const FAQ_SECTIONS: FaqSection[] = [
  {
    id: "core",
    emoji: "🧭",
    title: "Core",
    items: [
      {
        q: "What is changethegame?",
        a: [
          "changethegame is a collaborative platform connecting people, places, and projects working toward regenerative futures.",
          "It enables coordination of skills, resources, and initiatives across territories — both digital and physical.",
        ],
      },
      {
        q: "Is this a finished product?",
        a: [
          "No — changethegame is currently in alpha.",
          "Features are evolving. Some elements may be unstable. Your feedback directly shapes the system.",
          "👉 You are a co-builder, not just a user.",
        ],
      },
      {
        q: "Why release an unfinished version?",
        a: [
          "Because this is a commons-based infrastructure. We believe:",
          "• Real usage reveals real needs",
          "• Collective intelligence outperforms closed design",
          "• Early contributors shape the DNA of the platform",
        ],
      },
    ],
  },
  {
    id: "commons-ai-tech",
    emoji: "🌍",
    title: "Commons, AI & Tech",
    items: [
      {
        q: 'What are "digital commons" in changethegame?',
        a: [
          "Digital commons are shared resources that are openly accessible, co-governed, and non-extractive.",
          "On changethegame: knowledge, tools, and networks are treated as commons. Value circulates instead of being captured.",
        ],
      },
      {
        q: "How does changethegame use AI?",
        a: [
          "AI acts as a cognitive support layer: navigation assistant, matchmaking engine, and content helper.",
          "👉 It supports decision-making, not replaces it.",
        ],
      },
      {
        q: "What is your approach to AI sobriety?",
        a: [
          "We apply AI frugality principles:",
          "• Minimal necessary computation",
          "• No addictive loops or dark patterns",
          "• Human-first interaction design",
          "👉 Intelligence should be meaningful, not excessive.",
        ],
      },
      {
        q: "Is changethegame decentralized?",
        a: [
          "Partially, and progressively. We are exploring decentralized identity, distributed governance, and modular infrastructure.",
          "👉 We prioritize usefulness first, decentralization second.",
        ],
      },
      {
        q: "Will changethegame be open source?",
        a: [
          "Partially. Some modules will be open. Some infrastructure may remain managed. Commons logic will stay transparent.",
          "👉 The goal is open value, not ideological purity.",
        ],
      },
    ],
  },
  {
    id: "value-ownership",
    emoji: "🏦",
    title: "Value & Ownership",
    items: [
      {
        q: "How are contributions recognized?",
        a: [
          "Through multiple layers: reputation (XP), platform credits, and economic opportunities.",
          "👉 Not all value is financial — but all contributions matter.",
        ],
      },
      {
        q: "What is the difference between XP, credits, and tokens?",
        a: [
          "• XP → reputation & trust",
          "• Credits → usable within the platform (services, AI, actions)",
          "• Tokens / shares → long-term value & governance",
        ],
      },
      {
        q: "Can I earn money through the platform?",
        a: [
          "Yes — indirectly and progressively: through missions, collaborations, and project involvement.",
          "👉 changethegame is a facilitator of opportunities, not a job marketplace.",
        ],
      },
      {
        q: "How are reputations built and validated?",
        a: [
          "Through contributions, peer interactions, and project involvement.",
          "Over time a trust graph emerges instead of centralized scoring.",
        ],
      },
      {
        q: "What prevents misuse or gaming of the system?",
        a: [
          "We combine social validation, multi-signal reputation, and progressive trust access.",
          "👉 Systems are designed to reward consistent contribution over short-term exploitation.",
        ],
      },
      {
        q: "How does the shareholding system work?",
        a: [
          "We explore hybrid ownership models: multi-stakeholder structures, contribution-based access, and long-term alignment mechanisms.",
          "This may include different share classes, governance rights, and value redistribution.",
          "⚠️ Still experimental — co-designed with users.",
        ],
      },
      {
        q: "Who owns changethegame?",
        a: [
          "Currently initiated by a core team. Long-term: designed to evolve toward shared ownership structures.",
        ],
      },
      {
        q: "Can users influence governance?",
        a: [
          "Yes — progressively. Feedback loops (now), structured participation (next), governance roles (later).",
          "👉 Governance is earned and activated, not given instantly.",
        ],
      },
      {
        q: "What is the long-term governance vision?",
        a: [
          "A hybrid model combining commons governance, stakeholder representation, and distributed decision layers.",
          "👉 Neither purely centralized nor fully decentralized.",
        ],
      },
    ],
  },
  {
    id: "platform-usage",
    emoji: "🧪",
    title: "Platform Usage",
    items: [
      {
        q: "How do I create and manage my profile?",
        a: [
          "You can create a personal profile, add skills, interests, and projects, and update it dynamically.",
          "👉 Your profile becomes your interface with the ecosystem.",
        ],
      },
      {
        q: 'What are "guilds" and how do they work?',
        a: [
          "Guilds are thematic or functional groups organized around skills, topics, or missions.",
          "They allow coordination, knowledge sharing, and collective action.",
        ],
      },
      {
        q: "How can I find or join projects?",
        a: [
          "Through discovery feeds, recommendations, and direct invitations.",
          "👉 The platform aims to reduce friction between intent and action.",
        ],
      },
      {
        q: 'What are "quests" or missions?',
        a: [
          "Quests are action-oriented tasks linked to real needs. They can be individual, collective, or territorial.",
        ],
      },
      {
        q: "How does matchmaking between users happen?",
        a: [
          "Through AI-assisted suggestions, shared interests, and complementary needs.",
          "👉 Focused on meaningful collaboration, not random networking.",
        ],
      },
    ],
  },
  {
    id: "data-infra",
    emoji: "🔐",
    title: "Data & Infrastructure",
    items: [
      {
        q: "Where is my data stored?",
        a: [
          "Currently on secured centralized infrastructure. In the future, more distributed approaches will be explored.",
        ],
      },
      {
        q: "Is my data secure and private?",
        a: [
          "Yes. Standard security practices are applied. No sale of personal data.",
          "👉 Trust is foundational.",
        ],
      },
      {
        q: "How interoperable is the platform?",
        a: [
          "We aim for API connections, modular integrations, and cross-platform compatibility.",
          "👉 changethegame should be a hub, not a silo.",
        ],
      },
    ],
  },
  {
    id: "ecosystem-vision",
    emoji: "🌍",
    title: "Ecosystem & Vision",
    items: [
      {
        q: "What types of projects or places are supported?",
        a: [
          "Third places / tiers-lieux, regenerative initiatives, cultural, social, ecological projects, and hybrid physical-digital ecosystems.",
        ],
      },
      {
        q: "How does changethegame relate to real-world territories?",
        a: [
          "It is designed as a coordination layer for places, a tool for territorial collaboration, and a bridge between digital and physical ecosystems.",
          "👉 Not just a platform — a territorial infrastructure.",
        ],
      },
    ],
  },
  {
    id: "alpha-disclaimer",
    emoji: "🧪",
    title: "Alpha Disclaimer",
    items: [
      {
        q: 'What does "alpha" mean for my experience?',
        a: [
          "Things will evolve quickly. Some features may break. Interfaces may change.",
          "👉 In exchange: you have influence, you shape the system, you are part of the foundation.",
        ],
      },
    ],
  },
];

/* ─── Component ─── */
export default function FaqPage() {
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const filtered = useMemo(() => {
    if (!search.trim()) return FAQ_SECTIONS;
    const q = search.toLowerCase();
    return FAQ_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          item.q.toLowerCase().includes(q) ||
          item.a.some((line) => line.toLowerCase().includes(q))
      ),
    })).filter((s) => s.items.length > 0);
  }, [search]);

  const scrollTo = (id: string) => {
    setActiveSection(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <PageShell>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* ── Header ── */}
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl sm:text-4xl font-bold mb-3">
            FAQ — changethegame <span className="text-primary">(Alpha)</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            An evolving platform, co-built with its users
          </p>
        </div>

        {/* ── Intro banner ── */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 mb-8 text-sm text-foreground/80 space-y-1">
          <p className="font-semibold text-foreground">🌱 This is an alpha version</p>
          <p>You are a co-builder, not just a user. Features evolve based on your feedback. Your contributions shape the DNA of the platform.</p>
        </div>

        {/* ── Search ── */}
        <div className="relative mb-8 max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search a question..."
            className="pl-10"
          />
        </div>

        {/* ── Section pills ── */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {FAQ_SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className={`text-xs sm:text-sm px-3 py-1.5 rounded-full border transition-colors font-medium ${
                activeSection === s.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {s.emoji} {s.title}
            </button>
          ))}
        </div>

        {/* ── Accordion sections ── */}
        <div className="space-y-10">
          {filtered.map((section) => (
            <div
              key={section.id}
              ref={(el) => { sectionRefs.current[section.id] = el; }}
              className="scroll-mt-24"
            >
              <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">{section.emoji}</span> {section.title}
              </h2>
              <Accordion type="multiple" className="space-y-2">
                {section.items.map((item, idx) => (
                  <AccordionItem
                    key={idx}
                    value={`${section.id}-${idx}`}
                    className="border border-border rounded-lg px-4 bg-card data-[state=open]:bg-accent/30"
                  >
                    <AccordionTrigger className="text-sm font-medium text-left py-4 hover:no-underline">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 space-y-2">
                      {item.a.map((line, li) => (
                        <p
                          key={li}
                          className={`text-sm leading-relaxed ${
                            line.startsWith("👉") || line.startsWith("⚠️")
                              ? "text-primary font-medium mt-2"
                              : "text-muted-foreground"
                          }`}
                        >
                          {line}
                        </p>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}

          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-12">
              No questions match your search. Try different keywords.
            </p>
          )}
        </div>

        {/* ── CTA ── */}
        <div className="mt-16 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/10 p-8 text-center space-y-4">
          <h3 className="font-display text-xl font-bold">Help shape changethegame</h3>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm">
            This FAQ evolves with you. Suggest improvements, ask questions, contribute.
          </p>
          <Button asChild>
            <Link to="/contact">
              <MessageSquare className="h-4 w-4 mr-2" /> Give feedback
            </Link>
          </Button>
        </div>

        {/* ── Final note ── */}
        <p className="text-center text-muted-foreground/60 text-xs mt-10 italic">
          changethegame is an evolving commons — built with you, not for you. 🌟
        </p>
      </div>
    </PageShell>
  );
}
