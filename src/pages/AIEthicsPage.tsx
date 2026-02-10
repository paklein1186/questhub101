import { ContentPageShell, ContentSection, ContentList } from "@/components/ContentPageShell";

export default function AIEthicsPage() {
  return (
    <ContentPageShell title="AI Ethics & Transparency" subtitle="Responsible AI for a regenerative world.">
      <ContentSection title="Why We Use AI">
        <p>AI amplifies human collaboration, creativity, and coordination. It is never a replacement for human agency or decision-making.</p>
      </ContentSection>

      <ContentSection title="Principles">
        <ContentList items={[
          "What AI can and cannot do is clearly communicated",
          "Data boundaries are strictly enforced per unit",
          "Transparency of algorithms and recommendations",
          "Memory is per unit, not global",
          "Users control their AI interactions",
          "Deletion and privacy options are always available",
          "Commitment to responsible and ethical use",
        ]} />
      </ContentSection>
    </ContentPageShell>
  );
}
