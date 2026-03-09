import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Sprout, Plus, Loader2, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export function AdminHarvestTab() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    label: "",
    multiplier: 1.5,
    starts_at: new Date().toISOString().slice(0, 16),
    ends_at: "",
  });

  const { data: windows = [], isLoading } = useQuery({
    queryKey: ["admin-harvest-windows"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("harvest_windows" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const now = new Date();
  const activeWindow = windows.find(
    (w: any) => w.is_active && new Date(w.starts_at) <= now && new Date(w.ends_at) >= now
  );

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["admin-harvest-windows"] });
    qc.invalidateQueries({ queryKey: ["harvest-window-active"] });
  };

  const handleCreate = async () => {
    if (!form.label || !form.ends_at) {
      toast.error("Label and end date are required");
      return;
    }
    setCreating(true);
    try {
      const { error } = await supabase.from("harvest_windows" as any).insert({
        label: form.label,
        multiplier: form.multiplier,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: new Date(form.ends_at).toISOString(),
      } as any);
      if (error) throw error;
      toast.success("Harvest Window created!");
      setForm({ label: "", multiplier: 1.5, starts_at: new Date().toISOString().slice(0, 16), ends_at: "" });
      invalidateAll();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreating(false);
    }
  };

  const activateExclusive = async (id: string) => {
    // Deactivate all, then activate selected
    await supabase.from("harvest_windows" as any).update({ is_active: false } as any).neq("id", id);
    await supabase.from("harvest_windows" as any).update({ is_active: true } as any).eq("id", id);
    invalidateAll();
    toast.success("Window activated (others deactivated)");
  };

  const deactivate = async (id: string) => {
    await supabase.from("harvest_windows" as any).update({ is_active: false } as any).eq("id", id);
    invalidateAll();
    toast.success("Window deactivated");
  };

  const deleteWindow = async (id: string) => {
    await supabase.from("harvest_windows" as any).delete().eq("id", id);
    invalidateAll();
    toast.success("Window deleted");
  };

  return (
    <div className="space-y-6">
      {/* Live status banner */}
      {activeWindow ? (
        <div className="rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌾</span>
            <div>
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                Harvest in progress · {activeWindow.multiplier}× boost
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                {activeWindow.label} — ends {format(new Date(activeWindow.ends_at), "PPP p")}
              </p>
            </div>
          </div>
          <Badge className="bg-emerald-200 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200 text-xs">
            All $CTG emissions ×{activeWindow.multiplier}
          </Badge>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-muted/50 p-4 flex items-center gap-3">
          <span className="text-2xl opacity-40">🌾</span>
          <p className="text-sm text-muted-foreground">No active harvest window — $CTG emissions at standard rate</p>
        </div>
      )}

      {/* Create form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" /> Create Harvest Window
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Label *</Label>
              <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder='e.g. "Spring Sprint 2026"' />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Multiplier: {form.multiplier}×</Label>
              <Slider
                value={[form.multiplier]}
                onValueChange={([v]) => setForm({ ...form, multiplier: Math.round(v * 10) / 10 })}
                min={1}
                max={3}
                step={0.1}
                className="mt-2"
              />
              <p className="text-[11px] text-muted-foreground">
                {form.multiplier}× means contributors earn {Math.round((form.multiplier - 1) * 100)}% more 🌱 $CTG during this window
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Starts At</Label>
              <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Ends At *</Label>
              <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
            </div>
          </div>
          <Button onClick={handleCreate} disabled={creating} className="gap-1.5">
            {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sprout className="h-3.5 w-3.5" />}
            Create Window
          </Button>
        </CardContent>
      </Card>

      {/* Windows table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Harvest Windows ({windows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : windows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No harvest windows created yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Multiplier</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {windows.map((w: any) => {
                    const isLive = w.is_active && new Date(w.starts_at) <= now && new Date(w.ends_at) >= now;
                    const ended = new Date(w.ends_at) < now;
                    return (
                      <TableRow key={w.id}>
                        <TableCell className="font-medium text-sm">{w.label}</TableCell>
                        <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">{w.multiplier}×</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(w.starts_at), "dd/MM/yy HH:mm")}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(w.ends_at), "dd/MM/yy HH:mm")}
                        </TableCell>
                        <TableCell>
                          {isLive ? (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 text-[10px]">🌾 LIVE</Badge>
                          ) : ended ? (
                            <Badge variant="secondary" className="text-[10px]">Ended</Badge>
                          ) : w.is_active ? (
                            <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-600">Scheduled</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!ended && !w.is_active && (
                              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => activateExclusive(w.id)}>
                                <Zap className="h-3 w-3" /> Activate
                              </Button>
                            )}
                            {w.is_active && (
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => deactivate(w.id)}>
                                Deactivate
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => deleteWindow(w.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
