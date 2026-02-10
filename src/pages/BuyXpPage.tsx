import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Zap, Package, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/hooks/useAuth";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const XP_BUNDLES = [
  { code: "STARTER", name: "Starter", xpAmount: 50, price: 5, currency: "EUR" },
  { code: "GROWTH", name: "Growth", xpAmount: 150, price: 12, currency: "EUR" },
  { code: "PRO", name: "Pro", xpAmount: 400, price: 29, currency: "EUR" },
];

export default function BuyXpPage() {
  const { session } = useAuth();
  const { userXp, refresh } = usePlanLimits();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);

  const success = searchParams.get("success") === "true";
  const bundleCode = searchParams.get("bundle");

  useEffect(() => {
    if (success) {
      refresh();
      toast({ title: "XP purchased!", description: `Your XP bundle has been credited.` });
    }
  }, [success]);

  const handleBuy = async (code: string) => {
    setLoading(code);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { mode: "xp_bundle", bundleCode: code },
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
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/me"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Me</Link>
        </Button>

        {success && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-success/30 bg-success/5 p-4 mb-6 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-success" />
            <div>
              <p className="font-medium text-sm">Payment successful!</p>
              <p className="text-xs text-muted-foreground">Your XP has been credited to your account.</p>
            </div>
          </motion.div>
        )}

        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold mb-2">Buy XP</h1>
          <p className="text-muted-foreground">Use XP to create extra quests, join more guilds, and unlock pods beyond your plan limits.</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-5 py-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold">{userXp} XP</span>
            <span className="text-sm text-muted-foreground">current balance</span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {XP_BUNDLES.map((bundle, i) => (
            <motion.div
              key={bundle.code}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-border bg-card p-6 text-center relative overflow-hidden"
            >
              {bundle.code === "GROWTH" && (
                <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground text-[10px]">Popular</Badge>
              )}
              <Package className="h-8 w-8 mx-auto mb-3 text-primary" />
              <h3 className="font-display text-lg font-bold">{bundle.name}</h3>
              <div className="my-3">
                <span className="text-3xl font-bold text-primary">{bundle.xpAmount}</span>
                <span className="text-sm text-muted-foreground ml-1">XP</span>
              </div>
              <p className="text-2xl font-bold mb-1">€{bundle.price}</p>
              <p className="text-xs text-muted-foreground mb-4">
                €{(bundle.price / bundle.xpAmount).toFixed(2)} per XP
              </p>
              <Button
                onClick={() => handleBuy(bundle.code)}
                disabled={!!loading}
                className="w-full"
              >
                {loading === bundle.code ? (
                  <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Processing…</>
                ) : (
                  <><Zap className="h-4 w-4 mr-1" /> Buy {bundle.xpAmount} XP</>
                )}
              </Button>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>XP is non-refundable. Payments are processed securely via Stripe.</p>
          <p className="mt-1">
            Want more features? <Link to="/plans" className="text-primary hover:underline">See subscription plans →</Link>
          </p>
        </div>
      </div>
    </PageShell>
  );
}
