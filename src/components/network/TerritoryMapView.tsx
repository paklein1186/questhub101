import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapContainer, TileLayer, GeoJSON, Circle, CircleMarker, Popup, useMap, useMapEvents } from "react-leaflet";
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
  GLOBAL: { key: "global", rank: 0, color: "#4338ca", km: 2000, hideAfterZoom: 3 },
  CONTINENT: { key: "continent", rank: 1, color: "#6d28d9", km: 800, hideAfterZoom: 5 },
  NATIONAL: { key: "national", rank: 2, color: "#9a3412", km: 250, hideAfterZoom: 7 },
  REGION: { key: "region", rank: 3, color: "#7e22ce", km: 80, hideAfterZoom: 9 },
  PROVINCE: { key: "region", rank: 3, color: "#7e22ce", km: 40, hideAfterZoom: 10 },
  BIOREGION: { key: "bioregion", rank: 3, color: "#0e7490", km: 60, hideAfterZoom: 11 },
  OTHER: { key: "other", rank: 3, color: "#be185d", km: 40, hideAfterZoom: 10 },
  TOWN: { key: "town", rank: 4, color: "#1d4ed8", km: 0, hideAfterZoom: 99 },
};
const styleForLevel = (level: string | undefined): LevelStyle => LEVEL_STYLES[(level ?? "").toUpperCase()] ?? LEVEL_STYLES.TOWN;

