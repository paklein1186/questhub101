import { ContentPageShell, ContentSection, ContentList, ContentCTA } from "@/components/ContentPageShell";
import { useTranslation } from "react-i18next";

export default function CoursesInfoPage() {
  const { t } = useTranslation();
  return (
    <ContentPageShell title={t("pages.coursesInfo.title")} subtitle={t("pages.coursesInfo.subtitle")}>
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
