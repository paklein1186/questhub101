import { ContentPageShell, ContentSection, ContentList } from "@/components/ContentPageShell";
import { useTranslation } from "react-i18next";

export default function QuestFundingPage({ embedded }: { embedded?: boolean }) {
  const { t } = useTranslation();
  const dualItems = t("questFundingPage.dualCurrencyItems", { returnObjects: true }) as string[];
  const fundraisingItems = t("questFundingPage.fundraisingItems", { returnObjects: true }) as string[];
  const ocuItems = t("questFundingPage.ocuItems", { returnObjects: true }) as string[];
  const distItems = t("questFundingPage.distributionItems", { returnObjects: true }) as string[];

  return (
    <ContentPageShell
      title={t("questFundingPage.title")}
      subtitle={t("questFundingPage.subtitle")}
      embedded={embedded}
    >
      <ContentSection title={t("questFundingPage.dualCurrencyTitle")}>
        <p>{t("questFundingPage.dualCurrencyP")}</p>
        <ContentList items={Array.isArray(dualItems) ? dualItems : []} />
        <p className="text-sm text-muted-foreground mt-3 font-medium">
          {t("questFundingPage.creditsNote")}
        </p>
      </ContentSection>

      <ContentSection title={t("questFundingPage.fundraisingTitle")}>
        <ContentList items={Array.isArray(fundraisingItems) ? fundraisingItems : []} />
      </ContentSection>

      <ContentSection title={t("questFundingPage.ocuTitle")}>
        <p>{t("questFundingPage.ocuP")}</p>
        <ContentList items={Array.isArray(ocuItems) ? ocuItems : []} />
      </ContentSection>

      <ContentSection title={t("questFundingPage.distributionTitle")}>
        <ContentList items={Array.isArray(distItems) ? distItems : []} />
        <p className="text-sm text-muted-foreground mt-3">
          {t("questFundingPage.distributionNote")}
        </p>
      </ContentSection>

      <ContentSection title={t("questFundingPage.escrowTitle")}>
        <p>{t("questFundingPage.escrowP1")}</p>
        <p className="mt-2">{t("questFundingPage.escrowP2")}</p>
      </ContentSection>
    </ContentPageShell>
  );
}
