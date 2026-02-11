import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/PageShell";
import { autoFollowEntity } from "@/hooks/useFollow";

export default function ServiceCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { id: editId } = useParams<{ id: string }>();
  const isEditMode = !!editId;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("60");
  const [price, setPrice] = useState("0");
  const [currency, setCurrency] = useState("EUR");
  const [locationType, setLocationType] = useState("JITSI");
  const [isDraft, setIsDraft] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [loaded, setLoaded] = useState(false);

  // Load existing service for editing
  const { data: existingService, isLoading: loadingService } = useQuery({
    queryKey: ["service-edit", editId],
    queryFn: async () => {
      if (!editId) return null;
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("id", editId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isEditMode,
  });

  // Populate form when service data loads
  useEffect(() => {
    if (existingService && !loaded) {
      setTitle(existingService.title || "");
      setDescription(existingService.description || "");
      setDuration(String(existingService.duration_minutes || 60));
      setPrice(String(existingService.price_amount || 0));
      setCurrency(existingService.price_currency || "EUR");
      setLocationType(existingService.online_location_type || "JITSI");
      setIsDraft(existingService.is_draft || false);
      setIsActive(existingService.is_active ?? true);
      setLoaded(true);
    }
  }, [existingService, loaded]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");

      if (isEditMode && editId) {
        // UPDATE existing service
        const { error } = await supabase.from("services").update({
          title: title.trim(),
          description: description.trim() || null,
          duration_minutes: Number(duration) || 60,
          price_amount: Number(price) || 0,
          price_currency: currency,
          online_location_type: locationType,
          is_draft: isDraft,
          is_active: !isDraft && isActive,
        } as any).eq("id", editId);
        if (error) throw error;
      } else {
        // CREATE new service
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

        const serviceId = (data as any).id;

        // Create default Mon-Fri 9:00–17:00 availability rules
        const defaultRules = [1, 2, 3, 4, 5].map(weekday => ({
          provider_user_id: user.id,
          service_id: serviceId,
          weekday,
          start_time: "09:00",
          end_time: "17:00",
          is_active: true,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris",
        }));
        await supabase.from("availability_rules").insert(defaultRules);

        // Auto-follow
        if (data) await autoFollowEntity(user.id, "SERVICE", serviceId);
      }
    },
    onSuccess: () => {
      toast({ title: isEditMode ? "Service updated" : "Service created" });
      if (isEditMode && editId) {
        navigate(`/services/${editId}`);
      } else {
        navigate("/me?tab=services");
      }
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isEditMode && loadingService) {
    return <PageShell><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></PageShell>;
  }

  return (
    <PageShell>
      <div className="max-w-xl mx-auto py-10 px-4 space-y-6">
        <h1 className="text-2xl font-display font-bold">{isEditMode ? "Edit Service" : "Create Service"}</h1>
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
        {isEditMode && (
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Draft mode</label>
              <Switch checked={isDraft} onCheckedChange={(v) => { setIsDraft(v); if (v) setIsActive(false); }} />
            </div>
            {!isDraft && (
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Active (visible to public)</label>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            )}
          </div>
        )}
        <Button onClick={() => saveMutation.mutate()} disabled={!title.trim() || saveMutation.isPending} className="w-full" size="lg">
          {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
          {isEditMode ? "Save changes" : "Create service"}
        </Button>
      </div>
    </PageShell>
  );
}
