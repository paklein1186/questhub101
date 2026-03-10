import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Save, AlertCircle, DoorOpen } from "lucide-react";

interface Props {
  guild: any;
  guildId: string;
}

const DECISION_OPTIONS = [
  { value: "admin", label: "Guild admin alone" },
  { value: "vote", label: "Governance vote" },
  { value: "mediation_then_vote", label: "Mediation first, then vote" },
];

export function ExitProtocolSettings({ guild, guildId }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [goodPct, setGoodPct] = useState<number>((guild as any).exit_good_leaver_fmv_pct ?? 75);
  const [gracefulPct, setGracefulPct] = useState<number>((guild as any).exit_graceful_fmv_pct ?? 100);
  const [badPct, setBadPct] = useState<number>((guild as any).exit_bad_leaver_fmv_pct ?? 0);
  const [decision, setDecision] = useState<string>((guild as any).exit_bad_leaver_decision ?? "admin");
  const [threshold, setThreshold] = useState<number>((guild as any).abandonment_threshold_days ?? 60);

  const handleSave = async () => {
    await supabase.from("guilds").update({
      exit_good_leaver_fmv_pct: goodPct,
      exit_graceful_fmv_pct: gracefulPct,
      exit_bad_leaver_fmv_pct: badPct,
      exit_bad_leaver_decision: decision,
      abandonment_threshold_days: threshold,
    } as any).eq("id", guildId);
    qc.invalidateQueries({ queryKey: ["guild-settings", guildId] });
    toast({ title: "Exit protocol settings saved" });
  };

  const previewMatrix = [
    { type: "Voluntary (good leaver)", pct: `${goodPct}%`, decides: "Contributor initiates" },
    { type: "Graceful withdrawal", pct: `${gracefulPct}%`, decides: "Handover required" },
    { type: "Involuntary (for cause)", pct: `${badPct}%`, decides: DECISION_OPTIONS.find(o => o.value === decision)?.label ?? decision },
    { type: "Involuntary (no cause)", pct: `${goodPct}%`, decides: "Admin decision" },
    { type: "Abandonment", pct: `${badPct}%`, decides: `Auto-flagged after ${threshold} days` },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <DoorOpen className="h-5 w-5 text-primary" />
        <h3 className="font-display font-semibold text-base">Exit Protocol</h3>
      </div>

      <div className="space-y-4">
        {/* Good leaver */}
        <div>
          <Label className="text-sm font-medium mb-1 block">Good leaver settlement: {goodPct}%</Label>
          <p className="text-xs text-muted-foreground mb-2">
            A contributor who leaves voluntarily receives this % of their FMV.
          </p>
          <Slider
            value={[goodPct]}
            min={0}
            max={100}
            step={5}
            onValueChange={([v]) => setGoodPct(v)}
            className="max-w-xs"
          />
        </div>

        {/* Graceful */}
        <div>
          <Label className="text-sm font-medium mb-1 block">Graceful withdrawal settlement: {gracefulPct}%</Label>
          <p className="text-xs text-muted-foreground mb-2">
            A contributor who commits to a handover receives full FMV.
          </p>
          <Slider
            value={[gracefulPct]}
            min={0}
            max={100}
            step={5}
            onValueChange={([v]) => setGracefulPct(v)}
            className="max-w-xs"
          />
        </div>

        {/* Bad leaver */}
        <div>
          <Label className="text-sm font-medium mb-1 block">Bad leaver settlement: {badPct}%</Label>
          <p className="text-xs text-muted-foreground mb-2">
            A contributor removed for cause receives this % of their FMV.
          </p>
          <Slider
            value={[badPct]}
            min={0}
            max={100}
            step={5}
            onValueChange={([v]) => setBadPct(v)}
            className="max-w-xs"
          />
        </div>

        {/* Decision authority */}
        <div>
          <Label className="text-sm font-medium mb-1 block">Bad leaver decision authority</Label>
          <Select value={decision} onValueChange={setDecision}>
            <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DECISION_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Abandonment */}
        <div>
          <Label className="text-sm font-medium mb-1 block">Abandonment threshold (days)</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Auto-flag contributors with no approved contribution after this many days.
          </p>
          <Input
            type="number"
            min={7}
            max={365}
            value={threshold}
            onChange={(e) => setThreshold(parseInt(e.target.value) || 60)}
            className="max-w-[120px]"
          />
        </div>
      </div>

      {/* Preview matrix */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
          Exit type preview
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left p-2 font-medium">Exit type</th>
              <th className="text-center p-2 font-medium">Settlement</th>
              <th className="text-left p-2 font-medium">Who decides</th>
            </tr>
          </thead>
          <tbody>
            {previewMatrix.map((row, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="p-2 font-medium">{row.type}</td>
                <td className="p-2 text-center">
                  <Badge variant="outline" className="text-[10px]">{row.pct}</Badge>
                </td>
                <td className="p-2 text-muted-foreground">{row.decides}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button onClick={handleSave} className="gap-1.5">
        <Save className="h-4 w-4" /> Save Exit Protocol
      </Button>
    </div>
  );
}
