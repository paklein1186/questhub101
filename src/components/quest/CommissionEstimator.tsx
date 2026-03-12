import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { calculateCommission, CREDIT_COST_PER_1_PERCENT_REDUCTION, COMMISSION_FLOOR, MAX_CREDIT_REDUCTION_RATIO, type CommissionRule } from "@/lib/commissionCalc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingDown, Info, Minus, Plus } from "lucide-react";
import { CurrencyIcon } from "@/components/CurrencyIcon";

interface CommissionEstimatorProps {
  budgetMin: string;
  budgetMax: string;
  compact?: boolean;
}

export function CommissionEstimator({ budgetMin, budgetMax, compact }: CommissionEstimatorProps) {
  const { plan, userCredits } = usePlanLimits();
  const [creditSteps, setCreditSteps] = useState(0);

  const { data: rules = [] } = useQuery({
    queryKey: ["commission-rules"],
    queryFn: async () => {
      const { data } = await supabase
        .from("commission_rules" as any)
        .select("*")
        .eq("is_active", true)
        .order("sort_order") as any;
      return (data ?? []) as CommissionRule[];
    },
  });

  const planDiscount = (plan as any).commissionDiscountPercent ?? 0;

  const min = Number(budgetMin) || 0;
  const max = Number(budgetMax) || min;

  const resultMin = useMemo(
    () => calculateCommission({ amount: min, rules, planDiscountPercent: planDiscount, creditReductionSteps: creditSteps }),
    [min, rules, planDiscount, creditSteps]
  );
  const resultMax = useMemo(
    () => calculateCommission({ amount: max || min, rules, planDiscountPercent: planDiscount, creditReductionSteps: creditSteps }),
    [max, min, rules, planDiscount, creditSteps]
  );

  if (!min && !max) return null;

  const creditsNeeded = creditSteps * CREDIT_COST_PER_1_PERCENT_REDUCTION;
  const canAffordMore = userCredits >= (creditSteps + 1) * CREDIT_COST_PER_1_PERCENT_REDUCTION;
  const maxSteps = Math.floor(Math.max(0, (resultMin.afterPlanDiscount - COMMISSION_FLOOR) * MAX_CREDIT_REDUCTION_RATIO));

  if (compact) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm space-y-1">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-primary shrink-0" />
          <span className="font-medium">Commission: {resultMin.finalRate}%</span>
          {planDiscount > 0 && (
            <Badge variant="secondary" className="text-[10px]">-{planDiscount}% {plan.planName}</Badge>
          )}
        </div>
        {min > 0 && (
          <p className="text-xs text-muted-foreground">
            Est. payout: €{resultMin.payoutAmount.toLocaleString()} 
            {max > min ? ` – €${resultMax.payoutAmount.toLocaleString()}` : ""}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <TrendingDown className="h-4 w-4 text-primary" /> Commission Preview
      </h4>

      <div className="grid gap-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Base commission</span>
          <span className="font-medium">{resultMin.baseRate}%{resultMax.baseRate !== resultMin.baseRate ? ` – ${resultMax.baseRate}%` : ""}</span>
        </div>

        {planDiscount > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              {plan.planName} discount
              <Badge variant="secondary" className="text-[10px]">-{planDiscount}%</Badge>
            </span>
            <span className="font-medium text-primary">→ {resultMin.afterPlanDiscount}%</span>
          </div>
        )}

        {creditSteps > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <CurrencyIcon currency="credits" className="h-3 w-3" /> Credit reduction ({creditsNeeded} credits)
            </span>
            <span className="font-medium text-primary">-{creditSteps}%</span>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border pt-2">
          <span className="font-semibold">Final commission</span>
          <span className="font-bold text-primary">{resultMin.finalRate}%</span>
        </div>
      </div>

      {/* Credit reduction controls */}
      {maxSteps > 0 && (
        <div className="rounded-md bg-muted/50 p-3 space-y-2">
          <p className="text-xs font-medium flex items-center gap-1">
            <Coins className="h-3 w-3 text-primary" /> Reduce commission with credits
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm" className="h-7 w-7 p-0"
              onClick={() => setCreditSteps(Math.max(0, creditSteps - 1))}
              disabled={creditSteps === 0}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="text-sm font-mono w-8 text-center">{creditSteps}%</span>
            <Button
              variant="outline" size="sm" className="h-7 w-7 p-0"
              onClick={() => setCreditSteps(Math.min(maxSteps, creditSteps + 1))}
              disabled={creditSteps >= maxSteps || !canAffordMore}
            >
              <Plus className="h-3 w-3" />
            </Button>
            <span className="text-xs text-muted-foreground">
              ({CREDIT_COST_PER_1_PERCENT_REDUCTION} credits per 1%)
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Max reduction: {maxSteps}% • Floor: {COMMISSION_FLOOR}% • You have {userCredits} credits
          </p>
        </div>
      )}

      {/* Payout estimate */}
      {min > 0 && (
        <div className="rounded-md bg-primary/5 border border-primary/20 p-3">
          <p className="text-xs text-muted-foreground font-medium mb-1">🎯 Estimated payout to collaborator</p>
          <p className="text-lg font-bold">
            €{resultMin.payoutAmount.toLocaleString()}
            {max > min ? ` – €${resultMax.payoutAmount.toLocaleString()}` : ""}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Commission: €{resultMin.commissionAmount.toLocaleString()}
            {max > min ? ` – €${resultMax.commissionAmount.toLocaleString()}` : ""}
          </p>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
        <Info className="h-3 w-3" /> Commission is calculated on the accepted mission amount. Credits are not used for payments.
      </p>
    </div>
  );
}
