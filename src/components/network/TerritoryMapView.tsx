import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { TerritoryLeaderboardItem } from "@/hooks/useNetworkLeaderboardData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Fix leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function createCustomIcon(color: string) {
  return L.divIcon({
    className: "custom-territory-marker",
    html: `<div style="
      width: 28px; height: 28px;
      background: ${color};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
    "><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

const MARKER_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];

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
        .select("id, latitude, longitude, geojson")
        .in("id", territoryIds);
      const map: Record<string, TerritoryGeoData> = {};
      (data ?? []).forEach((t: any) => {
        if (t.latitude != null && t.longitude != null) {
          map[t.id] = { lat: t.latitude, lng: t.longitude, geojson: t.geojson };
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

          {/* GeoJSON boundary shapes */}
          {mappedTerritories.map((t, i) => {
            const geo = geoData[t.id];
            if (!geo?.geojson) return null;
            const color = MARKER_COLORS[i % MARKER_COLORS.length];
            return (
              <GeoJSON
                key={`geo-${t.id}`}
                data={geo.geojson}
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
                    </div>`
                  );
                }}
              />
            );
          })}

          {/* Point markers for territories without GeoJSON */}
          {mappedTerritories.map((t, i) => {
            const geo = geoData[t.id];
            if (geo?.geojson) return null; // skip if has boundary
            return (
              <Marker
                key={t.id}
                position={[geo.lat, geo.lng]}
                icon={createCustomIcon(MARKER_COLORS[i % MARKER_COLORS.length])}
                eventHandlers={{
                  click: () => navigate(`/territories/${t.id}`),
                }}
              >
                <Popup>
                  <div className="min-w-[180px] space-y-2 p-1">
                    <h4 className="font-semibold text-sm">{t.name}</h4>
                    {t.parent_name && (
                      <p className="text-xs text-gray-500">{t.parent_name}</p>
                    )}
                    <div className="flex gap-2 text-xs">
                      <span>{t.quests} quests</span>
                      <span>{t.entities} entities</span>
                      <span>{t.memoryContributions} memory</span>
                    </div>
                    <p className="text-[11px] text-gray-500 line-clamp-2">{t.synthesis}</p>
                    <button
                      onClick={() => navigate(`/territories/${t.id}`)}
                      className="text-xs text-blue-600 hover:underline font-medium"
                    >
                      View territory →
                    </button>
                  </div>
                </Popup>
              </Marker>
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
