/**
 * CreateBioregion.tsx — Multi-step wizard for creating a bioregion territory.
 * Steps: 1) Identity  2) Select towns  3) Link natural systems  4) Draw boundary
 */

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Leaf, MapPin, Search, ArrowRight, ArrowLeft, Check, Loader2,
  X, TreePine, Mountain, Sprout, Globe2,
} from "lucide-react";
import { toast } from "sonner";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* ── Step indicator ── */
const STEPS = [
  { label: "Identity", icon: Sprout },
  { label: "Towns", icon: MapPin },
  { label: "Living Systems", icon: Leaf },
  { label: "Boundary", icon: Globe2 },
] as const;

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center justify-center h-8 w-8 rounded-full text-xs font-semibold transition-colors",
                done && "bg-primary text-primary-foreground",
                active && "bg-primary/20 text-primary ring-2 ring-primary",
                !done && !active && "bg-muted text-muted-foreground"
              )}
            >
              {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </div>
            <span className={cn("text-xs hidden sm:inline", active ? "text-foreground font-medium" : "text-muted-foreground")}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && <div className="w-6 sm:w-10 h-px bg-border" />}
          </div>
        );
      })}
    </div>
  );
}

/* ── Territory search hook ── */
function useSearchTerritories(query: string, levels: string[] = ["TOWN", "LOCALITY", "PROVINCE"]) {
  return useQuery({
    queryKey: ["search-territories", query, levels],
    enabled: query.length >= 2,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("territories")
        .select("id, name, level, slug, latitude, longitude")
        .ilike("name", `%${query}%`)
        .in("level", levels as any)
        .eq("is_deleted", false)
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string; name: string; level: string; slug: string | null;
        latitude: number | null; longitude: number | null;
      }>;
    },
  });
}

/* ── Natural system search hook ── */
function useSearchNaturalSystems(query: string) {
  return useQuery({
    queryKey: ["search-ns", query],
    enabled: query.length >= 2,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("natural_systems")
        .select("id, name, kingdom, system_type, picture_url")
        .ilike("name", `%${query}%`)
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string; name: string; kingdom: string | null;
        system_type: string | null; picture_url: string | null;
      }>;
    },
  });
}

/* ── Step 1: Identity ── */
function StepIdentity({
  name, setName, description, setDescription,
}: {
  name: string; setName: (v: string) => void;
  description: string; setDescription: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Bioregion name *</label>
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Senne River Basin, Flemish Ardennes…"
          maxLength={100}
        />
        <p className="text-xs text-muted-foreground mt-1">Choose a name that reflects the ecological identity of this area</p>
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Description</label>
        <Textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Describe the ecological and cultural character of this bioregion…"
          rows={4}
          maxLength={1000}
        />
      </div>
    </div>
  );
}

