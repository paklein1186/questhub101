import { ContentPageShell, ContentSection, ContentList, ContentCTA } from "@/components/ContentPageShell";
import { useTranslation } from "react-i18next";

export default function HowItWorksPage() {
  const { t } = useTranslation();
  return (
    <ContentPageShell title={t("pages.howItWorks.title")} subtitle={t("pages.howItWorks.subtitle")}>
      <ContentSection title="1. Create Your Profile">
        <p>Pick your Houses (interests), choose your Territory, and define your persona (Impact, Creative, or Hybrid).</p>
      </ContentSection>

      <ContentSection title="2. Launch or Join Quests">
        <p>Quests are missions, projects, or creative endeavors. You can:</p>
        <ContentList items={["Start your own", "Join quests from others", "Propose contributions", "Fund quests with credits"]} />
      </ContentSection>

      <ContentSection title="3. Join or Create Guilds">
        <p>Guilds (or collectives) are communities united around shared themes. They offer:</p>
        <ContentList items={["Internal tools (chat, docs, kanban, events)", "Shared quests", "Services", "Governance tools"]} />
      </ContentSection>

      <ContentSection title="4. Offer or Book Services">
        <p>Turn your skills into bookable sessions. Includes:</p>
        <ContentList items={["Skill sessions (creative)", "Expertise services (impact)", "Calendars & bookings", "Optional monetization / credits"]} />
      </ContentSection>

      <ContentSection title="5. Companies & Pods">
        <p>Companies represent your professional world. Pods are small, temporary groups created for specific quests or collaborations.</p>
      </ContentSection>

      <ContentSection title="6. Territories & Houses">
        <p>Territories anchor action in the real world. Houses represent topics, themes, interests and expertise.</p>
      </ContentSection>

      <ContentSection title="7. AI Agents Everywhere">
        <p>Every guild, quest, company or territory comes with an AI agent that:</p>
        <ContentList items={["Helps coordinate", "Gives suggestions", "Creates summaries", "Proposes collaborators", "Drafts text", "Connects dots"]} />
      </ContentSection>

      <ContentSection title="8. Credits, XP & Reputation">
        <p>Earn XP from quests, collaborations and contributions. Earn credits from system activities or purchases. Use credits to fund quests, proposals, or services.</p>
      </ContentSection>

      <ContentSection title="9. The Open Trust Graph">
        <p>Your reputation is built through trust attestations — not vanity metrics. When someone vouches for you, they create a TrustEdge with a score, tags, and optional evidence. These edges are visible on your profile and feed into your XP and credit rewards. Trust decays over time and must be periodically renewed, keeping the ecosystem honest and up to date.</p>
        <ContentList items={[
          "Give and receive trust attestations across all entity types",
          "Scores from 1–5 with tags, notes, and evidence links",
          "Anti-gaming: weekly limits, cooldowns, and reciprocal penalties",
          "Public edges are available via an open API (JSON-LD compatible)",
        ]} />
      </ContentSection>

      <ContentCTA links={[
        { label: "Create a quest", href: "/quests/new" },
        { label: "Join a guild", href: "/explore?tab=guilds" },
        { label: "Open Trust Graph", href: "/ecosystem?tab=trust" },
        { label: "Explore people", href: "/explore/users" },
      ]} />
    </ContentPageShell>
  );
}
