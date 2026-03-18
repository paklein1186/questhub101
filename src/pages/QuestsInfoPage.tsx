import { ContentPageShell, ContentSection, ContentList, ContentCTA } from "@/components/ContentPageShell";
import { useTranslation } from "react-i18next";

export default function QuestsInfoPage() {
  const { t } = useTranslation();
  return (
    <ContentPageShell title={t("pages.questsInfo.title")} subtitle={t("pages.questsInfo.subtitle")}>
      <ContentSection title="What are Quests?">
        <p>Quests are the beating heart of changethegame. They can be:</p>
        <ContentList items={["Personal projects", "Community missions", "Creative journeys", "Impact collaborations", "Guild projects", "Company assignments"]} />
      </ContentSection>

      <ContentSection title="What You Can Do">
        <ContentList items={["Create quests", "Join quests", "Propose contributions", "Earn XP (reputation) for every contribution", "Earn 🟩 Coins from funded quest pools and 🌱 $CTG for commons contributions", "Fund and support quests"]} />
      </ContentSection>

      <ContentSection title="Quest Funding Pools">
        <p>
          Every Project or Ongoing Mission quest can hold two independent value pools:
        </p>
        <ContentList items={[
          "🟩 Coins — fiat-backed mission value. Pre-funded by the creator or raised via campaigns. Distributed to contributors via OCU pie, equal split, or manual dispatch. Withdrawable to €.",
          "🌱 $CTG — contribution token. Also fundable into quest escrow as an incentive. Frozen from demurrage while in escrow. Resumes 1%/month decay on distribution.",
        ]} />
        <p className="text-sm text-muted-foreground mt-2 font-medium">
          🔷 Platform Credits are never used for quest compensation.
        </p>
      </ContentSection>

      <ContentCTA links={[
        { label: "Browse quests", href: "/explore?tab=quests" },
        { label: "Create a quest", href: "/quests/new" },
        { label: "Understand the value system", href: "/ecosystem?tab=funding" },
      ]} />
    </ContentPageShell>
  );
}
