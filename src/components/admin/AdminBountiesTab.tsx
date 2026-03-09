import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Pin, Plus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export function AdminBountiesTab() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    action_type: "",
    required_count: 1,
    ctg_reward: 10,
    total_slots: 50,
    starts_at: new Date().toISOString().slice(0, 16),
    ends_at: "",
  });

  const { data: bounties = [], isLoading } = useQuery({
    queryKey: ["admin-ctg-bounties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ctg_bounties" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const handleCreate = async () => {
    if (!form.title || !form.action_type || !form.ends_at) {
      toast.error("Title, action type, and end date are required");
      return;
    }
    setCreating(true);
    try {
      const { error } = await supabase.from("ctg_bounties" as any).insert({
        title: form.title,
        description: form.description || null,
        action_type: form.action_type,
        required_count: form.required_count,
        ctg_reward: form.ctg_reward,
        total_slots: form.total_slots,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: new Date(form.ends_at).toISOString(),
      } as any);
      if (error) throw error;
      toast.success("Bounty created!");
      setForm({ title: "", description: "", action_type: "", required_count: 1, ctg_reward: 10, total_slots: 50, starts_at: new Date().toISOString().slice(0, 16), ends_at: "" });
      qc.invalidateQueries({ queryKey: ["admin-ctg-bounties"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("ctg_bounties" as any).update({ is_active: !current } as any).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-ctg-bounties"] });
    toast.success(`Bounty ${!current ? "activated" : "deactivated"}`);
  };

  const deleteBounty = async (id: string) => {
    await supabase.from("ctg_bounties" as any).delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-ctg-bounties"] });
    toast.success("Bounty deleted");
  };

  return (
    <div className="space-y-6">
      {/* Create form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" /> Create Bounty
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Document a Natural System" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Action Type *</Label>
              <Input value={form.action_type} onChange={(e) => setForm({ ...form, action_type: e.target.value })} placeholder="e.g. document_ns, host_ritual" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="What should contributors do?" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">$CTG Reward</Label>
              <Input type="number" value={form.ctg_reward} onChange={(e) => setForm({ ...form, ctg_reward: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Total Slots</Label>
              <Input type="number" value={form.total_slots} onChange={(e) => setForm({ ...form, total_slots: Number(e.target.value) })} />
            </div>
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
            {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pin className="h-3.5 w-3.5" />}
            Create Bounty
          </Button>
        </CardContent>
      </Card>

      {/* Existing bounties */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Bounties ({bounties.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : bounties.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No bounties created yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Reward</TableHead>
                    <TableHead className="text-right">Claims</TableHead>
                    <TableHead>Ends</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bounties.map((b: any) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium text-sm max-w-[200px] truncate">{b.title}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{b.action_type}</Badge></TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">{b.ctg_reward}</TableCell>
                      <TableCell className="text-right">{b.claimed_slots}/{b.total_slots}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(b.ends_at), "dd/MM/yy HH:mm")}</TableCell>
                      <TableCell>
                        <Switch checked={b.is_active} onCheckedChange={() => toggleActive(b.id, b.is_active)} />
                      </TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteBounty(b.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
