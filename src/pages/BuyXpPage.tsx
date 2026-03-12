import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Package, ArrowLeft, CheckCircle, Loader2, ArrowRight, Info, RefreshCw } from "lucide-react";
import { CurrencyIcon } from "@/components/CurrencyIcon";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/hooks/useAuth";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CREDIT_BUNDLES, CREDIT_COSTS, ECONOMY_LABELS } from "@/lib/xpCreditsConfig";

export default function BuyXpPage() {
  const { session } = useAuth();
  const { userCredits, userXp, plan, refresh } = usePlanLimits();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);

  const success = searchParams.get("success") === "true";
  const successBundle = searchParams.get("bundle");
  const successSessionId = searchParams.get("session_id");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  // CTG balance & exchange rate
  const { data: ctgData } = useQuery({
    queryKey: ["buy-page-ctg"],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("ctg_balance")
        .eq("user_id", session?.user?.id ?? "")
        .maybeSingle();
      const { data: rate } = await supabase
        .from("ctg_exchange_rates")
        .select("rate_ctg_to_credits")
        .eq("active", true)
        .maybeSingle();
      return {
        ctgBalance: Number((profile as any)?.ctg_balance ?? 0),
        rate: Number((rate as any)?.rate_ctg_to_credits ?? 5),
      };
    },
    enabled: !!session?.user?.id,
  });

  const [exchangeAmount, setExchangeAmount] = useState("");
  const [exchangeLoading, setExchangeLoading] = useState(false);

  const handleCtgExchange = async () => {
    const amt = parseFloat(exchangeAmount);
    if (!amt || amt <= 0) return;
    setExchangeLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ctg-exchange", {
        body: { ctg_amount: amt },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: "Exchange successful!",
        description: `${data.ctg_spent} $CTG → ${data.credits_received} Credits`,
      });
      setExchangeAmount("");
      refresh();
    } catch (err: any) {
      toast({ title: "Exchange failed", description: err.message, variant: "destructive" });
    } finally {
      setExchangeLoading(false);
    }
  };

  const previewCredits = ctgData?.rate
    ? Math.floor((parseFloat(exchangeAmount) || 0) * ctgData.rate)
    : 0;

  useEffect(() => {
    if (success && (successBundle || successSessionId) && !verified && !verifying) {
      setVerifying(true);
      supabase.functions.invoke("verify-credit-purchase", {
        body: { bundleCode: successBundle, sessionId: successSessionId },
      }).then(({ data, error }) => {
        setVerifying(false);
        setVerified(true);
        refresh();
        if (data?.granted) {
          toast({ title: "Credits purchased!", description: `${data.creditsAmount} credits added to your account.` });
        } else if (data?.alreadyGranted) {
          toast({ title: "Credits already added", description: "This purchase was already processed." });
        } else if (error) {
          toast({ title: "Verification issue", description: "Credits may take a moment to appear. Please refresh.", variant: "destructive" });
        }
      });
    }
  }, [success, successBundle, verified, verifying]);

  const handleBuy = async (code: string) => {
    setLoading(code);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { mode: "credit_bundle", bundleCode: code },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <PageShell>
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/me"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Me</Link>
        </Button>

        {success && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-success/30 bg-success/5 p-4 mb-6 flex items-center gap-3">
            {verifying ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <CheckCircle className="h-5 w-5 text-success" />}
            <div>
              <p className="font-medium text-sm">{verifying ? "Verifying payment…" : "Payment successful!"}</p>
              <p className="text-xs text-muted-foreground">{verifying ? "Please wait while we confirm your purchase." : "Your credits have been added to your account."}</p>
            </div>
          </motion.div>
        )}

        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold mb-2">Buy Credits</h1>
          <p className="text-muted-foreground">Credits are platform utility — use them for boosts, extra capacity, and AI features.</p>
          <div className="mt-4 flex items-center justify-center gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-5 py-2">
              <CurrencyIcon currency="credits" className="h-5 w-5" />
              <span className="text-lg font-bold">{userCredits}</span>
              <span className="text-sm text-muted-foreground">Credits</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-2">
              <span className="text-sm font-medium">{userXp} XP</span>
              <span className="text-xs text-muted-foreground">(reputation)</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Your plan ({plan.planName}) includes {plan.monthlyIncludedCredits} credits/month
          </p>
        </div>

        {/* ── $CTG → Credits exchange ── */}
        {ctgData && ctgData.ctgBalance > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 mb-6"
          >
            <div className="flex items-center gap-3 mb-3">
              <CurrencyIcon currency="ctg" className="h-6 w-6" />
              <div>
                <h3 className="font-display text-lg font-bold flex items-center gap-2">
                  Exchange your $CTG for Credits
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  No payment needed
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              You have{" "}
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {ctgData.ctgBalance.toLocaleString()} $CTG
              </span>{" "}
              available. Convert contribution earnings into platform Credits.
              Rate: 1 $CTG = {ctgData.rate} Credits.
              <span className="text-xs ml-1">
                ($CTG fades 1%/month — exchanging surplus is always rational)
              </span>
            </p>

            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Leaf className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                <Input
                  type="number"
                  placeholder="Amount to exchange"
                  value={exchangeAmount}
                  onChange={(e) => setExchangeAmount(e.target.value)}
                  min={1}
                  max={ctgData.ctgBalance * 0.5}
                  className="pl-8 text-sm"
                />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="text-center min-w-[80px]">
                <p className="text-xl font-bold text-primary">
                  {previewCredits > 0 ? previewCredits.toLocaleString() : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Credits</p>
              </div>
              <Button onClick={handleCtgExchange} disabled={exchangeLoading || !parseFloat(exchangeAmount)}>
                {exchangeLoading
                  ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Exchanging…</>
                  : <><RefreshCw className="h-4 w-4 mr-1" /> Exchange</>}
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground mt-3">
              Max 50% of balance per transaction · Up to 3 exchanges/hour
            </p>
          </motion.div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          {CREDIT_BUNDLES.map((bundle, i) => (
            <motion.div
              key={bundle.code}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-border bg-card p-6 text-center relative overflow-hidden"
            >
              {bundle.code === "CREATOR_300" && (
                <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground text-[10px]">Popular</Badge>
              )}
              <Package className="h-8 w-8 mx-auto mb-3 text-primary" />
              <h3 className="font-display text-lg font-bold">{bundle.label}</h3>
              <div className="my-3">
                <span className="text-3xl font-bold text-primary">{bundle.credits}</span>
                <span className="text-sm text-muted-foreground ml-1">Credits</span>
              </div>
              <p className="text-2xl font-bold mb-1">€{bundle.priceEur}</p>
              <p className="text-xs text-muted-foreground mb-4">
                €{(bundle.priceEur / bundle.credits).toFixed(3)} per credit
              </p>
              <Button
                onClick={() => handleBuy(bundle.code)}
                disabled={!!loading}
                className="w-full"
              >
                {loading === bundle.code ? (
                  <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Processing…</>
                ) : (
                  <><CurrencyIcon currency="credits" className="h-4 w-4 mr-1" /> Buy {bundle.credits} Credits</>
                )}
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Credit Shop link */}
        <div className="mt-8 rounded-xl border border-border bg-muted/30 p-5 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" /> What can you do with credits?
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Boosts, extra capacity, AI sessions, commission reductions & more.
            </p>
          </div>
          <Link to="/me/credit-shop">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              Browse Credit Shop <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground space-y-1">
          <p>Credits are non-refundable. Stripe payments and $CTG exchanges are final.</p>
          <p className="text-xs">{ECONOMY_LABELS.creditsDisclaimer}</p>
          <p className="mt-2">
            Want more features? <Link to="/plans" className="text-primary hover:underline">See subscription plans →</Link>
          </p>
        </div>
      </div>
    </PageShell>
  );
}
