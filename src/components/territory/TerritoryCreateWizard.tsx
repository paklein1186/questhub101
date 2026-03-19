/**
 * TerritoryCreateWizard.tsx
 * Multi-step wizard for creating a territory.
 * Steps: 1) Type selection  2) Location details + geocoding  3) Confirm
 * If "Bioregion" is selected, redirects to /create/bioregion.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin, Globe, TreePine, Mountain, Building2, Search,
  CheckCircle2, ArrowRight, ArrowLeft, Loader2, Sparkles, Leaf,
} from "lucide-react";

/* ── Territory types ── */
const TERRITORY_TYPES = [
  {
    id: "location",
    label: "Location",
    description: "A town, city, region, or country",
    icon: MapPin,
    color: "text-blue-500 bg-blue-500/10",
  },
  {
    id: "bioregion",
    label: "Bioregion",
    description: "An ecological bioregion (watershed, ecoregion...)",
    icon: Leaf,
    color: "text-emerald-500 bg-emerald-500/10",
  },
];

/* ── Level options with explanations ── */
const LOCATION_LEVELS = [
  { value: "TOWN", label: "Town / City", description: "A municipality or urban area" },
  { value: "PROVINCE", label: "Province / County", description: "A sub-regional administrative division" },
  { value: "REGION", label: "Region / State", description: "A major sub-national area" },
  { value: "NATIONAL", label: "Country", description: "A sovereign nation" },
  { value: "CONTINENT", label: "Continent", description: "A continental landmass" },
];

/* ── Granularity options with explanations ── */
const GRANULARITY_OPTIONS = [
  { value: "DISTRICT_OR_COMMUNE", label: "District / Commune", description: "Most precise — matches a specific municipality" },
  { value: "NUTS3", label: "NUTS3 (County-level)", description: "European statistical unit — e.g. arrondissement, Landkreis" },
  { value: "NUTS2", label: "NUTS2 (Province-level)", description: "European statistical unit — e.g. département, Regierungsbezirk" },
  { value: "NUTS1", label: "NUTS1 (Region-level)", description: "European statistical unit — e.g. Länder, grandes régions" },
  { value: "COUNTRY", label: "Country", description: "National boundary" },
  { value: "CUSTOM_PERIMETER", label: "Custom Perimeter", description: "Manually defined area" },
];

