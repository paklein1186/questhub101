import { ContentPageShell, ContentSection, ContentList, ContentCTA } from "@/components/ContentPageShell";

export default function CoursesInfoPage() {
  return (
    <ContentPageShell title="Browse Courses" subtitle="Learn, create and evolve with community-powered lessons.">
      <ContentSection title="What Courses Include">
        <p>Courses allow users and guilds to publish structured learning modules:</p>
        <ContentList items={["Lessons", "Videos", "Files", "Exercises", "Discussions"]} />
      </ContentSection>

      <ContentSection title="Pricing">
        <p>Courses can be free or monetized with credits.</p>
      </ContentSection>

      <ContentCTA links={[
        { label: "Browse courses", href: "/explore?tab=courses" },
        { label: "Create a course", href: "/courses/new" },
      ]} />
    </ContentPageShell>
  );
}
