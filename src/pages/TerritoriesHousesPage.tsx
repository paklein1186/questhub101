import { ContentPageShell, ContentSection, ContentList, ContentCTA } from "@/components/ContentPageShell";
import { useTranslation } from "react-i18next";

export default function TerritoriesHousesPage() {
  const { t } = useTranslation();
  return (
    <ContentPageShell title={t("pages.territoriesInfo.title")} subtitle={t("pages.territoriesInfo.subtitle")}>
      <ContentSection title={t("territoriesHousesPage.whatAreTerritories")}>
        <p>{t("territoriesHousesPage.territoriesDesc")}</p>
      </ContentSection>

      <ContentSection title={t("territoriesHousesPage.whatAreTopics")}>
        <p>{t("territoriesHousesPage.topicsDesc")}</p>
      </ContentSection>

      <ContentSection title={t("territoriesHousesPage.togetherShape")}>
        <ContentList items={t("territoriesHousesPage.shapeItems", { returnObjects: true }) as string[]} />
      </ContentSection>

      <ContentCTA links={[
        { label: t("territoriesHousesPage.exploreTopics"), href: "/explore/houses" },
        { label: t("territoriesHousesPage.explorePeople"), href: "/explore/users" },
      ]} />
    </ContentPageShell>
  );
}
