import { ContentPageShell, ContentSection, ContentList, ContentCTA } from "@/components/ContentPageShell";

export default function CompaniesInfoPage() {
  return (
    <ContentPageShell title="Browse Traditional Organizations" subtitle="Professional organizations, institutions, agencies and pods.">
      <ContentSection title="Traditional Organizations in changethegame">
        <p>Traditional Organizations represent the professional world inside changethegame — SMEs, non-profits, institutions, cooperatives, and startups. You can:</p>
        <ContentList items={["Attach yourself to an organization", "Create or join organization quests", "Offer services as an organization", "Build teams and pods"]} />
      </ContentSection>

      <ContentCTA links={[
        { label: "Browse Traditional Organizations", href: "/explore?tab=companies" },
        { label: "Create a Traditional Organization", href: "/me/companies" },
      ]} />
    </ContentPageShell>
  );
}