/* ── Geocoding hook ── */
function useGeocode(query: string) {
  return useQuery<any[]>({
    queryKey: ["territory-wizard-geocode", query],
    enabled: query.length >= 3,
    staleTime: 60_000,
    queryFn: async () => {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`,
        { headers: { "User-Agent": "changethegame-app" } }
      );
      if (!res.ok) return [];
      return res.json();
    },
  });
}

/* ── Step indicator ── */
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 py-2">
      {Array.from({ length: total }, (_, i) => i + 1).map(n => (
        <div key={n} className="flex items-center gap-2">
          <div
            className={cn(
              "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
              current > n
                ? "bg-primary border-primary text-primary-foreground"
                : current === n
                ? "bg-primary border-primary text-primary-foreground"
                : "bg-background border-border text-muted-foreground"
            )}
          >
            {current > n ? <CheckCircle2 className="h-3.5 w-3.5" /> : n}
          </div>
          {n < total && <div className={cn("h-0.5 w-8 rounded-full", current > n ? "bg-primary" : "bg-border")} />}
        </div>
      ))}
      <span className="ml-2 text-xs text-muted-foreground">Step {current} of {total}</span>
    </div>
  );
}

/* ── Main wizard ── */
interface TerritoryCreateWizardProps {
  open: boolean;
  onClose: () => void;
}

export function TerritoryCreateWizard({ open, onClose }: TerritoryCreateWizardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [step, setStep] = useState(1);
  const [territoryType, setTerritoryType] = useState<"location" | "bioregion" | null>(null);

  // Step 2 — Location details
  const [name, setName] = useState("");
  const [level, setLevel] = useState("TOWN");
  const [granularity, setGranularity] = useState("DISTRICT_OR_COMMUNE");
  const [postalCode, setPostalCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGeo, setSelectedGeo] = useState<any>(null);
  const [showGeoResults, setShowGeoResults] = useState(false);
  const [description, setDescription] = useState("");

  // Geocoding
  const geocodeQuery = searchQuery || (postalCode && name ? `${postalCode} ${name}` : name);
  const { data: geoResults = [], isLoading: geoLoading } = useGeocode(geocodeQuery);
  const searchRef = useRef<HTMLInputElement>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(1);
      setTerritoryType(null);
      setName("");
      setLevel("TOWN");
      setGranularity("DISTRICT_OR_COMMUNE");
      setPostalCode("");
      setSearchQuery("");
      setSelectedGeo(null);
      setDescription("");
    }
  }, [open]);

  // Auto-infer level from geocode result
  const inferLevelFromGeo = useCallback((result: any) => {
    const type = result.addresstype || result.type;
    if (type === "country") setLevel("NATIONAL");
    else if (type === "state" || type === "region") setLevel("REGION");
    else if (type === "county" || type === "province") setLevel("PROVINCE");
    else setLevel("TOWN");
  }, []);

  const handleSelectGeo = useCallback((result: any) => {
    setSelectedGeo(result);
    setName(result.display_name.split(",")[0]);
    setShowGeoResults(false);
    inferLevelFromGeo(result);
  }, [inferLevelFromGeo]);

  // Step 1 → select type
  const handleTypeSelect = useCallback((type: "location" | "bioregion") => {
    setTerritoryType(type);
    if (type === "bioregion") {
      onClose();
      navigate("/create/bioregion");
    } else {
      setStep(2);
    }
  }, [navigate, onClose]);

  // Create territory mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const lat = selectedGeo ? parseFloat(selectedGeo.lat) : null;
      const lng = selectedGeo ? parseFloat(selectedGeo.lon) : null;

      const { data, error } = await supabase
        .from("territories")
        .insert({
          name: name.trim(),
          level: level as any,
          granularity: granularity as any,
          summary: description.trim() || null,
          latitude: lat,
          longitude: lng,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["admin-territories"] });
      qc.invalidateQueries({ queryKey: ["territory-leaderboard"] });
      toast({ title: "Territory created! 🌍", description: `${name} has been added.` });
      onClose();
      navigate(`/territories/${data.id}`);
    },
    onError: (e: any) => {
      toast({ title: "Creation failed", description: e.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {step === 1 ? "Add new Territory" : step === 2 ? "Location details" : "Confirm"}
          </DialogTitle>
        </DialogHeader>

        {step > 1 && <StepDots current={step} total={3} />}

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* ── Step 1: Type Selection ── */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">What type of territory do you want to create?</p>
              <div className="grid gap-3">
                {TERRITORY_TYPES.map(t => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleTypeSelect(t.id as any)}
                      className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
                    >
                      <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0", t.color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{t.label}</p>
                        <p className="text-xs text-muted-foreground">{t.description}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 2: Location Details ── */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Name *</Label>
                <Input
                  placeholder="e.g. Marseille, Bavaria, Costa Rica..."
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="text-sm"
                />
              </div>

              {/* Level */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Level</Label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LOCATION_LEVELS.map(l => (
                      <SelectItem key={l.value} value={l.value}>
                        <div className="flex flex-col">
                          <span>{l.label}</span>
                          <span className="text-[10px] text-muted-foreground">{l.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Granularity */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Data granularity</Label>
                <Select value={granularity} onValueChange={setGranularity}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GRANULARITY_OPTIONS.map(g => (
                      <SelectItem key={g.value} value={g.value}>
                        <div className="flex flex-col">
                          <span>{g.label}</span>
                          <span className="text-[10px] text-muted-foreground">{g.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Postal code + geocode search */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Postal code (optional — helps locate precisely)</Label>
                <Input
                  placeholder="e.g. 13001"
                  value={postalCode}
                  onChange={e => setPostalCode(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Locate on map</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Input
                    ref={searchRef}
                    value={searchQuery || (postalCode ? `${postalCode} ${name}` : name)}
                    onChange={e => { setSearchQuery(e.target.value); setShowGeoResults(true); }}
                    onFocus={() => setShowGeoResults(true)}
                    placeholder="Search location..."
                    className="pl-9 text-sm"
                  />

                  {showGeoResults && (searchQuery || name).length >= 3 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                      {geoLoading ? (
                        <div className="flex items-center justify-center py-3">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : geoResults.length > 0 ? (
                        <div className="p-1.5">
                          {geoResults.map((r: any) => (
                            <button
                              key={r.place_id}
                              onClick={() => handleSelectGeo(r)}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 text-left text-sm transition-colors"
                            >
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate">{r.display_name}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-3">No results</p>
                      )}
                    </div>
                  )}
                </div>

                {selectedGeo && (
                  <div className="flex items-center gap-2 mt-1.5 p-2 rounded-lg bg-success/5 border border-success/20">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                    <p className="text-xs text-success truncate">
                      📍 {selectedGeo.display_name} ({parseFloat(selectedGeo.lat).toFixed(4)}, {parseFloat(selectedGeo.lon).toFixed(4)})
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Description (optional)</Label>
                <Textarea
                  placeholder="A brief description of this territory..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setStep(1)} className="gap-1.5">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </Button>
                <Button
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={() => setStep(3)}
                  disabled={!name.trim()}
                >
                  Continue <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 3: Confirm ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border p-4 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Summary
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Name</p>
                    <p className="text-sm font-medium">{name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Level</p>
                    <p className="text-sm font-medium">{LOCATION_LEVELS.find(l => l.value === level)?.label}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Granularity</p>
                    <p className="text-sm font-medium">{GRANULARITY_OPTIONS.find(g => g.value === granularity)?.label}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Coordinates</p>
                    <p className="text-sm font-medium">
                      {selectedGeo
                        ? `${parseFloat(selectedGeo.lat).toFixed(3)}, ${parseFloat(selectedGeo.lon).toFixed(3)}`
                        : <span className="text-amber-500">Will be auto-detected</span>
                      }
                    </p>
                  </div>
                </div>
                {description && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Description</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                )}
              </div>

              {!selectedGeo && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    No coordinates selected. We'll try to auto-detect the location from the name. You can always update coordinates later.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setStep(2)} className="gap-1.5">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </Button>
                <Button
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !name.trim()}
                >
                  {createMutation.isPending ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating...</>
                  ) : (
                    <><Globe className="h-3.5 w-3.5" /> Create Territory</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
