import { ContentPageShell, ContentSection, ContentList, ContentCTA } from "@/components/ContentPageShell";

export default function CompaniesInfoPage() {
  return (
    <ContentPageShell title="Browse Companies" subtitle="Professional organizations, studios, agencies and teams.">
      <ContentSection title="Companies in changethegame">
        <p>Companies represent the professional world inside changethegame. You can:</p>
        <ContentList items={["Attach yourself to an organization", "Create or join company quests", "Offer services as a company", "Build teams and pods"]} />
      </ContentSection>

      <ContentCTA links={[
        { label: "Browse companies", href: "/explore?tab=companies" },
        { label: "Create a company", href: "/me/companies" },
      ]} />
    </ContentPageShell>
  );
}
