import { ContentPageShell, ContentSection } from "@/components/ContentPageShell";
import { useTranslation } from "react-i18next";

export default function PrivacyPage({ embedded }: { embedded?: boolean }) {
  const { t } = useTranslation();
  return (
    <ContentPageShell embedded={embedded} title={t("pages.privacy.title")} subtitle={t("pages.privacy.subtitle")}>
      <p className="text-muted-foreground leading-relaxed mb-6">{t("privacyPage.intro")}</p>

      <ContentSection title={t("privacyPage.s1Title")}>
        <p>{t("privacyPage.s1P")}</p>
      </ContentSection>

      <ContentSection title={t("privacyPage.s2Title")}>
        <p>{t("privacyPage.s2P")}</p>
      </ContentSection>

      <ContentSection title={t("privacyPage.s3Title")}>
        <p>{t("privacyPage.s3P")}</p>
      </ContentSection>

      <ContentSection title={t("privacyPage.s4Title")}>
        <p>{t("privacyPage.s4P")}</p>
      </ContentSection>

      <ContentSection title={t("privacyPage.s5Title")}>
        <p>{t("privacyPage.s5P").replace("<a>", '<a href="/cookies" class="text-primary hover:underline">').replace("</a>", "</a>")}</p>
      </ContentSection>

      <ContentSection title={t("privacyPage.s6Title")}>
        <p>{t("privacyPage.s6P")}</p>
      </ContentSection>

      <ContentSection title={t("privacyPage.s7Title")}>
        <p>{t("privacyPage.s7P")}</p>
      </ContentSection>

      <ContentSection title={t("privacyPage.s8Title")}>
        <p>{t("privacyPage.s8P")}</p>
      </ContentSection>

      <ContentSection title={t("privacyPage.s9Title")}>
        <p>
          {t("privacyPage.s9P").split("<a>")[0]}
          <a href="mailto:privacy@changethegame.xyz" className="text-primary hover:underline">privacy@changethegame.xyz</a>
          {t("privacyPage.s9P").split("</a>")[1] || "."}
        </p>
      </ContentSection>
    </ContentPageShell>
  );
}
