import { ContentPageShell, ContentSection, ContentList, ContentCTA } from "@/components/ContentPageShell";
import { useTranslation } from "react-i18next";

export default function ServiceInfoPage() {
  const { t } = useTranslation();
  return (
    <ContentPageShell title={t("pages.serviceInfo.title")} subtitle={t("pages.serviceInfo.subtitle")}>
      <ContentSection title="What You Can Offer">
        <p>Services (or skill sessions) let you offer:</p>
        <ContentList items={["Expertise", "Creative sessions", "Workshops", "Mentoring", "Coaching", "Artistic practices"]} />
      </ContentSection>

      <ContentSection title="Features">
        <p>Integrated booking, calendar, and optional credit payments.</p>
      </ContentSection>

      <ContentCTA links={[{ label: "Create a service", href: "/services/new" }]} />
    </ContentPageShell>
  );
}
