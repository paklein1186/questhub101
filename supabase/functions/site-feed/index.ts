const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function dbQuery(supabaseUrl: string, serviceKey: string, table: string, params: string): Promise<Record<string, unknown>[]> {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/${table}?${params}`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
    }
  );
  if (!res.ok) { const t = await res.text(); throw new Error(`DB ${res.status}: ${t}`); }
  return res.json();
}

async function dbSingle(supabaseUrl: string, serviceKey: string, table: string, params: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/${table}?${params}`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.pgrst.object+json",
      },
    }
  );
  if (res.status === 406) return null;
  if (!res.ok) { const t = await res.text(); throw new Error(`DB ${res.status}: ${t}`); }
  return res.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    if (!code) {
      return new Response(JSON.stringify({ error: "Missing ?code= parameter" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sc = await dbSingle(supabaseUrl, serviceKey, "site_codes",
      `code=eq.${encodeURIComponent(code)}&revoked=eq.false`);

    if (!sc) {
      return new Response(JSON.stringify({ error: "Invalid or revoked site code" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ownerType = String(sc.owner_type);
    const ownerId = String(sc.owner_id);
    const BASE = "https://changethegame.xyz";

    const mapItem = (r: Record<string, unknown>, eType: string, tf = "title") => ({
      entityType: eType, id: r.id, slug: r.slug || null,
      title: r[tf] || r.name || "",
      shortDescription: r.description ? String(r.description).slice(0, 300) : null,
      coverImageUrl: r.cover_image_url || r.logo_url || r.banner_url || null,
      webTags: r.web_tags || [], webScopes: r.web_scopes || [],
      featuredOrder: r.featured_order, createdAt: r.created_at, updatedAt: r.updated_at,
    });

    let owner: Record<string, unknown> | null = null;
    let fp = { services: false, quests: false, guilds: false, partner_entities: false, posts: false };

    if (ownerType === "user") {
      const d = await dbSingle(supabaseUrl, serviceKey, "profiles", `user_id=eq.${ownerId}`);
      if (d) {
        fp = { services: !!d.feedpoint_default_services, quests: !!d.feedpoint_default_quests,
          guilds: !!d.feedpoint_default_guilds, partner_entities: !!d.feedpoint_default_partner_entities,
          posts: !!d.feedpoint_default_posts };
        owner = { type: "user", id: d.user_id, displayName: d.name || "",
          avatarUrl: d.avatar_url || null, ctgProfileUrl: BASE + "/u/" + (d.slug || d.user_id) };
      }
    } else if (ownerType === "guild") {
      const d = await dbSingle(supabaseUrl, serviceKey, "guilds", `id=eq.${ownerId}&is_deleted=eq.false`);
      if (d) {
        fp = { services: !!d.feedpoint_default_services, quests: !!d.feedpoint_default_quests,
          guilds: !!d.feedpoint_default_guilds, partner_entities: !!d.feedpoint_default_partner_entities,
          posts: !!d.feedpoint_default_posts };
        owner = { type: "guild", id: d.id, displayName: d.name || "",
          avatarUrl: d.logo_url || null, ctgProfileUrl: BASE + "/guilds/" + (d.slug || d.id) };
      }
    } else if (ownerType === "company") {
      const d = await dbSingle(supabaseUrl, serviceKey, "companies", `id=eq.${ownerId}&is_deleted=eq.false`);
      if (d) {
        fp = { services: !!d.feedpoint_default_services, quests: !!d.feedpoint_default_quests,
          guilds: !!d.feedpoint_default_guilds, partner_entities: !!d.feedpoint_default_partner_entities,
          posts: !!d.feedpoint_default_posts };
        owner = { type: "company", id: d.id, displayName: d.name || "",
          avatarUrl: d.logo_url || null, ctgProfileUrl: BASE + "/companies/" + d.id };
      }
    } else if (ownerType === "territory") {
      const d = await dbSingle(supabaseUrl, serviceKey, "territories", `id=eq.${ownerId}&is_deleted=eq.false`);
      if (d) { owner = { type: "territory", id: d.id, displayName: d.name || "" }; }
    }

    if (!owner) {
      return new Response(JSON.stringify({ error: "Owner not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vis = (item: Record<string, unknown>, def: boolean) => {
      const o = String(item.web_visibility_override || "inherit");
      return o === "force_visible" ? true : o === "force_hidden" ? false : def;
    };

    let services: Record<string, unknown>[] = [];
    if (ownerType !== "territory") {
      if (ownerType === "company") {
        const direct = await dbQuery(supabaseUrl, serviceKey, "services", `owner_type=eq.company&owner_id=eq.${ownerId}&is_deleted=eq.false&is_active=eq.true`);
        // Get entity roles for Admin/Operations
        const entityRoles = await dbQuery(supabaseUrl, serviceKey, "entity_roles", `entity_type=eq.company&entity_id=eq.${ownerId}`);
        const qualRoleIds = entityRoles.filter(r => r.name === "Admin" || r.name === "Operations").map(r => r.id);
        let roleUserIds: string[] = [];
        if (qualRoleIds.length > 0) {
          const ra = await dbQuery(supabaseUrl, serviceKey, "entity_member_roles", `entity_role_id=in.(${qualRoleIds.join(",")})`);
          roleUserIds = ra.map(r => String(r.user_id));
        }
        const members = await dbQuery(supabaseUrl, serviceKey, "company_members", `company_id=eq.${ownerId}`);
        const adminIds = members.filter(m => ["admin", "owner", "ADMIN"].includes(String(m.role))).map(m => String(m.user_id));
        const eligibleIds = [...new Set([...roleUserIds, ...adminIds])];
        let memberSvcs: Record<string, unknown>[] = [];
        if (eligibleIds.length > 0) {
          memberSvcs = await dbQuery(supabaseUrl, serviceKey, "services", `provider_user_id=in.(${eligibleIds.join(",")})&is_deleted=eq.false&is_active=eq.true`);
        }
        // Apply visibility overrides
        const visOvr = await dbQuery(supabaseUrl, serviceKey, "company_service_visibility", `company_id=eq.${ownerId}`);
        const visM = new Map(visOvr.map(v => [String(v.service_id), v.is_visible]));
        const filteredMSvcs = memberSvcs.filter(s => visM.get(String(s.id)) !== false);
        const allSvcs = [...direct, ...filteredMSvcs];
        const seen = new Set<unknown>();
        services = allSvcs.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return vis(r, fp.services); }).map(r => mapItem(r, "service"));
      } else {
        const f = ownerType === "user" ? "provider_user_id" : "provider_guild_id";
        const d = await dbQuery(supabaseUrl, serviceKey, "services", `${f}=eq.${ownerId}&is_deleted=eq.false&is_active=eq.true`);
        services = d.filter(r => vis(r, fp.services)).map(r => mapItem(r, "service"));
      }
    }

    let quests: Record<string, unknown>[] = [];
    if (ownerType !== "territory") {
      // Legacy: quests directly owned
      const f = ownerType === "user" ? "created_by_user_id" : ownerType === "company" ? "company_id" : "guild_id";
      const directQuests = await dbQuery(supabaseUrl, serviceKey, "quests", `${f}=eq.${ownerId}&is_deleted=eq.false`);

      // New: quests linked via quest_affiliations
      let affiliatedQuests: Record<string, unknown>[] = [];
      if (ownerType === "guild" || ownerType === "company") {
        const afType = ownerType === "guild" ? "GUILD" : "COMPANY";
        const afs = await dbQuery(supabaseUrl, serviceKey, "quest_affiliations",
          `entity_type=eq.${afType}&entity_id=eq.${ownerId}&select=quest_id`);
        if (afs.length > 0) {
          const qIds = afs.map(a => a.quest_id).join(",");
          affiliatedQuests = await dbQuery(supabaseUrl, serviceKey, "quests",
            `id=in.(${qIds})&is_deleted=eq.false`);
        }
      }

      // Merge & deduplicate
      const allQuests = [...directQuests, ...affiliatedQuests];
      const seenQ = new Set<unknown>();
      quests = allQuests.filter(r => { if (seenQ.has(r.id)) return false; seenQ.add(r.id); return vis(r, fp.quests); }).map(r => mapItem(r, "quest"));
    }

    let guilds: Record<string, unknown>[] = [];
    if (ownerType === "user") {
      const mem = await dbQuery(supabaseUrl, serviceKey, "guild_members", `user_id=eq.${ownerId}&select=guild_id`);
      if (mem.length > 0) {
        const ids = mem.map(m => m.guild_id).join(",");
        const d = await dbQuery(supabaseUrl, serviceKey, "guilds", `id=in.(${ids})&is_deleted=eq.false`);
        guilds = d.filter(r => vis(r, fp.guilds)).map(r => mapItem(r, "guild", "name"));
      }
    }

    const feed = { owner, services, quests, guilds, programs: [], territories: [], events: [],
      meta: { generatedAt: new Date().toISOString(), ownerType, ownerId } };

    return new Response(JSON.stringify(feed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("site-feed error:", err);
    return new Response(JSON.stringify({ error: "Internal error", detail: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
