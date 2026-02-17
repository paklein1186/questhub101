import { ContentPageShell, ContentSection, ContentList } from "@/components/ContentPageShell";
import { useTranslation } from "react-i18next";

export default function CommunityGuidelinesPage() {
  const { t } = useTranslation();
  return (
    <ContentPageShell title={t("pages.community.title")} subtitle={t("pages.community.subtitle")}>
      <ContentSection title="Our Standards">
        <ContentList items={[
          "Respect and kindness in all interactions",
          "Zero tolerance for harassment or discrimination",
          "Constructive collaboration over conflict",
          "Inclusive language that welcomes everyone",
          "Respect for territories and local communities",
          "Appropriate use of AI agents",
          "Use reporting tools when needed — moderation is active",
        ]} />
      </ContentSection>
    </ContentPageShell>
  );
}
