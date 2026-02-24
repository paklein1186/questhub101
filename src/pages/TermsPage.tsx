import { ContentPageShell, ContentSection } from "@/components/ContentPageShell";
import { useTranslation } from "react-i18next";

export default function TermsPage({ embedded }: { embedded?: boolean }) {
  const { t } = useTranslation();
  return (
    <ContentPageShell embedded={embedded} title={t("pages.terms.title")} subtitle={t("pages.terms.subtitle")}>
      <ContentSection title={t("termsPage.s1Title")}><p>{t("termsPage.s1P")}</p></ContentSection>
      <ContentSection title={t("termsPage.s2Title")}><p>{t("termsPage.s2P")}</p></ContentSection>
      <ContentSection title={t("termsPage.s3Title")}><p>{t("termsPage.s3P")}</p></ContentSection>
      <ContentSection title={t("termsPage.s4Title")}><p>{t("termsPage.s4P")}</p></ContentSection>
      <ContentSection title={t("termsPage.s5Title")}><p>{t("termsPage.s5P")}</p></ContentSection>
      <ContentSection title={t("termsPage.s6Title")}><p>{t("termsPage.s6P")}</p></ContentSection>
      <ContentSection title={t("termsPage.s7Title")}><p>{t("termsPage.s7P")}</p></ContentSection>
      <ContentSection title={t("termsPage.s8Title")}><p>{t("termsPage.s8P")}</p></ContentSection>
      <ContentSection title={t("termsPage.s9Title")}><p>{t("termsPage.s9P")}</p></ContentSection>
      <ContentSection title={t("termsPage.s10Title")}><p>{t("termsPage.s10P")}</p></ContentSection>
      <ContentSection title={t("termsPage.s11Title")}><p>{t("termsPage.s11P")}</p></ContentSection>
      <ContentSection title={t("termsPage.s12Title")}>
        <p>
          {t("termsPage.s12P").split("<a>")[0]}
          <a href="mailto:legal@changethegame.xyz" className="text-primary hover:underline">legal@changethegame.xyz</a>
          {t("termsPage.s12P").split("</a>")[1] || "."}
        </p>
      </ContentSection>
    </ContentPageShell>
  );
}
