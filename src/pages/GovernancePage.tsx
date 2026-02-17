import { ContentPageShell, ContentSection } from "@/components/ContentPageShell";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

export default function GovernancePage() {
  const { t } = useTranslation();

  const tiers = [
    { levels: "1–4", label: "Participate", description: "Explore the ecosystem, join guilds, attend events." },
    { levels: "5–8", label: "Comment & Vote", description: "Engage in governance discussions and cast votes on proposals." },
    { levels: "9–12", label: "Propose", description: "Submit governance proposals and lead initiatives." },
    { levels: "13–15", label: "Steward Council", description: "Eligible for steward council roles and strategic decisions." },
  ];

  return (
    <ContentPageShell title="Cooperative Governance" subtitle="Changethegame combines marketplace activity with cooperative stewardship.">
      <ContentSection title="How Governance Rights Are Unlocked">
        <p className="text-muted-foreground mb-4">
          Governance rights are unlocked by XP level, participation history, and shareholding.
          XP determines your participation tier. Shares increase long-term responsibility.
        </p>
        <p className="text-muted-foreground mb-6">
          This ensures merit-based legitimacy, long-term alignment, and protection from speculative capture.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {tiers.map((tier) => (
            <div key={tier.levels} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">Level {tier.levels}</Badge>
                <span className="font-display font-semibold text-sm">{tier.label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{tier.description}</p>
            </div>
          ))}
        </div>
      </ContentSection>

      <ContentSection title="Voting Weight">
        <p className="text-muted-foreground mb-2">Votes are weighted by:</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li><strong className="text-foreground">XP</strong> — your contribution history</li>
          <li><strong className="text-foreground">Shares</strong> — moderate governance weight</li>
          <li><strong className="text-foreground">Territory contribution</strong> — cross-territory activity</li>
        </ul>
      </ContentSection>

      <ContentSection title="Guild Governance">
        <p className="text-muted-foreground">Guilds operate with configurable membership policies (open, application-based, invite-only), role-based permissions, and AI-assisted decision-making through polls and proposals.</p>
      </ContentSection>

      <ContentSection title="Territorial Activation">
        <p className="text-muted-foreground">Territories are activated through quests, guilds, and people. AI agents help identify gaps and opportunities for local collaboration.</p>
      </ContentSection>

      <ContentSection title="Design Principles">
        <p className="text-muted-foreground">
          The governance architecture avoids complex quadratic voting and token-based voting.
          It is designed for progressive activation — simple today, with infrastructure for deeper participation as the ecosystem matures.
        </p>
      </ContentSection>
    </ContentPageShell>
  );
}
