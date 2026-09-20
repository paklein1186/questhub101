// Récupère le vrai contour d'un territoire (commune, biorégion, région…) sur OpenStreetMap
// (Nominatim) et l'enregistre dans territories.geojson, pour que la carte dessine la vraie zone.
// Ne remplace jamais un contour déjà présent (dessiné à la main ou déjà récupéré). Utilisateurs
// connectés seulement ; 8 territoires par appel, requêtes espacées d'une seconde (règle d'usage OSM).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const NOMINATIM_URL = Deno.env.get("NOMINATIM_URL") ?? "https://nominatim.openstreetmap.org";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://changethegame.xyz";
const MAX_PER_CALL = 8;
const RECHECK_DAYS = 30;
const MAX_POINTS = 1500;
const BIG_LEVELS = new Set(["GLOBAL", "CONTINENT", "NATIONAL"]);

// Distance maximale entre le centre connu du territoire et le contour trouvé (km), par niveau.
const maxDistanceKm = (level: string) => ({ BIOREGION: 200, REGION: 250, PROVINCE: 120, OTHER: 120 } as Record<string, number>)[level] ?? 40;

const km = (aLat: number, aLon: number, bLat: number, bLon: number) => {
  const r = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(r(bLat - aLat) / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(r(bLon - aLon) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function countPoints(c: any): number {
  return Array.isArray(c) && Array.isArray(c[0]) ? c.reduce((n: number, x: any) => n + countPoints(x), 0) : Array.isArray(c) ? 1 : 0;
}
/** Garde au plus MAX_POINTS points en gardant un point sur k de chaque anneau (fermé). */
function thin(geom: any): any {
  const total = countPoints(geom.coordinates);
  if (total <= MAX_POINTS) return geom;
  const k = Math.ceil(total / MAX_POINTS);
  const ring = (r: number[][]) => {
    const out = r.filter((_, i) => i % k === 0);
    if (out.length < 4) return r;
    out.push(out[0]);
    return out;
  };
  return geom.type === "Polygon"
    ? { type: "Polygon", coordinates: geom.coordinates.map(ring) }
    : { type: "MultiPolygon", coordinates: geom.coordinates.map((p: number[][][]) => p.map(ring)) };
}
const centroid = (geom: any): [number, number] | null => {
  const pts: number[][] = [];
  const walk = (c: any) => { if (Array.isArray(c) && typeof c[0] === "number") pts.push(c); else if (Array.isArray(c)) c.forEach(walk); };
  walk(geom.coordinates);
  if (!pts.length) return null;
  return [pts.reduce((s, p) => s + p[1], 0) / pts.length, pts.reduce((s, p) => s + p[0], 0) / pts.length];
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const { data: auth } = await anon.auth.getUser(token);
  if (!auth?.user) return json({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const ids: string[] = (Array.isArray(body.territory_ids) ? body.territory_ids : []).filter((x: unknown) => typeof x === "string").slice(0, MAX_PER_CALL);
  if (!ids.length) return json({ updated: 0 });

  const { data: rows } = await sb.from("territories").select("id, name, level, parent_id, latitude, longitude, geojson, stats").in("id", ids).eq("is_deleted", false);
  const parentIds = [...new Set((rows ?? []).map((r: any) => r.parent_id).filter(Boolean))];
  const { data: parents } = parentIds.length ? await sb.from("territories").select("id, name").in("id", parentIds) : { data: [] as any[] };
  const parentName = new Map((parents ?? []).map((p: any) => [p.id, p.name]));

  let updated = 0;
  let lastCall = 0;
  for (const t of rows ?? []) {
    const level = String(t.level ?? "").toUpperCase();
    const stats = (t.stats as Record<string, any>) ?? {};
    const checked = stats.boundary_checked_at ? Date.parse(stats.boundary_checked_at) : 0;
    if (t.geojson || BIG_LEVELS.has(level) || (checked && Date.now() - checked < RECHECK_DAYS * 86_400_000)) continue;

    const wait = 1_100 - (Date.now() - lastCall);
    if (wait > 0) await sleep(wait);
    lastCall = Date.now();

    let geometry: any = null;
    try {
      const q = [t.name, parentName.get(t.parent_id)].filter(Boolean).join(", ");
      const res = await fetch(`${NOMINATIM_URL}/search?q=${encodeURIComponent(q)}&format=jsonv2&limit=6&polygon_geojson=1&polygon_threshold=0.003&accept-language=fr`, {
        headers: { "User-Agent": `changethegame-territory-boundary/1.0 (${SITE_URL})` },
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) {
        const results: any[] = await res.json();
        const limit = maxDistanceKm(level);
        const hit = results.find((r) => {
          const g = r.geojson;
          if (!g || (g.type !== "Polygon" && g.type !== "MultiPolygon")) return false;
          if (t.latitude != null && t.longitude != null) {
            const c = centroid(g);
            if (c && km(Number(t.latitude), Number(t.longitude), c[0], c[1]) > limit) return false;
          }
          return true;
        });
        if (hit) geometry = thin(hit.geojson);
      }
    } catch { /* on réessaiera dans RECHECK_DAYS */ }

    const nextStats = { ...stats, boundary_checked_at: new Date().toISOString(), boundary_status: geometry ? "osm" : "none" };
    await sb.from("territories").update(geometry ? { geojson: geometry, stats: nextStats } : { stats: nextStats }).eq("id", t.id);
    if (geometry) updated++;
  }
  return json({ updated });
});
