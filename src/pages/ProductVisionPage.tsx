import { ContentPageShell, ContentSection } from "@/components/ContentPageShell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  User, Users, Swords, MapPin, Network, Coins, Sparkles, Shield, Heart,
} from "lucide-react";

const PILLARS = [
  {
    icon: User,
    title: "Living Profiles — Amplified by AI",
    description:
      "Each user owns a living profile: skills, territories, causes, services, quests completed, XP level and community involvement.",
    aiFeatures: [
      "Generate profile from CV / LinkedIn / text",
      "Identify ideal quests, roles or guilds",
      "Rewrite bios, pitches and project descriptions",
      "Suggest meaningful human connections",
      "Package services and expertise",
    ],
    goal: "Reduce friction, increase visibility, enhance impact.",
  },
  {
    icon: Users,
    title: "Guilds — Communities Designed for Action",
    description:
      "Autonomous communities with rituals & gatherings, members & roles, internal quests, partnerships, collective funding, shared knowledge and distributed governance.",
    aiFeatures: [
      "Publish public quests",
      "Onboard organizations",
      "Co-finance missions",
      "Co-create learning environments",
      "Define rules, traditions & rituals",
    ],
    goal: "Structure communities so they can act with clarity, agency and collective intelligence.",
  },
  {
    icon: Swords,
    title: "Quests — The Engine of Value and Impact",
    description:
      "Professional missions, community challenges, territorial actions, rituals, learning pathways, creative explorations and transition projects.",
    aiFeatures: [
      "Funded via fiat, credits, XP sponsorship, guild or territorial funds",
      "Quest templates for structured missions",
      "AI co-writes, analyzes and recommends quests",
    ],
    goal: "Help individuals, organizations and territories turn needs into action.",
  },
  {
    icon: MapPin,
    title: "Living Territories — Intelligence for Regeneration",
    description:
      "Every territory has a dynamic portrait, AI-powered ecosystem analysis, maps of skills and actors, a territory feed of needs and signals, and territorial quests.",
    aiFeatures: [
      "Collaborative territory builder module",
      "Territories become readable, understandable & mobilizable",
    ],
    goal: "Give local actors a live intelligence layer to guide transformation.",
  },
  {
    icon: Network,
    title: "The Social Graph — Purposeful & Real-World Anchored",
    description:
      "Connect people through shared causes, skills, place-based involvement, guild membership and project participation.",
    aiFeatures: [
      "Augmented messaging (AI summaries, actions, recommendations)",
      "In-person meetings and explorations",
      "Hybrid events (rituals, masterclasses, gatherings)",
      "Cross-territory learning loops",
    ],
    goal: "Weave meaningful networks of practice, purpose and mutual support.",
  },
  {
    icon: Coins,
    title: "A Cooperative Multi-Economy",
    description:
      "Value circulates through four complementary systems: fiat currency, credits (internal currency with slow demurrage), XP (reputation with 15 bio-inspired levels), and cooperative shares A/B/C.",
    aiFeatures: [
      "Fiat for classic payments",
      "Credits earned through contributions, unlock tools & quests",
      "XP grants governance rights with territory multipliers",
      "Shares represent long-term cooperative ownership",
    ],
    goal: "Align money, recognition, cooperation and governance.",
  },
];

export default function ProductVisionPage({ embedded }: { embedded?: boolean }) {
  return (
    <ContentPageShell
      embedded={embedded}
      title="Product Vision 2026"
      subtitle="The cooperative platform that turns people, communities and territories into engines of transformation."
    >
      {/* Ambition */}
      <ContentSection title="Our Ambition">
        <p className="text-sm text-muted-foreground leading-relaxed">
          changethegame is a global digital cooperative designed for people, organizations and territories who want to act, collaborate and regenerate their ecosystems.
        </p>
        <p className="text-sm text-muted-foreground mt-2 italic">
          It is not a social network. It is not a marketplace. It is not a project management tool.
        </p>
        <p className="text-sm font-semibold mt-2">
          👉 changethegame is an <span className="text-primary">action infrastructure</span> — where skills, missions, communities, territories, resources and collective intelligence turn into real-world impact.
        </p>
      </ContentSection>

      {/* Vision */}
      <ContentSection title="Our Vision">
        <ul className="space-y-1.5 text-sm text-muted-foreground list-disc pl-5">
          <li>Individuals showcase talents, stories and contributions</li>
          <li>Collectives organize, fund and grow</li>
          <li>Organizations find the right people and launch missions</li>
          <li>Territories become readable, understandable and actionable</li>
          <li>Value circulates through multiple systems (fiat, credits, XP, shares)</li>
          <li>Everyone contributes to a shared digital commons</li>
          <li>AI acts as a co-pilot for transformation</li>
        </ul>
      </ContentSection>

      {/* Six Pillars */}
      <ContentSection title="The Six Product Pillars">
        <div className="grid gap-5 sm:grid-cols-2">
          {PILLARS.map((p, i) => {
            const Icon = p.icon;
            return (
              <Card key={i} className="p-5 space-y-3 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-display font-bold text-sm leading-tight">{p.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.description}</p>
                <ul className="space-y-1 pl-4">
                  {p.aiFeatures.map((f) => (
                    <li key={f} className="text-xs text-muted-foreground list-disc">{f}</li>
                  ))}
                </ul>
                <p className="text-xs font-semibold text-primary">🎯 {p.goal}</p>
              </Card>
            );
          })}
        </div>
      </ContentSection>

      {/* AI Role */}
      <ContentSection title="The Role of AI — A Constant Co-pilot">
        <div className="flex flex-wrap gap-2 mb-3">
          {[
            "Structure ideas into quests",
            "Generate bios & proposals",
            "Summarize rituals & meetings",
            "Suggest connections & opportunities",
            "Diagnose territories",
            "Align tasks with missions",
            "Analyze collective signals",
          ].map((item) => (
            <Badge key={item} variant="secondary" className="text-xs font-normal">
              {item}
            </Badge>
          ))}
        </div>
        <p className="text-sm text-muted-foreground italic">
          🎯 Augment human capacities, not replace them.
        </p>
      </ContentSection>

      {/* Governance */}
      <ContentSection title="Governance Architecture">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { icon: Shield, label: "Users are co-stewards" },
            { icon: Sparkles, label: "XP grants progressive rights" },
            { icon: Coins, label: "Shares give long-term engagement" },
            { icon: Heart, label: "Transparent governance" },
            { icon: Users, label: "Guilds hold micro-governance" },
            { icon: MapPin, label: "Territories influence strategy" },
          ].map(({ icon: I, label }) => (
            <div key={label} className="flex items-center gap-2 rounded-lg border p-2.5">
              <I className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </ContentSection>

      {/* Promise */}
      <ContentSection title="Our Promise">
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          To reinvent how humans collaborate to transform their ecosystems. A space where:
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            "Talents find meaning",
            "Organizations find the right people",
            "Communities find structure",
            "Territories find clarity",
            "The commons find a home",
            "Transitions find momentum",
          ].map((p) => (
            <Badge key={p} className="text-xs px-3 py-1">{p}</Badge>
          ))}
        </div>
      </ContentSection>
    </ContentPageShell>
  );
}
