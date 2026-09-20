// Bannière d'un territoire : une photo réaliste et représentative du lieu, pas un paysage générique.
//
// 1. Un modèle de texte décrit d'abord la scène réelle la plus caractéristique du lieu (pays, région,
//    niveau, coordonnées, thèmes des guildes qui y sont actives).
// 2. Le modèle d'image génère la bannière à partir de cette description — sans aucun texte dans l'image
//    (le nom est affiché par l'interface, il est traduisible et ne se déforme pas).
//
// Modes : { territory_id, force? } (une bannière) ; { status: true } et { batch: true, limit? }
// (administrateurs : régénération par lots, territoires les plus denses d'abord).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const COVER_VERSION = 2;
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MAX_BATCH = 4;

/** What kind of picture suits each level. */
const LEVEL_GUIDE: Record<string, string> = {
  GLOBAL: "the Earth seen from a realistic vantage point (no fantasy), diverse landscapes",
  CONTINENT: "a characteristic aerial or panoramic view showing how people and landscape coexist on that continent",
  NATIONAL: "one recognisable, real landmark or landscape of the country, with its typical built environment",
  REGION: "a characteristic real landscape of the region together with its typical villages or towns and building materials",
  PROVINCE: "a characteristic real landscape of the province together with its typical villages or towns",
  BIOREGION: "the real ecosystem that defines the bioregion (terrain, vegetation, water, land use) as a naturalist photographer would show it",
  TOWN: "a real, typical street, square, skyline or village view of the place, with its actual architecture",
  LOCALITY: "a real, typical street or village view with its actual architecture",
  OTHER: "a characteristic real view of the area",
};

