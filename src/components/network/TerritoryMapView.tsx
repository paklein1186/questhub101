import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Badge } from "@/components/ui/badge";
import { Compass, Users, Brain, MapPin } from "lucide-react";
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

interface Props {
  territories: TerritoryLeaderboardItem[];
}

export function TerritoryMapView({ territories }: Props) {
  const navigate = useNavigate();

  // Fetch coordinates from DB
  const territoryIds = useMemo(() => territories.map((t) => t.id), [territories]);
  const { data: coords = {} } = useQuery({
    queryKey: ["territory-coords", territoryIds],
    queryFn: async () => {
      if (territoryIds.length === 0) return {};
      const { data } = await supabase
        .from("territories")
        .select("id, latitude, longitude")
        .in("id", territoryIds)
        .not("latitude", "is", null)
        .not("longitude", "is", null);
      const map: Record<string, { lat: number; lng: number }> = {};
      (data ?? []).forEach((t: any) => {
        if (t.latitude != null && t.longitude != null) {
          map[t.id] = { lat: t.latitude, lng: t.longitude };
        }
      });
      return map;
    },
    staleTime: 300_000,
  });

  const mappedTerritories = useMemo(
    () => territories.filter((t) => coords[t.id]),
    [territories, coords]
  );

  const positions = useMemo(
    () => mappedTerritories.map((t) => [coords[t.id].lat, coords[t.id].lng] as [number, number]),
    [mappedTerritories, coords]
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
            const pos = coords[t.id];
            const score = t.quests * 3 + t.entities * 2 + t.memoryContributions;
            return (
              <Marker
                key={t.id}
                position={[pos.lat, pos.lng]}
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
