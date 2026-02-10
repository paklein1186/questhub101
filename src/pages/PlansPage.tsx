import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Zap, ArrowLeft, Loader2, Crown, CheckCircle, ExternalLink } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/hooks/useAuth";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PlanRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  monthly_price_amount: number | null;
  monthly_price_currency: string;
  free_quests_per_week: number;
  max_guild_memberships: number | null;
  max_pods: number | null;
  xp_multiplier: number;
  stripe_price_id: string | null;
}

const PLAN_ORDER = ["FREE", "IMPACT_PLUS", "ECOSYSTEM_PRO"];

export default function PlansPage() {
  const { session } = useAuth();
  const { plan: currentPlan, refresh } = usePlanLimits();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const success = searchParams.get("success") === "true";

  useEffect(() => {
    fetchPlans();
    if (success) {
      refresh();
      toast({ title: "Plan updated!", description: "Your subscription has been activated." });
    }
  }, [success]);

  const fetchPlans = async () => {
    const { data } = await supabase
      .from("subscription_plans")
      .select("*") as { data: PlanRow[] | null };
    if (data) {
      setPlans(data.sort((a, b) => PLAN_ORDER.indexOf(a.code) - PLAN_ORDER.indexOf(b.code)));
    }
    setLoading(false);
  };

  const handleUpgrade = async (plan: PlanRow) => {
    if (!plan.stripe_price_id) return;
    setCheckoutLoading(plan.code);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { mode: "subscription", planStripePriceId: plan.stripe_price_id },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManage = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  const isCurrent = (code: string) => currentPlan.planCode === code;
  const currentIdx = PLAN_ORDER.indexOf(currentPlan.planCode);

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/me"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Me</Link>
        </Button>

        {success && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-success/30 bg-success/5 p-4 mb-6 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-success" />
            <p className="text-sm font-medium">Your plan has been updated successfully!</p>
          </motion.div>
        )}

        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold mb-2">Plans & Pricing</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Choose a plan that fits your level of activity. Upgrade anytime to unlock more quests, guilds, and pods.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan, i) => {
              const planIdx = PLAN_ORDER.indexOf(plan.code);
              const isCurrentPlan = isCurrent(plan.code);
              const isUpgrade = planIdx > currentIdx;
              const isHighlighted = plan.code === "IMPACT_PLUS";

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`rounded-xl border-2 bg-card p-6 relative ${
                    isCurrentPlan
                      ? "border-primary shadow-lg"
                      : isHighlighted
                      ? "border-primary/40"
                      : "border-border"
                  }`}
                >
                  {isCurrentPlan && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                      Your Plan
                    </Badge>
                  )}
                  {isHighlighted && !isCurrentPlan && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground">
                      Recommended
                    </Badge>
                  )}

                  <div className="text-center mb-4 pt-2">
                    <Crown className={`h-8 w-8 mx-auto mb-2 ${plan.code === "FREE" ? "text-muted-foreground" : "text-primary"}`} />
                    <h3 className="font-display text-xl font-bold">{plan.name}</h3>
                    {plan.description && <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>}
                  </div>

                  <div className="text-center mb-6">
                    {plan.monthly_price_amount && plan.monthly_price_amount > 0 ? (
                      <>
                        <span className="text-3xl font-bold">€{plan.monthly_price_amount}</span>
                        <span className="text-sm text-muted-foreground">/month</span>
                      </>
                    ) : (
                      <span className="text-3xl font-bold">Free</span>
                    )}
                  </div>

                  <ul className="space-y-2.5 mb-6">
                    <PlanFeature label={`${plan.free_quests_per_week === 999 ? "Unlimited" : plan.free_quests_per_week} quests/week`} />
                    <PlanFeature label={plan.max_guild_memberships === null ? "Unlimited guilds" : `${plan.max_guild_memberships} guilds`} />
                    <PlanFeature label={plan.max_pods === null ? "Unlimited pods" : `${plan.max_pods} pods`} />
                    <PlanFeature label={`${plan.xp_multiplier}x XP multiplier`} />
                  </ul>

                  {isCurrentPlan ? (
                    currentPlan.planCode !== "FREE" ? (
                      <Button variant="outline" className="w-full" onClick={handleManage} disabled={portalLoading}>
                        {portalLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ExternalLink className="h-4 w-4 mr-1" />}
                        Manage subscription
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full" disabled>Current plan</Button>
                    )
                  ) : isUpgrade && plan.stripe_price_id ? (
                    <Button className="w-full" onClick={() => handleUpgrade(plan)} disabled={!!checkoutLoading}>
                      {checkoutLoading === plan.code ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Processing…</>
                      ) : (
                        <><Zap className="h-4 w-4 mr-1" /> Upgrade</>
                      )}
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full" disabled>
                      {planIdx < currentIdx ? "Downgrade via portal" : "N/A"}
                    </Button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            Need more XP for extra actions? <Link to="/me/xp" className="text-primary hover:underline">Buy XP bundles →</Link>
          </p>
        </div>
      </div>
    </PageShell>
  );
}

function PlanFeature({ label }: { label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <Check className="h-4 w-4 text-primary shrink-0" />
      <span>{label}</span>
    </li>
  );
}
