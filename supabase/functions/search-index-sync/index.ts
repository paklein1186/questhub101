// Construit et tient à jour l'index de recherche sémantique de la plateforme (table search_index).
//
// Chaque élément (guilde, quête, entité, pod, service, cours, agent, territoire, thème, profil) devient un
// document texte + un vecteur. Seuls les documents dont le contenu a changé sont ré-embeddés (empreinte), les
// éléments supprimés ou non publiables sont retirés. Les droits d'accès sont notés sur chaque document
// (audience) et appliqués à la recherche, jamais ici.
//
// Appel : cron (en-tête x-cron-secret) ou administrateur connecté. Corps : { full?, types?, limit? }.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SITE = "";  // URLs relatives : les liens s'ouvrent dans l'application
const EMBEDDING_MODEL = "openai/text-embedding-3-small"; // 1536 dimensions
const EMBED_BATCH = 48;
const DEFAULT_EMBED_LIMIT = 240;
const BODY_MAX = 3500;
const PAGE = 1000;

interface Doc {
  entity_type: string; entity_id: string; title: string; body: string; url: string;
  audience: "public" | "members" | "private"; topics: string[]; territories: string[];
  source_updated_at: string | null; content_hash?: string;
}

const clean = (v: unknown, max = BODY_MAX) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const list = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => clean(x, 80)).filter(Boolean) : []);
const join = (parts: (string | null | undefined | false)[]) => parts.filter(Boolean).join("\n").slice(0, BODY_MAX);
const visibility = (v: unknown): "public" | "private" => (v === "public" ? "public" : "private");

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Toutes les lignes d'une requête paginée. */
async function fetchAll(build: (from: number, to: number) => any): Promise<any[]> {
  const out: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

const names = (rows: any[] | null | undefined, key: string): string[] =>
  (rows ?? []).map((r: any) => r?.[key]?.name).filter(Boolean);

// ── collecteurs par type ─────────────────────────────────────────────────────────────────────
type Collector = (sb: any) => Promise<Doc[]>;

const collectors: Record<string, Collector> = {
  async guild(sb) {
    const rows = await fetchAll((a, b) => sb.from("guilds")
      .select("id, name, description, type, is_physical_place, public_visibility, updated_at, guild_topics(topics(name)), guild_territories(territories(name))")
      .eq("is_deleted", false).eq("is_draft", false).eq("is_approved", true).order("id").range(a, b));
    return rows.map((g) => ({
      entity_type: "guild", entity_id: g.id, title: clean(g.name, 200), url: `${SITE}/guilds/${g.id}`,
      audience: visibility(g.public_visibility), source_updated_at: g.updated_at,
      topics: names(g.guild_topics, "topics"), territories: names(g.guild_territories, "territories"),
      body: join([clean(g.description), `Type : ${g.type}`, g.is_physical_place && "Lieu physique"]),
    }));
  },

  async quest(sb) {
    const rows = await fetchAll((a, b) => sb.from("quests")
      .select("id, title, description, ai_summary, status, guild_id, public_visibility, updated_at, quest_topics(topics(name)), quest_territories(territories(name))")
      .eq("is_deleted", false).eq("is_draft", false).order("id").range(a, b));
    const needs = await fetchAll((a, b) => sb.from("quest_needs").select("quest_id, title").in("status", ["open", "OPEN", "in_progress", "IN_PROGRESS"]).order("id").range(a, b));
    const needsBy = new Map<string, string[]>();
    for (const n of needs) (needsBy.get(n.quest_id) ?? needsBy.set(n.quest_id, []).get(n.quest_id)!).push(clean(n.title, 120));
    return rows.map((q) => ({
      entity_type: "quest", entity_id: q.id, title: clean(q.title, 200), url: `${SITE}/quests/${q.id}`,
      audience: visibility(q.public_visibility), source_updated_at: q.updated_at,
      topics: names(q.quest_topics, "topics"), territories: names(q.quest_territories, "territories"),
      body: join([clean(q.description), q.ai_summary && `Résumé : ${clean(q.ai_summary, 600)}`, `Statut : ${q.status}`,
        needsBy.get(q.id)?.length ? `Besoins ouverts : ${needsBy.get(q.id)!.slice(0, 8).join(" ; ")}` : null]),
    }));
  },

  async company(sb) {
    const rows = await fetchAll((a, b) => sb.from("companies")
      .select("id, name, description, sector, org_type, collaboration_interests, public_visibility, updated_at, company_topics(topics(name)), company_territories(territories(name))")
      .eq("is_deleted", false).order("id").range(a, b));
    return rows.map((c) => ({
      entity_type: "company", entity_id: c.id, title: clean(c.name, 200), url: `${SITE}/companies/${c.id}`,
      audience: visibility(c.public_visibility), source_updated_at: c.updated_at,
      topics: names(c.company_topics, "topics"), territories: names(c.company_territories, "territories"),
      body: join([clean(c.description), c.sector && `Secteur : ${c.sector}`, c.org_type && `Type : ${c.org_type}`,
        list(c.collaboration_interests).length ? `Cherche à collaborer sur : ${list(c.collaboration_interests).join(", ")}` : null]),
    }));
  },

  async pod(sb) {
    const rows = await fetchAll((a, b) => sb.from("pods")
      .select("id, name, description, type, updated_at, topics(name), pod_territories(territories(name))")
      .eq("is_deleted", false).eq("is_draft", false).order("id").range(a, b));
    return rows.map((p) => ({
      entity_type: "pod", entity_id: p.id, title: clean(p.name, 200), url: `${SITE}/pods/${p.id}`,
      audience: "private" as const, source_updated_at: p.updated_at,
      topics: p.topics?.name ? [p.topics.name] : [], territories: names(p.pod_territories, "territories"),
      body: join([clean(p.description), `Type : ${p.type}`]),
    }));
  },

  async service(sb) {
    const rows = await fetchAll((a, b) => sb.from("services")
      .select("id, title, description, service_type, location_text, public_visibility, updated_at, service_topics(topics(name)), service_territories(territories(name))")
      .eq("is_deleted", false).eq("is_draft", false).eq("is_active", true).order("id").range(a, b));
    return rows.map((s) => ({
      entity_type: "service", entity_id: s.id, title: clean(s.title, 200), url: `${SITE}/services/${s.id}`,
      audience: visibility(s.public_visibility), source_updated_at: s.updated_at,
      topics: names(s.service_topics, "topics"), territories: names(s.service_territories, "territories"),
      body: join([clean(s.description), s.service_type && `Type : ${s.service_type}`, s.location_text && `Lieu : ${clean(s.location_text, 120)}`]),
    }));
  },

  async course(sb) {
    const rows = await fetchAll((a, b) => sb.from("courses")
      .select("id, title, description, level, is_free, updated_at, course_topics(topics(name)), course_territories(territories(name))")
      .eq("is_deleted", false).eq("is_published", true).order("id").range(a, b));
    return rows.map((c) => ({
      entity_type: "course", entity_id: c.id, title: clean(c.title, 200), url: `${SITE}/courses/${c.id}`,
      audience: "public" as const, source_updated_at: c.updated_at,
      topics: names(c.course_topics, "topics"), territories: names(c.course_territories, "territories"),
      body: join([clean(c.description), c.level && `Niveau : ${c.level}`, c.is_free ? "Gratuit" : null]),
    }));
  },

  async agent(sb) {
    const rows = await fetchAll((a, b) => sb.from("agents")
      .select("id, name, description, purpose, category, updated_at, agent_topics(topics(name)), agent_territories(territories(name))")
      .eq("is_published", true).order("id").range(a, b));
    return rows.map((g) => ({
      entity_type: "agent", entity_id: g.id, title: clean(g.name, 200), url: `${SITE}/agents/${g.id}`,
      audience: "public" as const, source_updated_at: g.updated_at,
      topics: names(g.agent_topics, "topics"), territories: names(g.agent_territories, "territories"),
      body: join([clean(g.description), g.purpose && `Sert à : ${clean(g.purpose, 300)}`, `Catégorie : ${g.category}`, "Agent IA consultable depuis Pi ou le chat des guildes"]),
    }));
  },

  async territory(sb) {
    const rows = await fetchAll((a, b) => sb.from("territories")
      .select("id, name, level, summary, slug, updated_at").eq("is_deleted", false).order("id").range(a, b));
    return rows.map((t) => ({
      entity_type: "territory", entity_id: t.id, title: clean(t.name, 200), url: `${SITE}/territories/${t.slug ?? t.id}`,
      audience: "public" as const, source_updated_at: t.updated_at, topics: [], territories: [],
      body: join([clean(t.summary), `Niveau : ${String(t.level ?? "").toLowerCase()}`]),
    }));
  },

  async topic(sb) {
    const rows = await fetchAll((a, b) => sb.from("topics").select("id, name, slug, universe_type, updated_at").eq("is_deleted", false).order("id").range(a, b));
    return rows.map((t) => ({
      entity_type: "topic", entity_id: t.id, title: clean(t.name, 200), url: `${SITE}/topics/${t.slug}`,
      audience: "public" as const, source_updated_at: t.updated_at, topics: [], territories: [],
      body: join([`Thème de la plateforme`, t.universe_type && `Univers : ${t.universe_type}`]),
    }));
  },

  async profile(sb) {
    const rows = await fetchAll((a, b) => sb.from("profiles_public")
      .select("user_id, name, headline, bio, location, persona_type, updated_at").order("user_id").range(a, b));
    const topicsBy = new Map<string, string[]>();
    const ids = rows.map((r) => r.user_id);
    for (let i = 0; i < ids.length; i += 200) {
      const { data } = await sb.from("user_topics").select("user_id, topics(name)").in("user_id", ids.slice(i, i + 200));
      for (const r of data ?? []) if (r.topics?.name) (topicsBy.get(r.user_id) ?? topicsBy.set(r.user_id, []).get(r.user_id)!).push(r.topics.name);
    }
    return rows.filter((p) => p.name).map((p) => ({
      entity_type: "profile", entity_id: p.user_id, title: clean(p.name, 200), url: `${SITE}/users/${p.user_id}`,
      audience: "members" as const, source_updated_at: p.updated_at,
      topics: topicsBy.get(p.user_id) ?? [], territories: [],
      body: join([clean(p.headline, 300), clean(p.bio, 1500), p.location && `Lieu : ${clean(p.location, 120)}`, p.persona_type && `Profil : ${p.persona_type}`,
        topicsBy.get(p.user_id)?.length ? `Centres d'intérêt : ${topicsBy.get(p.user_id)!.join(", ")}` : null]),
    }));
  },
};

// ── embeddings ───────────────────────────────────────────────────────────────────────────────
async function embed(apiKey: string, texts: string[]): Promise<number[][]> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: texts }),
    signal: AbortSignal.timeout(40_000),
  });
  if (!res.ok) throw Object.assign(new Error(`embeddings ${res.status}`), { status: res.status });
  const data = await res.json();
  return data.data.map((d: any) => d.embedding as number[]);
}

