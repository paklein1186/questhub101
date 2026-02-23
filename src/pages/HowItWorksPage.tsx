import { ContentPageShell, ContentSection, ContentList, ContentCTA } from "@/components/ContentPageShell";
import { useTranslation } from "react-i18next";

export default function HowItWorksPage() {
  const { t } = useTranslation();
  const step2Items = t("howItWorksPage.step2Items", { returnObjects: true }) as string[];
  const step3Items = t("howItWorksPage.step3Items", { returnObjects: true }) as string[];
  const step4Items = t("howItWorksPage.step4Items", { returnObjects: true }) as string[];
  const step7Items = t("howItWorksPage.step7Items", { returnObjects: true }) as string[];
  const step9Items = t("howItWorksPage.step9Items", { returnObjects: true }) as string[];

  return (
    <ContentPageShell title={t("pages.howItWorks.title")} subtitle={t("pages.howItWorks.subtitle")}>
      <ContentSection title={t("howItWorksPage.step1Title")}>
        <p>{t("howItWorksPage.step1Text")}</p>
      </ContentSection>

      <ContentSection title={t("howItWorksPage.step2Title")}>
        <p>{t("howItWorksPage.step2Text")}</p>
        <ContentList items={Array.isArray(step2Items) ? step2Items : []} />
      </ContentSection>

      <ContentSection title={t("howItWorksPage.step3Title")}>
        <p>{t("howItWorksPage.step3Text")}</p>
        <ContentList items={Array.isArray(step3Items) ? step3Items : []} />
      </ContentSection>

      <ContentSection title={t("howItWorksPage.step4Title")}>
        <p>{t("howItWorksPage.step4Text")}</p>
        <ContentList items={Array.isArray(step4Items) ? step4Items : []} />
      </ContentSection>

      <ContentSection title={t("howItWorksPage.step5Title")}>
        <p>{t("howItWorksPage.step5Text")}</p>
      </ContentSection>

      <ContentSection title={t("howItWorksPage.step6Title")}>
        <p>{t("howItWorksPage.step6Text")}</p>
      </ContentSection>

      <ContentSection title={t("howItWorksPage.step7Title")}>
        <p>{t("howItWorksPage.step7Text")}</p>
        <ContentList items={Array.isArray(step7Items) ? step7Items : []} />
      </ContentSection>

      <ContentSection title={t("howItWorksPage.step8Title")}>
        <p>{t("howItWorksPage.step8Text")}</p>
      </ContentSection>

      <ContentSection title={t("howItWorksPage.step9Title")}>
        <p>{t("howItWorksPage.step9Text")}</p>
        <ContentList items={Array.isArray(step9Items) ? step9Items : []} />
      </ContentSection>

      <ContentCTA links={[
        { label: t("howItWorksPage.ctaCreateQuest"), href: "/quests/new" },
        { label: t("howItWorksPage.ctaJoinGuild"), href: "/explore?tab=guilds" },
        { label: t("howItWorksPage.ctaTrustGraph"), href: "/ecosystem?tab=trust" },
        { label: t("howItWorksPage.ctaExplorePeople"), href: "/explore/users" },
      ]} />
    </ContentPageShell>
  );
}
