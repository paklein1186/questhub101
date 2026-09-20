import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapContainer, TileLayer, GeoJSON, Circle, CircleMarker, Popup, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { TerritoryLeaderboardItem } from "@/hooks/useNetworkLeaderboardData";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

/**
 * How each level is drawn.
 * - Meta levels (world, continent, country, region, bioregion…) are outlines only, never filled, so they
 *   never capture clicks meant for what is inside them. They fade as the map zooms in and disappear past
 *   `hideAfterZoom`, leaving only the towns to click.
 * - Towns are discs a little larger than the real commune (`townKm`), never smaller than a readable dot,
 *   or their real contour once it is known.
 */
interface LevelStyle { key: string; rank: number; color: string; km: number; hideAfterZoom: number }
const LEVEL_STYLES: Record<string, LevelStyle> = {
  GLOBAL: { key: "global", rank: 0, color: "#6366f1", km: 2000, hideAfterZoom: 3 },
  CONTINENT: { key: "continent", rank: 1, color: "#8b5cf6", km: 800, hideAfterZoom: 5 },
  NATIONAL: { key: "national", rank: 2, color: "#f59e0b", km: 250, hideAfterZoom: 7 },
  REGION: { key: "region", rank: 3, color: "#10b981", km: 80, hideAfterZoom: 9 },
  PROVINCE: { key: "region", rank: 3, color: "#10b981", km: 40, hideAfterZoom: 10 },
  BIOREGION: { key: "bioregion", rank: 3, color: "#14b8a6", km: 60, hideAfterZoom: 11 },
  OTHER: { key: "other", rank: 3, color: "#ec4899", km: 40, hideAfterZoom: 10 },
  TOWN: { key: "town", rank: 4, color: "#3b82f6", km: 0, hideAfterZoom: 99 },
};
const styleForLevel = (level: string | undefined): LevelStyle => LEVEL_STYLES[(level ?? "").toUpperCase()] ?? LEVEL_STYLES.TOWN;

const TOWN_KM = 3;
const metersPerPixel = (lat: number, zoom: number) => (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;
const townRadiusPx = (lat: number, zoom: number) => Math.min(45, Math.max(5, (TOWN_KM * 1000) / metersPerPixel(lat, zoom)));
/** Levels whose real contour is worth fetching from OpenStreetMap. */
const BOUNDARY_LEVELS = new Set(["TOWN", "LOCAL", "BIOREGION", "REGION", "PROVINCE", "OTHER"]);

function ZoomWatcher({ onZoom }: { onZoom: (z: number) => void }): null {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) });
  useEffect(() => { onZoom(map.getZoom()); }, [map, onZoom]);
  return null;
}

function FitBounds({ positions }: { positions: [number, number][] }): null {
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
  /** Disable wheel zoom (useful on marketing pages where the page should scroll instead) */
  scrollWheelZoom?: boolean;
}

