import { ContentPageShell, ContentSection, ContentList, ContentCTA } from "@/components/ContentPageShell";
import { useTranslation } from "react-i18next";

export default function SupportPage() {
  const { t } = useTranslation();
  return (
    <ContentPageShell title={t("pages.support.title")} subtitle={t("pages.support.subtitle")}>
      <ContentSection title="Quickstart Guides">
        <ContentList items={[
          "How to create your profile",
          "How to launch a quest",
          "How to join a guild",
          "How to offer a service",
          "How to use AI agents",
        ]} />
      </ContentSection>

      <ContentSection title="In-depth Guides">
        <ContentList items={[
          "XP, credits & contribution index",
          "Pods and collaboration tools",
          "Guild governance",
          "Territory activation",
          "Courses & learning modules",
          "How AI works and where data goes",
        ]} />
      </ContentSection>

      <ContentSection title="Troubleshooting">
        <ContentList items={[
          "I can't create a quest",
          "My guild doesn't display properly",
          "My company isn't attached",
          "Bookings don't open",
          "Notifications don't appear",
        ]} />
      </ContentSection>

      <ContentSection title="Ask for Help">
        <p>Stuck? Contact the team for direct support.</p>
      </ContentSection>

      <ContentCTA links={[{ label: "Contact us", href: "/contact" }]} />
    </ContentPageShell>
  );
}
