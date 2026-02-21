import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    if (!code) {
      return new Response(JSON.stringify({ error: "Missing ?code= parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // 1. Resolve site code
    const { data: sc, error: scErr } = await sb
      .from("site_codes")
      .select("*")
      .eq("code", code)
      .eq("revoked", false)
      .maybeSingle();

    if (scErr || !sc) {
      return new Response(JSON.stringify({ error: "Invalid or revoked site code" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { owner_type: ownerType, owner_id: ownerId } = sc;

    const requiredScope: Record<string, string> = {
      user: "personal_site",
      guild: "guild_site",
      territory: "territory_site",
      program: "program_site",
    };
    const scope = requiredScope[ownerType] || "personal_site";

    const visibleItems = (items: Record<string, unknown>[]) =>
      items.filter(
        (i) =>
          i.public_visibility !== "private" &&
          Array.isArray(i.web_scopes) &&
          (i.web_scopes as string[]).includes(scope)
      );

    const BASE_URL = "https://changethegame.xyz";
    const buildCtgUrl = (type: string, row: Record<string, unknown>) => {
      const slug = row.slug || row.id;
      const paths: Record<string, string> = {
        service: `/services/${slug}`,
        quest: `/quests/${slug}`,
        guild: `/guilds/${slug}`,
        territory: `/territories/${slug}`,
        event: `/events/${slug}`,
        user: `/u/${slug}`,
      };
      return `${BASE_URL}${paths[type] || `/${type}s/${slug}`}`;
    };

    const mapItem = (row: Record<string, unknown>, entityType: string, titleField = "title") => ({
      entityType,
      id: row.id,
      slug: row.slug || null,
      title: row[titleField] || row.name || "",
      shortDescription: row.description ? (row.description as string).slice(0, 300) : null,
      ctgUrl: buildCtgUrl(entityType, row),
      coverImageUrl: row.cover_image_url || row.logo_url || row.banner_url || null,
      webTags: row.web_tags || [],
      webScopes: row.web_scopes || [],
      publicVisibility: row.public_visibility || "private",
      status: row.status || null,
      startDate: row.start_date || null,
      endDate: row.end_date || null,
      location: row.location || null,
      featuredOrder: row.featured_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });

    // 2. Build owner object
    let owner: Record<string, unknown> | null = null;
    if (ownerType === "user") {
      const { data } = await sb.from("profiles").select("*").eq("user_id", ownerId).maybeSingle();
      if (data) {
        owner = {
          type: "user", id: data.user_id, slug: data.slug || data.user_id,
          displayName: data.name || "", shortBio: data.headline || null,
          longBioMarkdown: data.bio || null, avatarUrl: data.avatar_url || null,
          coverImageUrl: data.banner_url || null, location: data.location || null,
          websiteUrl: data.website_url || null,
          ctgProfileUrl: `${BASE_URL}/u/${data.slug || data.user_id}`,
          roles: [data.role], webTags: data.web_tags || [], webScopes: data.web_scopes || [],
          publicVisibility: data.public_visibility || "private",
          createdAt: data.created_at, updatedAt: data.updated_at,
        };
      }
    } else if (ownerType === "guild") {
      const { data } = await sb.from("guilds").select("*").eq("id", ownerId).eq("is_deleted", false).maybeSingle();
      if (data) {
        owner = {
          type: "guild", id: data.id, slug: data.slug || data.id,
          displayName: data.name || "",
          shortBio: data.description ? data.description.slice(0, 300) : null,
          longBioMarkdown: data.description || null,
          avatarUrl: data.logo_url || null, coverImageUrl: data.banner_url || null,
          websiteUrl: data.website_url || null,
          ctgProfileUrl: `${BASE_URL}/guilds/${data.slug || data.id}`,
          orgType: data.type || "guild", webTags: data.web_tags || [],
          webScopes: data.web_scopes || [],
          publicVisibility: data.public_visibility || "private",
          createdAt: data.created_at, updatedAt: data.updated_at,
        };
      }
    } else if (ownerType === "territory") {
      const { data } = await sb.from("territories").select("*").eq("id", ownerId).eq("is_deleted", false).maybeSingle();
      if (data) {
        owner = {
          type: "territory", id: data.id, slug: data.slug || data.id,
          displayName: data.name || "", shortBio: data.description || null,
          ctgProfileUrl: `${BASE_URL}/territories/${data.slug || data.id}`,
          webTags: data.web_tags || [], webScopes: data.web_scopes || [],
          publicVisibility: data.public_visibility || "private",
          createdAt: data.created_at, updatedAt: data.updated_at,
        };
      }
    }

    if (!owner) {
      return new Response(JSON.stringify({ error: "Owner not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Load content collections
    let services: Record<string, unknown>[] = [];
    if (ownerType === "user" || ownerType === "guild") {
      const field = ownerType === "user" ? "provider_user_id" : "provider_guild_id";
      const { data } = await sb.from("services").select("*").eq(field, ownerId).eq("is_deleted", false).eq("is_active", true);
      services = visibleItems(data || []).map((r) => ({
        ...mapItem(r, "service"),
        priceHint: r.price_amount ? `${r.price_amount} ${r.price_currency || "EUR"}` : null,
        durationHint: r.duration_minutes ? `${r.duration_minutes} min` : null,
      }));
    }

    let quests: Record<string, unknown>[] = [];
    if (ownerType === "user" || ownerType === "guild") {
      const field = ownerType === "user" ? "created_by_user_id" : "guild_id";
      const { data } = await sb.from("quests").select("*").eq(field, ownerId).eq("is_deleted", false);
      quests = visibleItems(data || []).map((r) => ({
        ...mapItem(r, "quest"), progressPercent: null,
      }));
    }

    let guilds: Record<string, unknown>[] = [];
    if (ownerType === "user") {
      const { data: memberships } = await sb.from("guild_members").select("guild_id").eq("user_id", ownerId);
      if (memberships && memberships.length > 0) {
        const guildIds = memberships.map((m: Record<string, unknown>) => m.guild_id);
        const { data } = await sb.from("guilds").select("*").in("id", guildIds).eq("is_deleted", false);
        guilds = visibleItems(data || []).map((r) => ({ ...mapItem(r, "guild", "name") }));
      }
    }

    let territories: Record<string, unknown>[] = [];
    if (ownerType === "user") {
      const { data: uts } = await sb.from("user_territories").select("territory_id").eq("user_id", ownerId);
      if (uts && uts.length > 0) {
        const tIds = uts.map((t: Record<string, unknown>) => t.territory_id);
        const { data } = await sb.from("territories").select("*").in("id", tIds).eq("is_deleted", false);
        territories = visibleItems(data || []).map((r) => ({ ...mapItem(r, "territory", "name") }));
      }
    }

    const sortFeed = (arr: Record<string, unknown>[]) =>
      arr.sort((a, b) => {
        const aF = (a.webTags as string[] | undefined)?.includes("flagship") ? 0 : 1;
        const bF = (b.webTags as string[] | undefined)?.includes("flagship") ? 0 : 1;
        if (aF !== bF) return aF - bF;
        const aO = (a.featuredOrder as number) ?? 999;
        const bO = (b.featuredOrder as number) ?? 999;
        if (aO !== bO) return aO - bO;
        return ((b.updatedAt as string) || "").localeCompare((a.updatedAt as string) || "");
      });

    const feed = {
      owner,
      services: sortFeed(services),
      quests: sortFeed(quests),
      guilds: sortFeed(guilds),
      programs: [],
      territories: sortFeed(territories),
      events: [],
      meta: {
        generatedAt: new Date().toISOString(),
        ownerType, ownerId,
        ctgProfileUrl: owner.ctgProfileUrl,
      },
    };

    return new Response(JSON.stringify(feed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("site-feed error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
