import { ContentPageShell, ContentSection, ContentList, ContentCTA } from "@/components/ContentPageShell";

export default function CreateQuestInfoPage() {
  return (
    <ContentPageShell title="Create a Quest" subtitle="Turn your intention into a mission.">
      <ContentSection title="A Quest Can Be">
        <ContentList items={["A project you want to start", "An initiative in your guild", "A creative act", "A social or territorial action"]} />
      </ContentSection>

      <ContentSection title="Quest Lifecycle">
        <ContentList items={["Starting", "Ongoing", "Completed (achievement)"]} />
      </ContentSection>

      <ContentSection title="You Can Add">
        <ContentList items={["Houses", "Territories", "Credits / funding", "Images", "Participants"]} />
      </ContentSection>

      <ContentCTA links={[{ label: "Create a quest now", href: "/quests/new" }]} />
    </ContentPageShell>
  );
}
