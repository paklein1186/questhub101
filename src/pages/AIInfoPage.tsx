import { ContentPageShell, ContentSection, ContentList } from "@/components/ContentPageShell";

export default function AIInfoPage() {
  return (
    <ContentPageShell title="What AI Can Do Here" subtitle="Augment your creativity, collaboration and coordination.">
      <ContentSection title="AI Agents Assist You By">
        <ContentList items={[
          "Summarizing missions",
          "Proposing collaborators",
          "Drafting guild or quest descriptions",
          "Generating updates",
          "Analyzing territory activity",
          "Suggesting next steps",
          "Offering creative inspiration",
          "Supporting governance with polls and options",
        ]} />
      </ContentSection>

      <ContentSection title="Contextual Memory">
        <p>Each unit (guild, quest, company, territory, pod) has its own AI agent with contextual memory. Agents only access data within their unit — never globally.</p>
      </ContentSection>
    </ContentPageShell>
  );
}
