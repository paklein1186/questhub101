import { ContentPageShell, ContentSection, ContentList, ContentCTA } from "@/components/ContentPageShell";

export default function TerritoriesHousesPage() {
  return (
    <ContentPageShell title="Territories & Topics" subtitle="Where geography meets imagination.">
      <ContentSection title="What are Territories?">
        <p>Territories are real-world places where quests, guilds and communities act.</p>
      </ContentSection>

      <ContentSection title="What are Houses?">
        <p>Houses are thematic domains (creativity, impact, craft, regeneration, learning…).</p>
      </ContentSection>

      <ContentSection title="Together They Shape">
        <ContentList items={["Your identity", "Your suggested collaborators", "Your explore filters", "Your AI recommendations"]} />
      </ContentSection>

      <ContentCTA links={[
        { label: "Explore houses", href: "/explore/houses" },
        { label: "Explore people", href: "/explore/users" },
      ]} />
    </ContentPageShell>
  );
}
