import { useState } from "react";
import { motion } from "framer-motion";
import { Crown, Shield, Users, Vote, ArrowRight, Loader2, Plus, Minus } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

function useShareholdings(userId?: string) {
  return useQuery({
    queryKey: ["shareholdings", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("shareholdings")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!userId,
  });
}

function useCoopSettings() {
  return useQuery({
    queryKey: ["cooperative-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cooperative_settings")
        .select("key, value");
      const settings: Record<string, any> = {};
      (data ?? []).forEach((s: any) => { settings[s.key] = s.value; });
      return settings;
    },
    staleTime: 60_000,
  });
}

function useProfileShares(userId?: string) {
  return useQuery({
    queryKey: ["profile-shares", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("total_shares_a, total_shares_b, governance_weight, is_cooperative_member")
        .eq("user_id", userId!)
        .single();
      return data;
    },
    enabled: !!userId,
  });
}

export default function SharesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: holdings = [], isLoading } = useShareholdings(user?.id);
  const { data: settings = {} } = useCoopSettings();
  const { data: profile } = useProfileShares(user?.id);
  const [buyingClass, setBuyingClass] = useState<"A" | "B" | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [purchasing, setPurchasing] = useState(false);

  const sharePrice = settings?.share_price?.amount ?? 10;
  const classAEnabled = settings?.class_a_enabled?.enabled !== false;
  const classBEnabled = settings?.class_b_enabled?.enabled !== false;

  const handlePurchase = async (shareClass: "A" | "B") => {
    if (!user) return;
    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          mode: "shares",
          shareClass,
          quantity,
          pricePerShare: sharePrice,
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        // Fallback: direct insert for demo/dev
        const totalPaid = quantity * sharePrice;
        await supabase.from("shareholdings").insert({
          user_id: user.id,
          share_class: shareClass,
          number_of_shares: quantity,
          purchase_price_per_share: sharePrice,
          total_paid: totalPaid,
        });
        toast({ title: "Shares purchased!", description: `${quantity} Class ${shareClass} share(s) added.` });
        setBuyingClass(null);
        setQuantity(1);
      }
    } catch (e: any) {
      toast({ title: "Purchase failed", description: e.message, variant: "destructive" });
    } finally {
      setPurchasing(false);
    }
  };

  const isMember = profile?.is_cooperative_member;

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Crown className="h-4 w-4" /> Membership & Shares
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">
            Co-own <span className="text-primary">changethegame</span>
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            changethegame is co-owned by its members. You can become a shareholder starting at {sharePrice} €.
            Your voice and vote count through a fair logarithmic system that protects small shareholders while avoiding dominance.
          </p>
        </motion.div>

        {/* Current status */}
        {isMember && profile && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" /> You are a cooperative member
                </h3>
                <div className="flex gap-4 mt-2 text-sm">
                  {profile.total_shares_a > 0 && (
                    <span>Class A: <strong>{profile.total_shares_a}</strong> shares</span>
                  )}
                  {profile.total_shares_b > 0 && (
                    <span>Class B: <strong>{profile.total_shares_b}</strong> shares</span>
                  )}
                  <span>Governance weight: <strong>{Number(profile.governance_weight).toFixed(2)}</strong></span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/governance">Go to governance decisions</Link>
                </Button>
                <Button size="sm" onClick={() => setBuyingClass("A")}>Buy more shares</Button>
              </div>
            </div>
          </motion.div>
        )}

        <Separator />

        {/* Share classes */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Class A */}
          <Card className={`relative overflow-hidden ${!classAEnabled ? "opacity-50" : ""}`}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-[100%]" />
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/10 text-primary border-0">Class A</Badge>
                <Badge variant="outline">{sharePrice} € / share</Badge>
              </div>
              <CardTitle className="font-display text-xl">Strategic Member</CardTitle>
              <CardDescription>
                Class A members participate in strategic and operational decisions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2"><Vote className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Voting rights on all strategic decisions</li>
                <li className="flex items-start gap-2"><Users className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Priority for governance calls</li>
                <li className="flex items-start gap-2"><Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Logarithmic voting weight: log(1 + shares)</li>
              </ul>

              {buyingClass === "A" ? (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3 justify-center">
                    <Button variant="outline" size="sm" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="font-display text-2xl font-bold w-12 text-center">{quantity}</span>
                    <Button variant="outline" size="sm" onClick={() => setQuantity(quantity + 1)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    Total: <strong>{quantity * sharePrice} €</strong>
                  </p>
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => handlePurchase("A")} disabled={purchasing}>
                      {purchasing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Confirm purchase
                    </Button>
                    <Button variant="ghost" onClick={() => { setBuyingClass(null); setQuantity(1); }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button className="w-full" onClick={() => setBuyingClass("A")} disabled={!classAEnabled}>
                  Buy Class A Shares <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Class B */}
          <Card className={`relative overflow-hidden ${!classBEnabled ? "opacity-50" : ""}`}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-bl-[100%]" />
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge className="bg-accent/10 text-accent border-0">Class B</Badge>
                <Badge variant="outline">{sharePrice} € / share</Badge>
              </div>
              <CardTitle className="font-display text-xl">Community Supporter</CardTitle>
              <CardDescription>
                Class B members support the ecosystem and join assemblies & events.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2"><Users className="h-4 w-4 text-accent mt-0.5 shrink-0" /> Invitations to assemblies & events</li>
                <li className="flex items-start gap-2"><Vote className="h-4 w-4 text-accent mt-0.5 shrink-0" /> Light voting on symbolic questions</li>
                <li className="flex items-start gap-2"><Shield className="h-4 w-4 text-accent mt-0.5 shrink-0" /> Weight: log(1 + shares) × 0.2</li>
              </ul>

              {buyingClass === "B" ? (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3 justify-center">
                    <Button variant="outline" size="sm" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="font-display text-2xl font-bold w-12 text-center">{quantity}</span>
                    <Button variant="outline" size="sm" onClick={() => setQuantity(quantity + 1)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    Total: <strong>{quantity * sharePrice} €</strong>
                  </p>
                  <div className="flex gap-2">
                    <Button className="flex-1" variant="secondary" onClick={() => handlePurchase("B")} disabled={purchasing}>
                      {purchasing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Confirm purchase
                    </Button>
                    <Button variant="ghost" onClick={() => { setBuyingClass(null); setQuantity(1); }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button className="w-full" variant="secondary" onClick={() => setBuyingClass("B")} disabled={!classBEnabled}>
                  Buy Class B Shares <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Purchase history */}
        {holdings.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold">Your share history</h2>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-left p-3 font-medium">Class</th>
                    <th className="text-right p-3 font-medium">Shares</th>
                    <th className="text-right p-3 font-medium">Total Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h: any) => (
                    <tr key={h.id} className="border-b last:border-0">
                      <td className="p-3 text-muted-foreground">{new Date(h.created_at).toLocaleDateString()}</td>
                      <td className="p-3">
                        <Badge variant={h.share_class === "A" ? "default" : "secondary"} className="text-xs">
                          Class {h.share_class}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-medium">{h.number_of_shares}</td>
                      <td className="p-3 text-right">{Number(h.total_paid).toFixed(2)} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
