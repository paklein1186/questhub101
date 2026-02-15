import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Crown, ArrowRight, Shield, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const CLASS_A_MAILTO = "mailto:pa@changethegame.xyz?subject=Class%20A%20Membership%20Application";

export function ShareholderCTA() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile-coop", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("total_shares_a, total_shares_b, governance_weight, is_cooperative_member")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  if (!profile) return null;

  if (profile.is_cooperative_member) {
    const hasA = (profile.total_shares_a || 0) > 0;
    const hasB = (profile.total_shares_b || 0) > 0;

    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 0.3, y: 0 }}
        className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium">
              {hasA && <span>Class A: {profile.total_shares_a} shares</span>}
              {hasA && hasB && <span className="mx-1">·</span>}
              {hasB && <span>Class B: {profile.total_shares_b} shares</span>}
              <Badge variant="secondary" className="ml-2 text-[10px]">
                Weight: {Number(profile.governance_weight).toFixed(2)}
              </Badge>
            </p>
            {hasA && (
              <Badge variant="default" className="text-[10px] mt-1 mr-1">Strategic Member</Badge>
            )}
            {hasB && !hasA && (
              <Badge variant="secondary" className="text-[10px] mt-1">Community Member</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/governance">Governance <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/shares">Buy more Class B</Link>
          </Button>
          {!hasA && (
            <Button variant="outline" size="sm" asChild>
              <a href={CLASS_A_MAILTO}><Mail className="h-3.5 w-3.5 mr-1" /> Apply Class A</a>
            </Button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 0.3, y: 0 }}
      className="rounded-xl border border-border bg-card p-5 text-center space-y-3">
      <Crown className="h-8 w-8 text-primary mx-auto" />
      <h3 className="font-display font-semibold">Become a member of changethegame</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        Co-own the platform, vote on decisions, and shape the ecosystem's future.
      </p>
      <Button asChild>
        <Link to="/shares">Buy Class B Shares — From 10 € <ArrowRight className="ml-2 h-4 w-4" /></Link>
      </Button>
    </motion.div>
  );
}
