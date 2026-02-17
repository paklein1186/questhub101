import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Crown, Shield, Users, Vote, ArrowRight, Loader2, Plus, Minus, Mail, Lock, Compass, Handshake } from "lucide-react";
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
import { usePersona } from "@/hooks/usePersona";
import { getLabel } from "@/lib/personaLabels";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const CLASS_A_MAILTO = "mailto:pa@changethegame.xyz?subject=Class%20A%20Membership%20Application";

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

function useAllShareholders() {
  return useQuery({
    queryKey: ["all-shareholders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url, total_shares_a, total_shares_b")
        .eq("is_cooperative_member", true)
        .order("total_shares_a", { ascending: false });
      return (data ?? []) as {
        user_id: string;
        name: string;
        avatar_url: string | null;
        total_shares_a: number;
        total_shares_b: number;
      }[];
    },
    staleTime: 60_000,
  });
}

export default function SharesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { effectiveMode } = usePersona();
  const { data: holdings = [], isLoading } = useShareholdings(user?.id);
  const { data: settings = {} } = useCoopSettings();
  const { data: profile } = useProfileShares(user?.id);
  const { data: shareholders = [] } = useAllShareholders();
  const [quantity, setQuantity] = useState(1);
  const [purchasing, setPurchasing] = useState(false);
  const [showBuyB, setShowBuyB] = useState(false);

  const sharePrice = settings?.share_price?.amount ?? 10;

  const guildLabel = getLabel("guild.label", effectiveMode);
  const guildSingular = getLabel("guild.label_singular", effectiveMode);
  const questLabel = getLabel("quest.label", effectiveMode);
  const podLabel = getLabel("pod.label", effectiveMode);
  const serviceLabel = getLabel("service.label", effectiveMode);

  const handlePurchaseB = async () => {
    if (!user) return;
    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          mode: "shares",
          shareClass: "B",
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
          share_class: "B",
          number_of_shares: quantity,
          purchase_price_per_share: sharePrice,
          total_paid: totalPaid,
        });
        toast({ title: "Shares purchased!", description: `${quantity} Class B share(s) added.` });
        setShowBuyB(false);
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
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 px-1">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium text-primary">
            <Crown className="h-4 w-4" /> {t("pages.shares.title")}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold">
            {t("pages.shares.heading")} <span className="text-primary">changethegame</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
            changethegame is co-owned by its members. Two share classes exist — strategic (A) and community (B).
            Your voice and vote count through a fair logarithmic system.
          </p>
        </motion.div>

        {/* ═══ Start by joining the guild ═══ */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2">
            <Handshake className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg sm:text-xl font-semibold">
              Before becoming a shareholder, join the {guildSingular.toLowerCase()}.
            </h2>
          </div>
          <div className="text-sm sm:text-base text-muted-foreground space-y-2 max-w-2xl">
            <p>
              <span className="text-foreground font-medium">changethegame</span> is first and foremost a collaborative ecosystem.
            </p>
            <p>
              You can join {guildLabel.toLowerCase()}, take part in {questLabel.toLowerCase()}, co-create missions, start {podLabel.toLowerCase()}, share {serviceLabel.toLowerCase()}, and interact with other builders and creators.
            </p>
            <p>
              Becoming a shareholder is <strong>optional</strong>.
            </p>
            <p className="font-medium text-foreground">
              The real value begins with participation.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 pt-1">
            <Button asChild>
              <Link to="/explore?tab=entities&sub=guilds">
                <Users className="h-4 w-4 mr-2" /> Join a {guildSingular}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/explore?tab=quests">
                <Compass className="h-4 w-4 mr-2" /> Explore {questLabel}
              </Link>
            </Button>
          </div>
        </motion.div>

        {/* Current status */}
        {isMember && profile && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" /> You are a coop-like member
                </h3>
                <div className="flex gap-4 mt-2 text-sm">
                  <span>Class A: <strong>{profile.total_shares_a ?? 0}</strong> shares</span>
                  <span>Class B: <strong>{profile.total_shares_b ?? 0}</strong> shares</span>
                  <span>Governance weight: <strong>{Number(profile.governance_weight).toFixed(2)}</strong></span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/governance">Governance decisions</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={CLASS_A_MAILTO}>Apply for Class A</a>
                </Button>
                <Button size="sm" onClick={() => setShowBuyB(true)}>Buy more Class B</Button>
              </div>
            </div>
          </motion.div>
        )}

        <Separator />

        {/* Share classes */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* ═══════ Class A — Application Only ═══════ */}
          <Card className="relative overflow-hidden border-primary/20">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-[100%]" />
            <CardHeader>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-primary/10 text-primary border-0">Class A</Badge>
                <Badge variant="outline">{sharePrice} € / share</Badge>
                <Badge variant="secondary" className="text-[10px]">
                  <Lock className="h-3 w-3 mr-0.5" /> Application-Only
                </Badge>
              </div>
              <CardTitle className="font-display text-xl">Guardian Shares</CardTitle>
              <CardDescription>
                For governance participation and operational decision-making.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2"><Vote className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Strategic governance voting</li>
                <li className="flex items-start gap-2"><Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Operational decision power</li>
                <li className="flex items-start gap-2"><Users className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Participation in inner governance group</li>
              </ul>
              <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground text-sm">Voting weight: log(1 + shares)</p>
                <p>Full logarithmic governance weight.</p>
              </div>

              <Button className="w-full" variant="outline" asChild>
                <a href={CLASS_A_MAILTO}>
                  <Mail className="h-4 w-4 mr-2" /> Apply to Become a Class A Member
                </a>
              </Button>
              <p className="text-xs text-muted-foreground text-center italic">
                Class A membership is selective and handled manually.
              </p>
            </CardContent>
          </Card>

          {/* ═══════ Class B — Purchasable ═══════ */}
          <Card className="relative overflow-hidden border-accent/20">
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-bl-[100%]" />
            <CardHeader>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-accent/10 text-accent border-0">Class B</Badge>
                <Badge variant="outline">{sharePrice} € / share</Badge>
                <Badge variant="secondary" className="text-[10px] bg-accent/10 text-accent border-0">
                  Open for Purchase
                </Badge>
              </div>
              <CardTitle className="font-display text-xl">Steward Shares</CardTitle>
              <CardDescription>
                Support the ecosystem & join assemblies.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2"><Users className="h-4 w-4 text-accent mt-0.5 shrink-0" /> Access to assemblies & community events</li>
                <li className="flex items-start gap-2"><Vote className="h-4 w-4 text-accent mt-0.5 shrink-0" /> Symbolic governance input (light vote)</li>
              </ul>
              <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground text-sm">Voting weight: log(1 + shares) × 0.2</p>
                <p>Reduced weight for community input.</p>
              </div>

              {showBuyB ? (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3 justify-center">
                    <Button variant="outline" size="sm" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="font-display text-2xl font-bold w-12 text-center">{quantity}</span>
                    <Button variant="outline" size="sm" onClick={() => setQuantity(Math.min(100, quantity + 1))}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    Total: <strong>{quantity * sharePrice} €</strong>
                  </p>
                  <div className="flex gap-2">
                    <Button className="flex-1" variant="secondary" onClick={handlePurchaseB} disabled={purchasing}>
                      {purchasing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Confirm purchase
                    </Button>
                    <Button variant="ghost" onClick={() => { setShowBuyB(false); setQuantity(1); }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button className="w-full" variant="secondary" onClick={() => setShowBuyB(true)}>
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
            <div className="rounded-xl border border-border overflow-x-auto">
              <table className="w-full text-sm min-w-[360px]">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 sm:p-3 font-medium">Date</th>
                    <th className="text-left p-2 sm:p-3 font-medium">Class</th>
                    <th className="text-right p-2 sm:p-3 font-medium">Shares</th>
                    <th className="text-right p-2 sm:p-3 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h: any) => (
                    <tr key={h.id} className="border-b last:border-0">
                      <td className="p-2 sm:p-3 text-muted-foreground text-xs sm:text-sm">{new Date(h.created_at).toLocaleDateString()}</td>
                      <td className="p-2 sm:p-3">
                        <Badge variant={h.share_class === "A" ? "default" : "secondary"} className="text-xs">
                          Class {h.share_class}
                        </Badge>
                      </td>
                      <td className="p-2 sm:p-3 text-right font-medium">{h.number_of_shares}</td>
                      <td className="p-2 sm:p-3 text-right text-xs sm:text-sm">{Number(h.total_paid).toFixed(2)} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ Shareholders ═══ */}
        {shareholders.length > 0 && (
          <>
            <Separator />
            <div className="space-y-4">
              <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" /> Shareholders
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {shareholders.map((s) => {
                  const hasA = (s.total_shares_a ?? 0) > 0;
                  const hasB = (s.total_shares_b ?? 0) > 0;
                  return (
                    <Link
                      key={s.user_id}
                      to={`/users/${s.user_id}`}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={s.avatar_url || undefined} />
                        <AvatarFallback className="text-sm">{(s.name || "?")[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{s.name}</p>
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          {hasA && (
                            <Badge className="text-[10px] bg-primary/10 text-primary border-0 px-1.5 py-0">
                              <Shield className="h-2.5 w-2.5 mr-0.5" /> Guardian
                            </Badge>
                          )}
                          {hasB && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              <Users className="h-2.5 w-2.5 mr-0.5" /> Steward
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}
