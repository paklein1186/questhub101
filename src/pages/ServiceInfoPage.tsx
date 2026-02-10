import { ContentPageShell, ContentSection, ContentList, ContentCTA } from "@/components/ContentPageShell";

export default function ServiceInfoPage() {
  return (
    <ContentPageShell title="Offer a Service" subtitle="Share your skills with the ecosystem.">
      <ContentSection title="What You Can Offer">
        <p>Services (or skill sessions) let you offer:</p>
        <ContentList items={["Expertise", "Creative sessions", "Workshops", "Mentoring", "Coaching", "Artistic practices"]} />
      </ContentSection>

      <ContentSection title="Features">
        <p>Integrated booking, calendar, and optional credit payments.</p>
      </ContentSection>

      <ContentCTA links={[{ label: "Create a service", href: "/services/new" }]} />
    </ContentPageShell>
  );
}
