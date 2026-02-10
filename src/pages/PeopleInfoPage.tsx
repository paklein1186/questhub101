import { ContentPageShell, ContentSection, ContentList, ContentCTA } from "@/components/ContentPageShell";

export default function PeopleInfoPage() {
  return (
    <ContentPageShell title="Explore People" subtitle="Meet collaborators, creators, innovators and change-makers.">
      <ContentSection title="Find Your People">
        <p>Use Houses, Territories, XP and contributions to find people you align with. Discover:</p>
        <ContentList items={["Creators", "Experts", "Impact professionals", "Guild leaders", "Company representatives", "Local actors"]} />
      </ContentSection>

      <ContentCTA links={[{ label: "Explore people", href: "/explore/users" }]} />
    </ContentPageShell>
  );
}
