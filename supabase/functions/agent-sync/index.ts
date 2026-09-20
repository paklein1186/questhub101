// Synchronisation bidirectionnelle avec un agent externe qui expose le contrat
// « Space2 » : GET /lieux, POST /lieux/{id}/link, POST /events, PUT /access,
// PUT /lieux/{id}/masque. changethegame appelle l'agent ; l'agent n'a jamais
// d'accès à notre base.
//
// Appel : cron (en-tête x-cron-secret) pour tous les agents `sync_enabled`,
// ou utilisateur connecté qui gère l'agent (créateur ou admin de la guilde propriétaire) (body { agent_id, dry_run? }).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SITE_URL = Deno.env.get("SITE_URL") ?? "https://changethegame.xyz";
const DEFAULT_MAX_CREATE = 25;

// ── helpers ──────────────────────────────────────────────────────────────
function fmt(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) return v.map((x) => fmt(x)).filter(Boolean).join(", ");
  if (typeof v === "object") return Object.values(v as Record<string, unknown>).map(fmt).filter(Boolean).join(", ");
  return String(v).trim();
}

function describeLieu(lieu: any, agentName: string): string {
  const parts: string[] = [];
  if (fmt(lieu.resume)) parts.push(fmt(lieu.resume));
  const lines: [string, unknown][] = [
    ["Activités", lieu.activites], ["Publics", lieu.publics], ["Territoire", lieu.territoire],
    ["Besoins", lieu.besoins], ["Enjeux", lieu.enjeux],
  ];
  const detail = lines.filter(([, v]) => fmt(v)).map(([k, v]) => `${k} : ${fmt(v)}`);
  if (detail.length) parts.push(detail.join("\n"));
  parts.push(`Source : ${agentName}.`);
  return parts.join("\n\n").slice(0, 4000);
}

function needCategory(text: string): string {
  if (/financ|fund|subvention|don\b|budget|mécén|mecen/i.test(text)) return "FUNDING";
  if (/comp[ée]tence|b[ée]n[ée]vol|skill|expert|formation|accompagn|facilit/i.test(text)) return "SKILLS";
  if (/partenar|r[ée]seau|allian|collabor/i.test(text)) return "PARTNERSHIPS";
  return "RESOURCES";
}

function needLabels(lieu: any): string[] {
  const raw = Array.isArray(lieu.besoins_mis_en_avant) ? lieu.besoins_mis_en_avant : [];
  return raw
    .map((n: any) => (typeof n === "string" ? n : n?.label ?? n?.titre ?? n?.type ?? ""))
    .map((s: string) => s.trim())
    .filter(Boolean);
}

// ── rapprochement avec les territoires et thèmes de changethegame ─────────
// Les agents externes parlent français ou dans la langue locale (« Belgique »,
// « tiers-lieux ») alors que la base est en anglais (« Belgium », « Third Spaces »).
// Même bloc dans agent-manifest et agent-sync : à garder identique.
const normTax = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’'`]/g, " ").replace(/[^a-z0-9]+/g, " ").trim();

const TERRITORY_ALIASES: Record<string, string> = {
  "belgique": "belgium", "belgie": "belgium", "wallonie": "wallonia", "region wallonne": "wallonia",
  "bruxelles": "brussels", "brussel": "brussels", "bruxelles capitale": "brussels",
  "region de bruxelles capitale": "brussels", "region bruxelloise": "brussels",
  "flandre": "flanders", "vlaanderen": "flanders", "suisse": "switzerland", "allemagne": "germany",
  "espagne": "spain", "royaume uni": "uk", "united kingdom": "uk", "angleterre": "uk", "greece": "grece",
  "lisbonne": "lisbon", "londres": "london", "geneve": "geneva", "bourgogne": "burgundy",
  "la reunion": "reunion", "luik": "liege", "barcelone": "barcelona", "pays bas": "netherlands",
  "italie": "italy", "irlande": "ireland", "etats unis": "usa", "australie": "australia",
};

const TOPIC_ALIASES: Record<string, string> = {
  "tiers lieu": "third spaces", "tiers lieux": "third spaces", "third place": "third spaces", "third places": "third spaces",
  "culture": "arts culture", "arts": "arts culture", "art et culture": "arts culture", "culturel": "arts culture",
  "agriculture": "new agriculture", "agroecologie": "new agriculture", "energie": "energy",
  "education": "transformative education", "formation": "transformative education",
  "sante": "healthcare", "gouvernance": "governance", "numerique": "open data technology", "technologie": "open data technology",
  "commun": "commons dao", "communs": "commons dao", "eau": "water soils", "sols": "water soils",
  "innovation territoriale": "territorial innovation", "medias": "journalism medias", "journalisme": "journalism medias",
  "immobilier": "impact real estate", "lowtech": "low tech", "economie sociale et solidaire": "new economic models",
  "economie circulaire": "new economic models", "hospitalite": "hosting facilitation", "facilitation": "hosting facilitation",
  "recit": "narratives storytelling", "narration": "narratives storytelling",
};

function findByName<T extends { name: string; slug?: string | null }>(word: string, rows: T[], aliases: Record<string, string>): T | null {
  const n = normTax(word);
  if (!n) return null;
  const byKey = new Map<string, T>();
  for (const r of rows) {
    byKey.set(normTax(r.name), r);
    if (r.slug) byKey.set(normTax(r.slug), r);
  }
  const direct = byKey.get(n) ?? byKey.get(aliases[n] ?? "");
  if (direct) return direct;
  // Un mot significatif qui n'apparaît que dans un seul nom (« governance » → « Governance »).
  if (n.length >= 5 && !n.includes(" ")) {
    const hits = rows.filter((r) => normTax(r.name).split(" ").includes(n));
    if (hits.length === 1) return hits[0];
  }
  return null;
}

