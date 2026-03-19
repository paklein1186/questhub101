import { useState, useCallback } from "react";
import { Plus, MapPin, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { TerritoryLevel, TerritorialGranularity } from "@/types/enums";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  onCreated: (territoryId: string) => void;
}

export function AddTerritoryDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [level, setLevel] = useState<TerritoryLevel>(TerritoryLevel.TOWN);
  const [granularity, setGranularity] = useState<string>("");
  const [geocoding, setGeocoding] = useState(false);
  const [geocoded, setGeocoded] = useState<{ lat: number; lng: number; display: string } | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const handleGeocode = useCallback(async () => {
    const query = postalCode.trim() || name.trim();
    if (!query) return;
    setGeocoding(true);
    setGeocoded(null);
    try {
      const params = new URLSearchParams({ q: query, format: "json", limit: "1" });
      if (postalCode.trim()) params.set("postalcode", postalCode.trim());
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { "Accept-Language": "en" },
      });
      const data = await res.json();
      if (data?.[0]) {
        setGeocoded({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name });
      } else {
        toast({ title: "Could not find location", description: "Try a different name or postal code", variant: "destructive" });
      }
    } catch {
      toast({ title: "Geocoding failed", variant: "destructive" });
    } finally {
      setGeocoding(false);
    }
  }, [name, postalCode, toast]);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    // Check for duplicate
    const { data: existing } = await supabase
      .from("territories")
      .select("id")
      .ilike("name", trimmed)
      .eq("level", level as any)
      .eq("is_deleted", false)
      .maybeSingle();

    if (existing) {
      onCreated(existing.id);
      toast({ title: "This territory already exists; it has been selected for you." });
      setOpen(false);
      resetForm();
      return;
    }

    const insertData: Record<string, unknown> = {
      name: trimmed,
      level: level as any,
      latitude: geocoded?.lat ?? null,
      longitude: geocoded?.lng ?? null,
    };
    if (granularity) insertData.granularity = granularity;

    const { data: newTerritory, error } = await supabase
      .from("territories")
      .insert(insertData as any)
      .select()
      .single();

    if (error) { toast({ title: "Failed to create territory", variant: "destructive" }); return; }

    onCreated(newTerritory.id);
    qc.invalidateQueries({ queryKey: ["territories"] });
    toast({ title: `Territory "${trimmed}" created and selected!` });
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setName("");
    setPostalCode("");
    setGranularity("");
    setGeocoded(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-3.5 w-3.5 mr-1" /> New Territory
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" /> New Territory
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm font-medium mb-1 block">Name *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Marseille" maxLength={80} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Postal code</label>
            <div className="flex gap-2">
              <Input
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="e.g. 13001"
                maxLength={20}
                className="flex-1"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleGeocode}
                disabled={geocoding || (!name.trim() && !postalCode.trim())}
                className="shrink-0"
              >
                {geocoding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              </Button>
            </div>
            {geocoded && (
              <p className="text-xs text-muted-foreground mt-1.5 bg-muted/50 rounded-lg px-2.5 py-1.5">
                📍 {geocoded.display}
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Level</label>
            <Select value={level} onValueChange={(v) => setLevel(v as TerritoryLevel)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TerritoryLevel.TOWN}>Town</SelectItem>
                <SelectItem value={TerritoryLevel.REGION}>Region</SelectItem>
                <SelectItem value={TerritoryLevel.NATIONAL}>National</SelectItem>
                <SelectItem value={TerritoryLevel.OTHER}>Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Granularity</label>
            <Select value={granularity} onValueChange={setGranularity}>
              <SelectTrigger><SelectValue placeholder="Auto-detect" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TerritorialGranularity.DISTRICT_OR_COMMUNE}>District / Commune</SelectItem>
                <SelectItem value={TerritorialGranularity.NUTS3}>NUTS3 (County-level)</SelectItem>
                <SelectItem value={TerritorialGranularity.NUTS2}>NUTS2 (Province-level)</SelectItem>
                <SelectItem value={TerritorialGranularity.NUTS1}>NUTS1 (Major region)</SelectItem>
                <SelectItem value={TerritorialGranularity.COUNTRY}>Country</SelectItem>
                <SelectItem value={TerritorialGranularity.CUSTOM_PERIMETER}>Custom Perimeter</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSubmit} disabled={!name.trim()} className="w-full">
            Create Territory
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
