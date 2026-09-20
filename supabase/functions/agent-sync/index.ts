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
    skipped_over_limit: 0, unmatched_places: [] as string[], unmatched_terms: [] as string[], errors: [] as string[],
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
  const { data: allTerritories } = await sb.from("territories").select("id, name, slug");
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
    const region = lieu.region ? findByName(String(lieu.region), territoryPool, TERRITORY_ALIASES) : null;
    const country = lieu.pays ? findByName(String(lieu.pays), territoryPool, TERRITORY_ALIASES) : null;
    if (lieu.region && !region) note(summary.unmatched_places, String(lieu.region));
    if (lieu.pays && !country) note(summary.unmatched_places, String(lieu.pays));
    const territoryIds = [region, country].filter((t, i, a): t is any => !!t && a.findIndex((x) => x?.id === t.id) === i).map((t) => t.id as string);
    return { topicIds: [...topicIds], territoryIds };
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
        if (opts.dryRun) continue;

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
        const { data: guild } = await sb.from("guilds").select("id, claimed_at, auto_created_by_agent_id, is_deleted").eq("id", ref.entity_id).maybeSingle();
        if (guild && !guild.claimed_at && guild.auto_created_by_agent_id === agent.id && !guild.is_deleted) {
          await sb.from("guilds").update({ description: describeLieu(lieu, agent.name) }).eq("id", guild.id);
          await applyTaxonomy(guild.id, taxonomyFor(lieu), true);
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

  if (opts.dryRun) return summary;

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
    try {
      results.push(await syncAgent(sb, agent, { dryRun, maxCreate, full: !isCron }));
    } catch (e: any) {
      results.push({ agent: agent.name, error: String(e?.message ?? e) });
    }
  }
  return json({ results });
});
