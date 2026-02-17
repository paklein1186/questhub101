import { ContentPageShell, ContentSection } from "@/components/ContentPageShell";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { canVote, canPropose, isStewardEligible } from "@/lib/governanceConfig";
import { GOVERNANCE_XP_TIERS } from "@/lib/xpCreditsConfig";

export default function GovernancePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { userLevel } = usePlanLimits();

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

        {user && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 mb-6">
            <p className="text-sm font-medium">Your current level: <strong>Level {userLevel}</strong></p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="default" className="text-xs">✓ Participate</Badge>
              <Badge variant={canVote(userLevel) ? "default" : "outline"} className="text-xs">
                {canVote(userLevel) ? "✓" : "🔒"} Vote
              </Badge>
              <Badge variant={canPropose(userLevel) ? "default" : "outline"} className="text-xs">
                {canPropose(userLevel) ? "✓" : "🔒"} Propose
              </Badge>
              <Badge variant={isStewardEligible(userLevel) ? "default" : "outline"} className="text-xs">
                {isStewardEligible(userLevel) ? "✓" : "🔒"} Steward Council
              </Badge>
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {GOVERNANCE_XP_TIERS.map((tier) => {
            const unlocked = userLevel >= tier.minLevel;
            return (
              <div key={tier.levels} className={`rounded-lg border bg-card p-4 ${unlocked ? "border-primary/30" : "border-border"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={unlocked ? "default" : "outline"} className="text-xs">Level {tier.levels}</Badge>
                  <span className="font-display font-semibold text-sm">{tier.label}</span>
                  {unlocked && <Badge variant="secondary" className="text-[10px]">✓ Unlocked</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{tier.description}</p>
              </div>
            );
          })}
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
