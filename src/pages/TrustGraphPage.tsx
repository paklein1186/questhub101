import { ContentPageShell, ContentSection, ContentList, ContentCTA } from "@/components/ContentPageShell";
import { useTranslation } from "react-i18next";

export default function TrustGraphPage({ embedded }: { embedded?: boolean }) {
  const { t } = useTranslation();
  const howItems = t("trustGraphPage.howItems", { returnObjects: true }) as string[];
  const antiGamingItems = t("trustGraphPage.antiGamingItems", { returnObjects: true }) as string[];
  const rewardsItems = t("trustGraphPage.rewardsItems", { returnObjects: true }) as string[];
  const opennessItems = t("trustGraphPage.opennessItems", { returnObjects: true }) as string[];
  const platformItems = t("trustGraphPage.platformItems", { returnObjects: true }) as string[];

  return (
    <ContentPageShell
      title={t("pages.trustGraph.title")}
      subtitle={t("pages.trustGraph.subtitle")}
      embedded={embedded}
    >
      <ContentSection title={t("trustGraphPage.whyTitle")}>
        <p>{t("trustGraphPage.whyP1")}</p>
        <p>{t("trustGraphPage.whyP2")}</p>
      </ContentSection>

      <ContentSection title={t("trustGraphPage.howTitle")}>
        <p>{t("trustGraphPage.howIntro")}</p>
        <ContentList items={Array.isArray(howItems) ? howItems : []} />
      </ContentSection>

      <ContentSection title={t("trustGraphPage.antiGamingTitle")}>
        <p>{t("trustGraphPage.antiGamingIntro")}</p>
        <ContentList items={Array.isArray(antiGamingItems) ? antiGamingItems : []} />
      </ContentSection>

      <ContentSection title={t("trustGraphPage.rewardsTitle")}>
        <p>{t("trustGraphPage.rewardsIntro")}</p>
        <ContentList items={Array.isArray(rewardsItems) ? rewardsItems : []} />
      </ContentSection>

      <ContentSection title={t("trustGraphPage.opennessTitle")}>
        <p>{t("trustGraphPage.opennessP1")}</p>
        <ContentList items={Array.isArray(opennessItems) ? opennessItems : []} />
      </ContentSection>

      <ContentSection title={t("trustGraphPage.platformTitle")}>
        <p>{t("trustGraphPage.platformIntro")}</p>
        <ContentList items={Array.isArray(platformItems) ? platformItems : []} />
      </ContentSection>

      <ContentCTA links={[
        { label: t("trustGraphPage.ctaExplore"), href: "/explore/users" },
        { label: t("trustGraphPage.ctaCredits"), href: "/ecosystem?tab=credits" },
        { label: t("trustGraphPage.ctaGovernance"), href: "/ecosystem?tab=governance" },
      ]} />
    </ContentPageShell>
  );
}
