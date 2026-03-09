import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Pin, Clock, Sprout, Check, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Bounty {
  id: string;
  title: string;
  description: string | null;
  action_type: string;
  required_count: number;
  ctg_reward: number;
  total_slots: number;
  claimed_slots: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  created_at: string;
}

export function BountyBoard() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { toast } = useToast();
  const qc = useQueryClient();
  const [claiming, setClaiming] = useState<string | null>(null);

  const { data: bounties = [], isLoading } = useQuery({
    queryKey: ["ctg-bounties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ctg_bounties" as any)
        .select("*")
        .eq("is_active", true)
        .gt("ends_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).filter((b: any) => b.claimed_slots < b.total_slots) as unknown as Bounty[];
    },
  });

  const { data: myClaims = [] } = useQuery({
    queryKey: ["ctg-bounty-claims", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("ctg_bounty_claims" as any)
        .select("bounty_id, verified")
        .eq("user_id", userId!);
      return (data ?? []) as { bounty_id: string; verified: boolean }[];
    },
  });

  const claimedIds = new Set(myClaims.map((c) => c.bounty_id));

  const handleClaim = async (bounty: Bounty) => {
    if (!userId) {
      toast({ title: "Please sign in to claim bounties", variant: "destructive" });
      return;
    }
    setClaiming(bounty.id);
    try {
      const { error } = await supabase
        .from("ctg_bounty_claims" as any)
        .insert({ bounty_id: bounty.id, user_id: userId } as any);
      if (error) {
        if (error.code === "23505") {
          toast({ title: "Already claimed" });
        } else {
          throw error;
        }
      } else {
        // Increment claimed_slots
        await supabase
          .from("ctg_bounties" as any)
          .update({ claimed_slots: bounty.claimed_slots + 1 } as any)
          .eq("id", bounty.id);

        toast({ title: `Bounty claimed! 🌱 Pending verification for ${bounty.ctg_reward} $CTG` });
      }
      qc.invalidateQueries({ queryKey: ["ctg-bounties"] });
      qc.invalidateQueries({ queryKey: ["ctg-bounty-claims"] });
    } catch (e: any) {
      toast({ title: "Failed to claim bounty", description: e.message, variant: "destructive" });
    } finally {
      setClaiming(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (bounties.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-2">
        <Pin className="h-8 w-8 mx-auto text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground font-medium">No active bounties — check back soon!</p>
        <p className="text-xs text-muted-foreground">Bounties reward specific contributions with $CTG tokens.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Pin className="h-4 w-4 text-amber-600" />
        <h3 className="font-display text-sm font-semibold">Bounty Board</h3>
        <Badge variant="secondary" className="text-[10px]">{bounties.length} active</Badge>
      </div>

      {bounties.map((bounty) => {
        const isClaimed = claimedIds.has(bounty.id);
        const claim = myClaims.find((c) => c.bounty_id === bounty.id);
        const slotsLeft = bounty.total_slots - bounty.claimed_slots;
        const slotPercent = (bounty.claimed_slots / bounty.total_slots) * 100;
        const endsIn = formatDistanceToNow(new Date(bounty.ends_at), { addSuffix: true });

        return (
          <div
            key={bounty.id}
            className={`rounded-xl border overflow-hidden transition-all ${
              isClaimed
                ? "border-emerald-200 dark:border-emerald-800/40 opacity-75"
                : "border-amber-200/60 dark:border-amber-800/40 hover:shadow-md"
            }`}
          >
            {/* Header gradient */}
            <div className={`px-4 py-2.5 ${
              isClaimed
                ? "bg-emerald-50 dark:bg-emerald-950/30"
                : "bg-gradient-to-r from-amber-50 to-emerald-50 dark:from-amber-950/20 dark:to-emerald-950/20"
            }`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm">{isClaimed ? "✅" : "📌"}</span>
                  <h4 className="text-sm font-semibold truncate">{bounty.title}</h4>
                </div>
                <Badge
                  className="shrink-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700 shadow-[0_0_8px_rgba(16,185,129,0.15)]"
                >
                  <Sprout className="h-3 w-3 mr-1" />
                  {bounty.ctg_reward} $CTG
                </Badge>
              </div>
            </div>

            <div className="px-4 py-3 space-y-2.5 bg-card">
              {bounty.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">{bounty.description}</p>
              )}

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Ends {endsIn}
                </span>
                <span>{slotsLeft}/{bounty.total_slots} slots left</span>
              </div>

              <Progress value={slotPercent} className="h-1.5" />

              <div className="flex justify-end">
                {isClaimed ? (
                  <Badge variant="outline" className="text-xs text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700">
                    <Check className="h-3 w-3 mr-1" />
                    {claim?.verified ? "Verified ✓" : "Claimed — pending verification"}
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleClaim(bounty)}
                    disabled={!!claiming}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  >
                    {claiming === bounty.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sprout className="h-3.5 w-3.5" />
                    )}
                    Claim Bounty
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
