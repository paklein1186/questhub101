import { ContentPageShell, ContentSection, ContentList, ContentCTA } from "@/components/ContentPageShell";
import { useTranslation } from "react-i18next";

export default function AboutPage() {
  const { t } = useTranslation();
  const valuesList = t("aboutPage.valuesList", { returnObjects: true }) as string[];
  const whatYouCanDoList = t("aboutPage.whatYouCanDoList", { returnObjects: true }) as string[];

  return (
    <ContentPageShell title={t("pages.about.title")} subtitle={t("pages.about.subtitle")}>
      <ContentSection title={t("aboutPage.purpose")}>
        <p>{t("aboutPage.purposeText")}</p>
      </ContentSection>

      <ContentSection title={t("aboutPage.values")}>
        <ContentList items={Array.isArray(valuesList) ? valuesList : []} />
      </ContentSection>

      <ContentSection title={t("aboutPage.whatYouCanDo")}>
        <ContentList items={Array.isArray(whatYouCanDoList) ? whatYouCanDoList : []} />
      </ContentSection>

      <ContentSection title={t("aboutPage.trustTitle")}>
        <p>{t("aboutPage.trustText")}</p>
      </ContentSection>

      <ContentSection title={t("aboutPage.visionTitle")}>
        <p>{t("aboutPage.visionText")}</p>
      </ContentSection>

      <ContentCTA links={[
        { label: t("aboutPage.ctaHowItWorks"), href: "/how-it-works" },
        { label: t("aboutPage.ctaTrustGraph"), href: "/ecosystem?tab=trust" },
        { label: t("aboutPage.ctaGovernance"), href: "/governance" },
        { label: t("aboutPage.ctaRoadmap"), href: "/roadmap" },
      ]} />
    </ContentPageShell>
  );
}
