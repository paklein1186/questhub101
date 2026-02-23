import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Shield, RefreshCw, AlertTriangle, Clock, Check, X, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

interface TrustRenewalEdge {
  id: string;
  to_node_type: string;
  to_node_id: string;
  edge_type: string;
  score: number;
  tags: string[] | null;
  last_confirmed_at: string | null;
  renewal_notified_at: string | null;
  status: string;
  created_at: string;
  // resolved
  targetName?: string;
  targetAvatarUrl?: string | null;
}

export function TrustRenewalWidget() {
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [acting, setActing] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["trust-renewal-edges", currentUser.id],
    enabled: !!currentUser.id,
    queryFn: async () => {
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      // Fetch edges needing renewal (active, last_confirmed > 12 months ago)
      const { data: renewalEdges } = await supabase
        .from("trust_edges")
        .select("id, to_node_type, to_node_id, edge_type, score, tags, last_confirmed_at, renewal_notified_at, status, created_at")
        .eq("created_by", currentUser.id)
        .eq("status", "active")
        .lt("last_confirmed_at", twelveMonthsAgo.toISOString())
        .order("last_confirmed_at", { ascending: true })
        .limit(50);

      // Fetch outdated edges
      const { data: outdatedEdges } = await supabase
        .from("trust_edges")
        .select("id, to_node_type, to_node_id, edge_type, score, tags, last_confirmed_at, renewal_notified_at, status, created_at")
        .eq("created_by", currentUser.id)
        .eq("status", "outdated")
        .order("updated_at", { ascending: false })
        .limit(20);

      // Resolve target names
      const allEdges = [...(renewalEdges ?? []), ...(outdatedEdges ?? [])];
      const profileIds = allEdges.filter(e => e.to_node_type === "profile").map(e => e.to_node_id);
      const guildIds = allEdges.filter(e => e.to_node_type === "guild").map(e => e.to_node_id);
      const questIds = allEdges.filter(e => e.to_node_type === "quest").map(e => e.to_node_id);
      const serviceIds = allEdges.filter(e => e.to_node_type === "service").map(e => e.to_node_id);
      const companyIds = allEdges.filter(e => e.to_node_type === "partner_entity").map(e => e.to_node_id);

      const nameMap: Record<string, { name: string; avatar?: string | null }> = {};

      if (profileIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles_public").select("user_id, name, avatar_url").in("user_id", profileIds);
        for (const p of (profiles ?? []) as any[]) nameMap[p.user_id] = { name: p.name, avatar: p.avatar_url };
      }
      if (guildIds.length > 0) {
        const { data: guilds } = await supabase.from("guilds").select("id, name").in("id", guildIds);
        for (const g of (guilds ?? []) as any[]) nameMap[g.id] = { name: g.name };
      }
      if (questIds.length > 0) {
        const { data: quests } = await supabase.from("quests").select("id, title").in("id", questIds);
        for (const q of (quests ?? []) as any[]) nameMap[q.id] = { name: q.title };
      }
      if (serviceIds.length > 0) {
        const { data: services } = await supabase.from("services").select("id, title").in("id", serviceIds);
        for (const s of (services ?? []) as any[]) nameMap[s.id] = { name: s.title };
      }
      if (companyIds.length > 0) {
        const { data: companies } = await supabase.from("companies").select("id, name, logo_url").in("id", companyIds);
        for (const c of (companies ?? []) as any[]) nameMap[c.id] = { name: c.name, avatar: c.logo_url };
      }

      const enrich = (edges: any[]): TrustRenewalEdge[] =>
        edges.map(e => ({
          ...e,
          targetName: nameMap[e.to_node_id]?.name ?? "Unknown",
          targetAvatarUrl: nameMap[e.to_node_id]?.avatar ?? null,
        }));

      return {
        renewal: enrich(renewalEdges ?? []),
        outdated: enrich(outdatedEdges ?? []),
      };
    },
  });

  const handleRenew = async (edgeId: string) => {
    setActing(edgeId);
    const { data: result, error } = await supabase.rpc("process_trust_renewal", {
      p_edge_id: edgeId,
      p_user_id: currentUser.id,
    });
    setActing(null);
    if (error) {
      toast({ title: "Renewal failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Trust renewed!", description: `+2 credits earned. Your attestation for ${(result as any)?.target_name ?? "this entity"} is now fresh.` });
      qc.invalidateQueries({ queryKey: ["trust-renewal-edges"] });
    }
  };

  const handleRetract = async (edgeId: string) => {
    setActing(edgeId);
    await supabase
      .from("trust_edges")
      .update({ status: "retracted" as any, updated_at: new Date().toISOString() })
      .eq("id", edgeId);
    setActing(null);
    toast({ title: "Trust retracted" });
    qc.invalidateQueries({ queryKey: ["trust-renewal-edges"] });
  };

  const renewalCount = data?.renewal?.length ?? 0;
  const outdatedCount = data?.outdated?.length ?? 0;
  const totalCount = renewalCount + outdatedCount;

  if (!currentUser.id || isLoading || totalCount === 0) return null;

  return (
    <Card className="border-amber-200 dark:border-amber-800/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-amber-500" />
          Trust Attestation Renewals
          <Badge variant="secondary" className="text-[10px]">{totalCount}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Renewal-ready edges */}
        {renewalCount > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Ready for renewal ({renewalCount})
            </p>
            {data!.renewal.map((edge) => (
              <RenewalEdgeRow
                key={edge.id}
                edge={edge}
                acting={acting === edge.id}
                onRenew={() => handleRenew(edge.id)}
                onRetract={() => handleRetract(edge.id)}
                variant="renewal"
              />
            ))}
          </div>
        )}

        {/* Outdated edges */}
        {outdatedCount > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Outdated ({outdatedCount})
            </p>
            {data!.outdated.map((edge) => (
              <RenewalEdgeRow
                key={edge.id}
                edge={edge}
                acting={acting === edge.id}
                onRenew={() => handleRenew(edge.id)}
                onRetract={() => handleRetract(edge.id)}
                variant="outdated"
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RenewalEdgeRow({ edge, acting, onRenew, onRetract, variant }: {
  edge: TrustRenewalEdge;
  acting: boolean;
  onRenew: () => void;
  onRetract: () => void;
  variant: "renewal" | "outdated";
}) {
  const NODE_TYPE_LABELS: Record<string, string> = { profile: "User", guild: "Guild", quest: "Quest", service: "Service", partner_entity: "Organization" };

  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-lg border ${
      variant === "outdated" ? "border-destructive/20 bg-destructive/5" : "border-amber-200 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-900/10"
    }`}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={edge.targetAvatarUrl ?? undefined} />
        <AvatarFallback className="text-[10px]">{edge.targetName?.[0] ?? "?"}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{edge.targetName}</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
            {NODE_TYPE_LABELS[edge.to_node_type] ?? edge.to_node_type}
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {edge.score}★ · {edge.last_confirmed_at ? formatDistanceToNow(new Date(edge.last_confirmed_at), { addSuffix: true }) : "never confirmed"}
          </span>
          {(edge.tags ?? []).filter(t => !t.startsWith("__")).slice(0, 2).map(t => (
            <Badge key={t} variant="outline" className="text-[9px] px-1 py-0 h-3.5">{t}</Badge>
          ))}
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        <Button
          size="sm"
          className="h-7 text-xs"
          disabled={acting}
          onClick={onRenew}
        >
          {acting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-0.5" />}
          {variant === "outdated" ? "Reactivate" : "Renew"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          disabled={acting}
          onClick={onRetract}
        >
          <X className="h-3 w-3 mr-0.5" /> Retract
        </Button>
      </div>
    </div>
  );
}
