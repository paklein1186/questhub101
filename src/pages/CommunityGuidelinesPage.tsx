import { ContentPageShell, ContentSection, ContentList } from "@/components/ContentPageShell";

export default function CommunityGuidelinesPage() {
  return (
    <ContentPageShell title="Community Guidelines" subtitle="A safe, creative and regenerative space for all.">
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
