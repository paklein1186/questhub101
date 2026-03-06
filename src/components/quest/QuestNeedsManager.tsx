import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2, Lightbulb } from "lucide-react";

export const NEED_CATEGORIES = [
  { value: "GENERAL", label: "General" },
  { value: "SKILLS", label: "Skills / Expertise" },
  { value: "FUNDING", label: "Funding" },
  { value: "TOOLS", label: "Tools / Equipment" },
  { value: "MENTORSHIP", label: "Mentorship" },
  { value: "VISIBILITY", label: "Visibility / Promotion" },
  { value: "PARTNERSHIPS", label: "Partnerships" },
  { value: "VOLUNTEER", label: "Volunteers" },
];

export const NEED_STATUSES = [
  { value: "OPEN", label: "Open" },
  { value: "ACTIVE", label: "Active" },
  { value: "MET", label: "Met" },
];

const statusColors: Record<string, string> = {
  OPEN: "bg-primary/10 text-primary border-primary/30",
  ACTIVE: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  MET: "bg-green-500/10 text-green-700 border-green-500/30",
};

interface NeedForm {
  title: string;
  description: string;
  category: string;
  status: string;
}
const emptyForm: NeedForm = { title: "", description: "", category: "GENERAL", status: "OPEN" };

interface QuestNeedsManagerProps {
  questId: string;
  questOwnerId: string;
  /** Read-only view (no edit controls) */
  readOnly?: boolean;
}

export function QuestNeedsManager({ questId, questOwnerId, readOnly = false }: QuestNeedsManagerProps) {
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const qc = useQueryClient();

  const isOwner = currentUser.id === questOwnerId;

  const { data: needs = [], isLoading } = useQuery({
    queryKey: ["quest-needs", questId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quest_needs" as any)
        .select("*")
        .eq("quest_id", questId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!questId,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<NeedForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (need: any) => {
    setEditingId(need.id);
    setForm({
      title: need.title,
      description: need.description || "",
      category: need.category || "GENERAL",
      status: need.status || "OPEN",
    });
    setDialogOpen(true);
  };

  const saveNeed = async () => {
    if (!form.title.trim() || !currentUser.id) return;
    setSaving(true);
    const payload: any = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category,
      status: form.status,
    };
    if (editingId) {
      const { error } = await supabase.from("quest_needs" as any).update(payload).eq("id", editingId);
      if (error) { toast({ title: "Error saving", variant: "destructive" }); setSaving(false); return; }
      toast({ title: "Need updated" });
    } else {
      payload.quest_id = questId;
      payload.created_by_user_id = currentUser.id;
      const { error } = await supabase.from("quest_needs" as any).insert(payload);
      if (error) { toast({ title: "Error saving", variant: "destructive" }); setSaving(false); return; }
      toast({ title: "Need added" });
    }
    qc.invalidateQueries({ queryKey: ["quest-needs", questId] });
    setSaving(false);
    setDialogOpen(false);
  };

  const deleteNeed = async (id: string) => {
    if (!confirm("Remove this need?")) return;
    await supabase.from("quest_needs" as any).delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["quest-needs", questId] });
    toast({ title: "Need removed" });
  };

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-3">
      {!readOnly && isOwner && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Need
          </Button>
        </div>
      )}

      {needs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>No needs listed yet.</p>
          {!readOnly && isOwner && (
            <p className="mt-1 text-xs">Add what this quest requires — skills, funding, tools, volunteers…</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {needs.map((need: any) => {
            const cat = NEED_CATEGORIES.find(c => c.value === need.category);
            return (
              <div
                key={need.id}
                className="rounded-lg border border-border bg-card p-3 flex items-start gap-3"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{need.title}</span>
                    <Badge variant="outline" className={`text-xs ${statusColors[need.status] ?? ""}`}>
                      {NEED_STATUSES.find(s => s.value === need.status)?.label ?? need.status}
                    </Badge>
                    {cat && (
                      <Badge variant="secondary" className="text-xs">{cat.label}</Badge>
                    )}
                  </div>
                  {need.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{need.description}</p>
                  )}
                </div>
                {!readOnly && isOwner && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(need)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteNeed(need.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Need" : "Add a Need"}</DialogTitle>
            <DialogDescription>
              Describe what this quest requires from the community.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Title <span className="text-destructive">*</span></label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. UX designer for 2 weeks"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="More details about this need…"
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Category</label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NEED_CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NEED_STATUSES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveNeed} disabled={saving || !form.title.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingId ? "Update" : "Add Need"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
