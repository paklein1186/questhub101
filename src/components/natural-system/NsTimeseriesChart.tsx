import { Card, CardContent } from "@/components/ui/card";
import { useRecentDataPoints } from "@/hooks/useNaturalSystemData";
import { cn } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

interface Props {
  naturalSystemId: string;
  metric: string;
  unit: string | null;
}

export function NsTimeseriesChart({ naturalSystemId, metric, unit }: Props) {
  const { data: points, isLoading } = useRecentDataPoints(naturalSystemId, metric, 30);

  const chartData = (points ?? [])
    .slice()
    .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
    .map((p) => ({
      time: new Date(p.recorded_at).getTime(),
      value: p.value,
      label: format(new Date(p.recorded_at), "MMM d"),
    }));

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <h4 className="text-xs font-semibold text-foreground capitalize">
          {metric.replace(/_/g, " ")}
          {unit && <span className="text-muted-foreground font-normal ml-1">({unit})</span>}
        </h4>
        {isLoading ? (
          <div className="h-32 rounded-lg bg-muted animate-pulse" />
        ) : chartData.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">
            No data in the last 30 days
          </div>
        ) : (
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  width={35}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 11,
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                  }}
                  labelFormatter={(v) => String(v)}
                  formatter={(v: number) => [`${v.toFixed(2)}${unit ? ` ${unit}` : ""}`, metric.replace(/_/g, " ")]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3, fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
