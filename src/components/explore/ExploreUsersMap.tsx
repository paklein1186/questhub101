import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { XpLevelBadge } from "@/components/XpLevelBadge";
import { computeLevelFromXp } from "@/lib/xpCreditsConfig";

// Fix default marker icon path issue with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface MapUser {
  user_id: string;
  name: string;
  avatar_url: string | null;
  headline: string | null;
  xp: number;
  territories: { id: string; name: string; latitude?: number; longitude?: number }[];
}

interface Props {
  users: MapUser[];
  isLoggedIn: boolean;
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 1) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
    } else if (positions.length === 1) {
      map.setView(positions[0], 6);
    }
  }, [positions, map]);
  return null;
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899", "#14b8a6"];

function createDotIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3);"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

export function ExploreUsersMap({ users, isLoggedIn }: Props) {
  const navigate = useNavigate();

  // Group users by territory coordinate (cluster users at the same territory)
  const markers = useMemo(() => {
    const result: {
      lat: number;
      lng: number;
      territoryName: string;
      users: MapUser[];
    }[] = [];

    const coordMap = new Map<string, { lat: number; lng: number; territoryName: string; users: MapUser[] }>();

    for (const user of users) {
      for (const t of user.territories) {
        if (t.latitude == null || t.longitude == null) continue;
        const key = `${t.latitude.toFixed(4)},${t.longitude.toFixed(4)}`;
        if (!coordMap.has(key)) {
          coordMap.set(key, { lat: t.latitude, lng: t.longitude, territoryName: t.name, users: [] });
        }
        const entry = coordMap.get(key)!;
        if (!entry.users.some(u => u.user_id === user.user_id)) {
          entry.users.push(user);
        }
      }
    }

    coordMap.forEach((v) => result.push(v));
    return result;
  }, [users]);

  const positions = useMemo<[number, number][]>(
    () => markers.map((m) => [m.lat, m.lng]),
    [markers]
  );

  if (markers.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] rounded-xl border border-border bg-muted/30 text-muted-foreground text-sm">
        No location data available for the current results.
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-border" style={{ height: 500 }}>
      <MapContainer
        center={[20, 0]}
        zoom={2}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds positions={positions} />
        {markers.map((marker, idx) => (
          <Marker
            key={`${marker.lat}-${marker.lng}`}
            position={[marker.lat, marker.lng]}
            icon={createDotIcon(COLORS[idx % COLORS.length])}
          >
            <Popup maxWidth={280} minWidth={200}>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                <p className="font-semibold text-xs text-muted-foreground mb-1">{marker.territoryName}</p>
                {marker.users.slice(0, 10).map((u) => (
                  <button
                    key={u.user_id}
                    onClick={() => isLoggedIn && navigate(`/users/${u.user_id}`)}
                    className="flex items-center gap-2 w-full text-left hover:bg-muted/50 rounded p-1 transition-colors"
                  >
                    <div className="h-7 w-7 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center text-[10px] font-bold">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} className="h-full w-full object-cover" alt="" />
                      ) : (
                        u.name?.[0] ?? "?"
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{u.name}</p>
                      {u.headline && <p className="text-[10px] text-muted-foreground truncate">{u.headline}</p>}
                    </div>
                  </button>
                ))}
                {marker.users.length > 10 && (
                  <p className="text-[10px] text-muted-foreground text-center">+{marker.users.length - 10} more</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
