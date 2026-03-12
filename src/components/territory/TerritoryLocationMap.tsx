import { useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";

// Fix default marker icons (Leaflet + bundler issue)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/* ── helpers ── */

function createCircleGeoJSON(lat: number, lng: number, radiusKm: number, points = 48): GeoJSON.Feature {
  const coords: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dLat = (radiusKm / 111.32) * Math.cos(angle);
    const dLng = (radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);
    coords.push([lng + dLng, lat + dLat]);
  }
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [coords] } };
}

function radiusForLevel(level: string | undefined): number {
  switch (level?.toUpperCase()) {
    case "GLOBAL": return 2000;
    case "CONTINENT": return 800;
    case "COUNTRY": return 250;
    case "REGION": return 80;
    case "PROVINCE": return 40;
    case "LOCALITY":
    default: return 15;
  }
}

/** Deterministic jitter so same user always lands same spot */
function jitter(seed: string, range: number): [number, number] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  const a = ((h & 0xffff) / 0xffff - 0.5) * range;
  const b = (((h >>> 16) & 0xffff) / 0xffff - 0.5) * range;
  return [a, b];
}

const userIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:28px;height:28px;border-radius:50%;background:hsl(var(--primary));border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function FitView({ center, zoom }: { center: [number, number]; zoom: number }): null {
  const map = useMap();
  useEffect(() => {
    // Fix grey tiles by forcing a resize recalculation
    setTimeout(() => map.invalidateSize(), 100);
    map.setView(center, zoom, { animate: false });
  }, [center, zoom, map]);
  return null;
}

/* ── types ── */

interface UserPin {
  userId: string;
  name: string;
  avatarUrl: string | null;
  lat: number;
  lng: number;
}

interface Props {
  territoryId: string;
}

/* ── component ── */

export function TerritoryLocationMap({ territoryId }: Props) {
  // Fetch territory geo
  const { data: territory, isLoading: geoLoading } = useQuery({
    queryKey: ["territory-geo-detail", territoryId],
    queryFn: async () => {
      const { data } = await supabase
        .from("territories")
        .select("id, latitude, longitude, level, geojson, name")
        .eq("id", territoryId)
        .single();
      return data;
    },
    staleTime: 300_000,
  });

  // Fetch users associated with this territory
  const { data: users = [] } = useQuery({
    queryKey: ["territory-user-pins", territoryId],
    queryFn: async () => {
      const { data: ut } = await supabase
        .from("user_territories" as any)
        .select("user_id")
        .eq("territory_id", territoryId)
        .limit(200);

      if (!ut || ut.length === 0) return [];

      const userIds = (ut as any[]).map((u) => u.user_id as string);
      const chunks: any[] = [];
      for (let i = 0; i < userIds.length; i += 50) {
        const { data } = await supabase
          .from("profiles")
          .select("user_id, name, avatar_url")
          .in("user_id", userIds.slice(i, i + 50));
        if (data) chunks.push(...data);
      }
      return chunks as { user_id: string; name: string; avatar_url: string | null }[];
    },
    enabled: !!territoryId,
    staleTime: 300_000,
  });

  const hasCoords = territory?.latitude != null && territory?.longitude != null;

  const pins: UserPin[] = useMemo(() => {
    if (!hasCoords || !users.length) return [];
    const lat = territory!.latitude!;
    const lng = territory!.longitude!;
    const spread = radiusForLevel(territory!.level ?? undefined) * 0.4 / 111.32; // rough degrees
    return users.map((u) => {
      const [jLat, jLng] = jitter(u.user_id, spread);
      return {
        userId: u.user_id,
        name: u.name || "User",
        avatarUrl: u.avatar_url,
        lat: lat + jLat,
        lng: lng + jLng,
      };
    });
  }, [users, territory, hasCoords]);

  const zoomForLevel = (level: string | undefined) => {
    switch (level?.toUpperCase()) {
      case "GLOBAL": return 2;
      case "CONTINENT": return 3;
      case "COUNTRY": return 5;
      case "REGION": return 7;
      case "PROVINCE": return 8;
      case "LOCALITY":
      default: return 10;
    }
  };

  if (geoLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card flex items-center justify-center" style={{ height: 350 }}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasCoords) return null; // territory has no coordinates — skip map

  const center: [number, number] = [territory!.latitude!, territory!.longitude!];
  const geojsonData = (territory!.geojson as any) || createCircleGeoJSON(center[0], center[1], radiusForLevel(territory!.level ?? undefined));

  return (
    <div className="rounded-2xl border border-border overflow-hidden bg-card" style={{ height: 350 }}>
      <MapContainer
        center={center}
        zoom={zoomForLevel(territory!.level ?? undefined)}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitView center={center} zoom={zoomForLevel(territory!.level ?? undefined)} />

        <GeoJSON
          data={geojsonData}
          style={{
            color: "hsl(var(--primary))",
            weight: 2,
            fillColor: "hsl(var(--primary))",
            fillOpacity: 0.1,
            opacity: 0.6,
          }}
        />

        {pins.map((p) => (
          <Marker key={p.userId} position={[p.lat, p.lng]} icon={userIcon}>
            <Popup>
              <div style={{ minWidth: 120 }}>
                <Link
                  to={`/profile/${p.userId}`}
                  style={{ fontWeight: 600, fontSize: 13, color: "hsl(var(--primary))", textDecoration: "none" }}
                >
                  {p.name}
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
