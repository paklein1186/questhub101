import { useQuestValuePie, type ValuePieEntry } from "@/hooks/useValuePie";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { PieChart as PieIcon } from "lucide-react";

const COLORS = [
  "hsl(142, 70%, 45%)", // emerald
  "hsl(200, 70%, 50%)", // sky
  "hsl(262, 60%, 55%)", // violet
  "hsl(25, 80%, 50%)",  // orange
  "hsl(340, 65%, 50%)", // rose
  "hsl(45, 80%, 50%)",  // amber
  "hsl(170, 60%, 40%)", // teal
  "hsl(300, 50%, 50%)", // fuchsia
];

interface Props {
  questId: string;
}

export function ValuePieChart({ questId }: Props) {
  const { data: entries = [], isLoading } = useQuestValuePie(questId);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading value pie…</p>;
  if (entries.length === 0) return null;

  const totalTokens = entries.reduce((s, e) => s + e.gameb_tokens_awarded, 0);

  const chartData = entries.map((e, i) => ({
    name: e.profile?.name || "Unknown",
    value: e.gameb_tokens_awarded,
    percent: e.share_percent * 100,
    fill: COLORS[i % COLORS.length],
  }));

  return (
    <Card className="border-emerald-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <PieIcon className="h-4 w-4 text-emerald-500" />
          🟩 Value Pie — GameB Token Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4">
          {/* Chart */}
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${percent.toFixed(1)}%)`}
                  labelLine={false}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value} tokens`, "GameB Tokens"]}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="space-y-1.5">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 text-[10px] text-muted-foreground font-medium border-b border-border pb-1">
              <span>Contributor</span>
              <span className="text-right">Units</span>
              <span className="text-right">Share</span>
              <span className="text-right">🟩 Tokens</span>
            </div>
            {entries.map((e, i) => (
              <div key={e.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={e.profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[8px]">{e.profile?.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <span className="truncate">{e.profile?.name}</span>
                </div>
                <span className="text-right text-muted-foreground">{e.weighted_units}</span>
                <Badge variant="outline" className="text-[10px] justify-end">{(e.share_percent * 100).toFixed(1)}%</Badge>
                <span className="text-right font-medium text-emerald-600">{e.gameb_tokens_awarded}</span>
              </div>
            ))}
            <div className="border-t border-border pt-1 flex justify-between text-xs font-medium">
              <span>Total</span>
              <span className="text-emerald-600">{totalTokens} 🟩 Tokens</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
