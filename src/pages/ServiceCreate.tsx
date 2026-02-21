import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Loader2, Check, CalendarClock, ArrowRight } from "lucide-react";
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
import { useTopics, useTerritories } from "@/hooks/useSupabaseData";
import { PageShell } from "@/components/PageShell";
import { autoFollowEntity } from "@/hooks/useFollow";
import { WebVisibilityEditor } from "@/components/website/WebVisibilityEditor";

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
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [selectedTerritoryIds, setSelectedTerritoryIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Fetch topics, territories, and global availability
  const { data: topics = [] } = useTopics();
  const { data: territories = [] } = useTerritories();

  // Check if user has any global availability rules
  const { data: globalRulesCount = 0 } = useQuery({
    queryKey: ["global-availability-check", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("availability_rules")
        .select("id", { count: "exact", head: true })
        .eq("provider_user_id", user!.id)
        .is("service_id", null)
        .eq("is_active", true);
      return count ?? 0;
    },
    enabled: !!user?.id && !isEditMode,
  });

  const hasNoGlobalAvailability = !isEditMode && globalRulesCount === 0;

  // Load existing service for editing
  const { data: existingService, isLoading: loadingService } = useQuery({
    queryKey: ["service-edit", editId],
    queryFn: async () => {
      if (!editId) return null;
      const { data, error } = await supabase
        .from("services")
        .select("*, service_topics(topic_id), service_territories(territory_id)")
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
      setImageUrl(existingService.image_url || undefined);
      const topicIds = (existingService as any).service_topics?.map((st: any) => st.topic_id) || [];
      const territoryIds = (existingService as any).service_territories?.map((st: any) => st.territory_id) || [];
      setSelectedTopicIds(topicIds);
      setSelectedTerritoryIds(territoryIds);
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
          image_url: imageUrl || null,
        } as any).eq("id", editId);
        if (error) throw error;

        // Update topics and territories
        await supabase.from("service_topics").delete().eq("service_id", editId);
        await supabase.from("service_territories").delete().eq("service_id", editId);
        if (selectedTopicIds.length > 0) {
          await supabase.from("service_topics").insert(
            selectedTopicIds.map(tid => ({ service_id: editId, topic_id: tid }))
          );
        }
        if (selectedTerritoryIds.length > 0) {
          await supabase.from("service_territories").insert(
            selectedTerritoryIds.map(tid => ({ service_id: editId, territory_id: tid }))
          );
        }
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
          image_url: imageUrl || null,
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

        // Add topics
        if (selectedTopicIds.length > 0) {
          await supabase.from("service_topics").insert(
            selectedTopicIds.map(tid => ({ service_id: serviceId, topic_id: tid }))
          );
        }

        // Add territories
        if (selectedTerritoryIds.length > 0) {
          await supabase.from("service_territories").insert(
            selectedTerritoryIds.map(tid => ({ service_id: serviceId, territory_id: tid }))
          );
        }

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

        {hasNoGlobalAvailability && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
            <CalendarClock className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">No availability slots configured</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                You don't have global availability rules yet. Set up your weekly schedule first so clients can book time with you.
                A default Mon–Fri 9:00–17:00 schedule will be created for this service, but you can customize it.
              </p>
              <Link to="/me/availability">
                <Button variant="outline" size="sm" className="mt-2 gap-1.5">
                  Set up availability <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        )}
        <ImageUpload
          label="Cover image"
          description="Add a visual to make your service stand out"
          currentImageUrl={imageUrl}
          onChange={setImageUrl}
          aspectRatio="16/9"
        />
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

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Topics</label>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedTopicIds(topics.map(t => t.id))}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
              >
                Select all
              </button>
              <button
                onClick={() => setSelectedTopicIds([])}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
              >
                Deselect all
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {topics.map(topic => {
              const isSelected = selectedTopicIds.includes(topic.id);
              return (
                <button
                  key={topic.id}
                  onClick={() => setSelectedTopicIds(p => isSelected ? p.filter(id => id !== topic.id) : [...p, topic.id])}
                  className={`px-3 py-1.5 rounded-full border text-sm transition-all flex items-center gap-2 ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:border-foreground/50"
                  }`}
                >
                  {topic.name}
                  {isSelected && <Check className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Territories</label>
          <div className="flex flex-wrap gap-2">
            {territories.map(territory => {
              const isSelected = selectedTerritoryIds.includes(territory.id);
              return (
                <button
                  key={territory.id}
                  onClick={() => setSelectedTerritoryIds(p => isSelected ? p.filter(id => id !== territory.id) : [...p, territory.id])}
                  className={`px-3 py-1.5 rounded-full border text-sm transition-all flex items-center gap-2 ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:border-foreground/50"
                  }`}
                >
                  {territory.name}
                  {isSelected && <Check className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>
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

        {isEditMode && editId && existingService && (
          <WebVisibilityEditor
            entityId={editId}
            entityTable="services"
            initialVisibility={(existingService as any).public_visibility || "private"}
            initialScopes={(existingService as any).web_scopes || []}
            initialTags={(existingService as any).web_tags || []}
            initialFeaturedOrder={(existingService as any).featured_order ?? null}
          />
        )}
        <Button onClick={() => saveMutation.mutate()} disabled={!title.trim() || saveMutation.isPending} className="w-full" size="lg">
          {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
          {isEditMode ? "Save changes" : "Create service"}
        </Button>
      </div>
    </PageShell>
  );
}
