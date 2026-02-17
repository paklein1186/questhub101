import { ContentPageShell, ContentSection, ContentList, ContentCTA } from "@/components/ContentPageShell";
import { useTranslation } from "react-i18next";

export default function TerritoriesHousesPage() {
  const { t } = useTranslation();
  return (
    <ContentPageShell title={t("pages.territoriesInfo.title")} subtitle={t("pages.territoriesInfo.subtitle")}>
      <ContentSection title="What are Territories?">
        <p>Territories are real-world places where quests, guilds and communities act.</p>
      </ContentSection>

      <ContentSection title="What are Topics?">
        <p>Topics are thematic domains (creativity, impact, craft, regeneration, learning…).</p>
      </ContentSection>

      <ContentSection title="Together They Shape">
        <ContentList items={["Your identity", "Your suggested collaborators", "Your explore filters", "Your AI recommendations"]} />
      </ContentSection>

      <ContentCTA links={[
        { label: "Explore topics", href: "/explore/houses" },
        { label: "Explore people", href: "/explore/users" },
      ]} />
    </ContentPageShell>
  );
}
