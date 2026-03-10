import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Banknote, Send, DollarSign } from "lucide-react";
import { OCUFeatureGate } from "./OCUFeatureGate";

interface ContributorSummary {
  user_id: string;
  name: string;
  avatar_url: string | null;
  total_fmv: number;
  total_compensated: number;
  remaining: number;
  pct_compensated: number;
  pie_pct: number;
}

interface Props {
  quest: any;
  isAdmin: boolean;
  onEnableOCU?: () => void;
}

export function DistributeCompensation({ quest, isAdmin, onEnableOCU }: Props) {
  const currentUser = useCurrentUser();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [mode, setMode] = useState<"proportional" | "individual">("proportional");
  const [totalAmount, setTotalAmount] = useState("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [individualAmount, setIndividualAmount] = useState("");
  const [compensationMode, setCompensationMode] = useState<"coins" | "fiat" | "mixed">("coins");
  const [currency, setCurrency] = useState("EUR");
  const [note, setNote] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [externalDialogOpen, setExternalDialogOpen] = useState(false);
  const [externalContributionId, setExternalContributionId] = useState<string | null>(null);
  const [externalAmount, setExternalAmount] = useState("");
  const [externalNote, setExternalNote] = useState("");

  const { data: contributors = [] } = useQuery<ContributorSummary[]>({
    queryKey: ["compensation-summary", quest.id],
    queryFn: async () => {
      const { data: logs } = await supabase
        .from("contribution_logs" as any)
        .select("user_id, fmv_value, coins_compensated")
        .eq("quest_id", quest.id)
        .eq("status", "verified");

      if (!logs || logs.length === 0) return [];

      const byUser = new Map<string, { total_fmv: number; total_compensated: number }>();
      for (const l of logs as any[]) {
        const prev = byUser.get(l.user_id) ?? { total_fmv: 0, total_compensated: 0 };
        prev.total_fmv += l.fmv_value ?? 0;
        prev.total_compensated += l.coins_compensated ?? 0;
        byUser.set(l.user_id, prev);
      }

      const totalFmv = Array.from(byUser.values()).reduce((s, v) => s + v.total_fmv, 0);
      const userIds = Array.from(byUser.keys());

      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

      return userIds.map((uid) => {
        const v = byUser.get(uid)!;
        const p = profileMap.get(uid);
        return {
          user_id: uid,
          name: p?.name ?? "Unknown",
          avatar_url: p?.avatar_url ?? null,
          total_fmv: v.total_fmv,
          total_compensated: v.total_compensated,
          remaining: Math.max(0, v.total_fmv - v.total_compensated),
          pct_compensated: v.total_fmv > 0 ? Math.round((v.total_compensated / v.total_fmv) * 100) : 0,
          pie_pct: totalFmv > 0 ? (v.total_fmv / totalFmv) * 100 : 0,
        };
      }).sort((a, b) => b.total_fmv - a.total_fmv);
    },
  });

  const totalRemaining = contributors.reduce((s, c) => s + c.remaining, 0);

  const getDistributionPreview = () => {
    if (mode === "proportional") {
      const amt = parseFloat(totalAmount) || 0;
      if (amt <= 0) return [];
      return contributors
        .filter((c) => c.remaining > 0)
        .map((c) => {
          const totalRem = contributors.reduce((s, x) => s + x.remaining, 0);
          const share = totalRem > 0 ? c.remaining / totalRem : 0;
          return { ...c, distribution: Math.round(amt * share * 100) / 100 };
        });
    } else {
      const amt = parseFloat(individualAmount) || 0;
      const c = contributors.find((x) => x.user_id === selectedUser);
      if (!c || amt <= 0) return [];
      return [{ ...c, distribution: amt }];
    }
  };

  const handleDistribute = async () => {
    setSubmitting(true);
    try {
      const preview = getDistributionPreview();
      for (const entry of preview) {
        // Write compensation record
        await supabase.from("contribution_compensations" as any).insert({
          contribution_id: quest.id, // use quest_id as grouping key
          quest_id: quest.id,
          user_id: entry.user_id,
          amount_coins: compensationMode === "fiat" ? 0 : entry.distribution,
          amount_fiat: compensationMode === "coins" ? null : entry.distribution,
          compensation_mode: compensationMode,
          currency,
          note: note || null,
          compensated_by: currentUser.id,
        });

        // Update contribution_logs for this user+quest
        const { data: userLogs } = await supabase
          .from("contribution_logs" as any)
          .select("id, fmv_value, coins_compensated")
          .eq("quest_id", quest.id)
          .eq("user_id", entry.user_id)
          .eq("status", "verified");

        let remaining = entry.distribution;
        for (const log of (userLogs ?? []) as any[]) {
          if (remaining <= 0) break;
          const logRemaining = (log.fmv_value ?? 0) - (log.coins_compensated ?? 0);
          if (logRemaining <= 0) continue;
          const apply = Math.min(remaining, logRemaining);
          const newCompensated = (log.coins_compensated ?? 0) + apply;
          const newStatus = newCompensated >= (log.fmv_value ?? 0) ? "compensated" : "partial";
          await supabase
            .from("contribution_logs" as any)
            .update({
              coins_compensated: newCompensated,
              compensation_status: newStatus,
            })
            .eq("id", log.id);
          remaining -= apply;
        }
      }

      toast({ title: "Compensation distributed", description: `${preview.length} contributor(s) compensated.` });
      qc.invalidateQueries({ queryKey: ["compensation-summary", quest.id] });
      qc.invalidateQueries({ queryKey: ["contribution-logs"] });
      setConfirmOpen(false);
      setTotalAmount("");
      setIndividualAmount("");
      setNote("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkExternalPaid = async () => {
    if (!externalContributionId) return;
    setSubmitting(true);
    try {
      const amt = parseFloat(externalAmount) || 0;
      await supabase.from("contribution_compensations" as any).insert({
        contribution_id: externalContributionId,
        quest_id: quest.id,
        user_id: contributors.find((c) => c.user_id)?.user_id ?? currentUser.id,
        amount_coins: 0,
        amount_fiat: amt,
        compensation_mode: "fiat",
        currency: "EUR",
        note: externalNote || "Paid externally",
        compensated_by: currentUser.id,
      });

      // Update the specific log
      const { data: log } = await supabase
        .from("contribution_logs" as any)
        .select("fmv_value, coins_compensated")
        .eq("id", externalContributionId)
        .single();

      if (log) {
        const newComp = ((log as any).coins_compensated ?? 0) + amt;
        const newStatus = newComp >= ((log as any).fmv_value ?? 0) ? "compensated" : "partial";
        await supabase
          .from("contribution_logs" as any)
          .update({ coins_compensated: newComp, compensation_status: newStatus })
          .eq("id", externalContributionId);
      }

      toast({ title: "Marked as paid externally" });
      qc.invalidateQueries({ queryKey: ["compensation-summary", quest.id] });
      qc.invalidateQueries({ queryKey: ["contribution-logs"] });
      setExternalDialogOpen(false);
      setExternalAmount("");
      setExternalNote("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdmin) return null;

  const preview = getDistributionPreview();

  return (
    <OCUFeatureGate quest={quest} isAdmin={isAdmin} onEnable={onEnableOCU}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-sm flex items-center gap-1.5">
            <Banknote className="h-4 w-4" /> Distribute Compensation
          </h3>
          <Badge variant="outline" className="text-[10px]">
            🟡 {totalRemaining.toFixed(0)} outstanding
          </Badge>
        </div>

        {contributors.length === 0 ? (
          <p className="text-sm text-muted-foreground">No verified contributions to compensate yet.</p>
        ) : (
          <>
            {/* Contributor table */}
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left p-2 font-medium">Contributor</th>
                    <th className="text-right p-2 font-medium">FMV 🟡</th>
                    <th className="text-right p-2 font-medium">Paid</th>
                    <th className="text-right p-2 font-medium">Remaining</th>
                    <th className="p-2 font-medium w-24">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {contributors.map((c) => (
                    <tr key={c.user_id} className="border-b border-border last:border-0">
                      <td className="p-2">
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={c.avatar_url ?? undefined} />
                            <AvatarFallback className="text-[8px]">{c.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{c.name}</span>
                        </div>
                      </td>
                      <td className="p-2 text-right text-primary font-medium">{c.total_fmv.toFixed(0)}</td>
                      <td className="p-2 text-right text-emerald-600">{c.total_compensated.toFixed(0)}</td>
                      <td className="p-2 text-right text-amber-600">{c.remaining.toFixed(0)}</td>
                      <td className="p-2">
                        <Progress value={c.pct_compensated} className="h-1.5" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Distribution controls */}
            <div className="space-y-3 rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                <Label className="text-xs">Mode:</Label>
                <div className="flex gap-2">
                  <Button
                    variant={mode === "proportional" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setMode("proportional")}
                  >
                    Proportional
                  </Button>
                  <Button
                    variant={mode === "individual" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setMode("individual")}
                  >
                    Individual
                  </Button>
                </div>
              </div>

              {mode === "proportional" ? (
                <div className="flex items-center gap-2">
                  <Label className="text-xs whitespace-nowrap">Total amount:</Label>
                  <Input
                    type="number"
                    min={0}
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    placeholder="e.g. 1000"
                    className="h-8 w-32 text-xs"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger className="h-8 w-40 text-xs">
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {contributors.map((c) => (
                        <SelectItem key={c.user_id} value={c.user_id} className="text-xs">
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={0}
                    value={individualAmount}
                    onChange={(e) => setIndividualAmount(e.target.value)}
                    placeholder="Amount"
                    className="h-8 w-28 text-xs"
                  />
                </div>
              )}

              <div className="flex items-center gap-3 flex-wrap">
                <Select value={compensationMode} onValueChange={(v) => setCompensationMode(v as any)}>
                  <SelectTrigger className="h-8 w-36 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coins" className="text-xs">🟡 Coins (platform)</SelectItem>
                    <SelectItem value="fiat" className="text-xs">💶 Fiat (external)</SelectItem>
                    <SelectItem value="mixed" className="text-xs">Mixed</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Note (e.g. Grant tranche 1)"
                  className="h-8 flex-1 text-xs"
                />
              </div>

              {/* Preview */}
              {preview.length > 0 && (
                <div className="rounded bg-muted/50 p-2 space-y-1">
                  <p className="text-[10px] text-muted-foreground font-medium">Preview:</p>
                  {preview.map((p) => (
                    <div key={p.user_id} className="flex justify-between text-xs">
                      <span>{p.name}</span>
                      <span className="font-medium text-primary">🟡 {p.distribution.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              )}

              <Button
                size="sm"
                className="h-8 text-xs gap-1"
                disabled={preview.length === 0 || submitting}
                onClick={() => setConfirmOpen(true)}
              >
                <Send className="h-3 w-3" /> Distribute
              </Button>
            </div>
          </>
        )}

        {/* Confirm Dialog */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-sm">Confirm Distribution</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {preview.map((p) => (
                <div key={p.user_id} className="flex justify-between text-sm">
                  <span>{p.name}</span>
                  <span className="font-medium">🟡 {p.distribution.toFixed(0)}</span>
                </div>
              ))}
              {note && <p className="text-xs text-muted-foreground">Note: {note}</p>}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setConfirmOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button size="sm" onClick={handleDistribute} disabled={submitting} className="flex-1">
                  {submitting ? "Processing…" : "Confirm"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* External payment dialog */}
        <Dialog open={externalDialogOpen} onOpenChange={setExternalDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-sm">Mark as Paid Externally</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Fiat amount (€)</Label>
                <Input
                  type="number"
                  min={0}
                  value={externalAmount}
                  onChange={(e) => setExternalAmount(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Note (e.g. bank transfer ref)</Label>
                <Textarea
                  value={externalNote}
                  onChange={(e) => setExternalNote(e.target.value)}
                  className="text-xs mt-1"
                  rows={2}
                />
              </div>
              <Button size="sm" onClick={handleMarkExternalPaid} disabled={submitting} className="w-full">
                {submitting ? "Saving…" : "Confirm External Payment"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </OCUFeatureGate>
  );
}