async function chat(apiKey: string, model: string, messages: any[], extra: Record<string, unknown> = {}) {
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, ...extra }),
  });
  if (!res.ok) {
    const err: any = new Error(`AI gateway ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function ecosystemTopics(sb: any, territoryId: string): Promise<string[]> {
  const { data: links } = await sb.from("guild_territories").select("guild_id").eq("territory_id", territoryId).limit(40);
  const ids = (links ?? []).map((l: any) => l.guild_id);
  if (!ids.length) return [];
  const { data: rows } = await sb.from("guild_topics").select("topics(name)").in("guild_id", ids);
  const freq = new Map<string, number>();
  for (const r of rows ?? []) if (r.topics?.name) freq.set(r.topics.name, (freq.get(r.topics.name) ?? 0) + 1);
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([n]) => n);
}

async function generateCover(sb: any, apiKey: string, territoryId: string, hint?: { name?: string; level?: string }) {
  const { data: t } = await sb.from("territories").select("id, name, level, parent_id, latitude, longitude, stats").eq("id", territoryId).maybeSingle();
  if (!t) throw Object.assign(new Error("territory not found"), { status: 404 });
  const name: string = t.name ?? hint?.name;
  const level = String(t.level ?? hint?.level ?? "OTHER").toUpperCase();

  // Parent chain (up to 2) to place the territory: « Huy › Wallonia › Belgium ».
  const chain: string[] = [];
  let parentId: string | null = t.parent_id;
  for (let i = 0; i < 2 && parentId; i++) {
    const { data: p } = await sb.from("territories").select("name, parent_id").eq("id", parentId).maybeSingle();
    if (!p) break;
    chain.push(p.name);
    parentId = p.parent_id;
  }
  const topics = await ecosystemTopics(sb, territoryId);

  // 1. Photo brief grounded in the real place.
  const facts = [
    `Place: ${name}`,
    `Level: ${level.toLowerCase()}`,
    chain.length ? `Located in: ${chain.join(", ")}` : null,
    t.latitude != null && t.longitude != null ? `Coordinates: ${Number(t.latitude).toFixed(3)}, ${Number(t.longitude).toFixed(3)}` : null,
    topics.length ? `Local community themes (for a subtle, optional human touch): ${topics.join(", ")}` : null,
  ].filter(Boolean).join("\n");

  const briefRes = await chat(apiKey, "google/gemini-2.5-flash", [
    {
      role: "system",
      content:
        "You are a picture editor for a documentary photo agency. Write a photo brief (max 70 words, English, plain text) for a wide banner photograph that a local would recognise as THIS place. " +
        `Show: ${LEVEL_GUIDE[level] ?? LEVEL_GUIDE.OTHER}. ` +
        "Rules: use real, specific features of the place (actual landmarks, architecture, landscape, typical materials and colours, realistic weather and light for the region — not a golden-hour postcard). " +
        "Do NOT default to rivers, forests or green hills unless they truly define the place. If you are unsure about the exact place, stay with what is typical of its region. " +
        "A subtle human touch matching the community themes (a market garden, a shared workshop, a small gathering seen from afar) is welcome only if it is plausible there. No text, no signs with lettering, no logos, no close-up faces.",
    },
    { role: "user", content: facts },
  ], { temperature: 0.6, max_tokens: 300 });
  const brief: string = (briefRes.choices?.[0]?.message?.content ?? "").trim();
  if (!brief) throw new Error("empty brief");

  // 2. Image from the brief — no text in the image.
  const imageRes = await chat(apiKey, "google/gemini-3.1-flash-image-preview", [
    {
      role: "user",
      content:
        `Photorealistic documentary photograph, wide 16:9 banner. ${brief} ` +
        "Natural, true-to-life colours and lighting, high quality, sharp. Absolutely no text, letters, captions, watermarks or logos anywhere in the image.",
    },
  ], { modalities: ["image", "text"] });
  const imageUrl: string | undefined = imageRes.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!imageUrl || !imageUrl.startsWith("data:image")) throw new Error("no image in AI response");

  const bin = atob(imageUrl.split(",")[1]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

  const { error: bucketError } = await sb.storage.createBucket("territory-covers", { public: true, fileSizeLimit: 10485760 });
  if (bucketError && !bucketError.message?.includes("already exists")) console.error("bucket:", bucketError);

  // Versioned path: the old picture stays cached by browsers/CDN under its own URL.
  const filePath = `territory-covers/${territoryId}-v${COVER_VERSION}.png`;
  const { error: uploadError } = await sb.storage.from("territory-covers").upload(filePath, bytes.buffer, { contentType: "image/png", upsert: true });
  if (uploadError) throw new Error(`upload: ${uploadError.message}`);
  const coverUrl = sb.storage.from("territory-covers").getPublicUrl(filePath).data.publicUrl;

  const stats = { ...((t.stats as Record<string, unknown>) ?? {}), cover_url: coverUrl, cover_version: COVER_VERSION, cover_generated_at: new Date().toISOString(), cover_brief: brief };
  delete (stats as any).cover_urls;
  await sb.from("territories").update({ stats }).eq("id", territoryId);
  return { cover_url: coverUrl, brief };
}

/** Density = guilds + quests + entities + pods located in the territory. */
async function densityRanking(sb: any) {
  const tables = ["guild_territories", "quest_territories", "company_territories", "pod_territories"];
  const score = new Map<string, number>();
  for (const table of tables) {
    const { data } = await sb.from(table).select("territory_id").limit(20000);
    for (const r of data ?? []) score.set(r.territory_id, (score.get(r.territory_id) ?? 0) + 1);
  }
  const { data: terr } = await sb.from("territories").select("id, name, level, stats").eq("is_deleted", false);
  return (terr ?? [])
    .map((t: any) => ({ id: t.id, name: t.name, level: t.level, score: score.get(t.id) ?? 0, version: Number(t.stats?.cover_version ?? 0) }))
    .sort((a: any, b: any) => b.score - a.score || String(a.name).localeCompare(String(b.name)));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "LOVABLE_API_KEY not configured" }, 500);
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // ── Admin modes: status / batch regeneration ──────────────────────────────
    if (body.status || body.batch) {
      const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
      const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
      const { data: auth } = await anon.auth.getUser(token);
      if (!auth?.user) return json({ error: "Unauthorized" }, 401);
      const { data: isAdmin } = await sb.rpc("has_role", { _user_id: auth.user.id, _role: "admin" });
      if (isAdmin !== true) return json({ error: "Forbidden" }, 403);

      const ranking = await densityRanking(sb);
      const pending = ranking.filter((r: any) => r.version < COVER_VERSION);
      if (body.status) {
        return json({ total: ranking.length, done: ranking.length - pending.length, remaining: pending.length, next: pending.slice(0, 8).map((r: any) => ({ name: r.name, level: r.level, score: r.score })) });
      }
      const limit = Math.min(Math.max(parseInt(body.limit) || 3, 1), MAX_BATCH);
      const processed: { name: string; ok: boolean; error?: string }[] = [];
      for (const r of pending.slice(0, limit)) {
        try {
          await generateCover(sb, apiKey, r.id, { name: r.name, level: r.level });
          processed.push({ name: r.name, ok: true });
        } catch (e: any) {
          processed.push({ name: r.name, ok: false, error: e?.status === 429 ? "rate limit" : e?.status === 402 ? "credits exhausted" : String(e?.message ?? e) });
          if (e?.status === 429 || e?.status === 402) break;
        }
      }
      const okCount = processed.filter((p) => p.ok).length;
      return json({ processed, remaining: Math.max(0, pending.length - okCount) });
    }

    // ── Single cover (used by the territory page when it has none) ──────────────
    const { territory_id, territory_name, territory_level, force } = body;
    if (!territory_id) return json({ error: "territory_id is required" }, 400);

    const { data: existing } = await sb.from("territories").select("stats").eq("id", territory_id).maybeSingle();
    const stats = (existing?.stats as Record<string, unknown>) ?? {};
    if (!force && stats.cover_url) return json({ cover_url: stats.cover_url, cached: true });

    const result = await generateCover(sb, apiKey, territory_id, { name: territory_name, level: territory_level });
    return json({ cover_url: result.cover_url, cached: false });
  } catch (e: any) {
    console.error("Error:", e);
    if (e?.status === 429) return json({ error: "Rate limits exceeded, please try again later." }, 429);
    if (e?.status === 402) return json({ error: "Payment required, please add funds." }, 402);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
