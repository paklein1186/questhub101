import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ImageUpload";
import { Plus, Link2, Search, Loader2, Sparkles, Globe, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useCreateAndLinkNaturalSystem,
  useLinkNaturalSystem,
  useSearchNaturalSystems,
} from "@/hooks/useNaturalSystems";
import type { NsLinkType, NaturalSystemKingdom, NaturalSystemTypeV2 } from "@/types/naturalSystems";
import { KINGDOM_LABELS, SYSTEM_TYPE_LABELS } from "@/types/naturalSystems";
import { supabase } from "@/integrations/supabase/client";

type Step = "choose" | "create" | "link";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  linkedType: NsLinkType;
  linkedId: string;
  defaultTerritoryId?: string;
}

export function AddLinkNaturalSystemModal({ open, onOpenChange, linkedType, linkedId, defaultTerritoryId }: Props) {
  const [step, setStep] = useState<Step>("choose");
  const { toast } = useToast();

  const handleClose = (o: boolean) => {
    if (!o) setStep("choose");
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "choose" && "Add or Link a Natural System"}
            {step === "create" && "Create a New Natural System"}
            {step === "link" && "Link an Existing Natural System"}
          </DialogTitle>
        </DialogHeader>

        {step === "choose" && (
          <div className="grid gap-3 py-4">
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-start gap-1"
              onClick={() => setStep("create")}
            >
              <div className="flex items-center gap-2 font-semibold">
                <Plus className="h-4 w-4" /> Create a new Natural System
              </div>
              <p className="text-xs text-muted-foreground text-left">Register a new ecosystem (river, forest, soil…) and link it here.</p>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-start gap-1"
              onClick={() => setStep("link")}
            >
              <div className="flex items-center gap-2 font-semibold">
                <Link2 className="h-4 w-4" /> Link an existing Natural System
              </div>
              <p className="text-xs text-muted-foreground text-left">Search and connect a system that's already registered.</p>
            </Button>
          </div>
        )}

        {step === "create" && (
          <CreateForm
            linkedType={linkedType}
            linkedId={linkedId}
            defaultTerritoryId={defaultTerritoryId}
            onDone={() => { handleClose(false); toast({ title: "Natural system created & linked!" }); }}
            onBack={() => setStep("choose")}
          />
        )}

        {step === "link" && (
          <LinkForm
            linkedType={linkedType}
            linkedId={linkedId}
            onDone={() => { handleClose(false); toast({ title: "Natural system linked!" }); }}
            onBack={() => setStep("choose")}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ═══ Link existing ═══ */
function LinkForm({ linkedType, linkedId, onDone, onBack }: {
  linkedType: NsLinkType; linkedId: string; onDone: () => void; onBack: () => void;
}) {
  const [search, setSearch] = useState("");
  const { data: results, isLoading } = useSearchNaturalSystems(search);
  const linkMutation = useLinkNaturalSystem();

  const { toast } = useToast();

  const handleSelect = async (systemId: string) => {
    try {
      await linkMutation.mutateAsync({ natural_system_id: systemId, linked_type: linkedType, linked_id: linkedId });
      onDone();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Failed to link system", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="max-h-60 overflow-y-auto space-y-2">
        {isLoading && <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
        {results?.map((s) => (
          <button
            key={s.id}
            className="w-full text-left rounded-lg border border-border p-3 hover:border-primary/30 transition-all flex items-center gap-3"
            onClick={() => handleSelect(s.id)}
            disabled={linkMutation.isPending}
          >
            {s.picture_url && <img src={s.picture_url} className="h-10 w-10 rounded object-cover shrink-0" />}
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{s.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {KINGDOM_LABELS[s.kingdom as NaturalSystemKingdom]} · {SYSTEM_TYPE_LABELS[s.system_type as NaturalSystemTypeV2]}
              </p>
            </div>
          </button>
        ))}
        {search.length >= 2 && !isLoading && results?.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No systems found.</p>
        )}
      </div>
      <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
    </div>
  );
}

/* ═══ Create new ═══ */
function CreateForm({ linkedType, linkedId, defaultTerritoryId, onDone, onBack }: {
  linkedType: NsLinkType; linkedId: string; defaultTerritoryId?: string;
  onDone: () => void; onBack: () => void;
}) {
  const [name, setName] = useState("");
  const [kingdom, setKingdom] = useState<NaturalSystemKingdom>("plants");
  const [systemType, setSystemType] = useState<NaturalSystemTypeV2>("other");
  const [description, setDescription] = useState("");
  const [locationText, setLocationText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [pictureUrl, setPictureUrl] = useState<string | undefined>();
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [scraping, setScraping] = useState(false);

  const createMutation = useCreateAndLinkNaturalSystem();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        kingdom,
        system_type: systemType,
        description: description.trim(),
        territory_id: defaultTerritoryId || undefined,
        location_text: locationText.trim() || undefined,
        source_url: sourceUrl.trim() || undefined,
        picture_url: pictureUrl,
        tags,
        linked_type: linkedType,
        linked_id: linkedId,
      });
      onDone();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleScrapeUrl = async () => {
    if (!sourceUrl.trim()) return;
    setScraping(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-entity", {
        body: { url: sourceUrl.trim() },
      });
      if (error) throw error;
      if (data?.name && !name) setName(data.name);
      if (data?.description && !description) setDescription(data.description?.slice(0, 500) || "");
      if (data?.logo && !pictureUrl) setPictureUrl(data.logo);
      if (data?.suggestedTopics?.length) {
        setTags((prev) => [...new Set([...prev, ...data.suggestedTopics.slice(0, 5)])]);
      }
      toast({ title: "Metadata imported" });
    } catch {
      toast({ title: "Could not scrape URL", variant: "destructive" });
    } finally {
      setScraping(false);
    }
  };

  const handleAiFill = async () => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-storyteller", {
        body: {
          type: "rewrite_description",
          context: {
            entityType: "natural system",
            title: name,
            currentText: description,
            keywords: `Kingdom: ${KINGDOM_LABELS[kingdom]}, Type: ${SYSTEM_TYPE_LABELS[systemType]}${sourceUrl ? `, Source: ${sourceUrl}` : ""}`,
          },
        },
      });
      if (error) throw error;
      if (data?.text) setDescription(data.text);
    } catch {
      toast({ title: "AI generation failed", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  return (
    <div className="space-y-4 py-2">
      {/* Name */}
      <div>
        <Label>Name *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Loire River Watershed" />
      </div>

      {/* Kingdom + System Type */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Kingdom</Label>
          <Select value={kingdom} onValueChange={(v) => setKingdom(v as NaturalSystemKingdom)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(KINGDOM_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>System Type</Label>
          <Select value={systemType} onValueChange={(v) => setSystemType(v as NaturalSystemTypeV2)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(SYSTEM_TYPE_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Source URL */}
      <div>
        <Label>Source URL</Label>
        <div className="flex gap-2">
          <Input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://en.wikipedia.org/wiki/…"
            className="flex-1"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!sourceUrl.trim() || scraping}
            onClick={handleScrapeUrl}
          >
            {scraping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Location */}
      <div>
        <Label>Location</Label>
        <Input value={locationText} onChange={(e) => setLocationText(e.target.value)} placeholder="e.g. Central France, Loire Valley" />
      </div>

      {/* Picture */}
      <ImageUpload
        label="Picture"
        currentImageUrl={pictureUrl}
        onChange={(url) => setPictureUrl(url)}
        aspectRatio="16/9"
      />

      {/* Description + AI */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label>Description</Label>
          <Button type="button" size="sm" variant="ghost" className="text-xs h-7 gap-1" onClick={handleAiFill} disabled={aiLoading || !name}>
            {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Fill with AI
          </Button>
        </div>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe this natural system…" rows={4} />
      </div>

      {/* Tags */}
      <div>
        <Label>Tags</Label>
        <div className="flex gap-2 mb-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Add tag…"
            className="flex-1"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
          />
          <Button type="button" size="sm" variant="outline" onClick={addTag} disabled={!tagInput.trim()}>Add</Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((t) => (
              <Badge key={t} variant="secondary" className="text-xs gap-1">
                {t}
                <button onClick={() => setTags(tags.filter((x) => x !== t))}><X className="h-2.5 w-2.5" /></button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-2">
        <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
        <Button onClick={handleSubmit} disabled={createMutation.isPending || !name.trim()}>
          {createMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
          Create & Link
        </Button>
      </div>
    </div>
  );
}