const TOWN_KM = 3;
const metersPerPixel = (lat: number, zoom: number) => (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;
const townRadiusPx = (lat: number, zoom: number) => Math.min(45, Math.max(5, (TOWN_KM * 1000) / metersPerPixel(lat, zoom)));
/** Levels whose real contour is worth fetching from OpenStreetMap. */
const BOUNDARY_LEVELS = new Set(["TOWN", "LOCAL", "BIOREGION", "REGION", "PROVINCE", "OTHER"]);

interface MapItem { t: TerritoryLeaderboardItem; geo: TerritoryGeoData; st: LevelStyle }

const boxCache = new WeakMap<object, [number, number, number, number]>();
/** [minLng, minLat, maxLng, maxLat] of a GeoJSON geometry / feature. */
function geoBox(geo: any): [number, number, number, number] {
  const cached = boxCache.get(geo);
  if (cached) return cached;
  const box: [number, number, number, number] = [180, 90, -180, -90];
  const walk = (c: any) => {
    if (Array.isArray(c) && typeof c[0] === "number") {
      box[0] = Math.min(box[0], c[0]); box[1] = Math.min(box[1], c[1]); box[2] = Math.max(box[2], c[0]); box[3] = Math.max(box[3], c[1]);
    } else if (Array.isArray(c)) c.forEach(walk);
  };
  walk((geo.geometry ?? geo).coordinates);
  boxCache.set(geo, box);
  return box;
}

function ringContains(ring: number[][], lng: number, lat: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Point-in-polygon for Polygon / MultiPolygon (holes respected). */
function pointInGeo(lat: number, lng: number, geo: any): boolean {
  const g = geo.geometry ?? geo;
  const [minX, minY, maxX, maxY] = geoBox(geo);
  if (lng < minX || lng > maxX || lat < minY || lat > maxY) return false;
  const polys: number[][][][] = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
  return polys.some((rings) => ringContains(rings[0], lng, lat) && !rings.slice(1).some((h) => ringContains(h, lng, lat)));
}

/** The territory under the pointer: the most local level wins over the wider ones that contain it. */
function hitTest(map: L.Map, ll: L.LatLng, items: MapItem[], zoom: number): MapItem | null {
  const cursor = map.latLngToContainerPoint(ll);
  let best: { item: MapItem; size: number } | null = null;
  for (const it of items) {
    const { geo, st } = it;
    const centre = map.latLngToContainerPoint([geo.lat, geo.lng]);
    const dPx = cursor.distanceTo(centre);
    let size: number | null = null;
    if (st.rank >= 4) {
      if (geo.geojson && zoom >= 10) {
        if (pointInGeo(ll.lat, ll.lng, geo.geojson)) size = dPx;
      } else if (dPx <= townRadiusPx(geo.lat, zoom) + 3) size = dPx;
    } else if (dPx <= 9) {
      size = 0;
    } else if (geo.geojson) {
      if (pointInGeo(ll.lat, ll.lng, geo.geojson)) { const b = geoBox(geo.geojson); size = (b[2] - b[0]) * (b[3] - b[1]) * 1e4; }
    } else if (map.distance(ll, [geo.lat, geo.lng]) <= st.km * 1000) {
      size = st.km * st.km;
    }
    if (size === null) continue;
    if (!best || st.rank > best.item.st.rank || (st.rank === best.item.st.rank && size < best.size)) best = { item: it, size };
  }
  return best?.item ?? null;
}

/** Hover label + click popup are computed from the pointer position, not from each layer. */
function HoverPicker({ items, zoom, onHover, onPick }: {
  items: MapItem[]; zoom: number;
  onHover: (item: MapItem | null, x: number, y: number) => void;
  onPick: (item: MapItem, latlng: L.LatLng) => void;
}): null {
  const map = useMapEvents({
    mousemove: (e) => {
      const hit = hitTest(map, e.latlng, items, zoom);
      map.getContainer().style.cursor = hit ? "pointer" : "";
      onHover(hit, e.containerPoint.x, e.containerPoint.y);
    },
    mouseout: () => { map.getContainer().style.cursor = ""; onHover(null, 0, 0); },
    zoomstart: () => onHover(null, 0, 0),
    click: (e) => {
      const hit = hitTest(map, e.latlng, items, zoom);
      if (hit) onPick(hit, e.latlng);
    },
  });
  return null;
}

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
  const [hovered, setHovered] = useState<MapItem | null>(null);
  const [picked, setPicked] = useState<{ item: MapItem; latlng: L.LatLng } | null>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const requestedBoundaries = useRef(new Set<string>());
  const boundaryUnavailable = useRef(false);

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
    if (boundaryUnavailable.current) return;
    const missing = mappedTerritories
      .filter((t) => {
        const g = geoData[t.id];
        return !g.geojson && BOUNDARY_LEVELS.has((g.level ?? "TOWN").toUpperCase()) && !requestedBoundaries.current.has(t.id);
      })
      .slice(0, 8);
    if (!missing.length) return;
    missing.forEach((t) => requestedBoundaries.current.add(t.id));
    supabase.functions.invoke("territory-boundary", { body: { territory_ids: missing.map((t) => t.id) } })
      .then(({ data, error }) => {
        // Function not deployed / signed out: stop asking instead of retrying for every batch.
        if (error) { boundaryUnavailable.current = true; return; }
        if ((data?.updated ?? 0) > 0) qc.invalidateQueries({ queryKey: ["territory-geo"] });
        setBoundaryTick((n) => n + 1);
      })
      .catch(() => { boundaryUnavailable.current = true; });
  }, [mappedTerritories, geoData, boundaryTick, qc]);

  // What is drawn at this zoom, wide levels first so the most local ones end up on top.
  const items: MapItem[] = useMemo(
    () => mappedTerritories
      .map((t) => ({ t, geo: geoData[t.id], st: styleForLevel(geoData[t.id].level) }))
      .filter((i) => zoom <= i.st.hideAfterZoom)
      .sort((a, b) => a.st.rank - b.st.rank),
    [mappedTerritories, geoData, zoom],
  );

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
          <HoverPicker
            items={items}
            zoom={zoom}
            onHover={(item, x, y) => {
              if (labelRef.current) labelRef.current.style.transform = `translate(${x + 14}px, ${y + 14}px)`;
              setHovered((prev) => (prev?.t.id === item?.t.id ? prev : item));
            }}
            onPick={(item, latlng) => setPicked({ item, latlng })}
          />

          {/* Layers are purely visual: hover and click are resolved by HoverPicker. */}
          {items.map(({ t, geo, st }) => {
            const on = hovered?.t.id === t.id;

            // Towns: the real contour when known and zoomed in, otherwise a disc slightly larger than the commune.
            if (st.rank >= 4) {
              if (geo.geojson && zoom >= 10) {
                return (
                  <GeoJSON key={`geo-${t.id}-${on}`} data={geo.geojson} interactive={false}
                    style={{ color: st.color, weight: on ? 3.5 : 2, fillColor: st.color, fillOpacity: on ? 0.4 : 0.22, opacity: 0.95 }} />
                );
              }
              return (
                <CircleMarker key={`dot-${t.id}`} center={[geo.lat, geo.lng]} radius={townRadiusPx(geo.lat, zoom) + (on ? 2 : 0)} interactive={false}
                  pathOptions={{ color: "#fff", weight: on ? 2.5 : 1.5, fillColor: st.color, fillOpacity: (zoom < 9 ? 0.85 : 0.3) + (on ? 0.25 : 0) }} />
              );
            }

            // Meta levels: light tint and white casing under a coloured outline, fading as we zoom in.
            const fade = Math.min(1, Math.max(0.3, (st.hideAfterZoom - zoom + 1) / 3));
            const tint = { stroke: false, fillColor: st.color, fillOpacity: (on ? 0.16 : 0.09) * fade };
            const casing = { color: "#ffffff", weight: on ? 7 : 6, fill: false, opacity: 0.85 * fade };
            const outline = { color: st.color, weight: on ? 4.5 : 3, fill: false, opacity: (on ? 1 : 0.95) * fade, dashArray: geo.geojson ? undefined : "8 5" };
            return (
              <Fragment key={`area-${t.id}-${on}`}>
                {geo.geojson ? (
                  <>
                    <GeoJSON data={geo.geojson} style={tint} interactive={false} />
                    <GeoJSON data={geo.geojson} style={casing} interactive={false} />
                    <GeoJSON data={geo.geojson} style={outline} interactive={false} />
                  </>
                ) : (
                  <>
                    <Circle center={[geo.lat, geo.lng]} radius={st.km * 1000} pathOptions={tint} interactive={false} />
                    <Circle center={[geo.lat, geo.lng]} radius={st.km * 1000} pathOptions={casing} interactive={false} />
                    <Circle center={[geo.lat, geo.lng]} radius={st.km * 1000} pathOptions={outline} interactive={false} />
                  </>
                )}
                <CircleMarker center={[geo.lat, geo.lng]} radius={on ? 8 : 6} interactive={false}
                  pathOptions={{ color: "#fff", weight: 2, fillColor: st.color, fillOpacity: 0.9 * fade, opacity: fade }} />
              </Fragment>
            );
          })}

          {picked && (
            <Popup position={picked.latlng} eventHandlers={{ remove: () => setPicked(null) }}>
              <div style={{ minWidth: 160 }}>
                <h4 style={{ fontWeight: 600, fontSize: 13, margin: "0 0 4px" }}>{picked.item.t.name}</h4>
                {picked.item.t.parent_name && <p style={{ fontSize: 11, color: "#888", margin: "0 0 4px" }}>{picked.item.t.parent_name}</p>}
                <div style={{ fontSize: 11, display: "flex", gap: 8 }}>
                  <span>{picked.item.t.quests} quests</span>
                  <span>{picked.item.t.entities} entities</span>
                </div>
                <a href={`/territories/${picked.item.t.id}`} style={{ fontSize: 11, color: "#3b82f6", textDecoration: "none", marginTop: 4, display: "block" }}>
                  {tr("territoryMap.view")}
                </a>
              </div>
            </Popup>
          )}
        </MapContainer>
        <div ref={labelRef} className="pointer-events-none absolute left-0 top-0 z-[500]" style={{ transform: "translate(-999px, -999px)" }}>
          {hovered && (
            <div className="rounded-md bg-background/95 backdrop-blur px-2.5 py-1.5 shadow border border-border text-xs leading-tight">
              <p className="font-semibold text-foreground">{hovered.t.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {tr(`territoryMap.levels.${hovered.st.key}`)}{hovered.t.parent_name ? ` · ${hovered.t.parent_name}` : ""}
              </p>
            </div>
          )}
        </div>
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
