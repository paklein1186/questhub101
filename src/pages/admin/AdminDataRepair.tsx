import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { MapPin, AlertTriangle, Check, Save, X, RefreshCw, Wrench } from "lucide-react";

export default function AdminDataRepair() {
  const { toast } = useToast();
  const qc = useQueryClient();

  // ── Territory repair ──────────────────────────────────────
  const { data: territories = [], isLoading } = useQuery({
    queryKey: ["admin-territories-repair"],
    queryFn: async () => {
      const { data } = await supabase
        .from("territories")
        .select("id, name, level, latitude, longitude, geojson, parent_id, is_deleted")
        .eq("is_deleted", false)
        .order("name");
      return data ?? [];
    },
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLat, setEditLat] = useState("");
  const [editLng, setEditLng] = useState("");
  const [editGeoJson, setEditGeoJson] = useState("");

  const missingCoords = territories.filter((t: any) => t.latitude == null || t.longitude == null);
  const missingGeo = territories.filter((t: any) => !t.geojson);

  const startEdit = (t: any) => {
    setEditingId(t.id);
    setEditLat(t.latitude?.toString() ?? "");
    setEditLng(t.longitude?.toString() ?? "");
    setEditGeoJson(t.geojson ? JSON.stringify(t.geojson, null, 2) : "");
  };

  const saveEdit = async (id: string) => {
    const updates: any = {};
    if (editLat) updates.latitude = parseFloat(editLat);
    if (editLng) updates.longitude = parseFloat(editLng);
    if (editGeoJson.trim()) {
      try {
        updates.geojson = JSON.parse(editGeoJson);
      } catch {
        toast({ title: "Invalid GeoJSON", variant: "destructive" });
        return;
      }
    } else {
      updates.geojson = null;
    }

    const { error } = await supabase.from("territories").update(updates).eq("id", id);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Territory updated!" });
    setEditingId(null);
    qc.invalidateQueries({ queryKey: ["admin-territories-repair"] });
  };

  // ── Orphan detection ──────────────────────────────────────
  const { data: orphanedGuildMembers = 0 } = useQuery({
    queryKey: ["admin-orphan-guild-members"],
    queryFn: async () => {
      const { count } = await supabase
        .from("guild_members")
        .select("id", { count: "exact", head: true })
        .not("guild_id", "in", `(${territories.map(() => "''").join(",") || "''"})`)
      return count ?? 0;
    },
    enabled: false, // manual trigger
  });

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total territories</p>
          <p className="text-2xl font-bold">{territories.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Missing coordinates</p>
          <p className={`text-2xl font-bold ${missingCoords.length > 0 ? "text-destructive" : "text-primary"}`}>
            {missingCoords.length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Missing GeoJSON</p>
          <p className={`text-2xl font-bold ${missingGeo.length > 0 ? "text-warning" : "text-primary"}`}>
            {missingGeo.length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">With boundaries</p>
          <p className="text-2xl font-bold text-primary">{territories.length - missingGeo.length}</p>
        </div>
      </div>

      {/* Territory coordinates & GeoJSON editor */}
      <div>
        <h3 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
          <MapPin className="h-5 w-5" /> Territory Coordinates & Boundaries
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Fix missing coordinates, add GeoJSON boundary shapes for map polygons. Paste valid GeoJSON (Feature or FeatureCollection) in the GeoJSON field.
        </p>

        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Lat</TableHead>
                <TableHead>Lng</TableHead>
                <TableHead>GeoJSON</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {territories.map((t: any) => {
                const isEditing = editingId === t.id;
                const hasCoords = t.latitude != null && t.longitude != null;
                const hasGeo = !!t.geojson;

                return (
                  <TableRow key={t.id} className={!hasCoords ? "bg-destructive/5" : ""}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] capitalize">{t.level?.toLowerCase()}</Badge>
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          step="any"
                          value={editLat}
                          onChange={(e) => setEditLat(e.target.value)}
                          className="w-24 h-8 text-xs"
                          placeholder="Latitude"
                        />
                      ) : (
                        <span className={`text-xs ${hasCoords ? "" : "text-destructive"}`}>
                          {hasCoords ? t.latitude.toFixed(4) : "—"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          step="any"
                          value={editLng}
                          onChange={(e) => setEditLng(e.target.value)}
                          className="w-24 h-8 text-xs"
                          placeholder="Longitude"
                        />
                      ) : (
                        <span className={`text-xs ${hasCoords ? "" : "text-destructive"}`}>
                          {hasCoords ? t.longitude.toFixed(4) : "—"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Textarea
                          value={editGeoJson}
                          onChange={(e) => setEditGeoJson(e.target.value)}
                          className="text-[10px] font-mono h-20 min-w-[200px]"
                          placeholder='{"type":"Feature","geometry":{...}}'
                        />
                      ) : (
                        <span className="text-xs">
                          {hasGeo ? (
                            <Badge className="bg-primary/10 text-primary border-0 text-[10px]">
                              <Check className="h-3 w-3 mr-0.5" /> Has boundary
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              <AlertTriangle className="h-3 w-3 mr-0.5" /> None
                            </Badge>
                          )}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => saveEdit(t.id)}>
                            <Save className="h-3.5 w-3.5 text-primary" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingId(null)}>
                            <X className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEdit(t)}>
                          <Wrench className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {territories.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No territories found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
