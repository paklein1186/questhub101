import { ContentPageShell, ContentSection, ContentList } from "@/components/ContentPageShell";
import { useTranslation } from "react-i18next";

export default function TerritoryAgentsInfoPage() {
  const { t } = useTranslation();
  const analyzeItems = t("territoryAgentsPage.analyzeItems", { returnObjects: true }) as string[];

  return (
    <ContentPageShell title={t("pages.territoryAgents.title")} subtitle={t("pages.territoryAgents.subtitle")}>
      <ContentSection title={t("territoryAgentsPage.whatAnalyze")}>
        <ContentList items={Array.isArray(analyzeItems) ? analyzeItems : []} />
      </ContentSection>

      <ContentSection title={t("territoryAgentsPage.purposeTitle")}>
        <p>{t("territoryAgentsPage.purposeP")}</p>
      </ContentSection>
    </ContentPageShell>
  );
}
