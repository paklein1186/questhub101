// Lit la fiche d'un agent externe à partir de son propre endpoint GET /manifest
// (repli : /.well-known/agent.json) pour préremplir sa fiche dans changethegame.
//
// Sécurité : l'adresse est saisie par un utilisateur, la fonction appelle donc
// un serveur choisi par lui — https seulement, adresses locales/privées
// refusées (littérales et résolues), pas de redirection, taille et délai
// plafonnés, utilisateurs connectés seulement. Le contenu renvoyé est du texte
// d'un tiers : il est borné et normalisé, jamais interprété.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MAX_BYTES = 200_000;
const TIMEOUT_MS = 8_000;

function isPrivateIp(ip: string): boolean {
  if (ip.includes(":")) {
    const v = ip.toLowerCase();
    return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("::ffff:");
  }
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true;
  const [a, b] = p;
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

async function assertPublicHost(host: string) {
  const h = host.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".localhost")) throw new Error("adresse non autorisée");
  if (/^[0-9.]+$/.test(h) || h.includes(":")) {
    if (isPrivateIp(h.replace(/^\[|\]$/g, ""))) throw new Error("adresse non autorisée");
    return;
  }
  try {
    const [v4, v6] = await Promise.all([
      Deno.resolveDns(h, "A").catch(() => [] as string[]),
      Deno.resolveDns(h, "AAAA").catch(() => [] as string[]),
    ]);
    if ([...v4, ...v6].some(isPrivateIp)) throw new Error("adresse non autorisée");
  } catch (e) {
    if (e instanceof Error && e.message === "adresse non autorisée") throw e;
    // résolution DNS indisponible dans ce runtime : les contrôles sur le nom d'hôte restent appliqués
  }
}

async function fetchJson(url: string): Promise<any | null> {
  const res = await fetch(url, {
    redirect: "manual",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`l'agent a répondu ${res.status}`);
  const reader = res.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_BYTES) throw new Error("fiche trop volumineuse");
    chunks.push(value);
  }
  const text = new TextDecoder().decode(await new Blob(chunks).arrayBuffer());
  return JSON.parse(text);
}

const str = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s.slice(0, max) : null;
};
const strList = (v: unknown, max: number, item: number): string[] =>
  Array.isArray(v) ? v.map((x) => str(x, item)).filter((x): x is string => !!x).slice(0, max) : [];

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

type Variable = { name: string; description: string; kind: "input" | "data"; columns?: string[] };

/** Paramètres d'entrée et jeux de données de l'agent, quelle que soit la forme choisie pour les décrire. */
function readVariables(raw: any): Variable[] {
  const out: Variable[] = [];
  const asList = (v: unknown): any[] =>
    Array.isArray(v) ? v : v && typeof v === "object" ? Object.entries(v).map(([name, d]) => (typeof d === "object" && d ? { name, ...(d as object) } : { name, description: d })) : [];

  for (const v of asList(raw.variables ?? raw.inputs ?? raw.parameters)) {
    const name = typeof v === "string" ? str(v, 80) : str(v?.name ?? v?.key, 80);
    if (name) out.push({ name, description: (typeof v === "string" ? "" : str(v?.description ?? v?.desc, 400)) ?? "", kind: "input" });
  }

  for (const d of asList(raw.datasets ?? raw.data)) {
    const name = typeof d === "string" ? str(d, 80) : str(d?.name ?? d?.key, 80);
    if (!name) continue;
    let description = (typeof d === "string" ? "" : str(d?.description ?? d?.desc, 600)) ?? "";
    let columns: string[] = asList(d?.columns ?? d?.fields)
      .map((c) => (typeof c === "string" ? str(c, 60) : str(c?.name ?? c?.key, 60)))
      .filter((c): c is string => !!c);
    if (columns.length === 0) {
      // Repli : la liste de colonnes écrite entre parenthèses dans la description.
      const m = description.match(/\(([^()]{12,})\)/);
      const parts = m ? m[1].split(",").map((x) => x.trim()).filter((x) => /^[\p{L}0-9_./ -]{1,60}$/u.test(x)) : [];
      if (m && parts.length >= 3) { columns = parts; description = description.replace(m[0], "").replace(/\s+([.,;])/g, "$1").trim(); }
    }
    out.push({ name, description, kind: "data", ...(columns.length ? { columns: columns.slice(0, 60) } : {}) });
  }
  return out.slice(0, 40);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const { data: auth } = await anon.auth.getUser(token);
  if (!auth?.user) return json({ error: "Unauthorized" }, 401);

  try {
    const { url } = await req.json();
    let target: URL;
    try { target = new URL(String(url)); } catch { return json({ error: "URL invalide" }); }
    if (target.protocol !== "https:") return json({ error: "L'URL doit commencer par https://" });
    if (target.username || target.password) return json({ error: "URL invalide" });
    await assertPublicHost(target.hostname);

    const origin = target.origin;
    const raw = (await fetchJson(`${origin}/manifest`)) ?? (await fetchJson(`${origin}/.well-known/agent.json`));
    if (!raw || typeof raw !== "object") {
      return json({ error: "Cet agent n'expose pas de fiche (GET /manifest). Remplissez les champs à la main." });
    }

    const variables = readVariables(raw);

    const topicWanted = strList(raw.topics, 20, 80);
    const territoryWanted = strList(raw.territories, 20, 80);
    const [topics, territories] = await Promise.all([
      topicWanted.length ? sb.from("topics").select("id, name, slug") : Promise.resolve({ data: [] as any[] }),
      territoryWanted.length ? sb.from("territories").select("id, name, slug") : Promise.resolve({ data: [] as any[] }),
    ]);
    const topicIds: string[] = [];
    const territoryIds: string[] = [];
    const unmatched: string[] = [];
    const matches: { wanted: string; name: string }[] = [];
    for (const w of topicWanted) {
      const hit = findByName(w, topics.data ?? [], TOPIC_ALIASES);
      if (hit) { topicIds.push(hit.id); matches.push({ wanted: w, name: hit.name }); } else unmatched.push(w);
    }
    for (const w of territoryWanted) {
      const hit = findByName(w, territories.data ?? [], TERRITORY_ALIASES);
      if (hit) { territoryIds.push(hit.id); matches.push({ wanted: w, name: hit.name }); } else unmatched.push(w);
    }

    // Adresse de conversation annoncée par l'agent (« POST /ask ») : c'est celle que le chat appelle.
    const askPath = String(raw.endpoints?.ask ?? "").match(/(\/[A-Za-z0-9._~\/-]*)/)?.[1];
    const askUrl = askPath && !askPath.includes("//") ? `${origin}${askPath}` : null;

    return json({
      manifest: {
        ask_url: askUrl,
        name: str(raw.name, 120),
        description: str(raw.description, 500),
        purpose: str(raw.purpose, 300),
        readme: str(raw.readme ?? raw.long_description, 20_000),
        category: str(raw.category, 40),
        version: str(raw.version, 40),
        variables,
        topic_ids: topicIds,
        territory_ids: territoryIds,
        unmatched,
        matches,
      },
    });
  } catch (e: any) {
    return json({ error: `Impossible de lire la fiche : ${e?.message ?? e}` });
  }
});
