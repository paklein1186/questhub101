import { ContentPageShell, ContentSection, ContentList, ContentCTA } from "@/components/ContentPageShell";
import { useTranslation } from "react-i18next";

export default function CreateQuestInfoPage() {
  const { t } = useTranslation();
  return (
    <ContentPageShell title={t("pages.createQuest.title")} subtitle={t("pages.createQuest.subtitle")}>
      <ContentSection title="A Quest Can Be">
        <ContentList items={["A project you want to start", "An initiative in your guild", "A creative act", "A social or territorial action"]} />
      </ContentSection>

      <ContentSection title="Quest Lifecycle">
        <ContentList items={["Starting", "Ongoing", "Completed (achievement)"]} />
      </ContentSection>

      <ContentSection title="You Can Add">
        <ContentList items={["Houses", "Territories", "Credits / funding", "Images", "Participants"]} />
      </ContentSection>

      <ContentCTA links={[{ label: "Create a quest now", href: "/quests/new" }]} />
    </ContentPageShell>
  );
}
