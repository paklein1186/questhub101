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
