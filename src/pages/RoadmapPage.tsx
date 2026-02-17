import { ContentPageShell, ContentSection, ContentList } from "@/components/ContentPageShell";
import { useTranslation } from "react-i18next";

export default function RoadmapPage() {
  const { t } = useTranslation();
  return (
    <ContentPageShell title={t("pages.roadmap.title")} subtitle={t("pages.roadmap.subtitle")}>
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
