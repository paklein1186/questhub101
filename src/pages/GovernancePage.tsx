import { ContentPageShell, ContentSection } from "@/components/ContentPageShell";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { canVote, canPropose, isStewardEligible } from "@/lib/governanceConfig";
import { GOVERNANCE_XP_TIERS } from "@/lib/xpCreditsConfig";

export default function GovernancePage({ embedded }: { embedded?: boolean }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { userLevel } = usePlanLimits();

  return (
    <ContentPageShell embedded={embedded} title={t("governancePage.title")} subtitle={t("governancePage.subtitle")}>
      <ContentSection title={t("governancePage.howUnlocked")}>
        <p className="text-muted-foreground mb-4">{t("governancePage.howUnlockedP1")}</p>
        <p className="text-muted-foreground mb-6">{t("governancePage.howUnlockedP2")}</p>

        {user && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 mb-6">
            <p className="text-sm font-medium" dangerouslySetInnerHTML={{ __html: t("governancePage.currentLevel", { level: userLevel }) }} />
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="default" className="text-xs">✓ {t("governancePage.participate")}</Badge>
              <Badge variant={canVote(userLevel) ? "default" : "outline"} className="text-xs">
                {canVote(userLevel) ? "✓" : "🔒"} {t("governancePage.vote")}
              </Badge>
              <Badge variant={canPropose(userLevel) ? "default" : "outline"} className="text-xs">
                {canPropose(userLevel) ? "✓" : "🔒"} {t("governancePage.propose")}
              </Badge>
              <Badge variant={isStewardEligible(userLevel) ? "default" : "outline"} className="text-xs">
                {isStewardEligible(userLevel) ? "✓" : "🔒"} {t("governancePage.stewardCouncil")}
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
                  {unlocked && <Badge variant="secondary" className="text-[10px]">✓ {t("governancePage.unlocked")}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{tier.description}</p>
              </div>
            );
          })}
        </div>
      </ContentSection>

      <ContentSection title={t("governancePage.votingWeight")}>
        <p className="text-muted-foreground mb-2">{t("governancePage.votingWeightP")}</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li dangerouslySetInnerHTML={{ __html: t("governancePage.votingXP") }} />
          <li dangerouslySetInnerHTML={{ __html: t("governancePage.votingShares") }} />
          <li dangerouslySetInnerHTML={{ __html: t("governancePage.votingTerritory") }} />
        </ul>
      </ContentSection>

      <ContentSection title={t("governancePage.guildGov")}>
        <p className="text-muted-foreground">{t("governancePage.guildGovP")}</p>
      </ContentSection>

      <ContentSection title={t("governancePage.territorialActivation")}>
        <p className="text-muted-foreground">{t("governancePage.territorialActivationP")}</p>
      </ContentSection>

      <ContentSection title={t("governancePage.designPrinciples")}>
        <p className="text-muted-foreground">{t("governancePage.designPrinciplesP")}</p>
      </ContentSection>
    </ContentPageShell>
  );
}
