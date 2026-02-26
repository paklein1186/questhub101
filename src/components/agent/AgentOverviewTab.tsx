import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Bot, Shield, Zap, TrendingUp, Activity, Star, Copy, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { format } from "date-fns";

interface Props {
  agent: any;
  isOwner: boolean;
  isAdmin: boolean;
}

const TRUST_LEVELS = [
  { min: 0, max: 20, label: "Untrusted", color: "text-destructive" },
  { min: 20, max: 40, label: "Guest Agent", color: "text-orange-500" },
  { min: 40, max: 60, label: "Member Agent", color: "text-yellow-600" },
  { min: 60, max: 80, label: "Trusted Agent", color: "text-primary" },
  { min: 80, max: 100, label: "Autonomous", color: "text-emerald-500" },
];

function getTrustLevel(score: number) {
  return TRUST_LEVELS.find(l => score >= l.min && score < l.max) || TRUST_LEVELS[4];
}

export default function AgentOverviewTab({ agent, isOwner, isAdmin }: Props) {
  const { data: trustScore } = useQuery({
    queryKey: ["agent-trust-score", agent.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("agent_trust_scores" as any)
        .select("*")
        .eq("agent_id", agent.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: ownerProfile } = useQuery({
    queryKey: ["agent-owner-profile", agent.creator_user_id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles_public").select("user_id, name, avatar_url").eq("user_id", agent.creator_user_id).single();
      return data;
    },
  });

  const { data: recentUsage } = useQuery({
    queryKey: ["agent-recent-usage", agent.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("agent_usage_records" as any)
        .select("*, monetized_action_types(code, label)")
        .eq("agent_id", agent.id)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const trust = trustScore ? Number(trustScore.total_score) : 50;
  const level = getTrustLevel(trust);

  return (
    <div className="space-y-6">
      {/* Agent Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              {agent.avatar_url ? (
                <img src={agent.avatar_url} className="h-20 w-20 rounded-2xl object-cover" />
              ) : (
                <Bot className="h-10 w-10 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">{agent.name}</h1>
                {agent.is_featured && <Star className="h-5 w-5 text-amber-500 fill-amber-500" />}
                <Badge variant={agent.is_published ? "default" : "secondary"}>
                  {agent.is_published ? "Published" : "Draft"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{agent.description}</p>

              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <Badge variant="outline">{agent.category}</Badge>
                {agent.skills?.map((s: string) => (
                  <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                ))}
              </div>

              {/* Owner */}
              <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                <span>Owner:</span>
                {ownerProfile && (
                  <Link to={`/users/${ownerProfile.user_id}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={ownerProfile.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[8px]">{ownerProfile.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <span>{ownerProfile.name}</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Shield className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className={`text-2xl font-bold ${level.color}`}>{trust.toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground">Trust Score — {level.label}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Zap className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{agent.cost_per_use}</p>
            <p className="text-[10px] text-muted-foreground">Credits / Action</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Activity className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{agent.usage_count}</p>
            <p className="text-[10px] text-muted-foreground">Total Interactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{trustScore ? Number(trustScore.xp_level).toFixed(0) : 0}</p>
            <p className="text-[10px] text-muted-foreground">XP Level</p>
          </CardContent>
        </Card>
      </div>

      {/* Trust Score Breakdown */}
      {trustScore && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Trust Score Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { label: "Owner Trust (25%)", value: Number(trustScore.owner_trust), max: 100 },
                { label: "History Score (25%)", value: Number(trustScore.history_score), max: 100 },
                { label: "Guild Endorsements (20%)", value: Number(trustScore.guild_endorsements), max: 100 },
                { label: "XP Level (15%)", value: Number(trustScore.xp_level), max: 100 },
                { label: "Penalties (15%)", value: Number(trustScore.penalties), max: 100, inverted: true },
              ].map((item) => (
                <div key={item.label} className="space-y-0.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium">{item.value.toFixed(1)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${item.inverted ? "bg-destructive" : "bg-primary"}`}
                      style={{ width: `${Math.min(100, (item.value / item.max) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recent Actions</CardTitle>
        </CardHeader>
        <CardContent>
          {!recentUsage?.length ? (
            <p className="text-xs text-muted-foreground">No recent actions.</p>
          ) : (
            <div className="space-y-2">
              {recentUsage.map((u: any) => (
                <div key={u.id} className="flex items-center justify-between text-xs border-b border-border/50 pb-2 last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{u.monetized_action_types?.code || "action"}</Badge>
                    {u.resource_type && <span className="text-muted-foreground">{u.resource_type}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{Number(u.final_price).toFixed(1)} credits</span>
                    <span className="text-muted-foreground">{format(new Date(u.created_at), "dd/MM HH:mm")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
