import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Check, Zap, ArrowLeft, Loader2, Crown, CheckCircle, ExternalLink, Coins, Building2, Sparkles, Eye, ArrowRight, TrendingDown } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/hooks/useAuth";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PLAN_ORDER, ECONOMY_LABELS } from "@/lib/xpCreditsConfig";

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
  max_services_active: number | null;
  max_courses: number | null;
  xp_multiplier: number;
  stripe_price_id: string | null;
  monthly_included_credits: number;
  visibility_ranking: string;
  ai_muse_mode: string;
  can_create_company: boolean;
  custom_guild_tools: boolean;
  commission_discount_percentage: number;
  max_territories: number | null;
  can_create_territory: boolean;
  max_attachment_size_mb: number;
  partnership_proposals_enabled: boolean;
  fundraising_tools_enabled: boolean;
  ai_agents_enabled: boolean;
  territory_intelligence_enabled: boolean;
  memory_engine_enabled: boolean;
  broadcast_enabled: boolean;
}

const PLAN_ICONS: Record<string, typeof Crown> = {
  FREE: Crown,
  STARTER: ArrowRight,
  CREATOR: Sparkles,
  CATALYST: Zap,
  VISIONARY: Crown,
};

const PLAN_COLORS: Record<string, string> = {
  FREE: "text-muted-foreground",
  STARTER: "text-blue-500",
  CREATOR: "text-primary",
  CATALYST: "text-amber-500",
  VISIONARY: "text-purple-500",
};

