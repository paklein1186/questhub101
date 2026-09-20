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

    const variables = (Array.isArray(raw.variables) ? raw.variables : [])
      .map((v: any) => ({ name: str(v?.name, 80), description: str(v?.description, 400) ?? "" }))
      .filter((v: any) => v.name)
      .slice(0, 30);

    const topicWanted = strList(raw.topics, 20, 80);
    const territoryWanted = strList(raw.territories, 20, 80);
    const [topics, territories] = await Promise.all([
      topicWanted.length ? sb.from("topics").select("id, name, slug") : Promise.resolve({ data: [] as any[] }),
      territoryWanted.length ? sb.from("territories").select("id, name") : Promise.resolve({ data: [] as any[] }),
    ]);
    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
    const topicIds: string[] = [];
    const territoryIds: string[] = [];
    const unmatched: string[] = [];
    for (const w of topicWanted) {
      const hit = (topics.data ?? []).find((t: any) => norm(t.slug ?? "") === norm(w) || norm(t.name) === norm(w));
      if (hit) topicIds.push(hit.id); else unmatched.push(w);
    }
    for (const w of territoryWanted) {
      const hit = (territories.data ?? []).find((t: any) => norm(t.name) === norm(w));
      if (hit) territoryIds.push(hit.id); else unmatched.push(w);
    }

    return json({
      manifest: {
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
      },
    });
  } catch (e: any) {
    return json({ error: `Impossible de lire la fiche : ${e?.message ?? e}` });
  }
});
