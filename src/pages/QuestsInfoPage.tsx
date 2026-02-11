import { ContentPageShell, ContentSection, ContentList, ContentCTA } from "@/components/ContentPageShell";

export default function QuestsInfoPage() {
  return (
    <ContentPageShell title="Discover Quests" subtitle="Missions, projects, creative acts, and impact initiatives.">
      <ContentSection title="What are Quests?">
        <p>Quests are the beating heart of changethegame. They can be:</p>
        <ContentList items={["Personal projects", "Community missions", "Creative journeys", "Impact collaborations", "Guild projects", "Company assignments"]} />
      </ContentSection>

      <ContentSection title="What You Can Do">
        <ContentList items={["Create quests", "Join quests", "Propose contributions", "Earn XP and credits", "Fund and support quests"]} />
      </ContentSection>

      <ContentCTA links={[
        { label: "Browse quests", href: "/explore?tab=quests" },
        { label: "Create a quest", href: "/quests/new" },
      ]} />
    </ContentPageShell>
  );
}
