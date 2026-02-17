import { ContentPageShell, ContentSection } from "@/components/ContentPageShell";
import { useTranslation } from "react-i18next";

export default function GovernancePage() {
  const { t } = useTranslation();
  return (
    <ContentPageShell title={t("pages.governance.title")} subtitle={t("pages.governance.subtitle")}>
      <ContentSection title="Guild Governance">
        <p>Guilds operate with configurable membership policies (open, application-based, invite-only), role-based permissions, and AI-assisted decision-making through polls and proposals.</p>
      </ContentSection>

      <ContentSection title="Company Roles">
        <p>Companies define their own internal hierarchy with admin, member, and contributor roles. Governance is managed by company admins.</p>
      </ContentSection>

      <ContentSection title="Pod Operations">
        <p>Pods are lightweight, temporary groups that form around specific quests or tasks. They inherit governance rules from their parent entities.</p>
      </ContentSection>

      <ContentSection title="Territorial Activation">
        <p>Territories are activated through quests, guilds, and people. AI agents help identify gaps and opportunities for local collaboration.</p>
      </ContentSection>

      <ContentSection title="AI-Assisted Decision-Making">
        <p>AI agents can create decision polls, summarize discussions, and propose next steps — but all decisions are ultimately made by humans.</p>
      </ContentSection>

      <ContentSection title="Future Direction">
        <p>We are working toward more decentralized governance, community-driven proposals, and transparent resource allocation powered by the credit and XP system.</p>
      </ContentSection>
    </ContentPageShell>
  );
}
