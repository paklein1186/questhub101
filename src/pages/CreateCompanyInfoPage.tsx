import { ContentPageShell, ContentSection, ContentList, ContentCTA } from "@/components/ContentPageShell";

export default function CreateCompanyInfoPage() {
  return (
    <ContentPageShell title="Create a Traditional Organization" subtitle="Bring your organization into the ecosystem.">
      <ContentSection title="What Traditional Organizations Manage">
        <p>A Traditional Organization refers to a classic structure (SME, non-profit, institution, cooperative, or startup) operating in the conventional world. They manage:</p>
        <ContentList items={["Organization quests", "Organization services", "Members and roles", "Bookings", "Governance"]} />
      </ContentSection>

      <ContentCTA links={[{ label: "Create a Traditional Organization", href: "/me/companies" }]} />
    </ContentPageShell>
  );
}