/** Try to geocode a territory name via Nominatim and persist the result */
async function geocodeAndPersist(id: string, name: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=json&limit=1`,
      { headers: { "User-Agent": "changethegame-app" } }
    );
    if (!res.ok) return null;
    const results = await res.json();
    if (!results.length) return null;
    const lat = parseFloat(results[0].lat);
    const lng = parseFloat(results[0].lon);
    if (isNaN(lat) || isNaN(lng)) return null;
    // Persist coordinates so future loads don't need geocoding
    await supabase
      .from("territories")
      .update({ latitude: lat, longitude: lng, updated_at: new Date().toISOString() })
      .eq("id", id);
    return { lat, lng };
  } catch {
    return null;
  }
}

export function TerritoryMapView({ territories, scrollWheelZoom = true }: Props) {
  const { t: tr } = useTranslation();
  const qc = useQueryClient();
  const [zoom, setZoom] = useState(2);
  const [boundaryTick, setBoundaryTick] = useState(0);
  const requestedBoundaries = useRef(new Set<string>());

  const territoryIds = useMemo(() => territories.map((t) => t.id), [territories]);
  const { data: geoData = {} } = useQuery({
    queryKey: ["territory-geo", territoryIds],
    queryFn: async () => {
      if (territoryIds.length === 0) return {};
      const { data } = await supabase
        .from("territories")
        .select("id, name, latitude, longitude, level, geojson")
        .in("id", territoryIds);
      const map: Record<string, TerritoryGeoData> = {};
      const toGeocode: { id: string; name: string }[] = [];

      (data ?? []).forEach((t: any) => {
        if (t.latitude != null && t.longitude != null) {
          map[t.id] = { lat: t.latitude, lng: t.longitude, level: t.level, geojson: t.geojson };
        } else {
          toGeocode.push({ id: t.id, name: t.name });
        }
      });

      // Auto-geocode territories missing coordinates (batch up to 5 at a time)
      if (toGeocode.length > 0) {
        const batch = toGeocode.slice(0, 10);
        // Nominatim requires sequential requests (rate limit), so run serially
        for (const item of batch) {
          const coords = await geocodeAndPersist(item.id, item.name);
          if (coords) {
            const original = (data ?? []).find((t: any) => t.id === item.id);
            map[item.id] = { lat: coords.lat, lng: coords.lng, level: original?.level, geojson: original?.geojson };
          }
        }
      }

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

  // Ask the server for the real outline of towns, bioregions… that have none yet (8 at a time).
  useEffect(() => {
    const missing = mappedTerritories
      .filter((t) => {
        const g = geoData[t.id];
        return !g.geojson && BOUNDARY_LEVELS.has((g.level ?? "TOWN").toUpperCase()) && !requestedBoundaries.current.has(t.id);
      })
      .slice(0, 8);
    if (!missing.length) return;
    missing.forEach((t) => requestedBoundaries.current.add(t.id));
    supabase.functions.invoke("territory-boundary", { body: { territory_ids: missing.map((t) => t.id) } })
      .then(({ data }) => {
        if ((data?.updated ?? 0) > 0) qc.invalidateQueries({ queryKey: ["territory-geo"] });
        setBoundaryTick((n) => n + 1);
      })
      .catch(() => {});
  }, [mappedTerritories, geoData, boundaryTick, qc]);

  const unmappedCount = territories.length - mappedTerritories.length;
  const levelsPresent = useMemo(() => {
    const seen = new Map<string, LevelStyle>();
    for (const t of mappedTerritories) {
      const st = styleForLevel(geoData[t.id].level);
      if (!seen.has(st.key)) seen.set(st.key, st);
    }
    return [...seen.values()].sort((a, b) => a.rank - b.rank);
  }, [mappedTerritories, geoData]);

  return (
    <div className="space-y-3">
      <style>{`.leaflet-interactive:focus { outline: none; }`}</style>
      <div className="relative rounded-2xl border border-border overflow-hidden bg-card" style={{ height: "500px" }}>
        <MapContainer
          center={[30, 0]}
          zoom={2}
          scrollWheelZoom={scrollWheelZoom}
          style={{ height: "100%", width: "100%" }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {positions.length > 0 && <FitBounds positions={positions} />}

          <ZoomWatcher onZoom={setZoom} />

          {/* Meta levels first so towns are drawn on top and stay clickable. */}
          {[...mappedTerritories]
            .sort((x, y) => styleForLevel(geoData[x.id].level).rank - styleForLevel(geoData[y.id].level).rank)
            .map((t) => {
              const geo = geoData[t.id];
              const st = styleForLevel(geo.level);
              if (zoom > st.hideAfterZoom) return null;

              const popup = (
                <Popup>
                  <div style={{ minWidth: 160 }}>
                    <h4 style={{ fontWeight: 600, fontSize: 13, margin: "0 0 4px" }}>{t.name}</h4>
                    {t.parent_name && <p style={{ fontSize: 11, color: "#888", margin: "0 0 4px" }}>{t.parent_name}</p>}
                    <div style={{ fontSize: 11, display: "flex", gap: 8 }}>
                      <span>{t.quests} quests</span>
                      <span>{t.entities} entities</span>
                    </div>
                    <a href={`/territories/${t.id}`} style={{ fontSize: 11, color: "#3b82f6", textDecoration: "none", marginTop: 4, display: "block" }}>
                      {tr("territoryMap.view")}
                    </a>
                  </div>
                </Popup>
              );
              const label = <Tooltip sticky direction="top">{t.name}</Tooltip>;

              // Towns: the real contour when known and zoomed in, otherwise a disc slightly larger than the commune.
              if (st.rank >= 4) {
                if (geo.geojson && zoom >= 10) {
                  return (
                    <GeoJSON key={`geo-${t.id}`} data={geo.geojson}
                      style={{ color: st.color, weight: 2, fillColor: st.color, fillOpacity: 0.22, opacity: 0.9 }}>
                      {label}{popup}
                    </GeoJSON>
                  );
                }
                return (
                  <CircleMarker key={`dot-${t.id}`} center={[geo.lat, geo.lng]} radius={townRadiusPx(geo.lat, zoom)}
                    pathOptions={{ color: "#fff", weight: 1.5, fillColor: st.color, fillOpacity: zoom < 9 ? 0.85 : 0.3 }}>
                    {label}{popup}
                  </CircleMarker>
                );
              }

              // Meta levels: outline only (real contour when known), fading as we zoom, plus a small centre dot to click.
              const fade = Math.min(1, Math.max(0.25, (st.hideAfterZoom - zoom + 1) / 3));
              const outline = { color: st.color, weight: 2.5, fill: false, opacity: 0.75 * fade, dashArray: geo.geojson ? undefined : "6 4" };
              return (
                <Fragment key={`area-${t.id}`}>
                  {geo.geojson
                    ? <GeoJSON key={`geo-${t.id}-${zoom > 8}`} data={geo.geojson} style={outline}>{label}</GeoJSON>
                    : <Circle center={[geo.lat, geo.lng]} radius={st.km * 1000} pathOptions={outline}>{label}</Circle>}
                  <CircleMarker center={[geo.lat, geo.lng]} radius={5}
                    pathOptions={{ color: st.color, weight: 2, fillColor: st.color, fillOpacity: 0.2, opacity: 0.9 * fade }}>
                    {label}{popup}
                  </CircleMarker>
                </Fragment>
              );
            })}
        </MapContainer>
        {levelsPresent.length > 1 && (
          <div className="absolute bottom-3 left-3 z-[400] rounded-lg bg-background/90 backdrop-blur px-2.5 py-2 text-[11px] shadow border border-border space-y-1">
            {levelsPresent.map((l) => (
              <div key={l.key} className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
                {tr(`territoryMap.levels.${l.key}`)}
              </div>
            ))}
            <p className="text-muted-foreground pt-0.5">{tr("territoryMap.zoomHint")}</p>
          </div>
        )}
      </div>

      {unmappedCount > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {unmappedCount} territor{unmappedCount > 1 ? "ies" : "y"} without coordinates — they'll appear on the map once located.
        </p>
      )}
    </div>
  );
}
