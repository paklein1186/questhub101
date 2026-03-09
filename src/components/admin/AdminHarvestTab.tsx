import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Sprout, Plus, Loader2 } from "lucide-react";
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
      qc.invalidateQueries({ queryKey: ["admin-harvest-windows"] });
      qc.invalidateQueries({ queryKey: ["harvest-window-active"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("harvest_windows" as any).update({ is_active: !current } as any).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-harvest-windows"] });
    qc.invalidateQueries({ queryKey: ["harvest-window-active"] });
    toast.success(`Window ${!current ? "activated" : "deactivated"}`);
  };

  const now = new Date();

  return (
    <div className="space-y-6">
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
              <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder='e.g. "Spring Harvest 🌾"' />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Multiplier: {form.multiplier}×</Label>
              <Slider
                value={[form.multiplier]}
                onValueChange={([v]) => setForm({ ...form, multiplier: Math.round(v * 10) / 10 })}
                min={1.2}
                max={2}
                step={0.1}
                className="mt-2"
              />
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
                    <TableHead>Label</TableHead>
                    <TableHead className="text-right">Multiplier</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {windows.map((w: any) => {
                    const isLive = w.is_active && new Date(w.starts_at) <= now && new Date(w.ends_at) >= now;
                    return (
                      <TableRow key={w.id}>
                        <TableCell className="font-medium text-sm">{w.label}</TableCell>
                        <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">{w.multiplier}×</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(w.starts_at), "dd/MM/yy HH:mm")} → {format(new Date(w.ends_at), "dd/MM/yy HH:mm")}
                        </TableCell>
                        <TableCell>
                          {isLive ? (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 text-[10px]">🌾 LIVE</Badge>
                          ) : new Date(w.ends_at) < now ? (
                            <Badge variant="secondary" className="text-[10px]">Ended</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">Scheduled</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch checked={w.is_active} onCheckedChange={() => toggleActive(w.id, w.is_active)} />
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
