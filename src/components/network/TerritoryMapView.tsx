import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { TerritoryLeaderboardItem } from "@/hooks/useNetworkLeaderboardData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const MARKER_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899", "#14b8a6"];

/** Generate a GeoJSON circle polygon from a center point + radius in km */
function createCircleGeoJSON(lat: number, lng: number, radiusKm: number, points = 48): GeoJSON.Feature {
  const coords: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dLat = (radiusKm / 111.32) * Math.cos(angle);
    const dLng = (radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);
    coords.push([lng + dLng, lat + dLat]);
  }
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [coords] },
  };
}

/** Approximate radius by territory level */
function radiusForLevel(level: string | undefined): number {
  switch (level?.toUpperCase()) {
    case "GLOBAL": return 2000;
    case "CONTINENT": return 800;
    case "NATIONAL": return 250;
    case "REGION": return 80;
    case "PROVINCE": return 40;
    case "TOWN":
    case "LOCAL":
    default: return 15;
  }
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(([lat, lng]) => [lat, lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
    }
  }, [positions, map]);
  return null;
}

interface TerritoryGeoData {
  lat: number;
  lng: number;
  level?: string;
  geojson?: any;
}

interface Props {
  territories: TerritoryLeaderboardItem[];
}

export function TerritoryMapView({ territories }: Props) {
  const navigate = useNavigate();

  const territoryIds = useMemo(() => territories.map((t) => t.id), [territories]);
  const { data: geoData = {} } = useQuery({
    queryKey: ["territory-geo", territoryIds],
    queryFn: async () => {
      if (territoryIds.length === 0) return {};
      const { data } = await supabase
        .from("territories")
        .select("id, latitude, longitude, level, geojson")
        .in("id", territoryIds);
      const map: Record<string, TerritoryGeoData> = {};
      (data ?? []).forEach((t: any) => {
        if (t.latitude != null && t.longitude != null) {
          map[t.id] = { lat: t.latitude, lng: t.longitude, level: t.level, geojson: t.geojson };
        }
      });
      return map;
    },
    staleTime: 300_000,
  });

  const mappedTerritories = useMemo(
    () => territories.filter((t) => geoData[t.id]),
    [territories, geoData]
  );

  const positions = useMemo(
    () => mappedTerritories.map((t) => [geoData[t.id].lat, geoData[t.id].lng] as [number, number]),
    [mappedTerritories, geoData]
  );

  const unmappedCount = territories.length - mappedTerritories.length;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border overflow-hidden bg-card" style={{ height: "500px" }}>
        <MapContainer
          center={[30, 0]}
          zoom={2}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {positions.length > 0 && <FitBounds positions={positions} />}

          {mappedTerritories.map((t, i) => {
            const geo = geoData[t.id];
            const color = MARKER_COLORS[i % MARKER_COLORS.length];
            // Use stored GeoJSON if available, otherwise generate a circle boundary
            const geojsonData = geo.geojson || createCircleGeoJSON(geo.lat, geo.lng, radiusForLevel(geo.level));

            return (
              <GeoJSON
                key={`geo-${t.id}-${geo.lat}-${geo.lng}`}
                data={geojsonData}
                style={{
                  color,
                  weight: 2,
                  fillColor: color,
                  fillOpacity: 0.15,
                  opacity: 0.8,
                }}
                eventHandlers={{
                  click: () => navigate(`/territories/${t.id}`),
                  mouseover: (e: any) => {
                    e.target.setStyle({ fillOpacity: 0.35, weight: 3 });
                  },
                  mouseout: (e: any) => {
                    e.target.setStyle({ fillOpacity: 0.15, weight: 2 });
                  },
                }}
                onEachFeature={(_feature, layer) => {
                  layer.bindPopup(
                    `<div style="min-width:160px">
                      <h4 style="font-weight:600;font-size:13px;margin:0 0 4px">${t.name}</h4>
                      ${t.parent_name ? `<p style="font-size:11px;color:#888;margin:0 0 4px">${t.parent_name}</p>` : ""}
                      <div style="font-size:11px;display:flex;gap:8px">
                        <span>${t.quests} quests</span>
                        <span>${t.entities} entities</span>
                      </div>
                      <a href="/territories/${t.id}" style="font-size:11px;color:#3b82f6;text-decoration:none;margin-top:4px;display:block">View territory →</a>
                    </div>`
                  );
                }}
              />
            );
          })}
        </MapContainer>
      </div>

      {unmappedCount > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {unmappedCount} territor{unmappedCount > 1 ? "ies" : "y"} without coordinates — they'll appear on the map once located.
        </p>
      )}
    </div>
  );
}
