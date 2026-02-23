import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // ── site-feed route: /public-website/site-feed?code=xxx ──
  const isSiteFeed = url.pathname.replace(/^\/public-website\/?/, "").startsWith("site-feed");
  if (isSiteFeed) {
    return handleSiteFeed(url);
  }

  const pathParts = url.pathname.replace(/^\/public-website\/?/, "").split("/").filter(Boolean);

  // Routes:
  // GET /:slug
  // GET /:slug/full
  // GET /:slug/pages/:pageSlug/resolved
  if (pathParts.length === 0) {
    return json({ error: "Slug required" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );

  const slug = pathParts[0];

  // Fetch the website
  const { data: website, error: wErr } = await supabase
    .from("websites")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (wErr || !website) {
    return json({ error: "Website not found" }, 404);
  }

  // Fetch pages
  const { data: pages } = await supabase
    .from("website_pages")
    .select("*")
    .eq("website_id", website.id)
    .order("sort_order");

  // Fetch sections for all pages
  const pageIds = (pages || []).map((p: any) => p.id);
  const { data: sections } = await supabase
    .from("website_sections")
    .select("*")
    .in("page_id", pageIds.length > 0 ? pageIds : ["__none__"])
    .order("sort_order");

  const sectionsByPage: Record<string, any[]> = {};
  for (const s of sections || []) {
    if (!sectionsByPage[s.page_id]) sectionsByPage[s.page_id] = [];
    sectionsByPage[s.page_id].push(s);
  }

  const pagesWithSections = (pages || []).map((p: any) => ({
    ...p,
    sections: sectionsByPage[p.id] || [],
  }));

  // Route: /:slug (unresolved)
  if (pathParts.length === 1) {
    return json({
      ...website,
      pages: pagesWithSections,
    });
  }

  // Route: /:slug/full
  if (pathParts.length === 2 && pathParts[1] === "full") {
    const resolvedPages = await Promise.all(
      pagesWithSections.map((p: any) => resolvePage(supabase, website, p))
    );
    return json({ ...website, pages: resolvedPages });
  }

  // Route: /:slug/pages/:pageSlug/resolved
  if (
    pathParts.length === 4 &&
    pathParts[1] === "pages" &&
    pathParts[3] === "resolved"
  ) {
    const pageSlug = pathParts[2];
    const page = pagesWithSections.find((p: any) => p.slug === pageSlug);
    if (!page) return json({ error: "Page not found" }, 404);
    const resolved = await resolvePage(supabase, website, page);
    return json(resolved);
  }

  return json({ error: "Not found" }, 404);
});

function ownerScope(ownerType: string): string {
  const map: Record<string, string> = {
    user: "personal_site",
    guild: "guild_site",
    territory: "territory_site",
    program: "program_site",
  };
  return map[ownerType] || "personal_site";
}

async function resolvePage(supabase: any, website: any, page: any) {
  const resolvedSections = await Promise.all(
    (page.sections || []).map((s: any) => resolveSection(supabase, website, s))
  );
  return { ...page, sections: resolvedSections };
}

async function resolveSection(supabase: any, website: any, section: any) {
  const listTypes = [
    "services_list",
    "quests_list",
    "guilds_list",
    "projects_list",
  ];
  if (!listTypes.includes(section.type)) return section;

  const scope = ownerScope(website.owner_type);
  let items: any[] = [];

  if (section.source === "manual" && section.selected_ids?.length > 0) {
    items = await fetchManualItems(supabase, section, scope);
  } else if (section.source === "auto") {
    items = await fetchAutoItems(supabase, section, scope);
  }

  return { ...section, items };
}

async function fetchManualItems(supabase: any, section: any, scope: string) {
  const table = tableForSectionType(section.type);
  if (!table) return [];

  const nameCol = table === "quests" || table === "services" ? "title" : "name";
  const descCol = table === "guilds" ? "description" : "short_description";

  const { data } = await supabase
    .from(table)
    .select(`id, ${nameCol}, ${descCol}, web_tags, public_visibility, web_scopes, featured_order`)
    .in("id", section.selected_ids)
    .neq("public_visibility", "private")
    .contains("web_scopes", [scope]);

  return (data || []).map((item: any) => ({
    id: item.id,
    title: item[nameCol],
    shortDescription: item[descCol] || null,
    webTags: item.web_tags || [],
    featuredOrder: item.featured_order,
  }));
}

