import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Rocket, Star, Sparkles, ShieldCheck, Eye,
  Megaphone, GraduationCap, Store, Percent, Bot, Zap, ArrowRight,
} from "lucide-react";
import { CurrencyIcon } from "@/components/CurrencyIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/PageShell";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { CREDIT_COSTS } from "@/lib/xpCreditsConfig";

interface ShopItem {
  label: string;
  cost: number;
  description: string;
  icon: React.ReactNode;
  category: "capacity" | "visibility" | "utility";
  action?: string; // future: inline spend
}

const SHOP_ITEMS: ShopItem[] = [
  {
    label: "Create an extra quest",
    cost: CREDIT_COSTS.EXTRA_QUEST_CREATION,
    description: "Exceed your plan's quest limit with a one-time credit spend.",
    icon: <Rocket className="h-5 w-5" />,
    category: "capacity",
  },
  {
    label: "Open an extra pod",
    cost: CREDIT_COSTS.EXTRA_POD_CREATION,
    description: "Spin up an additional pod beyond your plan allowance.",
    icon: <Store className="h-5 w-5" />,
    category: "capacity",
  },
  {
    label: "Boost quest visibility",
    cost: CREDIT_COSTS.BOOST_QUEST_VISIBILITY,
    description: "Push your quest higher in Explore and search results for 7 days.",
    icon: <Eye className="h-5 w-5" />,
    category: "visibility",
  },
  {
    label: "Boost service visibility",
    cost: CREDIT_COSTS.BOOST_SERVICE_VISIBILITY,
    description: "Increase your service's ranking in the marketplace for 7 days.",
    icon: <Megaphone className="h-5 w-5" />,
    category: "visibility",
  },
  {
    label: "Feature quest for 7 days",
    cost: CREDIT_COSTS.FEATURE_QUEST_7D,
    description: "Pin your quest to the Featured section on the Explore page.",
    icon: <Star className="h-5 w-5" />,
    category: "visibility",
  },
  {
    label: "Boost guild in Explore",
    cost: CREDIT_COSTS.BOOST_GUILD_EXPLORE,
    description: "Highlight your guild for increased discoverability.",
    icon: <ShieldCheck className="h-5 w-5" />,
    category: "visibility",
  },
  {
    label: "Boost course visibility",
    cost: CREDIT_COSTS.BOOST_COURSE,
    description: "Promote your course in the learning hub.",
    icon: <GraduationCap className="h-5 w-5" />,
    category: "visibility",
  },
  {
    label: "AI Pro session",
    cost: CREDIT_COSTS.ENABLE_AI_PRO_SESSION,
    description: "Unlock an advanced AI assistant session with extended context.",
    icon: <Bot className="h-5 w-5" />,
    category: "utility",
  },
  {
    label: "Reduce commission by 1%",
    cost: CREDIT_COSTS.REDUCE_COMMISSION_BY_1_PERCENT,
    description: "Permanently lower the platform fee on your next booking or service sale.",
    icon: <Percent className="h-5 w-5" />,
    category: "utility",
  },
];

const CATEGORIES = [
  { key: "capacity" as const, label: "⚡ Extra Capacity", description: "Go beyond your plan limits" },
  { key: "visibility" as const, label: "📣 Visibility Boosts", description: "Get noticed in Explore & search" },
  { key: "utility" as const, label: "🛠 Utility & Tools", description: "Unlock special features" },
];

export default function CreditShopPage() {
  const { userCredits } = usePlanLimits();

  return (
    <PageShell>
      <div className="max-w-3xl mx-auto space-y-6 pb-16">
        {/* Back link */}
        <Link
          to="/me"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Me
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h1 className="font-display text-2xl font-bold flex items-center justify-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> Credit Shop
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Spend your Credits on boosts, extra capacity, and platform tools.
          </p>

          {/* Balance */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <Badge variant="outline" className="text-base px-4 py-1.5 gap-2 font-semibold">
              <CurrencyIcon currency="credits" className="h-4 w-4" />
              {userCredits.toLocaleString()} Credits
            </Badge>
            <Link to="/me/credits">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Zap className="h-3.5 w-3.5" /> Top Up
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Categories */}
        {CATEGORIES.map((cat, catIdx) => {
          const items = SHOP_ITEMS.filter((i) => i.category === cat.key);
          return (
            <motion.div
              key={cat.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: catIdx * 0.08 }}
              className="space-y-3"
            >
              <div>
                <h2 className="font-display font-semibold text-lg">{cat.label}</h2>
                <p className="text-xs text-muted-foreground">{cat.description}</p>
              </div>

              <div className="grid gap-2">
                {items.map((item) => {
                  const canAfford = userCredits >= item.cost;
                  return (
                    <div
                      key={item.label}
                      className={`flex items-center gap-4 rounded-xl border px-4 py-3 transition-colors ${
                        canAfford
                          ? "border-border bg-card hover:bg-muted/40"
                          : "border-border/50 bg-card/50 opacity-60"
                      }`}
                    >
                      <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{item.label}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {item.description}
                        </p>
                      </div>
                      <Badge
                        variant={canAfford ? "default" : "secondary"}
                        className="text-xs font-mono shrink-0"
                      >
                        {item.cost} cr
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}

        {/* How to earn */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-border bg-muted/30 p-5 space-y-3"
        >
          <h3 className="font-display font-semibold text-sm flex items-center gap-2">
            <CurrencyIcon currency="credits" className="h-4 w-4" /> How to get Credits
          </h3>
          <div className="grid sm:grid-cols-3 gap-3 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <ArrowRight className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
              <span>
                <strong className="text-foreground">Buy with €</strong> — Instant Stripe
                purchase from the{" "}
                <Link to="/me/credits" className="text-primary hover:underline">
                  Top Up page
                </Link>
                .
              </span>
            </div>
            <div className="flex items-start gap-2">
              <ArrowRight className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
              <span>
                <strong className="text-foreground">Exchange $CTG</strong> — Convert
                contribution tokens earned through quests. No payment needed.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <ArrowRight className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
              <span>
                <strong className="text-foreground">Level up</strong> — Earn bonus credits
                at XP Level 5 (+50) and Level 10 (+150).
              </span>
            </div>
          </div>
        </motion.div>

        {/* Disclaimer */}
        <p className="text-[11px] text-muted-foreground text-center">
          Credits are non-refundable. Subject to 1%/month demurrage. Spending is
          triggered inline when you perform the action (e.g. creating an extra quest).
        </p>
      </div>
    </PageShell>
  );
}
