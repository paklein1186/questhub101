import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, TrendingUp, AlertTriangle, Users, Star, Clock } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface Props {
  agent: any;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(200, 70%, 50%)",
  "hsl(142, 70%, 45%)",
  "hsl(25, 80%, 50%)",
  "hsl(0, 65%, 50%)",
];

export default function AgentTrustTab({ agent }: Props) {
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

  if (!trustScore) {
    return (
      <div className="text-center py-12">
        <Shield className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Trust score not yet computed.</p>
        <p className="text-xs text-muted-foreground mt-1">Trust scores are computed after the first agent actions.</p>
      </div>
    );
  }

  const components = [
    { name: "Owner Trust", value: Number(trustScore.owner_trust) * 0.25, raw: Number(trustScore.owner_trust), weight: "25%" },
    { name: "History Score", value: Number(trustScore.history_score) * 0.25, raw: Number(trustScore.history_score), weight: "25%" },
    { name: "Guild Endorsements", value: Number(trustScore.guild_endorsements) * 0.20, raw: Number(trustScore.guild_endorsements), weight: "20%" },
    { name: "XP Level", value: Number(trustScore.xp_level) * 0.15, raw: Number(trustScore.xp_level), weight: "15%" },
    { name: "Penalties", value: Number(trustScore.penalties) * 0.15, raw: Number(trustScore.penalties), weight: "15%" },
  ];

  const total = Number(trustScore.total_score);

  const pieData = components.filter(c => c.value > 0).map(c => ({ name: c.name, value: c.value }));

  return (
    <div className="space-y-6">
      {/* Score Hero */}
      <Card className="border-primary/20">
        <CardContent className="p-6 flex items-center gap-6">
          <div className="h-[140px] w-[140px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={2}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p className="text-4xl font-bold text-primary">{total.toFixed(0)}</p>
            <p className="text-sm text-muted-foreground">/ 100 Trust Score</p>
            <p className="text-xs text-muted-foreground mt-2">
              Last computed: {trustScore.computed_at ? new Date(trustScore.computed_at).toLocaleDateString() : "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Component Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Score Components</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {components.map((c, i) => (
              <div key={c.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                    <span>{c.name}</span>
                    <Badge variant="secondary" className="text-[9px]">{c.weight}</Badge>
                  </div>
                  <span className="font-medium">{c.raw.toFixed(1)} → {c.value.toFixed(1)} pts</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, c.raw)}%`, background: COLORS[i] }} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Formula */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Trust Formula</CardTitle>
        </CardHeader>
        <CardContent>
          <code className="text-xs bg-muted px-2 py-1 rounded block">
            trust = 0.25 × owner_trust + 0.25 × history_score + 0.20 × guild_endorsements + 0.15 × xp_level − 0.15 × penalties
          </code>
          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
            <p>• <strong>Owner Trust:</strong> Derived from the agent creator's platform trust score</p>
            <p>• <strong>History Score:</strong> Clean actions / total actions ratio × 100</p>
            <p>• <strong>Guild Endorsements:</strong> Number of guild approvals (capped at 100)</p>
            <p>• <strong>XP Level:</strong> Agent experience points from successful actions</p>
            <p>• <strong>Penalties:</strong> Deducted for violations, errors, or complaints</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