async function fetchAutoItems(supabase: any, section: any, scope: string) {
  const filters = section.filters || {};
  const itemType = filters.itemType || sectionTypeToItemType(section.type);
  const table = itemTypeToTable(itemType);
  if (!table) return [];

  const nameCol = table === "quests" || table === "services" ? "title" : "name";
  const descCol = table === "guilds" ? "description" : "short_description";

  let query = supabase
    .from(table)
    .select(`id, ${nameCol}, ${descCol}, web_tags, public_visibility, web_scopes, featured_order`)
    .contains("web_scopes", [scope]);

  if (filters.publicOnly !== false) {
    query = query.eq("public_visibility", "public");
  } else {
    query = query.neq("public_visibility", "private");
  }

  if (filters.webTags?.length > 0) {
    query = query.overlaps("web_tags", filters.webTags);
  }

  if (filters.webScopes?.length > 0) {
    query = query.overlaps("web_scopes", filters.webScopes);
  }

  // Soft-delete check
  if (table !== "guilds") {
    query = query.eq("is_deleted", false);
  } else {
    query = query.eq("is_deleted", false);
  }

  query = query.order("featured_order", { ascending: true, nullsFirst: false });

  if (filters.limit) {
    query = query.limit(filters.limit);
  } else {
    query = query.limit(50);
  }

  const { data } = await query;

  return (data || []).map((item: any) => ({
    id: item.id,
    title: item[nameCol],
    shortDescription: item[descCol] || null,
    webTags: item.web_tags || [],
    featuredOrder: item.featured_order,
  }));
}

function tableForSectionType(type: string): string | null {
  const map: Record<string, string> = {
    services_list: "services",
    quests_list: "quests",
    guilds_list: "guilds",
    projects_list: "quests", // projects are quests
  };
  return map[type] || null;
}

function sectionTypeToItemType(type: string): string {
  const map: Record<string, string> = {
    services_list: "service",
    quests_list: "quest",
    guilds_list: "guild",
    projects_list: "quest",
  };
  return map[type] || "quest";
}

function itemTypeToTable(itemType: string): string | null {
  const map: Record<string, string> = {
    service: "services",
    quest: "quests",
    guild: "guilds",
    project: "quests",
  };
  return map[itemType] || null;
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── site-feed handler (mirrors supabase/functions/site-feed logic) ──

async function sfQuery(sbUrl: string, key: string, table: string, params: string): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${sbUrl}/rest/v1/${table}?${params}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`DB ${res.status}: ${t}`); }
  return res.json();
}

async function sfSingle(sbUrl: string, key: string, table: string, params: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${sbUrl}/rest/v1/${table}?${params}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/vnd.pgrst.object+json" },
  });
  if (res.status === 406) return null;
  if (!res.ok) { const t = await res.text(); throw new Error(`DB ${res.status}: ${t}`); }
  return res.json();
}