export default function PlansPage() {
  const { t } = useTranslation();
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
      setPlans(data.sort((a, b) => PLAN_ORDER.indexOf(a.code as any) - PLAN_ORDER.indexOf(b.code as any)));
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
  const currentIdx = PLAN_ORDER.indexOf(currentPlan.planCode as any);

  return (
    <PageShell>
      <div className="max-w-5xl mx-auto">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/me"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Me</Link>
        </Button>

        {success && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-success/30 bg-success/5 p-4 mb-6 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-success" />
            <p className="text-sm font-medium">Your plan has been updated successfully!</p>
          </motion.div>
        )}

        <div className="text-center mb-10">
          <h1 className="font-display text-3xl font-bold mb-2">{t("pages.plans.title")}</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            {t("pages.plans.subtitle")}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-5 md:grid-cols-3 sm:grid-cols-2">
            {plans.map((plan, i) => {
              const planIdx = PLAN_ORDER.indexOf(plan.code as any);
              const isCurrentPlan = isCurrent(plan.code);
              const isUpgrade = planIdx > currentIdx;
              const isHighlighted = plan.code === "CREATOR";
              const PlanIcon = PLAN_ICONS[plan.code] || Crown;
              const iconColor = PLAN_COLORS[plan.code] || "text-primary";

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className={`rounded-xl border-2 bg-card p-5 relative flex flex-col ${
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
                      Popular
                    </Badge>
                  )}

                  <div className="text-center mb-3 pt-2">
                    <PlanIcon className={`h-7 w-7 mx-auto mb-1.5 ${iconColor}`} />
                    <h3 className="font-display text-lg font-bold">{plan.name}</h3>
                    {plan.description && <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>}
                  </div>

                  <div className="text-center mb-4">
                    {plan.monthly_price_amount && plan.monthly_price_amount > 0 ? (
                      <>
                        <span className="text-2xl font-bold">€{plan.monthly_price_amount}</span>
                        <span className="text-xs text-muted-foreground">/mo</span>
                      </>
                    ) : (
                      <span className="text-2xl font-bold">Free</span>
                    )}
                  </div>

                  <ul className="space-y-1.5 mb-4 flex-1 text-xs">
                    <PlanFeature icon={<Coins className="h-3 w-3" />} label={`${plan.monthly_included_credits} credits/mo`} />
                    <PlanFeature label={`${plan.free_quests_per_week >= 30 ? "∞" : plan.free_quests_per_week} quests/week`} />
                    <PlanFeature label={plan.max_guild_memberships === null ? "∞ guilds" : `${plan.max_guild_memberships} guilds`} />
                    <PlanFeature label={plan.max_pods === null ? "∞ pods" : `${plan.max_pods} pods`} />
                    <PlanFeature label={plan.max_services_active === null ? "∞ services" : `${plan.max_services_active} services`} />
                    <PlanFeature label={plan.max_courses === null ? "∞ courses" : `${plan.max_courses} courses`} />
                    <PlanFeature label={plan.max_territories === null ? "∞ territories" : `${plan.max_territories} territories`} />
                    <PlanFeature icon={<Eye className="h-3 w-3" />} label={`${plan.visibility_ranking} visibility`} highlight={plan.visibility_ranking !== "standard"} />
                    <PlanFeature icon={<Sparkles className="h-3 w-3" />} label={`AI: ${plan.ai_muse_mode}`} highlight={plan.ai_muse_mode !== "basic"} />
                    <PlanFeature label={`${plan.max_attachment_size_mb} MB uploads`} />
                    {plan.commission_discount_percentage > 0 && <PlanFeature icon={<TrendingDown className="h-3 w-3" />} label={`${plan.commission_discount_percentage}% commission off`} highlight />}
                    {plan.can_create_territory && <PlanFeature label="Create territories" highlight />}
                    {plan.can_create_company && <PlanFeature icon={<Building2 className="h-3 w-3" />} label="Create companies" highlight />}
                    {plan.partnership_proposals_enabled && <PlanFeature label="Partnership proposals" highlight />}
                    {plan.ai_agents_enabled && <PlanFeature label="AI Agents" highlight />}
                    {plan.territory_intelligence_enabled && <PlanFeature label="Territory intelligence" highlight />}
                    {plan.fundraising_tools_enabled && <PlanFeature label="Fundraising tools" highlight />}
                    {plan.memory_engine_enabled && <PlanFeature label="Memory engine" highlight />}
                    {plan.custom_guild_tools && <PlanFeature label="Custom guild tools" highlight />}
                    <PlanFeature label={`${plan.xp_multiplier}x XP multiplier`} />
                  </ul>

                  {isCurrentPlan ? (
                    currentPlan.planCode !== "FREE" ? (
                      <Button variant="outline" className="w-full" size="sm" onClick={handleManage} disabled={portalLoading}>
                        {portalLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ExternalLink className="h-4 w-4 mr-1" />}
                        Manage
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full" size="sm" disabled>Current plan</Button>
                    )
                  ) : isUpgrade && plan.stripe_price_id ? (
                    <Button className="w-full" size="sm" onClick={() => handleUpgrade(plan)} disabled={!!checkoutLoading}>
                      {checkoutLoading === plan.code ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-1" /> …</>
                      ) : (
                        <><Zap className="h-4 w-4 mr-1" /> Upgrade</>
                      )}
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full" size="sm" disabled>
                      {planIdx < currentIdx ? "Downgrade via portal" : "N/A"}
                    </Button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Dual economy info */}
        <div className="mt-10 rounded-xl border border-border bg-muted/30 p-6 text-center max-w-2xl mx-auto">
          <h3 className="font-display text-lg font-bold mb-3 flex items-center justify-center gap-2">
            <Coins className="h-5 w-5 text-primary" /> Understanding the Dual Economy
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-card border border-border">
              <p className="font-semibold text-primary mb-1">💶 Money (€)</p>
              <p className="text-muted-foreground">Mission budgets & freelance payments. Handled via Stripe or invoicing.</p>
            </div>
            <div className="p-3 rounded-lg bg-card border border-border">
              <p className="font-semibold text-primary mb-1">⚡ Credits</p>
              <p className="text-muted-foreground">Platform utility: boosts, extra capacity, AI features. Not exchangeable for money.</p>
            </div>
            <div className="p-3 rounded-lg bg-card border border-border">
              <p className="font-semibold text-primary mb-1">🏆 XP</p>
              <p className="text-muted-foreground">Your reputation score. Earned through activity, never purchased.</p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground space-y-1">
          <p>
            Need more credits? <Link to="/me/credits" className="text-primary hover:underline">Buy credit bundles →</Link>
          </p>
          <p className="text-xs">{ECONOMY_LABELS.creditsDisclaimer}</p>
        </div>
      </div>
    </PageShell>
  );
}

function PlanFeature({ label, icon, highlight }: { label: string; icon?: React.ReactNode; highlight?: boolean }) {
  return (
    <li className={`flex items-center gap-2 text-sm ${highlight ? "text-primary font-medium" : ""}`}>
      {icon || <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
      <span>{label}</span>
    </li>
  );
}