/* ── Step 2: Select towns ── */
function StepTowns({
  selected, onToggle,
}: {
  selected: Array<{ id: string; name: string; level: string }>;
  onToggle: (t: { id: string; name: string; level: string }) => void;
}) {
  const [q, setQ] = useState("");
  const { data: results = [], isLoading } = useSearchTerritories(q);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Search for towns, localities, or provinces to include in this bioregion.</p>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search territories…"
          className="pl-9"
        />
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(t => (
            <Badge key={t.id} variant="secondary" className="gap-1 pr-1">
              <MapPin className="h-3 w-3" /> {t.name}
              <button onClick={() => onToggle(t)} className="ml-0.5 hover:bg-muted rounded-full p-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {q.length >= 2 && (
        <div className="border rounded-lg max-h-60 overflow-y-auto divide-y divide-border">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : results.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No territories found</p>
          ) : (
            results.map(t => {
              const isSelected = selected.some(s => s.id === t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => onToggle({ id: t.id, name: t.name, level: t.level })}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors",
                    isSelected && "bg-primary/5"
                  )}
                >
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.level}</p>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/* ── Step 3: Link natural systems ── */
function StepNaturalSystems({
  selected, onToggle,
}: {
  selected: Array<{ id: string; name: string; system_type: string | null }>;
  onToggle: (ns: { id: string; name: string; system_type: string | null }) => void;
}) {
  const [q, setQ] = useState("");
  const { data: results = [], isLoading } = useSearchNaturalSystems(q);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Link watersheds, forests, soil systems, and other living systems to this bioregion.</p>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search natural systems…"
          className="pl-9"
        />
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(ns => (
            <Badge key={ns.id} variant="secondary" className="gap-1 pr-1">
              <Leaf className="h-3 w-3" /> {ns.name}
              <button onClick={() => onToggle(ns)} className="ml-0.5 hover:bg-muted rounded-full p-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {q.length >= 2 && (
        <div className="border rounded-lg max-h-60 overflow-y-auto divide-y divide-border">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : results.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No natural systems found</p>
          ) : (
            results.map(ns => {
              const isSelected = selected.some(s => s.id === ns.id);
              return (
                <button
                  key={ns.id}
                  onClick={() => onToggle({ id: ns.id, name: ns.name, system_type: ns.system_type })}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors",
                    isSelected && "bg-primary/5"
                  )}
                >
                  <TreePine className="h-4 w-4 text-green-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ns.name}</p>
                    {ns.system_type && <p className="text-xs text-muted-foreground">{ns.system_type}</p>}
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/* ── Step 4: Draw boundary (click-to-place markers) ── */
function BoundaryMapInner({
  points, setPoints,
}: {
  points: [number, number][];
  setPoints: (pts: [number, number][]) => void;
}) {
  useMapEvents({
    click(e) {
      setPoints([...points, [e.latlng.lat, e.latlng.lng]]);
    },
  });

  return (
    <>
      {points.map((p, i) => (
        <Marker key={i} position={p} />
      ))}
      {points.length >= 3 && (
        // Draw polygon lines using a polyline overlay isn't supported natively here,
        // so we just show markers
        null
      )}
    </>
  );
}

function StepBoundary({
  points, setPoints, center,
}: {
  points: [number, number][];
  setPoints: (pts: [number, number][]) => void;
  center: [number, number];
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Click on the map to place boundary points. Place at least 3 points to define the bioregion perimeter.</p>
      {points.length > 0 && (
        <div className="flex items-center gap-2">
          <Badge variant="outline">{points.length} points</Badge>
          <Button variant="ghost" size="sm" onClick={() => setPoints([])} className="text-xs">
            Clear
          </Button>
          {points.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setPoints(points.slice(0, -1))} className="text-xs">
              Undo last
            </Button>
          )}
        </div>
      )}
      <div className="rounded-xl overflow-hidden border border-border h-[400px]">
        <MapContainer
          center={center}
          zoom={8}
          className="h-full w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <BoundaryMapInner points={points} setPoints={setPoints} />
        </MapContainer>
      </div>
    </div>
  );
}

/* ── Slug helper ── */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/* ── Main page ── */
export default function CreateBioregion() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);

  // Step 1
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Step 2
  const [selectedTowns, setSelectedTowns] = useState<Array<{ id: string; name: string; level: string }>>([]);

  // Step 3
  const [selectedSystems, setSelectedSystems] = useState<Array<{ id: string; name: string; system_type: string | null }>>([]);

  // Step 4
  const [boundaryPoints, setBoundaryPoints] = useState<[number, number][]>([]);

  // XP gate
  const { data: xpLevel = 1 } = useQuery({
    queryKey: ["my-xp-level", currentUser.id],
    enabled: !!currentUser.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("xp_level").eq("user_id", currentUser.id!).single();
      return (data as any)?.xp_level ?? 1;
    },
  });

  const canCreate = xpLevel >= 3;

  // Compute map center from selected towns
  const mapCenter = useMemo<[number, number]>(() => {
    const withCoords = selectedTowns.filter(t => {
      // We don't have coords stored in selectedTowns, use default
      return false;
    });
    return [50.85, 4.35]; // Default to Brussels area
  }, [selectedTowns]);

  const toggleTown = useCallback((t: { id: string; name: string; level: string }) => {
    setSelectedTowns(prev =>
      prev.some(s => s.id === t.id)
        ? prev.filter(s => s.id !== t.id)
        : [...prev, t]
    );
  }, []);

  const toggleSystem = useCallback((ns: { id: string; name: string; system_type: string | null }) => {
    setSelectedSystems(prev =>
      prev.some(s => s.id === ns.id)
        ? prev.filter(s => s.id !== ns.id)
        : [...prev, ns]
    );
  }, []);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser.id) throw new Error("Not authenticated");

      const slug = toSlug(name);

      // Build GeoJSON polygon from boundary points
      let geojson = null;
      if (boundaryPoints.length >= 3) {
        const ring = [...boundaryPoints, boundaryPoints[0]].map(([lat, lng]) => [lng, lat]);
        geojson = {
          type: "Polygon",
          coordinates: [ring],
        };
      }

      // Compute center from boundary or from selected towns default
      const lat = boundaryPoints.length > 0
        ? boundaryPoints.reduce((s, p) => s + p[0], 0) / boundaryPoints.length
        : null;
      const lng = boundaryPoints.length > 0
        ? boundaryPoints.reduce((s, p) => s + p[1], 0) / boundaryPoints.length
        : null;

      // 1. Create the territory
      const { data: territory, error: terrErr } = await supabase
        .from("territories")
        .insert({
          name,
          slug,
          level: "BIOREGION" as any,
          summary: description || null,
          created_by_user_id: currentUser.id,
          latitude: lat,
          longitude: lng,
          geojson: geojson as any,
        })
        .select("id")
        .single();
      if (terrErr) throw terrErr;

      const bioregionId = territory.id;

      // 2. Add bioregion members (towns)
      if (selectedTowns.length > 0) {
        const members = selectedTowns.map(t => ({
          bioregion_id: bioregionId,
          territory_id: t.id,
        }));
        const { error: memErr } = await supabase
          .from("bioregion_members" as any)
          .insert(members);
        if (memErr) console.error("Failed to add bioregion members:", memErr);
      }

      // 3. Link natural systems
      if (selectedSystems.length > 0) {
        const links = selectedSystems.map(ns => ({
          natural_system_id: ns.id,
          linked_id: bioregionId,
          linked_type: "territory" as any,
          linked_via: "bioregion_creation",
        }));
        const { error: nsErr } = await supabase
          .from("natural_system_links")
          .insert(links as any);
        if (nsErr) console.error("Failed to link natural systems:", nsErr);
      }

      // 4. Add creator as steward via trust edge
      await (supabase.from("trust_edges") as any).insert({
        from_node_id: currentUser.id,
        from_node_type: "user",
        to_node_id: bioregionId,
        to_node_type: "territory",
        edge_type: "stewardship",
        weight: 1.0,
        status: "active",
        evidence_count: 1,
      });

      // 5. Add user_territory association
      await supabase.from("user_territories").insert({
        user_id: currentUser.id,
        territory_id: bioregionId,
        attachment_type: "steward",
      } as any);

      return { id: bioregionId, slug };
    },
    onSuccess: (result) => {
      toast.success("Bioregion created!", { description: `${name} is now live.` });
      queryClient.invalidateQueries({ queryKey: ["territories"] });
      navigate(`/territories/${result.slug ?? result.id}`);
    },
    onError: (err: any) => {
      toast.error("Failed to create bioregion", { description: err.message });
    },
  });

  // Auth/XP gate
  if (!currentUser.id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <Mountain className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Please sign in to create a bioregion.</p>
            <Button onClick={() => navigate("/login")}>Sign in</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canCreate) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <Mountain className="h-10 w-10 text-muted-foreground mx-auto" />
            <h2 className="text-lg font-semibold">Experience required</h2>
            <p className="text-sm text-muted-foreground">
              You need to be at least <strong>Level 3</strong> to create a bioregion. Complete quests and contribute to the community to level up!
            </p>
            <Badge variant="outline">Your level: {xpLevel}</Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canNext = step === 0
    ? name.trim().length >= 3
    : step === 1
      ? selectedTowns.length >= 1
      : true;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
              <Mountain className="h-5 w-5 text-primary" />
              Create a Bioregion
            </h1>
            <p className="text-sm text-muted-foreground">Define an ecological territory that crosses administrative boundaries</p>
          </div>
        </div>

        <StepIndicator current={step} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {(() => { const Icon = STEPS[step].icon; return <Icon className="h-4 w-4 text-primary" />; })()}
              {STEPS[step].label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {step === 0 && (
              <StepIdentity name={name} setName={setName} description={description} setDescription={setDescription} />
            )}
            {step === 1 && (
              <StepTowns selected={selectedTowns} onToggle={toggleTown} />
            )}
            {step === 2 && (
              <StepNaturalSystems selected={selectedSystems} onToggle={toggleSystem} />
            )}
            {step === 3 && (
              <StepBoundary points={boundaryPoints} setPoints={setBoundaryPoints} center={mapCenter} />
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between mt-6">
          <Button
            variant="ghost"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext}
              className="gap-1.5"
            >
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !name.trim()}
              className="gap-1.5 bg-primary"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Create Bioregion
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
