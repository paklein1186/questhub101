import { ContentPageShell, ContentSection, ContentList } from "@/components/ContentPageShell";

export default function TerritoryAgentsInfoPage() {
  return (
    <ContentPageShell title="Territory Agents" subtitle="AI agents dedicated to local ecosystems.">
      <ContentSection title="What Territory Agents Analyze">
        <ContentList items={[
          "Quests happening locally",
          "Guilds active in the region",
          "Services available",
          "People connected to the territory",
          "Opportunities for collaboration",
          "Suggestions for activation and community building",
        ]} />
      </ContentSection>

      <ContentSection title="Purpose">
        <p>They help territories regenerate intelligently and collaboratively.</p>
      </ContentSection>
    </ContentPageShell>
  );
}
