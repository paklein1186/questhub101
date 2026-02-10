import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus, Pencil, Trash2, Clock, Euro, Video, Loader2,
  ToggleLeft, ToggleRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function useMyServices(userId: string) {
  return useQuery({
    queryKey: ["my-services", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("provider_user_id", userId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });
}

export function MyServicesPanel({ userId }: { userId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: allMyServices = [], isLoading } = useMyServices(userId);

  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDuration, setFormDuration] = useState("60");
  const [formPrice, setFormPrice] = useState("0");
  const [formCurrency, setFormCurrency] = useState("EUR");
  const [formLocationType, setFormLocationType] = useState("JITSI");

  const resetForm = () => {
    setFormTitle(""); setFormDesc(""); setFormDuration("60"); setFormPrice("0");
    setFormCurrency("EUR"); setFormLocationType("JITSI");
    setEditId(null);
  };

  const openEdit = (svc: any) => {
    setEditId(svc.id);
    setFormTitle(svc.title);
    setFormDesc(svc.description || "");
    setFormDuration(String(svc.duration_minutes ?? 60));
    setFormPrice(String(svc.price_amount ?? 0));
    setFormCurrency(svc.price_currency || "EUR");
    setFormLocationType(svc.online_location_type ?? "JITSI");
    setCreateOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editId) {
        const { error } = await supabase.from("services").update({
          title: formTitle.trim(),
          description: formDesc.trim() || null,
          duration_minutes: Number(formDuration) || 60,
          price_amount: Number(formPrice) || 0,
          price_currency: formCurrency,
          online_location_type: formLocationType,
        }).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("services").insert({
          title: formTitle.trim(),
          description: formDesc.trim() || null,
          provider_user_id: userId,
          duration_minutes: Number(formDuration) || 60,
          price_amount: Number(formPrice) || 0,
          price_currency: formCurrency,
          online_location_type: formLocationType,
          is_active: true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-services"] });
      setCreateOpen(false);
      resetForm();
      toast({ title: editId ? "Service updated" : "Service created" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from("services").update({ is_active: !isActive }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-services"] });
      toast({ title: "Service status toggled" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-services"] });
      toast({ title: "Service deleted" });
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold">My Services</h3>
        <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Create service</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? "Edit Service" : "Create Service"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Title</label>
                <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="e.g. Strategy Workshop" maxLength={120} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <Textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="What this service includes…" maxLength={500} className="resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Duration (min)</label>
                  <Input type="number" value={formDuration} onChange={(e) => setFormDuration(e.target.value)} min={15} max={480} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Price (€)</label>
                  <Input type="number" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} min={0} step={5} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Location type</label>
                <Select value={formLocationType} onValueChange={setFormLocationType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JITSI">Jitsi</SelectItem>
                    <SelectItem value="ZOOM">Zoom</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => saveMutation.mutate()} disabled={!formTitle.trim() || saveMutation.isPending} className="w-full">
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                {editId ? "Save changes" : "Create service"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}

      {!isLoading && allMyServices.length === 0 && (
        <p className="text-muted-foreground">No services yet. Create your first service above.</p>
      )}

      <div className="space-y-3">
        {allMyServices.map((svc: any, i: number) => (
          <motion.div
            key={svc.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <Link to={`/services/${svc.id}`} className="font-display font-semibold hover:text-primary transition-colors">{svc.title}</Link>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {svc.duration_minutes} min</span>
                  <span className="flex items-center gap-1">
                    <Euro className="h-3 w-3" />
                    {(!svc.price_amount || svc.price_amount === 0) ? "Free" : `€${svc.price_amount}`}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    <Video className="h-2.5 w-2.5 mr-0.5" /> {svc.online_location_type}
                  </Badge>
                </div>
              </div>
              <Badge className={svc.is_active ? "bg-emerald-500/10 text-emerald-600 border-0" : "bg-muted text-muted-foreground border-0"}>
                {svc.is_active ? "Active" : "Paused"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{svc.description}</p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => openEdit(svc)}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
              <Button size="sm" variant="outline" onClick={() => toggleMutation.mutate({ id: svc.id, isActive: svc.is_active })}>
                {svc.is_active ? <><ToggleRight className="h-3.5 w-3.5 mr-1" /> Pause</> : <><ToggleLeft className="h-3.5 w-3.5 mr-1" /> Resume</>}
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(svc.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
