import { ContentPageShell, ContentSection, ContentList } from "@/components/ContentPageShell";
import { useTranslation } from "react-i18next";

export default function TerritoryAgentsInfoPage() {
  const { t } = useTranslation();
  return (
    <ContentPageShell title={t("pages.territoryAgents.title")} subtitle={t("pages.territoryAgents.subtitle")}>
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
