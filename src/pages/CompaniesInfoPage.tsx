import { ContentPageShell, ContentSection, ContentList, ContentCTA } from "@/components/ContentPageShell";
import { useTranslation } from "react-i18next";

export default function CompaniesInfoPage() {
  const { t } = useTranslation();
  return (
    <ContentPageShell title={t("pages.companiesInfo.title")} subtitle={t("pages.companiesInfo.subtitle")}>
      <ContentSection title="Traditional Organizations in changethegame">
        <p>Traditional Organizations represent the professional world inside changethegame — SMEs, non-profits, institutions, cooperatives, and startups. You can:</p>
        <ContentList items={["Attach yourself to an organization", "Create or join organization quests", "Offer services as an organization", "Build teams and pods"]} />
      </ContentSection>

      <ContentCTA links={[
        { label: "Browse Traditional Organizations", href: "/explore?tab=companies" },
        { label: "Create a Traditional Organization", href: "/me/companies" },
      ]} />
    </ContentPageShell>
  );
}