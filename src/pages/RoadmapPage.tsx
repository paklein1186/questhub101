import { ContentPageShell, ContentSection, ContentList } from "@/components/ContentPageShell";

export default function RoadmapPage() {
  return (
    <ContentPageShell title="Roadmap & Changelog" subtitle="What's coming next.">
      <ContentSection title="Upcoming Features">
        <ContentList items={[
          "Enhanced territory intelligence dashboards",
          "Advanced guild governance tools",
          "Public API for integrations",
          "Mobile-optimized experience improvements",
          "Cross-platform AI matchmaking upgrades",
        ]} />
      </ContentSection>

      <ContentSection title="Recent Updates">
        <ContentList items={[
          "Network hub with relational ecosystem view",
          "AI matchmaker integration across all units",
          "Course creation and enrollment system",
          "Quest proposals and funding workflows",
          "Persona-based UI personalization",
        ]} />
      </ContentSection>

      <ContentSection title="Community Proposals">
        <p>Features shaped by community feedback are prioritized in our development cycle. Share your ideas through the governance tools in your guild or via the contact page.</p>
      </ContentSection>
    </ContentPageShell>
  );
}
