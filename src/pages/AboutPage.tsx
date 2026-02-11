import { ContentPageShell, ContentSection, ContentList, ContentCTA } from "@/components/ContentPageShell";

export default function AboutPage() {
  return (
    <ContentPageShell title="About changethegame" subtitle="Human-powered. AI-augmented. Game-changing.">
      <ContentSection title="Our Purpose">
        <p>changethegame exists to help humans collaborate, create, and regenerate the world. We blend collective intelligence, creativity, territories, and AI-powered agents into a single ecosystem where anyone can launch quests, join guilds, offer services, and activate their region or community.</p>
      </ContentSection>

      <ContentSection title="What We Stand For">
        <ContentList items={[
          "Regeneration over extraction",
          "Collaboration over competition",
          "Collective intelligence over silos",
          "Territories as living ecosystems",
          "Creativity as a force for transformation",
          "AI as an amplifier of human agency",
        ]} />
      </ContentSection>

      <ContentSection title="What You Can Do Here">
        <ContentList items={[
          "Launch or join quests",
          "Create or join guilds and collectives",
          "Offer services or skill sessions",
          "Start or join companies",
          "Explore territories, people, and ideas",
          "Learn with courses, sessions, and events",
          "Collaborate with AI agents dedicated to each unit",
        ]} />
      </ContentSection>

      <ContentSection title="Our Vision">
        <p>A world where people, organizations, and territories collaborate fluidly to build a regenerative, creative and inclusive future — one quest at a time.</p>
      </ContentSection>

      <ContentCTA links={[
        { label: "How it works", href: "/how-it-works" },
        { label: "Governance model", href: "/governance" },
        { label: "Roadmap & Changelog", href: "/roadmap" },
      ]} />
    </ContentPageShell>
  );
}
