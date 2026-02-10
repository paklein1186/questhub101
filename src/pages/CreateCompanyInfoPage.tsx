import { ContentPageShell, ContentSection, ContentList, ContentCTA } from "@/components/ContentPageShell";

export default function CreateCompanyInfoPage() {
  return (
    <ContentPageShell title="Create a Company" subtitle="Bring your organization into the ecosystem.">
      <ContentSection title="Companies Manage">
        <p>Companies represent studios, agencies, cooperatives, teams or professional entities. They manage:</p>
        <ContentList items={["Company quests", "Company services", "Members and roles", "Bookings", "Governance"]} />
      </ContentSection>

      <ContentCTA links={[{ label: "Create a company", href: "/me/companies" }]} />
    </ContentPageShell>
  );
}
