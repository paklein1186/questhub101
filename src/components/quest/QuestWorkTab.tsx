import { useState } from "react";
import { ListChecks, FileText, PieChart, Trophy, CheckCircle, ScrollText, Handshake, DoorOpen, AlertCircle, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { QuestSubtasks } from "@/components/guild/QuestSubtasks";
import { ContributionLogPanel } from "@/components/quest/ContributionLogPanel";
import { OCUContributionsList } from "@/components/ocu/OCUContributionsList";
import { OCUFeatureGate } from "@/components/ocu/OCUFeatureGate";
import { QuestPiePanel } from "@/components/ocu/QuestPiePanel";
import { DistributeCompensation } from "@/components/ocu/DistributeCompensation";
import { DistributionPanel } from "@/components/ocu/DistributionPanel";
import { ContractTab } from "@/components/ocu/ContractTab";
import { ContractWizard } from "@/components/quest/ContractWizard";
import { CurrencyIcon } from "@/components/CurrencyIcon";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";

interface QuestWorkTabProps {
  quest: any;
  participants: any[];
  territories: any[];
  currentUser: any;
  isOwner: boolean;
  isParticipant: boolean;
  isCollaborator: boolean;
  isGuildAdmin: boolean;
}

export function QuestWorkTab({
  quest,
  participants,
  territories,
  currentUser,
  isOwner,
  isParticipant,
  isCollaborator,
  isGuildAdmin,
}: QuestWorkTabProps) {
  const qc = useQueryClient();
  const [wizardOpen, setWizardOpen] = useState(false);

  const enableOCU = async () => {
    await supabase.from("quests").update({ ocu_enabled: true } as any).eq("id", quest.id);
    qc.invalidateQueries({ queryKey: ["quest", quest.id] });
  };

  // Subtask counts
  const { data: subtaskCounts } = useQuery({
    queryKey: ["quest-subtask-counts", quest.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quest_subtasks" as any)
        .select("status")
        .eq("quest_id", quest.id);
      if (error) throw error;
      const all = data || [];
      const done = all.filter((s: any) => s.status === "DONE").length;
      return { done, total: all.length };
    },
    enabled: !!quest.id,
  });

  // Contribution stats (count + FMV totals)
  const { data: contributionStats } = useQuery({
    queryKey: ["quest-contribution-stats", quest.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contribution_log" as any)
        .select("fmv_value, status, coins_compensated")
        .eq("quest_id", quest.id);
      if (error) throw error;
      const all = data || [];
      const count = all.length;
      const totalFmv = all.reduce((s: number, c: any) => s + (Number(c.fmv_value) || 0), 0);
      const verifiedFmv = all.filter((c: any) => c.status === "verified").reduce((s: number, c: any) => s + (Number(c.fmv_value) || 0), 0);
      const compensated = all.reduce((s: number, c: any) => s + (Number(c.coins_compensated) || 0), 0);
      return { count, totalFmv, verifiedFmv, compensated };
    },
    enabled: !!quest.id,
  });

  // Check if contract exists
  const { data: contractData } = useQuery({
    queryKey: ["quest-contracts", quest.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("quest_contracts" as any)
        .select("id, status")
        .eq("quest_id", quest.id)
        .order("created_at", { ascending: false })
        .limit(1);
      return (data && data.length > 0) ? data[0] : null;
    },
    enabled: !!quest.id,
  });

  const isAdmin = isOwner || isGuildAdmin;
  const ocuEnabled = (quest as any).ocu_enabled;

  // Contract CTA conditions: 2+ participants, contributions exist, no active contract
  const activeParticipants = (participants || []).filter((p: any) => p.status === "ACCEPTED");
  const showContractCTA = isAdmin
    && activeParticipants.length >= 2
    && (contributionStats?.count ?? 0) > 0
    && !contractData;

  // Escrow totals
  const coinsEscrow = Number((quest as any).coins_escrow ?? 0);
  const ctgEscrow = Number((quest as any).ctg_escrow ?? 0);
  const coinsBudget = Number((quest as any).coins_budget ?? 0);
  const ctgBudget = Number((quest as any).ctg_budget ?? 0);
  const hasEscrow = coinsEscrow > 0 || ctgEscrow > 0 || coinsBudget > 0 || ctgBudget > 0;

  // FMV owed vs paid
  const totalFmv = contributionStats?.totalFmv ?? 0;
  const compensated = contributionStats?.compensated ?? 0;
  const remaining = totalFmv - compensated;
  const compensationPct = totalFmv > 0 ? (compensated / totalFmv) * 100 : 0;

  return (
    <div className="mt-6 space-y-4">
      {/* ─── Proactive Contract CTA ─── */}
      {showContractCTA && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-start gap-3">
          <Handshake className="h-6 w-6 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">
              You have {activeParticipants.length} contributors logging work.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Set up a collaboration agreement to define how contributions are valued, validated, and distributed. This protects everyone.
            </p>
            <Button size="sm" className="mt-3" onClick={() => setWizardOpen(true)}>
              <FileText className="h-4 w-4 mr-1" /> Start Agreement Wizard
            </Button>
          </div>
        </div>
      )}

      {/* ─── FMV Summary Bar (visible when contributions exist) ─── */}
      {totalFmv > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Value Overview
            </span>
            {ocuEnabled && (
              <Badge variant="default" className="text-xs">OCU Active</Badge>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Total FMV</p>
              <p className="text-lg font-bold">€{totalFmv.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Compensated</p>
              <p className="text-lg font-bold text-green-600">€{compensated.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Remaining</p>
              <p className={`text-lg font-bold ${remaining > 0 ? "text-amber-600" : "text-green-600"}`}>
                €{remaining.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
          {totalFmv > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Compensation progress</span>
                <span>{compensationPct.toFixed(0)}%</span>
              </div>
              <Progress value={compensationPct} className="h-2" />
            </div>
          )}
        </div>
      )}

      <Accordion type="multiple" defaultValue={["tasks"]} className="space-y-2">
        {/* ─── Tasks ─── */}
        <AccordionItem value="tasks" className="rounded-xl border border-border bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <ListChecks className="h-5 w-5 text-primary" />
              <span className="font-display font-semibold">Tasks</span>
              {subtaskCounts && subtaskCounts.total > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {subtaskCounts.done}/{subtaskCounts.total}
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <QuestSubtasks
              questId={quest.id}
              questOwnerId={quest.created_by_user_id}
              guildId={quest.guild_id}
              canManage={isOwner || isCollaborator}
            />
          </AccordionContent>
        </AccordionItem>

        {/* ─── Contributions ─── */}
        <AccordionItem value="contributions" className="rounded-xl border border-border bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <ScrollText className="h-5 w-5 text-primary" />
              <span className="font-display font-semibold">Contributions</span>
              {(contributionStats?.count ?? 0) > 0 && (
                <Badge variant="secondary" className="text-xs">{contributionStats?.count}</Badge>
              )}
              {totalFmv > 0 && (
                <span className="text-xs text-muted-foreground ml-1">
                  €{totalFmv.toLocaleString(undefined, { maximumFractionDigits: 0 })} FMV
                </span>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <ContributionLogPanel
              questId={quest.id}
              questOwnerId={quest.created_by_user_id}
              guildId={quest.guild_id}
              territoryId={territories.length > 0 ? territories[0].id : null}
              isCoHost={isCollaborator}
              isGuildAdmin={isGuildAdmin}
            />
          </AccordionContent>
        </AccordionItem>

        {/* ─── Validation & OCU ─── */}
        <AccordionItem value="validation" className="rounded-xl border border-border bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-primary" />
              <span className="font-display font-semibold">Validation</span>
              {!ocuEnabled && (
                <Badge variant="outline" className="text-xs text-muted-foreground">Basic</Badge>
              )}
              {ocuEnabled && (
                <Badge variant="default" className="text-xs">OCU Active</Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <OCUFeatureGate
              quest={quest}
              isAdmin={isAdmin}
              onEnable={enableOCU}
            >
              <OCUContributionsList
                quest={quest}
                isAdmin={isAdmin}
                onEnableOCU={() => {}}
              />
              <DistributeCompensation
                quest={quest}
                isAdmin={isAdmin}
                onEnableOCU={() => {}}
              />
              <DistributionPanel
                quest={quest}
                isAdmin={isAdmin}
                isParticipant={isParticipant}
                onEnableOCU={() => {}}
              />
            </OCUFeatureGate>
          </AccordionContent>
        </AccordionItem>

        {/* ─── Contract ─── */}
        <AccordionItem value="contract" className="rounded-xl border border-border bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <span className="font-display font-semibold">Contract</span>
              {contractData ? (
                <Badge
                  variant={
                    (contractData as any).status === "active" ? "default" :
                    (contractData as any).status === "pending_signatures" ? "outline" :
                    "secondary"
                  }
                  className={`text-xs ${(contractData as any).status === "pending_signatures" ? "border-amber-500 text-amber-600" : ""}`}
                >
                  {(contractData as any).status === "active" ? "Active" :
                   (contractData as any).status === "pending_signatures" ? "Pending signatures" :
                   (contractData as any).status}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">No contract</Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            {!contractData && isAdmin ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center space-y-3">
                <Handshake className="h-10 w-10 mx-auto text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No collaboration agreement yet. Create one to define how contributions are valued and distributed.
                </p>
                <Button size="sm" variant="outline" onClick={() => setWizardOpen(true)}>
                  <FileText className="h-4 w-4 mr-1" /> Start Agreement Wizard
                </Button>
              </div>
            ) : (
              <ContractTab
                quest={quest}
                isAdmin={isAdmin}
                onEnableOCU={enableOCU}
              />
            )}
          </AccordionContent>
        </AccordionItem>

        {/* ─── Pie (Progressive) ─── */}
        <AccordionItem value="pie" className="rounded-xl border border-border bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <PieChart className="h-5 w-5 text-primary" />
              <span className="font-display font-semibold">Value Pie</span>
              {ocuEnabled ? (
                (quest as any).pie_frozen_at ? (
                  <Badge className="bg-blue-600 text-white text-xs">Frozen</Badge>
                ) : (
                  <Badge variant="default" className="text-xs">Live</Badge>
                )
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">Preview</Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            {ocuEnabled ? (
              <QuestPiePanel
                quest={quest}
                isAdmin={isAdmin}
                onEnableOCU={enableOCU}
              />
            ) : (
              <div className="rounded-lg border border-dashed border-border p-6 text-center space-y-3">
                <PieChart className="h-10 w-10 mx-auto text-muted-foreground/50" />
                <div>
                  <p className="text-sm font-medium">Contribution Pie</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Shows how contributions are distributed among participants.
                    Enable OCU to activate live tracking.
                  </p>
                </div>
                {activeParticipants.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Equal share preview:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {activeParticipants.map((p: any) => (
                        <Badge key={p.id} variant="secondary" className="text-xs">
                          {p.user?.name || "Participant"} — {(100 / activeParticipants.length).toFixed(0)}%
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {isAdmin && (
                  <Button size="sm" variant="outline" onClick={enableOCU} className="mt-2">
                    Enable OCU
                  </Button>
                )}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* ─── Rewards Earned + Escrow Visibility ─── */}
        <AccordionItem value="rewards" className="rounded-xl border border-border bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <Trophy className="h-5 w-5 text-amber-500" />
              <span className="font-display font-semibold">Rewards Earned</span>
              {quest.status === "COMPLETED" && (
                <Badge className="bg-green-600 text-white text-xs">Distributed</Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              {/* Escrow / Pool Visibility */}
              {hasEscrow && (
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                  <p className="text-xs font-medium flex items-center gap-1.5">
                    <CurrencyIcon currency="coins" className="h-3.5 w-3.5" /> Available Pool
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {(coinsEscrow > 0 || coinsBudget > 0) && (
                      <div>
                        <p className="text-xs text-muted-foreground">Coins in escrow</p>
                        <p className="text-sm font-bold">{(coinsEscrow || coinsBudget).toLocaleString()} Coins</p>
                      </div>
                    )}
                    {(ctgEscrow > 0 || ctgBudget > 0) && (
                      <div>
                        <p className="text-xs text-muted-foreground">$CTG in escrow</p>
                        <p className="text-sm font-bold">{(ctgEscrow || ctgBudget).toLocaleString()} $CTG</p>
                      </div>
                    )}
                  </div>
                  {(quest as any).allow_fundraising && (quest as any).funding_goal_credits && (
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Fundraising progress</span>
                        <span>{Math.round(((coinsEscrow + ctgEscrow) / Number((quest as any).funding_goal_credits)) * 100)}%</span>
                      </div>
                      <Progress
                        value={Math.min(100, ((coinsEscrow + ctgEscrow) / Number((quest as any).funding_goal_credits)) * 100)}
                        className="h-1.5"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Rewards Status */}
              {quest.status === "COMPLETED" ? (
                <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-4 space-y-2">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">Rewards distributed to all participants.</p>
                  {quest.credit_reward > 0 && (
                    <p className="text-xs text-muted-foreground">{quest.credit_reward} $CTG per participant</p>
                  )}
                  <p className="text-xs text-muted-foreground">+{quest.reward_xp} XP earned</p>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Rewards distributed on quest completion.
                  </p>
                  <div className="flex items-center justify-center gap-4 mt-3">
                    {quest.credit_reward > 0 && (
                      <span className="text-sm font-medium">{quest.credit_reward} $CTG</span>
                    )}
                    <span className="text-sm font-medium text-primary">+{quest.reward_xp} XP</span>
                  </div>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Contract Wizard Dialog */}
      <ContractWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        quest={quest}
        participants={participants}
      />
    </div>
  );
}
