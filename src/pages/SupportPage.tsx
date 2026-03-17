import { ContentPageShell, ContentSection, ContentList, ContentCTA } from "@/components/ContentPageShell";
import { useTranslation } from "react-i18next";

export default function SupportPage() {
  const { t } = useTranslation();
  return (
    <ContentPageShell title={t("pages.support.title")} subtitle={t("pages.support.subtitle")}>
      <ContentSection title={t("supportPage.quickstartTitle")}>
        <ContentList items={t("supportPage.quickstartItems", { returnObjects: true }) as string[]} />
      </ContentSection>

      <ContentSection title={t("supportPage.indepthTitle")}>
        <ContentList items={t("supportPage.indepthItems", { returnObjects: true }) as string[]} />
      </ContentSection>

      <ContentSection title={t("supportPage.troubleshootingTitle")}>
        <ContentList items={t("supportPage.troubleshootingItems", { returnObjects: true }) as string[]} />
      </ContentSection>

      <ContentSection title={t("supportPage.askTitle")}>
        <p>{t("supportPage.askText")}</p>
      </ContentSection>

      <ContentCTA links={[{ label: t("supportPage.contactLink"), href: "/contact" }]} />
    </ContentPageShell>
  );
}