async function handleSiteFeed(url: URL): Promise<Response> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const code = url.searchParams.get("code");
    if (!code) return json({ error: "Missing ?code= parameter" }, 400);

    const sc = await sfSingle(supabaseUrl, serviceKey, "site_codes",
      `code=eq.${encodeURIComponent(code)}&revoked=eq.false`);
    if (!sc) return json({ error: "Invalid or revoked site code" }, 404);

    const ownerType = String(sc.owner_type);
    const ownerId = String(sc.owner_id);
    const BASE = "https://changethegame.xyz";

    const mapItem = (r: Record<string, unknown>, eType: string, tf = "title") => ({
      entityType: eType, id: r.id, slug: r.slug || null,
      title: r[tf] || r.name || "",
      shortDescription: r.description ? String(r.description).slice(0, 300) : null,
      coverImageUrl: r.cover_image_url || r.image_url || r.logo_url || r.banner_url || null,
      webTags: r.web_tags || [], webScopes: r.web_scopes || [],
      featuredOrder: r.featured_order, createdAt: r.created_at, updatedAt: r.updated_at,
    });

    let owner: Record<string, unknown> | null = null;
    let fp = { services: false, quests: false, guilds: false, partner_entities: false, posts: false };

    if (ownerType === "user") {
      const d = await sfSingle(supabaseUrl, serviceKey, "profiles", `user_id=eq.${ownerId}`);
      if (d) {
        fp = { services: !!d.feedpoint_default_services, quests: !!d.feedpoint_default_quests,
          guilds: !!d.feedpoint_default_guilds, partner_entities: !!d.feedpoint_default_partner_entities,
          posts: !!d.feedpoint_default_posts };
        owner = { type: "user", id: d.user_id, displayName: d.name || "",
          avatarUrl: d.avatar_url || null, ctgProfileUrl: BASE + "/u/" + (d.slug || d.user_id) };
      }
    } else if (ownerType === "guild") {
      const d = await sfSingle(supabaseUrl, serviceKey, "guilds", `id=eq.${ownerId}&is_deleted=eq.false`);
      if (d) {
        fp = { services: !!d.feedpoint_default_services, quests: !!d.feedpoint_default_quests,
          guilds: !!d.feedpoint_default_guilds, partner_entities: !!d.feedpoint_default_partner_entities,
          posts: !!d.feedpoint_default_posts };
        owner = { type: "guild", id: d.id, displayName: d.name || "",
          avatarUrl: d.logo_url || null, ctgProfileUrl: BASE + "/guilds/" + (d.slug || d.id) };
      }
    } else if (ownerType === "company") {
      const d = await sfSingle(supabaseUrl, serviceKey, "companies", `id=eq.${ownerId}&is_deleted=eq.false`);
      if (d) {
        fp = { services: !!d.feedpoint_default_services, quests: !!d.feedpoint_default_quests,
          guilds: !!d.feedpoint_default_guilds, partner_entities: !!d.feedpoint_default_partner_entities,
          posts: !!d.feedpoint_default_posts };
        owner = { type: "company", id: d.id, displayName: d.name || "",
          avatarUrl: d.logo_url || null, ctgProfileUrl: BASE + "/companies/" + d.id };
      }
    } else if (ownerType === "territory") {
      const d = await sfSingle(supabaseUrl, serviceKey, "territories", `id=eq.${ownerId}&is_deleted=eq.false`);
      if (d) { owner = { type: "territory", id: d.id, displayName: d.name || "" }; }
    }

    if (!owner) return json({ error: "Owner not found" }, 404);

    const vis = (item: Record<string, unknown>, def: boolean) => {
      const o = String(item.web_visibility_override || "inherit");
      return o === "force_visible" ? true : o === "force_hidden" ? false : def;
    };

    let services: Record<string, unknown>[] = [];
    if (ownerType !== "territory") {
      if (ownerType === "company") {
        // Include directly-owned services AND services from members with Admin/Operations entity roles
        const direct = await sfQuery(supabaseUrl, serviceKey, "services", `owner_type=eq.company&owner_id=eq.${ownerId}&is_deleted=eq.false&is_active=eq.true`);

        // Get entity roles for Admin/Operations
        const entityRoles = await sfQuery(supabaseUrl, serviceKey, "entity_roles", `entity_type=eq.company&entity_id=eq.${ownerId}`);
        const qualifyingRoleIds = entityRoles.filter(r => r.name === "Admin" || r.name === "Operations").map(r => r.id);

        // Get user ids with qualifying roles
        let roleUserIds: string[] = [];
        if (qualifyingRoleIds.length > 0) {
          const roleAssignments = await sfQuery(supabaseUrl, serviceKey, "entity_member_roles", `entity_role_id=in.(${qualifyingRoleIds.join(",")})`);
          roleUserIds = roleAssignments.map(r => String(r.user_id));
        }

        // Also include structural admin members
        const members = await sfQuery(supabaseUrl, serviceKey, "company_members", `company_id=eq.${ownerId}`);
        const adminMemberIds = members.filter(m => ["admin", "owner", "ADMIN"].includes(String(m.role))).map(m => String(m.user_id));

        const eligibleIds = [...new Set([...roleUserIds, ...adminMemberIds])];

        let memberSvcs: Record<string, unknown>[] = [];
        if (eligibleIds.length > 0) {
          memberSvcs = await sfQuery(supabaseUrl, serviceKey, "services", `provider_user_id=in.(${eligibleIds.join(",")})&is_deleted=eq.false&is_active=eq.true`);
        }

        // Apply per-service visibility overrides
        const visOverrides = await sfQuery(supabaseUrl, serviceKey, "company_service_visibility", `company_id=eq.${ownerId}`);
        const visMap = new Map(visOverrides.map(v => [String(v.service_id), v.is_visible]));
        const filteredMemberSvcs = memberSvcs.filter(s => visMap.get(String(s.id)) !== false);

        const allSvcs = [...direct, ...filteredMemberSvcs];
        const seen = new Set<unknown>();
        services = allSvcs.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return vis(r, fp.services); }).map(r => mapItem(r, "service"));
      } else {
        const f = ownerType === "user" ? "provider_user_id" : "provider_guild_id";
        const d = await sfQuery(supabaseUrl, serviceKey, "services", `${f}=eq.${ownerId}&is_deleted=eq.false&is_active=eq.true`);
        services = d.filter(r => vis(r, fp.services)).map(r => mapItem(r, "service"));
      }
    }

    let quests: Record<string, unknown>[] = [];
    if (ownerType !== "territory") {
      const f = ownerType === "user" ? "created_by_user_id" : ownerType === "company" ? "company_id" : "guild_id";
      const d = await sfQuery(supabaseUrl, serviceKey, "quests", `${f}=eq.${ownerId}&is_deleted=eq.false`);
      quests = d.filter(r => vis(r, fp.quests)).map(r => mapItem(r, "quest"));
    }

    let guilds: Record<string, unknown>[] = [];
    if (ownerType === "user") {
      const mem = await sfQuery(supabaseUrl, serviceKey, "guild_members", `user_id=eq.${ownerId}&select=guild_id`);
      if (mem.length > 0) {
        const ids = mem.map(m => m.guild_id).join(",");
        const d = await sfQuery(supabaseUrl, serviceKey, "guilds", `id=in.(${ids})&is_deleted=eq.false`);
        guilds = d.filter(r => vis(r, fp.guilds)).map(r => mapItem(r, "guild", "name"));
      }
    } else if (ownerType === "company" || ownerType === "guild") {
      // Fetch partner guilds from partnerships table
      const entityType = ownerType === "company" ? "COMPANY" : "GUILD";
      console.log("[site-feed] Fetching partnerships for", entityType, ownerId);
      const fromP = await sfQuery(supabaseUrl, serviceKey, "partnerships",
        `from_entity_type=eq.${entityType}&from_entity_id=eq.${ownerId}&status=eq.ACCEPTED`);
      const toP = await sfQuery(supabaseUrl, serviceKey, "partnerships",
        `to_entity_type=eq.${entityType}&to_entity_id=eq.${ownerId}&status=eq.ACCEPTED`);
      console.log("[site-feed] fromP count:", fromP.length, "toP count:", toP.length);
      
      // Collect partner guild IDs from both sides
      const partnerGuildIds = new Set<string>();
      for (const p of fromP) {
        if (String(p.to_entity_type) === "GUILD") partnerGuildIds.add(String(p.to_entity_id));
      }
      for (const p of toP) {
        if (String(p.from_entity_type) === "GUILD") partnerGuildIds.add(String(p.from_entity_id));
      }
      console.log("[site-feed] partnerGuildIds:", [...partnerGuildIds]);
      
      if (partnerGuildIds.size > 0) {
        const ids = [...partnerGuildIds].join(",");
        const d = await sfQuery(supabaseUrl, serviceKey, "guilds", `id=in.(${ids})&is_deleted=eq.false`);
        console.log("[site-feed] fetched guilds count:", d.length, "fp.guilds:", fp.guilds);
        guilds = d.filter(r => vis(r, fp.guilds)).map(r => mapItem(r, "guild", "name"));
        console.log("[site-feed] final guilds count:", guilds.length);
      }
    }

    return json({
      owner, services, quests, guilds, programs: [], territories: [], events: [],
      meta: { generatedAt: new Date().toISOString(), ownerType, ownerId },
    });
  } catch (err) {
    console.error("site-feed error:", err);
    return json({ error: "Internal error", detail: String(err) }, 500);
  }
}
