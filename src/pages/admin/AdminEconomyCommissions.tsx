import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculateCommission, COMMISSION_FLOOR, type CommissionRule } from "@/lib/commissionCalc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TrendingDown, Plus, Pencil, Trash2, Calculator, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminEconomyCommissions() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["admin-commission-rules"],
    queryFn: async () => {
      const { data } = await supabase
        .from("commission_rules" as any)
        .select("*")
        .order("sort_order") as any;
      return (data ?? []) as CommissionRule[];
    },
  });

  // Plan discounts
  const { data: plans = [] } = useQuery({
    queryKey: ["admin-plans-commission"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscription_plans")
        .select("id, code, name, commission_discount_percentage")
        .order("monthly_price_amount") as any;
      return data ?? [];
    },
  });

  // Edit/Add dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editMin, setEditMin] = useState("0");
  const [editMax, setEditMax] = useState("");
  const [editPct, setEditPct] = useState("10");
  const [editDesc, setEditDesc] = useState("");
  const [editOrder, setEditOrder] = useState("0");
  const [saving, setSaving] = useState(false);

  // Calculator state
  const [calcAmount, setCalcAmount] = useState("1000");
  const [calcPlan, setCalcPlan] = useState("FREE");

  const openAdd = () => {
    setEditId(null); setEditMin("0"); setEditMax(""); setEditPct("10"); setEditDesc(""); setEditOrder(String(rules.length + 1)); setEditOpen(true);
  };

  const openEdit = (r: CommissionRule) => {
    setEditId(r.id); setEditMin(String(r.min_amount)); setEditMax(r.max_amount != null ? String(r.max_amount) : ""); setEditPct(String(r.commission_percentage)); setEditDesc(r.description ?? ""); setEditOrder(String(r.sort_order)); setEditOpen(true);
  };

  const saveRule = async () => {
    setSaving(true);
    const payload = {
      min_amount: Number(editMin) || 0,
      max_amount: editMax ? Number(editMax) : null,
      commission_percentage: Number(editPct) || 10,
      description: editDesc || null,
      sort_order: Number(editOrder) || 0,
    };
    if (editId) {
      await (supabase.from("commission_rules" as any) as any).update(payload).eq("id", editId);
    } else {
      await (supabase.from("commission_rules" as any) as any).insert(payload);
    }
    qc.invalidateQueries({ queryKey: ["admin-commission-rules"] });
    setSaving(false); setEditOpen(false);
    toast({ title: editId ? "Rule updated" : "Rule added" });
  };

  const toggleActive = async (r: CommissionRule) => {
    await (supabase.from("commission_rules" as any) as any).update({ is_active: !r.is_active }).eq("id", r.id);
    qc.invalidateQueries({ queryKey: ["admin-commission-rules"] });
  };

  const deleteRule = async (id: string) => {
    await (supabase.from("commission_rules" as any) as any).delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-commission-rules"] });
    toast({ title: "Rule deleted" });
  };

  const savePlanDiscount = async (planId: string, discount: number) => {
    await supabase.from("subscription_plans").update({ commission_discount_percentage: discount } as any).eq("id", planId);
    qc.invalidateQueries({ queryKey: ["admin-plans-commission"] });
    toast({ title: "Plan discount updated" });
  };

  // Calculator
  const selectedPlan = plans.find((p: any) => p.code === calcPlan);
  const calcResult = calculateCommission({
    amount: Number(calcAmount) || 0,
    rules: rules.filter(r => r.is_active),
    planDiscountPercent: (selectedPlan as any)?.commission_discount_percentage ?? 0,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold flex items-center gap-2">
          <TrendingDown className="h-6 w-6 text-primary" /> Commission Rules
        </h2>
        <Button onClick={openAdd} size="sm"><Plus className="h-4 w-4 mr-1" /> Add Tier</Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Degressive commission tiers applied to mission payments. Floor: {COMMISSION_FLOOR}% minimum.
      </p>

      {/* Rules table */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Range (€)</th>
                <th className="text-left p-3 font-medium">Commission %</th>
                <th className="text-left p-3 font-medium">Description</th>
                <th className="text-center p-3 font-medium">Active</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3">€{r.min_amount.toLocaleString()} – {r.max_amount != null ? `€${r.max_amount.toLocaleString()}` : "∞"}</td>
                  <td className="p-3"><Badge variant="secondary" className="font-mono">{r.commission_percentage}%</Badge></td>
                  <td className="p-3 text-muted-foreground">{r.description || "—"}</td>
                  <td className="p-3 text-center"><Switch checked={r.is_active} onCheckedChange={() => toggleActive(r)} /></td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteRule(r.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Plan-based discounts */}
      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-sm">Plan-Based Commission Discounts</h3>
        <p className="text-xs text-muted-foreground">Each plan can reduce the base commission by a percentage. E.g. 20% means base 7% → 5.6%.</p>
        <div className="space-y-2">
          {plans.map((p: any) => (
            <div key={p.id} className="flex items-center gap-3">
              <span className="w-24 font-medium text-sm">{p.name}</span>
              <Input
                type="number"
                className="w-24 text-sm"
                defaultValue={(p as any).commission_discount_percentage ?? 0}
                min={0}
                max={99}
                onBlur={(e) => savePlanDiscount(p.id, Number(e.target.value) || 0)}
              />
              <span className="text-xs text-muted-foreground">% discount</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Commission Calculator */}
      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" /> Commission Calculator
        </h3>
        <div className="flex items-center gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Mission Amount (€)</label>
            <Input type="number" value={calcAmount} onChange={e => setCalcAmount(e.target.value)} className="w-32" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Plan</label>
            <select value={calcPlan} onChange={e => setCalcPlan(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
              {plans.map((p: any) => <option key={p.code} value={p.code}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="rounded-md bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Base Rate</p><p className="font-bold">{calcResult.baseRate}%</p></div>
          <div className="rounded-md bg-muted/50 p-3"><p className="text-xs text-muted-foreground">After Plan</p><p className="font-bold">{calcResult.afterPlanDiscount}%</p></div>
          <div className="rounded-md bg-primary/5 p-3"><p className="text-xs text-muted-foreground">Final Rate</p><p className="font-bold text-primary">{calcResult.finalRate}%</p></div>
          <div className="rounded-md bg-primary/5 p-3"><p className="text-xs text-muted-foreground">Payout</p><p className="font-bold text-primary">€{calcResult.payoutAmount.toLocaleString()}</p></div>
        </div>
      </Card>

      {/* Edit/Add dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Edit" : "Add"} Commission Tier</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">Min Amount (€)</label><Input type="number" value={editMin} onChange={e => setEditMin(e.target.value)} min={0} /></div>
              <div><label className="text-sm font-medium">Max Amount (€, empty=∞)</label><Input type="number" value={editMax} onChange={e => setEditMax(e.target.value)} min={0} placeholder="Unlimited" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium">Commission %</label><Input type="number" value={editPct} onChange={e => setEditPct(e.target.value)} min={1} max={100} step={0.5} /></div>
              <div><label className="text-sm font-medium">Sort Order</label><Input type="number" value={editOrder} onChange={e => setEditOrder(e.target.value)} min={0} /></div>
            </div>
            <div><label className="text-sm font-medium">Description</label><Input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="e.g. Small missions" /></div>
            <Button onClick={saveRule} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              {editId ? "Update" : "Create"} Rule
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