/** Découpe une valeur libre (texte, liste, objet) en mots-clés propres. */
function splitTerms(v: unknown): string[] {
  const raw = v == null ? [] : Array.isArray(v) ? v : typeof v === "object" ? Object.values(v as object) : [v];
  return raw.flatMap((x) => String(x ?? "").split(/[,;|/·\n]+/)).map((s) => s.trim()).filter((s) => s.length > 1 && s.length < 60);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const NOMINATIM_URL = Deno.env.get("NOMINATIM_URL") ?? "https://nominatim.openstreetmap.org";
const slugify = (s: string) => normTax(s).replace(/ /g, "-");
const km = (aLat: number, aLon: number, bLat: number, bLon: number) => {
  const r = (x: number) => (x * Math.PI) / 180;
  const h = Math.sin(r(bLat - aLat) / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(r(bLon - aLon) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
const MAX_PHOTO_BYTES = 5_000_000;

/** Copie la photo d'un lieu dans notre stockage (jamais de lien externe vers le serveur de l'agent) et renvoie son URL publique. */
async function importPhoto(sb: any, guildId: string, url: string): Promise<string | null> {
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  const host = u.hostname.toLowerCase();
  if (u.protocol !== "https:" || u.username || u.password) return null;
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || /^[0-9.]+$/.test(host) || host.includes(":")) return null;
  const res = await fetch(u.toString(), { headers: { Accept: "image/*" }, signal: AbortSignal.timeout(8_000) });
  if (!res.ok) return null;
  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const ext = IMAGE_TYPES[type];
  if (!ext) return null;
  if (Number(res.headers.get("content-length") ?? 0) > MAX_PHOTO_BYTES) return null;
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_PHOTO_BYTES) return null;
  const path = `guilds/${guildId}/logo-${Date.now()}.${ext}`;
  const { error } = await sb.storage.from("entity-images").upload(path, bytes, { contentType: type, upsert: true });
  if (error) return null;
  return sb.storage.from("entity-images").getPublicUrl(path).data.publicUrl ?? null;
}

async function callAgent(base: string, secret: string, path: string, init: RequestInit = {}) {
  return await fetch(`${base.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "X-Webhook-Secret": secret, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(25_000),
  });
}

// ── synchronisation d'un agent ─────────────────────────────────────────────
async function syncAgent(sb: any, agent: any, opts: { dryRun: boolean; maxCreate: number; full?: boolean }) {
  const summary: Record<string, any> = {
    agent: agent.name, dry_run: opts.dryRun,
    fetched: 0, created: 0, updated: 0, linked: 0, needs_quests: 0, events_sent: 0, access_sent: 0, masked: 0,
    skipped_over_limit: 0, unmatched_places: [] as string[], unmatched_terms: [] as string[], new_territories: [] as string[], territories_created: 0,
    geocode_remaining: 0, photos: 0, photos_failed: 0, objects_found: 0, objects_sent: 0, errors: [] as string[],
  };
  const err = (m: string) => { if (summary.errors.length < 30) summary.errors.push(m); };

  const { data: secrets } = await sb.from("agent_secrets").select("webhook_secret").eq("agent_id", agent.id).maybeSingle();
  const secret = secrets?.webhook_secret;
  const base = agent.sync_base_url;
  if (!secret || !base) { err("secret ou sync_base_url manquant"); return summary; }

  // Compte agent (créateur des fiches créées automatiquement).
  let agentUserId: string | null = agent.agent_user_id ?? null;
  if (!agentUserId && !opts.dryRun) {
    const { data, error } = await sb.auth.admin.createUser({
      email: `agents+${agent.id}@changethegame.xyz`,
      password: crypto.randomUUID() + crypto.randomUUID(),
      email_confirm: true,
      user_metadata: { name: agent.name, is_agent: true },
    });
    if (error || !data?.user) { err(`création du compte agent : ${error?.message}`); return summary; }
    agentUserId = data.user.id;
    await sb.from("profiles").update({ is_agent: true, name: agent.name }).eq("user_id", agentUserId);
    await sb.from("agents").update({ agent_user_id: agentUserId }).eq("id", agent.id);
  }

  // 1. Flux des lieux -------------------------------------------------------
  // Un lancement manuel relit tout le flux (idempotent) : rattrape un curseur trop avancé.
  const since = agent.sync_cursor && !opts.full ? `?updated_since=${encodeURIComponent(agent.sync_cursor)}` : "";
  const feedRes = await callAgent(base, secret, `/lieux${since}`);
  if (!feedRes.ok) { err(`GET /lieux → ${feedRes.status}`); return summary; }
  const lieux: any[] = (await feedRes.json())?.lieux ?? [];
  summary.fetched = lieux.length;

  const { data: refRows } = await sb.from("agent_external_refs").select("*").eq("agent_id", agent.id).eq("entity_type", "guild");
  const refs = new Map<string, any>((refRows ?? []).map((r: any) => [r.external_id, r]));

  const { data: allTopics } = await sb.from("topics").select("id, name, slug");
  const { data: allTerritories } = await sb.from("territories").select("id, name, slug, level, latitude, longitude, parent_id").eq("is_deleted", false);
  const topicPool = allTopics ?? [];
  const territoryPool = allTerritories ?? [];
  const tiersLieuxTopicId = findByName("tiers-lieux", topicPool, TOPIC_ALIASES)?.id ?? null;
  const note = (list: string[], v: string) => { if (list.length < 30 && !list.includes(v)) list.push(v); };

  // Thèmes : « tiers-lieux » + ceux que les catégories / mots-clés du lieu désignent.
  // Territoires : la région en principal, le pays en complément — seulement s'ils existent chez nous.
  const taxonomyFor = (lieu: any) => {
    const topicIds = new Set<string>(tiersLieuxTopicId ? [tiersLieuxTopicId] : []);
    for (const term of [...splitTerms(lieu.categories), ...splitTerms(lieu.mots_cles)]) {
      const hit = findByName(term, topicPool, TOPIC_ALIASES);
      if (hit) topicIds.add(hit.id); else note(summary.unmatched_terms, term);
      if (topicIds.size >= 6) break;
    }
    // « Liège » (province) correspond chez nous à la VILLE de Liège : on ne l'accepte que si le lieu y est vraiment.
    const lat = Number(lieu.latitude), lon = Number(lieu.longitude);
    const hasCoords = lieu.latitude != null && lieu.longitude != null && Number.isFinite(lat) && Number.isFinite(lon);
    const farTown = (t: any) => !!t && t.level === "TOWN" && !(t.latitude != null && t.longitude != null && hasCoords && km(Number(t.latitude), Number(t.longitude), lat, lon) < 8);
    let region = lieu.region ? findByName(String(lieu.region), territoryPool, TERRITORY_ALIASES) : null;
    if (region && farTown(region)) region = null;
    const country = lieu.pays ? findByName(String(lieu.pays), territoryPool, TERRITORY_ALIASES) : null;
    if (lieu.region && !region) note(summary.unmatched_places, String(lieu.region));
    if (lieu.pays && !country) note(summary.unmatched_places, String(lieu.pays));
    const territoryIds = [region, country].filter((t, i, a): t is any => !!t && a.findIndex((x) => x?.id === t.id) === i).map((t) => t.id as string);
    return { topicIds: [...topicIds], territoryIds, region, country };
  };
  const applyTaxonomy = async (guildId: string, tax: { topicIds: string[]; territoryIds: string[] }, onlyMissing: boolean) => {
    let addTopics = tax.topicIds.length > 0, addTerritories = tax.territoryIds.length > 0;
    if (onlyMissing) {
      const [tp, tr] = await Promise.all([
        sb.from("guild_topics").select("topic_id", { count: "exact", head: true }).eq("guild_id", guildId),
        sb.from("guild_territories").select("territory_id", { count: "exact", head: true }).eq("guild_id", guildId),
      ]);
      addTopics = addTopics && !(tp.count ?? 0);
      addTerritories = addTerritories && !(tr.count ?? 0);
    }
    if (addTopics) await sb.from("guild_topics").insert(tax.topicIds.map((topic_id) => ({ guild_id: guildId, topic_id })));
    if (addTerritories) await sb.from("guild_territories").insert(tax.territoryIds.map((territory_id, i) => ({ guild_id: guildId, territory_id, is_primary: i === 0 })));
  };

  // Localisation exacte : la commune (reverse-geocoding OSM des coordonnées du lieu), rattachée à la
  // guilde comme territoire principal, et créée si elle n'existe pas encore chez nous.
  const GEO_BUDGET = 30;
  let geoCalls = 0;
  let lastGeo = 0;
  const geoCache = new Map<string, { name: string; lat: number; lon: number } | null>();
  const reverse = async (lat: number, lon: number) => {
    const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
    if (geoCache.has(key)) return geoCache.get(key) ?? null;
    if (geoCalls >= GEO_BUDGET) return undefined;
    geoCalls++;
    const wait = 1_100 - (Date.now() - lastGeo);
    if (wait > 0) await sleep(wait);
    lastGeo = Date.now();
    let out: { name: string; lat: number; lon: number } | null = null;
    try {
      const res = await fetch(`${NOMINATIM_URL}/reverse?format=jsonv2&zoom=10&addressdetails=1&accept-language=fr&lat=${lat}&lon=${lon}`, {
        headers: { "User-Agent": `changethegame-agent-sync/1.0 (${SITE_URL})` },
        signal: AbortSignal.timeout(8_000),
      });
      if (res.ok) {
        const j = await res.json();
        const a = j?.address ?? {};
        const name = a.city ?? a.town ?? a.village ?? a.municipality ?? a.hamlet ?? null;
        if (name) out = { name: String(name), lat: Number(j.lat), lon: Number(j.lon) };
      } else err(`géocodage → ${res.status}`);
    } catch (e: any) { err(`géocodage : ${e?.message ?? e}`); }
    geoCache.set(key, out);
    return out;
  };

  type Town = { id: string | null; name: string; created: boolean };
  // "budget" : plus de crédit de géocodage pour ce passage — le lieu sera repris au suivant.
  const locateTown = async (lieu: any, region: any, country: any): Promise<Town | null | "budget"> => {
    const lat = Number(lieu.latitude), lon = Number(lieu.longitude);
    const hasCoords = lieu.latitude != null && lieu.longitude != null && Number.isFinite(lat) && Number.isFinite(lon) && (lat !== 0 || lon !== 0);
    let name: string | null = fmt(lieu.commune ?? lieu.ville) || null;
    let cLat: number | null = hasCoords ? lat : null;
    let cLon: number | null = hasCoords ? lon : null;
    if (!name) {
      if (!hasCoords) return null;
      const g = await reverse(lat, lon);
      if (g === undefined) return "budget";
      if (!g) return null;
      summary.geocoded = (summary.geocoded ?? 0) + 1;
      name = g.name;
      if (Number.isFinite(g.lat) && Number.isFinite(g.lon)) { cLat = g.lat; cLon = g.lon; }
    }
    const n = normTax(name);
    const target = TERRITORY_ALIASES[n] ?? n;
    const parents = new Set([region?.id, country?.id].filter(Boolean));
    const existing = territoryPool.find((t: any) => {
      const tn = normTax(t.name);
      if (tn !== n && tn !== target) return false;
      if (t.latitude != null && t.longitude != null && cLat != null && cLon != null) return km(Number(t.latitude), Number(t.longitude), cLat, cLon) < 30;
      return !t.parent_id || parents.has(t.parent_id);
    });
    if (existing) return { id: existing.id, name: existing.name, created: false };

    note(summary.new_territories, name);
    if (opts.dryRun) return { id: null, name, created: true };
    const base = slugify(name) || "lieu";
    for (let attempt = 0; attempt < 4; attempt++) {
      const slug = attempt === 0 ? base : attempt === 1 && country ? `${base}-${slugify(country.name)}` : `${base}-${attempt + 1}`;
      const { data: row, error } = await sb.from("territories").insert({
        name, level: "TOWN", slug, parent_id: region?.id ?? country?.id ?? null,
        latitude: cLat, longitude: cLon, created_by_user_id: agentUserId,
      }).select("id").single();
      if (!error && row) {
        territoryPool.push({ id: row.id, name, slug, level: "TOWN", latitude: cLat, longitude: cLon, parent_id: region?.id ?? country?.id ?? null });
        summary.territories_created++;
        return { id: row.id, name, created: true };
      }
      if (error?.code !== "23505") { err(`territoire « ${name} » : ${error?.message}`); return null; }
    }
    return null;
  };

  // Guilde créée par l'agent et pas encore revendiquée : ses territoires suivent la synchro
  // (commune principale, puis région et pays). Une fois revendiquée, on n'y touche plus.
  const reconcileTerritories = async (guildId: string, lieu: any, tax: { territoryIds: string[]; region: any; country: any }) => {
    const { data: rows } = await sb.from("guild_territories").select("territory_id, is_primary").eq("guild_id", guildId);
    const current: any[] = rows ?? [];
    const attached = new Set(current.map((r) => r.territory_id));
    const lat = Number(lieu.latitude), lon = Number(lieu.longitude);
    const hasCoords = lieu.latitude != null && lieu.longitude != null && Number.isFinite(lat) && Number.isFinite(lon);

    let town: Town | null | "budget";
    const near = !fmt(lieu.commune ?? lieu.ville) && hasCoords
      ? territoryPool.find((t: any) => attached.has(t.id) && t.level === "TOWN" && t.latitude != null && t.longitude != null && km(Number(t.latitude), Number(t.longitude), lat, lon) < 8)
      : null;
    if (near) town = { id: near.id, name: near.name, created: false };
    else town = await locateTown(lieu, tax.region, tax.country);
    if (town === "budget") { summary.geocode_remaining++; cursorBlocked = true; return; }

    const desired = [town?.id, ...tax.territoryIds].filter((id, i, a): id is string => !!id && a.indexOf(id) === i);
    if (!desired.length) return;
    const primary = current.find((r) => r.is_primary)?.territory_id;
    if (desired.length === attached.size && desired.every((id) => attached.has(id)) && primary === desired[0]) return;
    await sb.from("guild_territories").delete().eq("guild_id", guildId);
    await sb.from("guild_territories").insert(desired.map((territory_id, i) => ({ guild_id: guildId, territory_id, is_primary: i === 0 })));
  };

  // Photo du lieu → logo de la guilde (copie dans notre stockage, plafonnée par passage).
  const PHOTO_BUDGET = 40;
  let photoCalls = 0;
  const applyPhoto = async (guildId: string, lieu: any) => {
    const url = fmt(lieu.photo_url);
    if (!url) return;
    if (photoCalls >= PHOTO_BUDGET) { cursorBlocked = true; return; }
    photoCalls++;
    try {
      const publicUrl = await importPhoto(sb, guildId, url);
      if (publicUrl) { await sb.from("guilds").update({ logo_url: publicUrl }).eq("id", guildId); summary.photos++; }
      else summary.photos_failed++;
    } catch { summary.photos_failed++; }
  };

  let createdThisRun = 0;
  let maxUpdatedAt: string | null = null;
  // Le curseur ne doit jamais dépasser un lieu non traité (plafond de création, erreur) : il serait perdu.
  let cursorBlocked = false;

  for (const lieu of lieux) {
    try {
      if (lieu.updated_at && (!maxUpdatedAt || String(lieu.updated_at) > maxUpdatedAt)) maxUpdatedAt = String(lieu.updated_at);
      let ref = refs.get(lieu.space2_id);

      // Adopte une guilde déjà liée côté agent mais absente de nos correspondances.
      if (!ref && lieu.ctg_entity_id) {
        const { data: existing } = await sb.from("guilds").select("id").eq("id", lieu.ctg_entity_id).maybeSingle();
        if (existing && !opts.dryRun) {
          const { data: inserted } = await sb.from("agent_external_refs")
            .insert({ agent_id: agent.id, external_id: lieu.space2_id, entity_type: "guild", entity_id: existing.id })
            .select("*").single();
          ref = inserted; if (ref) refs.set(lieu.space2_id, ref);
        }
      }

      if (!ref) {
        if (createdThisRun >= opts.maxCreate) { summary.skipped_over_limit++; cursorBlocked = true; continue; }
        createdThisRun++;
        summary.created++;
        const tax = taxonomyFor(lieu);
        const town = await locateTown(lieu, tax.region, tax.country);
        if (town === "budget") { summary.geocode_remaining++; cursorBlocked = true; }
        if (opts.dryRun) continue;
        if (town && town !== "budget" && town.id) tax.territoryIds = [town.id, ...tax.territoryIds.filter((id) => id !== town.id)];

        const { data: guild, error: gErr } = await sb.from("guilds").insert({
          name: String(lieu.tiers_lieu).slice(0, 200),
          description: describeLieu(lieu, agent.name),
          type: "GUILD",
          created_by_user_id: agentUserId,
          is_approved: true,
          is_draft: false,
          public_visibility: "public",
          website_url: lieu.lien_externe ?? null,
          auto_created_by_agent_id: agent.id,
        }).select("id").single();
        if (gErr || !guild) { err(`création « ${lieu.tiers_lieu} » : ${gErr?.message}`); summary.created--; cursorBlocked = true; continue; }

        await sb.from("guild_members").insert({ guild_id: guild.id, user_id: agentUserId, role: "ADMIN" });

        await applyTaxonomy(guild.id, tax, false);
        await applyPhoto(guild.id, lieu);

        const { data: inserted } = await sb.from("agent_external_refs")
          .insert({ agent_id: agent.id, external_id: lieu.space2_id, entity_type: "guild", entity_id: guild.id })
          .select("*").single();
        if (!inserted) { err(`correspondance non enregistrée pour ${lieu.space2_id}`); cursorBlocked = true; continue; }
        ref = inserted; refs.set(lieu.space2_id, ref);

        const linkRes = await callAgent(base, secret, `/lieux/${encodeURIComponent(lieu.space2_id)}/link`, {
          method: "POST", body: JSON.stringify({ ctg_entity_id: guild.id }),
        });
        if (linkRes.ok) summary.linked++; else err(`link ${lieu.space2_id} → ${linkRes.status}`);
      } else if (!opts.dryRun) {
        // Mise à jour de la description tant que la fiche n'est pas revendiquée.
        const { data: guild } = await sb.from("guilds").select("id, claimed_at, auto_created_by_agent_id, is_deleted, logo_url").eq("id", ref.entity_id).maybeSingle();
        if (guild && !guild.claimed_at && guild.auto_created_by_agent_id === agent.id && !guild.is_deleted) {
          await sb.from("guilds").update({ description: describeLieu(lieu, agent.name) }).eq("id", guild.id);
          const tax = taxonomyFor(lieu);
          await applyTaxonomy(guild.id, { topicIds: tax.topicIds, territoryIds: [] }, true);
          await reconcileTerritories(guild.id, lieu, tax);
          if (!guild.logo_url) await applyPhoto(guild.id, lieu);
          summary.updated++;
        }
      }

      // 2. Besoins → quête dédiée -------------------------------------------
      const needs = needLabels(lieu);
      if (!opts.dryRun && ref && (needs.length > 0 || lieu.campagne)) {
        let questId: string | null = ref.needs_quest_id;
        if (!questId) {
          const { data: quest, error: qErr } = await sb.from("quests").insert({
            title: `Besoins de ${lieu.tiers_lieu}`.slice(0, 200),
            description: fmt(lieu.campagne?.texte) || `Besoins mis en avant par ${lieu.tiers_lieu} (source : ${agent.name}).`,
            guild_id: ref.entity_id,
            owner_type: "GUILD",
            owner_id: ref.entity_id,
            created_by_user_id: agentUserId,
            quest_nature: "PROJECT",
            status: "OPEN",
            is_draft: false,
            public_visibility: "public",
          }).select("id").single();
          if (qErr || !quest) { err(`quête besoins « ${lieu.tiers_lieu} » : ${qErr?.message}`); }
          else {
            questId = quest.id;
            await sb.from("agent_external_refs").update({ needs_quest_id: questId }).eq("id", ref.id);
            ref.needs_quest_id = questId;
            summary.needs_quests++;
          }
        }
        if (questId) {
          const { data: existingNeeds } = await sb.from("quest_needs").select("id, title, status").eq("quest_id", questId);
          const byTitle = new Map<string, any>((existingNeeds ?? []).map((n: any) => [n.title, n]));
          for (const label of needs) {
            const found = byTitle.get(label);
            if (!found) {
              await sb.from("quest_needs").insert({ quest_id: questId, title: label, category: needCategory(label), status: "open", created_by_user_id: agentUserId });
            } else if (found.status === "closed") {
              await sb.from("quest_needs").update({ status: "open" }).eq("id", found.id);
            }
          }
          for (const n of existingNeeds ?? []) {
            if (!needs.includes(n.title) && n.status !== "closed") await sb.from("quest_needs").update({ status: "closed" }).eq("id", n.id);
          }
        }
      }
    } catch (e: any) {
      err(`${lieu?.space2_id}: ${e?.message ?? e}`);
      cursorBlocked = true;
    }
  }

  // Objets « Third Spaces » de ctg (guildes, quêtes, entités, posts publics) → agent. `send` = false :
  // simple aperçu (simulation), rien n'est envoyé.
  const collectAndPushObjects = async (send: boolean) => {
    if (!tiersLieuxTopicId) return;
  // 4b. Objets « Third Spaces » de ctg → agent ---------------------------------------------
  // Guildes (lieux physiques cochés, ou simplement taguées), quêtes, entités et posts publics
  // taguées Third Spaces. Contrat : PUT /ctg/objects { objects: [...] }, upsert par ctg_id.
  // Un agent qui n'expose pas encore cette route est simplement ignoré (pas une erreur).
    const pushStartedAt = new Date().toISOString();
    const since = opts.full ? null : agent.objects_cursor ?? null;
    const agentGuildIds = new Set([...refs.values()].map((r: any) => r.entity_id));
    const objects: any[] = [];
    let objectsFailed = false;
    const objErr = (m: string) => { objectsFailed = true; err(m); };
    const cut = (v: unknown, n: number) => (fmt(v) ? fmt(v).slice(0, n) : null);
    const chunks = <T,>(a: T[], n = 100) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
    const topicNames = (rows: any[]) => (rows ?? []).map((r: any) => r.topics?.name).filter(Boolean);
    const placeOf = (rows: any[]) => {
      const list = (rows ?? []).map((r: any) => ({ primary: r.is_primary, ...(r.territories ?? {}) })).filter((t: any) => t.name);
      const town = list.find((t: any) => t.level === "TOWN" && t.primary) ?? list.find((t: any) => t.level === "TOWN");
      return { names: list.map((t: any) => t.name), commune: town?.name ?? null, latitude: town?.latitude ?? null, longitude: town?.longitude ?? null };
    };

    // Guildes
    const { data: taggedGuilds } = await sb.from("guild_topics").select("guild_id").eq("topic_id", tiersLieuxTopicId);
    const guildSelect = "id, name, description, website_url, is_physical_place, updated_at, auto_created_by_agent_id, guild_topics(topics(name)), guild_territories(is_primary, territories(name, level, latitude, longitude))";
    const guildRows = new Map<string, any>();
    const guildBase = () => {
      // Pas de filtre de visibilité ici : on classe ensuite (envoyée / écartée avec sa raison).
      let q = sb.from("guilds").select(guildSelect + ", is_approved, public_visibility").eq("is_deleted", false).eq("is_draft", false);
      if (since) q = q.gt("updated_at", since);
      return q;
    };
    for (const ids of chunks((taggedGuilds ?? []).map((r: any) => r.guild_id))) {
      const { data, error } = await guildBase().in("id", ids);
      if (error) objErr(`objets (guildes) : ${error.message}`);
      for (const g of data ?? []) guildRows.set(g.id, g);
    }
    {
      const { data, error } = await guildBase().eq("is_physical_place", true);
      if (error) objErr(`objets (lieux) : ${error.message}`);
      for (const g of data ?? []) guildRows.set(g.id, g);
    }
    const skipped: { name: string; reason: "private" | "unapproved" }[] = [];
    for (const g of guildRows.values()) {
      if (g.auto_created_by_agent_id === agent.id) continue; // vient déjà de cet agent
      // La case « Lieu physique » est un consentement explicite à partager avec l'agent, même pour une guilde
      // privée ; une guilde non approuvée (modération en attente) n'est jamais envoyée.
      if (!g.is_approved) { skipped.push({ name: g.name, reason: "unapproved" }); continue; }
      if (g.public_visibility !== "public" && !g.is_physical_place) { skipped.push({ name: g.name, reason: "private" }); continue; }
      const place = placeOf(g.guild_territories);
      objects.push({
        ctg_id: `guild:${g.id}`, kind: g.is_physical_place ? "lieu" : "organisation", is_place: !!g.is_physical_place,
        name: cut(g.name, 200), description: cut(g.description, 4000), url: `${SITE_URL}/guilds/${g.id}`, website_url: g.website_url ?? null,
        topics: topicNames(g.guild_topics), territories: place.names, commune: place.commune,
        latitude: place.latitude, longitude: place.longitude, updated_at: g.updated_at,
      });
    }

    // Quêtes
    const { data: taggedQuests } = await sb.from("quest_topics").select("quest_id").eq("topic_id", tiersLieuxTopicId);
    for (const ids of chunks((taggedQuests ?? []).map((r: any) => r.quest_id))) {
      let q = sb.from("quests").select("id, title, description, status, guild_id, updated_at, quest_topics(topics(name))")
        .eq("is_draft", false).eq("is_deleted", false).eq("public_visibility", "public").in("id", ids);
      if (since) q = q.gt("updated_at", since);
      const { data, error } = await q;
      if (error) { objErr(`objets (quêtes) : ${error.message}`); continue; }
      for (const qu of data ?? []) {
        if (qu.guild_id && agentGuildIds.has(qu.guild_id)) continue; // déjà remontée par les événements
        objects.push({
          ctg_id: `quest:${qu.id}`, kind: "quete", is_place: false, name: cut(qu.title, 300), description: cut(qu.description, 4000),
          status: qu.status, url: `${SITE_URL}/quests/${qu.id}`, parent_ctg_id: qu.guild_id ? `guild:${qu.guild_id}` : null,
          topics: topicNames(qu.quest_topics), updated_at: qu.updated_at,
        });
      }
    }

    // Entités (organisations enregistrées)
    const { data: taggedCompanies } = await sb.from("company_topics").select("company_id").eq("topic_id", tiersLieuxTopicId);
    for (const ids of chunks((taggedCompanies ?? []).map((r: any) => r.company_id))) {
      let q = sb.from("companies").select("id, name, description, website_url, updated_at, company_topics(topics(name))")
        .eq("is_deleted", false).eq("public_visibility", "public").in("id", ids);
      if (since) q = q.gt("updated_at", since);
      const { data, error } = await q;
      if (error) { objErr(`objets (entités) : ${error.message}`); continue; }
      for (const c of data ?? []) {
        objects.push({
          ctg_id: `company:${c.id}`, kind: "entite", is_place: false, name: cut(c.name, 200), description: cut(c.description, 4000),
          url: `${SITE_URL}/companies/${c.id}`, website_url: c.website_url ?? null, topics: topicNames(c.company_topics), updated_at: c.updated_at,
        });
      }
    }

    // Posts publics (hors salons non publics ; jamais d'auteur)
    const { data: taggedPosts } = await sb.from("post_topics").select("post_id").eq("topic_id", tiersLieuxTopicId);
    for (const ids of chunks((taggedPosts ?? []).map((r: any) => r.post_id))) {
      let q = sb.from("feed_posts").select("id, content, context_type, context_id, updated_at, created_at, post_topics(topics(name))")
        .eq("is_deleted", false).eq("visibility", "public").is("room_id", null).in("id", ids);
      if (since) q = q.gt("updated_at", since);
      const { data, error } = await q;
      if (error) { objErr(`objets (posts) : ${error.message}`); continue; }
      for (const p of data ?? []) {
        if (!p.content) continue;
        if (p.context_type === "GUILD" && agentGuildIds.has(p.context_id)) continue; // déjà remonté par les événements
        objects.push({
          ctg_id: `post:${p.id}`, kind: "post", is_place: false, name: cut(String(p.content).replace(/\s+/g, " "), 100), description: cut(p.content, 1500),
          url: p.context_type === "GUILD" ? `${SITE_URL}/guilds/${p.context_id}` : SITE_URL,
          parent_ctg_id: p.context_type === "GUILD" && p.context_id ? `guild:${p.context_id}` : null,
          topics: topicNames(p.post_topics), updated_at: p.updated_at ?? p.created_at,
        });
      }
    }

    if (skipped.length) summary.objects_skipped = skipped.slice(0, 30);
    // Space2 refuse un objet sans nom (422) : jamais de nom vide.
    for (const o of objects) if (!o.name) o.name = o.ctg_id;
    summary.objects_found = objects.length;
    summary.objects_preview = objects.slice(0, 80).map((o) => ({ kind: o.kind, name: o.name ?? o.description?.slice(0, 60) ?? o.ctg_id, commune: o.commune ?? null }));
    if (!send) return;
    const toSend = objects.slice(0, 500);
    if (objects.length > toSend.length) { summary.objects_remaining = objects.length - toSend.length; }
    let unsupported = false;
    for (const batch of chunks(toSend)) {
      const r = await callAgent(base, secret, "/ctg/objects", { method: "PUT", body: JSON.stringify({ objects: batch }) });
      if (r.status === 404 || r.status === 405 || r.status === 501) { unsupported = true; break; }
      if (r.ok) summary.objects_sent = (summary.objects_sent ?? 0) + batch.length;
      else {
        // Le détail de validation renvoyé par l'agent (422) dit quel champ pose problème.
        const detail = (await r.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 300);
        objErr(`PUT /ctg/objects → ${r.status}${detail ? ` : ${detail}` : ""}`);
      }
    }
    if (unsupported) summary.objects_unsupported = true;
    if (!unsupported && !objectsFailed && !summary.objects_remaining) {
      try { await sb.from("agents").update({ objects_cursor: pushStartedAt }).eq("id", agent.id); } catch { /* colonne pas encore créée */ }
    }
  };

  if (opts.dryRun) { await collectAndPushObjects(false); return summary; }

  // 3. Événements publics ctg → agent ----------------------------------------
  const allRefs = [...refs.values()];
  const guildIds = allRefs.map((r) => r.entity_id);
  if (guildIds.length) {
    const { data: guilds } = await sb.from("guilds").select("id, name, is_deleted").in("id", guildIds);
    const alive = new Map<string, any>((guilds ?? []).filter((g: any) => !g.is_deleted).map((g: any) => [g.id, g]));
    const events: any[] = [];
    const now = new Date().toISOString();

    for (const ref of allRefs) {
      const guild = alive.get(ref.entity_id);
      if (!guild) continue;
      const url = `${SITE_URL}/guilds/${guild.id}`;
      const evBase = { space2_id: ref.external_id, ctg_entity_id: guild.id };

      // Membres : un nombre, jamais de noms.
      const { count } = await sb.from("guild_members").select("id", { count: "exact", head: true })
        .eq("guild_id", guild.id).neq("user_id", agentUserId ?? "00000000-0000-0000-0000-000000000000");
      if (typeof count === "number" && count > 0) {
        events.push({ ...evBase, ctg_event_id: `members:${guild.id}:${count}`, type: "membre", titre: "Membres",
          texte: `${count} membre${count > 1 ? "s" : ""} dans la guilde sur changethegame.`, url, occurred_at: now });
      }

      // Discussions publiques (hors salons non publics).
      const { data: publicRooms } = await sb.from("discussion_rooms").select("id").eq("scope_id", guild.id).eq("audience_type", "PUBLIC");
      const roomIds = (publicRooms ?? []).map((r: any) => r.id);
      let postQuery = sb.from("feed_posts").select("id, content, created_at")
        .eq("context_type", "GUILD").eq("context_id", guild.id).eq("visibility", "public").eq("is_deleted", false)
        .order("created_at", { ascending: false }).limit(10);
      postQuery = roomIds.length ? postQuery.or(`room_id.is.null,room_id.in.(${roomIds.join(",")})`) : postQuery.is("room_id", null);
      const { data: posts } = await postQuery;
      for (const p of posts ?? []) {
        if (!p.content) continue;
        events.push({ ...evBase, ctg_event_id: `post:${p.id}`, type: "discussion", titre: null,
          texte: String(p.content).slice(0, 1500), url, occurred_at: p.created_at });
      }

      // Quêtes publiques de la guilde (hors la quête des besoins issue de l'agent).
      const { data: quests } = await sb.from("quests").select("id, title, description, created_at")
        .eq("guild_id", guild.id).eq("is_draft", false).eq("is_deleted", false).eq("public_visibility", "public").limit(20);
      for (const q of quests ?? []) {
        if (q.id === ref.needs_quest_id) continue;
        events.push({ ...evBase, ctg_event_id: `quest:${q.id}`, type: "quete", titre: String(q.title).slice(0, 300),
          texte: q.description ? String(q.description).slice(0, 1500) : null, url: `${SITE_URL}/quests/${q.id}`, occurred_at: q.created_at });
        const { data: qNeeds } = await sb.from("quest_needs").select("id, title, description, created_at")
          .eq("quest_id", q.id).in("status", ["open", "in_progress", "OPEN", "IN_PROGRESS"]).limit(20);
        for (const n of qNeeds ?? []) {
          events.push({ ...evBase, ctg_event_id: `need:${n.id}`, type: "besoin", titre: String(n.title).slice(0, 300),
            texte: n.description ? String(n.description).slice(0, 1500) : null, url: `${SITE_URL}/quests/${q.id}`, occurred_at: n.created_at });
        }
      }
    }

    for (let i = 0; i < events.length; i += 100) {
      const batch = events.slice(i, i + 100);
      const r = await callAgent(base, secret, "/events", { method: "POST", body: JSON.stringify({ events: batch }) });
      if (r.ok) summary.events_sent += batch.length; else err(`POST /events → ${r.status}`);
    }

    // 4. Retrait : une guilde supprimée est masquée côté agent ------------------
    for (const ref of allRefs) {
      const deleted = !alive.has(ref.entity_id);
      if (deleted && !ref.masked_notified_at) {
        const r = await callAgent(base, secret, `/lieux/${encodeURIComponent(ref.external_id)}/masque`, { method: "PUT", body: JSON.stringify({ masque: true }) });
        if (r.ok) { await sb.from("agent_external_refs").update({ masked_notified_at: now }).eq("id", ref.id); summary.masked++; }
        else err(`masque ${ref.external_id} → ${r.status}`);
      } else if (!deleted && ref.masked_notified_at) {
        const r = await callAgent(base, secret, `/lieux/${encodeURIComponent(ref.external_id)}/masque`, { method: "PUT", body: JSON.stringify({ masque: false }) });
        if (r.ok) await sb.from("agent_external_refs").update({ masked_notified_at: null }).eq("id", ref.id);
        else err(`démasquer ${ref.external_id} → ${r.status}`);
      }
    }
  }

  // 4b. Objets « Third Spaces » de ctg → agent
  await collectAndPushObjects(true);

  // 5. Accès : uniquement les utilisateurs qui ont consenti ---------------------
  const { data: consents } = await sb.from("agent_access_consents").select("user_id, revoked_at").eq("agent_id", agent.id);
  if (consents?.length) {
    const userIds = consents.map((c: any) => c.user_id);
    const [profiles, attached, hires] = await Promise.all([
      sb.from("profiles").select("user_id, email").in("user_id", userIds),
      sb.from("unit_agents").select("unit_id").eq("agent_id", agent.id).eq("unit_type", "guild").eq("is_active", true),
      sb.from("agent_hires").select("user_id").eq("agent_id", agent.id).eq("status", "active").in("user_id", userIds),
    ]);
    const attachedGuilds = (attached.data ?? []).map((a: any) => a.unit_id);
    const { data: memberships } = attachedGuilds.length
      ? await sb.from("guild_members").select("user_id, guild_id").in("guild_id", attachedGuilds).in("user_id", userIds)
      : { data: [] as any[] };
    const guildOf = new Map<string, string>((memberships ?? []).map((m: any) => [m.user_id, m.guild_id]));
    const hired = new Set((hires.data ?? []).map((h: any) => h.user_id));
    const emailOf = new Map<string, string>((profiles.data ?? []).map((p: any) => [p.user_id, p.email]));

    const members = consents
      .filter((c: any) => emailOf.get(c.user_id))
      .map((c: any) => ({
        email: emailOf.get(c.user_id),
        statut: !c.revoked_at && (guildOf.has(c.user_id) || hired.has(c.user_id)) ? "actif" : "revoque",
        guilde_id: guildOf.get(c.user_id) ?? null,
      }));
    for (let i = 0; i < members.length; i += 500) {
      const batch = members.slice(i, i + 500);
      const r = await callAgent(base, secret, "/access", { method: "PUT", body: JSON.stringify({ members: batch }) });
      if (r.ok) summary.access_sent += batch.length; else err(`PUT /access → ${r.status}`);
    }
  }

  // 6. Curseur + trace ------------------------------------------------------------
  await sb.from("agents").update({
    sync_cursor: cursorBlocked ? (agent.sync_cursor ?? null) : (maxUpdatedAt ?? agent.sync_cursor ?? null),
    last_sync_at: new Date().toISOString(),
    last_sync_summary: summary,
  }).eq("id", agent.id);

  return summary;
}

const KEEP_RUNS = 50;

/** Journal des passages : ne doit jamais faire échouer la synchro elle-même. */
async function logRun(sb: any, agentId: string, r: { trigger: string; dryRun: boolean; userId: string | null; ok: boolean; summary: unknown; ms: number }) {
  try {
    await sb.from("agent_sync_runs").insert({
      agent_id: agentId, trigger: r.trigger, dry_run: r.dryRun, triggered_by: r.userId,
      ok: r.ok, summary: r.summary, duration_ms: r.ms,
    });
    const { data: old } = await sb.from("agent_sync_runs").select("id").eq("agent_id", agentId)
      .order("created_at", { ascending: false }).range(KEEP_RUNS, KEEP_RUNS + 200);
    if (old?.length) await sb.from("agent_sync_runs").delete().in("id", old.map((x: any) => x.id));
  } catch (e) { console.error("sync log failed", e); }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const cronSecret = Deno.env.get("CRON_SECRET");
  const isCron = !!cronSecret && req.headers.get("x-cron-secret") === cronSecret;

  let userId: string | null = null;
  if (!isCron) {
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data } = await anon.auth.getUser(token);
    if (!data?.user) return json({ error: "Unauthorized" }, 401);
    userId = data.user.id;
  }

  const body = await req.json().catch(() => ({}));
  const dryRun = body.dry_run === true;
  const maxCreate = Math.min(Math.max(parseInt(body.max_create) || DEFAULT_MAX_CREATE, 1), 200);

  let query = sb.from("agents").select("*").eq("sync_enabled", true);
  if (body.agent_id) query = query.eq("id", body.agent_id);
  else if (!isCron) return json({ error: "agent_id required" }, 400);
  const { data: agents } = await query;

  const results: any[] = [];
  for (const agent of agents ?? []) {
    if (!isCron) {
      let allowed = agent.creator_user_id === userId;
      if (!allowed) {
        const { data: ok } = await sb.rpc("can_manage_agent", { _agent_id: agent.id, _user_id: userId });
        allowed = ok === true;
      }
      if (!allowed) { results.push({ agent: agent.name, error: "forbidden" }); continue; }
    }
    const startedAt = Date.now();
    let summary: any = null;
    let failure: string | null = null;
    try {
      summary = await syncAgent(sb, agent, { dryRun, maxCreate, full: !isCron });
      results.push(summary);
    } catch (e: any) {
      failure = String(e?.message ?? e);
      results.push({ agent: agent.name, error: failure });
    }
    await logRun(sb, agent.id, {
      trigger: isCron ? "cron" : "manual", dryRun, userId,
      ok: !failure && !(summary?.errors?.length),
      summary: summary ?? { error: failure }, ms: Date.now() - startedAt,
    });
  }
  return json({ results });
});
