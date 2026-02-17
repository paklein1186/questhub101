import { ContentPageShell, ContentSection, ContentList, ContentCTA } from "@/components/ContentPageShell";
import { useTranslation } from "react-i18next";

export default function CreateGuildInfoPage() {
  const { t } = useTranslation();
  return (
    <ContentPageShell title={t("pages.createGuild.title")} subtitle={t("pages.createGuild.subtitle")}>
      <ContentSection title="What Guilds Offer">
        <p>Guilds (or collectives) are collaborative groups with:</p>
        <ContentList items={["Quests", "Collaboration tools", "Events", "Services", "Members and roles", "An AI agent for coordination"]} />
      </ContentSection>

      <ContentSection title="Membership">
        <p>You can require applications or keep it open.</p>
      </ContentSection>

      <ContentCTA links={[{ label: "Create a guild", href: "/me/guilds" }]} />
    </ContentPageShell>
  );
}
