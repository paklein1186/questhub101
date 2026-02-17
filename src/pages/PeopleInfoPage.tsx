import { ContentPageShell, ContentSection, ContentList, ContentCTA } from "@/components/ContentPageShell";
import { useTranslation } from "react-i18next";

export default function PeopleInfoPage() {
  const { t } = useTranslation();
  return (
    <ContentPageShell title={t("pages.peopleInfo.title")} subtitle={t("pages.peopleInfo.subtitle")}>
      <ContentSection title="Find Your People">
        <p>Use Houses, Territories, XP and contributions to find people you align with. Discover:</p>
        <ContentList items={["Creators", "Experts", "Impact professionals", "Guild leaders", "Company representatives", "Local actors"]} />
      </ContentSection>

      <ContentCTA links={[{ label: "Explore people", href: "/explore/users" }]} />
    </ContentPageShell>
  );
}
