import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/PageShell";
import { autoFollowEntity } from "@/hooks/useFollow";

export default function ServiceCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("60");
  const [price, setPrice] = useState("0");
  const [currency, setCurrency] = useState("EUR");
  const [locationType, setLocationType] = useState("JITSI");

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("services").insert({
        title: title.trim(),
        description: description.trim() || null,
        provider_user_id: user.id,
        owner_type: "USER",
        owner_id: user.id,
        duration_minutes: Number(duration) || 60,
        price_amount: Number(price) || 0,
        price_currency: currency,
        online_location_type: locationType,
        is_active: true,
      } as any).select("id").single();
      if (error) throw error;
      // Auto-follow
      if (data) await autoFollowEntity(user.id, "SERVICE", (data as any).id);
    },
    onSuccess: () => {
      toast({ title: "Service created" });
      navigate("/me?tab=services");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <PageShell>
      <div className="max-w-xl mx-auto py-10 px-4 space-y-6">
        <h1 className="text-2xl font-display font-bold">Create Service</h1>
        <div>
          <label className="text-sm font-medium mb-1 block">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Strategy Workshop" maxLength={120} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Description</label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this service includes…" maxLength={500} className="resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Duration (min)</label>
            <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} min={15} max={480} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Price (€)</label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} min={0} step={5} />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Location type</label>
          <Select value={locationType} onValueChange={setLocationType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="JITSI">Jitsi</SelectItem>
              <SelectItem value="ZOOM">Zoom</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={!title.trim() || saveMutation.isPending} className="w-full" size="lg">
          {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
          Create service
        </Button>
      </div>
    </PageShell>
  );
}
