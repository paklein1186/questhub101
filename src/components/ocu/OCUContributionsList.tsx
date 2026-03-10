import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useQuestContributions } from "@/hooks/useContributionLog";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OCUFeatureGate } from "./OCUFeatureGate";
import { LogContributionDialog } from "./LogContributionDialog";
import { ContributionCard } from "./ContributionCard";
import { PeerReviewDialog } from "./PeerReviewDialog";

interface Props {
  quest: any;
  isAdmin: boolean;
  onEnableOCU?: () => void;
}

export function OCUContributionsList({ quest, isAdmin, onEnableOCU }: Props) {
  const currentUser = useCurrentUser();
  const [logOpen, setLogOpen] = useState(false);
  const [reviewingContribution, setReviewingContribution] = useState<any>(null);

  // Get guild FMV rate
  const { data: guild } = useQuery({
    queryKey: ["guild-fmv", quest.guild_id],
    queryFn: async () => {
      if (!quest.guild_id) return null;
      const { data } = await supabase
        .from("guilds")
        .select("fmv_rate_per_half_day, governance_model")
        .eq("id", quest.guild_id)
        .single();
      return data;
    },
    enabled: !!quest.guild_id,
  });

  const fmvRate = (guild as any)?.fmv_rate_per_half_day ?? 200;

  // Get OCU settings from features_config
  const featuresConfig = typeof quest.features_config === "object" && quest.features_config
    ? quest.features_config
    : {};
  const ocuConfig = (featuresConfig as any)?.ocu ?? {};
  const reviewQuorum = ocuConfig.review_quorum ?? 1;

  const { data: contributions = [], isLoading } = useQuestContributions(quest.id);

  return (
    <OCUFeatureGate quest={quest} isAdmin={isAdmin} onEnable={onEnableOCU}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-sm">OCU Contribution Ledger</h3>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setLogOpen(true)}>
            <Plus className="h-3 w-3" /> Log Contribution
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading contributions…</p>
        ) : contributions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">No contributions logged yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Use the button above to log your first OCU contribution.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {contributions.map((c: any) => (
              <ContributionCard
                key={c.id}
                contribution={c}
                currentUserId={currentUser.id}
                showReviewButton
                onReview={() => setReviewingContribution(c)}
              />
            ))}
          </div>
        )}

        <LogContributionDialog
          open={logOpen}
          onOpenChange={setLogOpen}
          questId={quest.id}
          guildId={quest.guild_id}
          territoryId={null}
          fmvRate={fmvRate}
        />

        <PeerReviewDialog
          open={!!reviewingContribution}
          onOpenChange={(open) => { if (!open) setReviewingContribution(null); }}
          contribution={reviewingContribution}
          questId={quest.id}
          reviewQuorum={reviewQuorum}
        />
      </div>
    </OCUFeatureGate>
  );
}