const docText = (d: Doc) => [d.title, d.body, d.topics.length ? `Thèmes : ${d.topics.join(", ")}` : "", d.territories.length ? `Territoires : ${d.territories.join(", ")}` : ""].filter(Boolean).join("\n");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const cronSecret = Deno.env.get("CRON_SECRET");
  const isCron = !!cronSecret && req.headers.get("x-cron-secret") === cronSecret;
  if (!isCron) {
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: auth } = await anon.auth.getUser((req.headers.get("Authorization") ?? "").replace("Bearer ", ""));
    if (!auth?.user) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await sb.rpc("has_role", { _user_id: auth.user.id, _role: "admin" });
    if (isAdmin !== true) return json({ error: "Forbidden" }, 403);
  }

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

  const body = await req.json().catch(() => ({}));
  const wanted = Array.isArray(body.types) && body.types.length ? body.types.filter((t: string) => t in collectors) : Object.keys(collectors);
  let budget = Math.min(Math.max(parseInt(body.limit) || DEFAULT_EMBED_LIMIT, 1), 600);
  const forceAll = body.full === true;

  const report: Record<string, any> = { indexed: 0, unchanged: 0, removed: 0, remaining: 0, errors: [] as string[], byType: {} as Record<string, number> };
  const startedAt = Date.now();

  for (const type of wanted) {
    try {
      const docs = await collectors[type](sb);
      for (const d of docs) d.content_hash = await sha256(JSON.stringify([d.title, d.body, d.url, d.audience, d.topics, d.territories]));

      const existing = await fetchAll((a, b) => sb.from("search_index").select("entity_id, content_hash, embedding").eq("entity_type", type).order("entity_id").range(a, b));
      const known = new Map<string, { hash: string; hasEmbedding: boolean }>(existing.map((e: any) => [e.entity_id, { hash: e.content_hash, hasEmbedding: e.embedding != null }]));

      const seen = new Set(docs.map((d) => d.entity_id));
      const gone = existing.map((e: any) => e.entity_id).filter((id: string) => !seen.has(id));
      for (let i = 0; i < gone.length; i += 200) await sb.from("search_index").delete().eq("entity_type", type).in("entity_id", gone.slice(i, i + 200));
      report.removed += gone.length;

      const todo = docs.filter((d) => forceAll || known.get(d.entity_id)?.hash !== d.content_hash || known.get(d.entity_id)?.hasEmbedding === false);
      report.unchanged += docs.length - todo.length;

      let done = 0;
      for (let i = 0; i < todo.length; i += EMBED_BATCH) {
        if (budget <= 0 || Date.now() - startedAt > 100_000) break;
        const batch = todo.slice(i, i + EMBED_BATCH).slice(0, budget);
        const vectors = await embed(apiKey, batch.map(docText));
        const rows = batch.map((d, k) => ({
          entity_type: d.entity_type, entity_id: d.entity_id, title: d.title, body: d.body, url: d.url, audience: d.audience,
          topics: d.topics, territories: d.territories, content_hash: d.content_hash, source_updated_at: d.source_updated_at,
          embedding: `[${vectors[k].join(",")}]`, indexed_at: new Date().toISOString(),
        }));
        const { error } = await sb.from("search_index").upsert(rows, { onConflict: "entity_type,entity_id" });
        if (error) throw new Error(error.message);
        done += batch.length;
        budget -= batch.length;
      }
      report.indexed += done;
      report.remaining += todo.length - done;
      report.byType[type] = docs.length;
    } catch (e: any) {
      report.errors.push(`${type} : ${e?.message ?? e}`);
      if (e?.status === 429 || e?.status === 402) break;
    }
  }
  return json(report);
});
