import { ContentPageShell, ContentSection, ContentList } from "@/components/ContentPageShell";
import { Badge } from "@/components/ui/badge";

export default function QuestFundingPage({ embedded }: { embedded?: boolean }) {
  return (
    <ContentPageShell
      title="Quest Funding & Distribution"
      subtitle="How quest value pools work, from pre-funding to contributor payout."
      embedded={embedded}
    >
      <ContentSection title="Dual-Currency Quest Pools">
        <p>Every Project or Ongoing Mission can hold:</p>
        <ContentList items={[
          "🟩 Coins — fiat-backed mission value. Pre-funded by the creator, raised via campaigns, or both.",
          "🌱 $CTG — contribution token. Fundable into quest escrow as an additional incentive.",
          "Both pools are independent and can coexist on the same quest.",
        ]} />
        <p className="text-sm text-muted-foreground mt-3 font-medium">
          🔷 Platform Credits are never used for quest compensation in any form.
        </p>
      </ContentSection>

      <ContentSection title="Fundraising Campaigns">
        <ContentList items={[
          "Quest admins can launch one or more campaigns per currency (Coins or $CTG).",
          "Each campaign has a threshold amount — once reached, funds can be dispatched.",
          "Dispatch modes: Manual (admin decides), Auto: OCU pie (proportional), Auto: Equal split.",
          "Any logged-in user can contribute to an active campaign from their wallet balance.",
          "Campaigns and direct top-ups can run in parallel.",
        ]} />
      </ContentSection>

      <ContentSection title="OCU — Open Contributive Unit">
        <p>
          When OCU is enabled on a quest, contributors log their work in half-days.
          Each half-day is weighted by a guild FMV rate (default €200/half-day) and a
          difficulty multiplier. This produces a live percentage share of the Coins pool
          for each contributor — the contribution pie.
        </p>
        <ContentList items={[
          "Half-days × FMV rate × difficulty = weighted value",
          "Live pie updates as contributions are logged and peer-reviewed",
          "Pie can be frozen for final distribution (immutable audit snapshot)",
          "Distribution follows the frozen pie — proportional, transparent, auditable",
        ]} />
      </ContentSection>

      <ContentSection title="Distribution & Fairness">
        <ContentList items={[
          "Admins choose distribution mode: OCU pie %, equal split, or manual amounts",
          "Preview table shows each contributor's allocation before confirmation",
          "Coins are credited to contributor wallets (withdrawable to € via Stripe Connect)",
          "$CTG is credited to contributor wallets (demurrage resumes)",
          "Full audit trail: quest_distributions record with recipient snapshot",
        ]} />
        <p className="text-sm text-muted-foreground mt-3">
          After any distribution, contributors can privately report a fairness concern to
          platform superadmins. Quest admins see only an anonymous flag — no details.
        </p>
      </ContentSection>

      <ContentSection title="$CTG Escrow & Demurrage Freeze">
        <p>
          $CTG normally circulates with 1%/month demurrage. When $CTG is allocated to a
          quest escrow pool, demurrage is frozen — the tokens hold their value while the
          quest is active. Once distributed to contributor wallets, normal demurrage resumes.
        </p>
        <p className="mt-2">
          This makes $CTG quest pools a time-coherent incentive: contributors are not
          penalised for the duration of a slow-moving quest.
        </p>
      </ContentSection>
    </ContentPageShell>
  );
}
