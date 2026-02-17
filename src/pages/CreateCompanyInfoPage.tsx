import { ContentPageShell, ContentSection, ContentList, ContentCTA } from "@/components/ContentPageShell";
import { useTranslation } from "react-i18next";

export default function CreateCompanyInfoPage() {
  const { t } = useTranslation();
  return (
    <ContentPageShell title={t("pages.createCompany.title")} subtitle={t("pages.createCompany.subtitle")}>
      <ContentSection title="What Traditional Organizations Manage">
        <p>A Traditional Organization refers to a classic structure (SME, non-profit, institution, coop-like, or startup) operating in the conventional world. They manage:</p>
        <ContentList items={["Organization quests", "Organization services", "Members and roles", "Bookings", "Governance"]} />
      </ContentSection>

      <ContentCTA links={[{ label: "Create a Traditional Organization", href: "/me/companies" }]} />
    </ContentPageShell>
  );
}
