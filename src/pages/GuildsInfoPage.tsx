import { ContentPageShell, ContentSection, ContentList, ContentCTA } from "@/components/ContentPageShell";

export default function GuildsInfoPage() {
  return (
    <ContentPageShell title="Find Guilds & Collectives" subtitle="Join communities that resonate with your mission or creativity.">
      <ContentSection title="What are Guilds?">
        <p>Guilds are living communities that gather around shared themes, territories, practices or professions. Inside a guild you can:</p>
        <ContentList items={["Collaborate on quests", "Share resources", "Organize events", "Use collaboration tools (kanban, docs, AI agent)", "Apply or invite members"]} />
      </ContentSection>

      <ContentCTA links={[
        { label: "Browse guilds", href: "/explore?tab=guilds" },
        { label: "Create a guild", href: "/me/guilds" },
      ]} />
    </ContentPageShell>
  );
}
