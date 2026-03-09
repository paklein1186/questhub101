import { useState } from "react";
import {
  Banknote, Zap, Coins, ChevronRight, ChevronLeft, Check, HelpCircle, Leaf,
  CreditCard, Handshake, Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CommissionEstimator } from "@/components/quest/CommissionEstimator";
import { cn } from "@/lib/utils";

interface QuestBudgetWizardProps {
  missionBudgetMin: string;
  setMissionBudgetMin: (v: string) => void;
  missionBudgetMax: string;
  setMissionBudgetMax: (v: string) => void;
  paymentType: string;
  setPaymentType: (v: string) => void;
  rewardXp: string;
  setRewardXp: (v: string) => void;
  isMonetized: boolean;
  setIsMonetized: (v: boolean) => void;
  creditReward: string;
  setCreditReward: (v: string) => void;
  priceFiat: string;
  setPriceFiat: (v: string) => void;
  openForProposals: boolean;
  setOpenForProposals: (v: boolean) => void;
  fundingType: "CREDITS" | "FIAT";
  setFundingType: (v: "CREDITS" | "FIAT") => void;
  creditBudget: string;
  setCreditBudget: (v: string) => void;
  fundingGoalCredits: string;
  setFundingGoalCredits: (v: string) => void;
  allowFundraising: boolean;
  setAllowFundraising: (v: boolean) => void;
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0 cursor-help" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-60 text-xs">
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const STEPS = [
  { id: 0, label: "Budget", icon: Banknote, short: "Coins budget · $CTG pool · fiat compensation" },
  { id: 1, label: "Rewards", icon: Zap, short: "XP & monetization" },
  { id: 2, label: "Funding", icon: Handshake, short: "Proposals & fundraising" },
];

export function QuestBudgetWizard(props: QuestBudgetWizardProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  const hasBudget = !!(props.missionBudgetMin || props.missionBudgetMax);
  const hasRewards = Number(props.rewardXp) > 0 || props.isMonetized;
  const hasFunding = props.openForProposals || props.allowFundraising;

  return (
    <Card className="overflow-hidden">
      {/* Step nav */}
      <div className="flex border-b border-border">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = step === i;
          const done =
            (i === 0 && hasBudget) ||
            (i === 1 && hasRewards) ||
            (i === 2 && hasFunding);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(i)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors relative",
                active
                  ? "text-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {done && !active ? (
                <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-2.5 w-2.5 text-primary-foreground" />
                </div>
              ) : (
                <Icon className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{s.label}</span>
              {active && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Step content */}
      <div className="p-5 space-y-4">
        {/* ── Step 0: Mission Budget ── */}
        {step === 0 && (
          <>
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <Banknote className="h-4 w-4 text-primary" /> Mission Budget
                <Tip>The fiat compensation range for this quest in euros. This is separate from Platform Credits.</Tip>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Set fiat compensation (paid in 🟩 Coins), and a 🌱 $CTG pool (funded from your 🔷 Credits).
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="bw-budgetMin" className="text-xs flex items-center gap-1">
                  Min (€) <Tip>Minimum compensation you'd pay for this quest</Tip>
                </Label>
                <Input
                  id="bw-budgetMin"
                  type="number"
                  value={props.missionBudgetMin}
                  onChange={(e) => props.setMissionBudgetMin(e.target.value)}
                  min={0}
                  className="mt-1"
                  placeholder="500"
                />
              </div>
              <div>
                <Label htmlFor="bw-budgetMax" className="text-xs flex items-center gap-1">
                  Max (€) <Tip>Maximum compensation for this quest</Tip>
                </Label>
                <Input
                  id="bw-budgetMax"
                  type="number"
                  value={props.missionBudgetMax}
                  onChange={(e) => props.setMissionBudgetMax(e.target.value)}
                  min={0}
                  className="mt-1"
                  placeholder="5000"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="bw-paymentType" className="text-xs flex items-center gap-1">
                Payment method <Tip>How will the participant be paid?</Tip>
              </Label>
              <Select value={props.paymentType} onValueChange={props.setPaymentType}>
                <SelectTrigger className="mt-1 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INVOICE">Invoice</SelectItem>
                  <SelectItem value="STRIPE">Stripe</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(props.missionBudgetMin || props.missionBudgetMax) && (
              <CommissionEstimator budgetMin={props.missionBudgetMin} budgetMax={props.missionBudgetMax} />
            )}
          </>
        )}

        {/* ── Step 1: Rewards ── */}
        {step === 1 && (
          <>
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-primary" /> Rewards
                <Tip>XP rewards distributed to participants when they complete this quest.</Tip>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                What do participants earn?
              </p>
            </div>

            <div>
              <Label htmlFor="bw-rewardXp" className="text-xs flex items-center gap-1">
                XP Reward <Tip>⭐ XP granted on completion. Permanent reputation — never decays, never purchased. Reflects who you are becoming.</Tip>
              </Label>
              <Input
                id="bw-rewardXp"
                type="number"
                value={props.rewardXp}
                onChange={(e) => props.setRewardXp(e.target.value)}
                min={0}
                className="mt-1 max-w-48"
              />
            </div>

            <div className="rounded-lg border border-border p-3 space-y-3">
              <div className="flex items-center gap-3">
                <Switch id="bw-monetized" checked={props.isMonetized} onCheckedChange={props.setIsMonetized} />
                <Label htmlFor="bw-monetized" className="text-xs font-medium flex items-center gap-1">
                  Monetize this quest
                  <Tip>Enable $CTG and/or fiat payment for this quest.</Tip>
                </Label>
              </div>

              {props.isMonetized && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                     <Label htmlFor="bw-creditReward" className="text-xs flex items-center gap-1">
                       🌱 $CTG reward <Tip>🌱 $CTG emitted on verified completion. Contribution to the commons — not fiat-backed, not purchasable. Fades 1%/month.</Tip>
                    </Label>
                    <Input
                      id="bw-creditReward"
                      type="number"
                      value={props.creditReward}
                      onChange={(e) => props.setCreditReward(e.target.value)}
                      min={0}
                      className="mt-1"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bw-priceFiat" className="text-xs flex items-center gap-1">
                      Entry fee (€ cents) <Tip>Stripe payment required to join this quest, in euro cents. E.g. 500 = 5€.</Tip>
                    </Label>
                    <Input
                      id="bw-priceFiat"
                      type="number"
                      value={props.priceFiat}
                      onChange={(e) => props.setPriceFiat(e.target.value)}
                      min={0}
                      className="mt-1"
                      placeholder="0"
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Step 2: Funding & Proposals ── */}
        {step === 2 && (
          <>
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <Handshake className="h-4 w-4 text-primary" /> Funding & Proposals
                <Tip>Let the community submit proposals and/or crowdfund this quest.</Tip>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Open this quest to proposals or fundraising?
              </p>
            </div>

            <div className="rounded-lg border border-border p-3 space-y-3">
              <div className="flex items-center gap-3">
                <Switch id="bw-proposals" checked={props.openForProposals} onCheckedChange={props.setOpenForProposals} />
                <Label htmlFor="bw-proposals" className="text-xs font-medium flex items-center gap-1">
                  Open for proposals
                  <Tip>Allow the community to submit proposals for this quest. You decide which to accept.</Tip>
                </Label>
              </div>

              {props.openForProposals && (
                <div className="space-y-3 pt-1">
                  <div>
                    <Label className="text-xs flex items-center gap-1">
                       Pot currency <Tip>Use $CTG or fiat euros to fund accepted proposals.</Tip>
                    </Label>
                    <Select value={props.fundingType} onValueChange={(v) => props.setFundingType(v as "CREDITS" | "FIAT")}>
                      <SelectTrigger className="mt-1 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CREDITS">🌱 $CTG (contribution token)</SelectItem>
                        <SelectItem value="FIAT">Fiat (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="bw-creditBudget" className="text-xs flex items-center gap-1">
                        🌱 $CTG Pool <Tip>You spend 🔷 Credits now. Contributors earn 🌱 $CTG from this pool when they complete work. Credits and $CTG are different layers — this is how contribution value gets created.</Tip>
                      </Label>
                      <Input
                        id="bw-creditBudget"
                        type="number"
                        value={props.creditBudget}
                        onChange={(e) => props.setCreditBudget(e.target.value)}
                        min={0}
                        className="mt-1"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bw-fundingGoal" className="text-xs flex items-center gap-1">
                        Goal (optional) <Tip>Target amount for this quest. Purely indicative.</Tip>
                      </Label>
                      <Input
                        id="bw-fundingGoal"
                        type="number"
                        value={props.fundingGoalCredits}
                        onChange={(e) => props.setFundingGoalCredits(e.target.value)}
                        min={0}
                        className="mt-1"
                        placeholder="Target"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                <Switch id="bw-fundraising" checked={props.allowFundraising} onCheckedChange={props.setAllowFundraising} />
                <Label htmlFor="bw-fundraising" className="text-xs font-medium flex items-center gap-1">
                  Community fundraising
                  <Tip>Allow others to contribute Coins to this quest's budget.</Tip>
                </Label>
              </div>
            </div>
          </>
        )}

        {/* Nav buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs"
            disabled={step === 0}
            onClick={() => setStep(step - 1)}
          >
            <ChevronLeft className="h-3 w-3 mr-1" /> Back
          </Button>

          {/* Summary badges */}
          <div className="flex gap-1.5 flex-wrap justify-center">
            {hasBudget && (
              <Badge variant="outline" className="text-[10px] py-0 gap-1">
                <Banknote className="h-2.5 w-2.5" />
                €{props.missionBudgetMin || "0"}-{props.missionBudgetMax || "∞"}
              </Badge>
            )}
            {Number(props.rewardXp) > 0 && (
              <Badge variant="outline" className="text-[10px] py-0 gap-1">
                <Zap className="h-2.5 w-2.5" /> {props.rewardXp} XP
              </Badge>
            )}
            {props.isMonetized && Number(props.creditReward) > 0 && (
              <Badge variant="outline" className="text-[10px] py-0 gap-1">
                <Leaf className="h-2.5 w-2.5 text-emerald-600" /> {props.creditReward} 🌱 $CTG
              </Badge>
            )}
            {props.openForProposals && (
              <Badge variant="outline" className="text-[10px] py-0 gap-1">
                <Target className="h-2.5 w-2.5" /> Proposals
              </Badge>
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs"
            disabled={step === STEPS.length - 1}
            onClick={() => setStep(step + 1)}
          >
            Next <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
