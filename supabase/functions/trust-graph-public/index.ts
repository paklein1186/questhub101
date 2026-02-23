import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const VALID_NODE_TYPES = ["profile", "guild", "company", "quest", "service", "territory"];
const MAX_LIMIT = 50;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    const url = new URL(req.url);
    // Path: /trust-graph-public?node_type=profile&node_id=xxx
    const nodeType = url.searchParams.get("node_type");
    const nodeId = url.searchParams.get("node_id");

    if (!nodeType || !nodeId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: node_type, node_id" }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!VALID_NODE_TYPES.includes(nodeType)) {
      return new Response(
        JSON.stringify({ error: `Invalid node_type. Must be one of: ${VALID_NODE_TYPES.join(", ")}` }),
        { status: 400, headers: corsHeaders }
      );
    }

    // UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(nodeId)) {
      return new Response(
        JSON.stringify({ error: "Invalid node_id format" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Pagination
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), MAX_LIMIT);
    const offset = Math.max(parseInt(url.searchParams.get("offset") || "0", 10), 0);

    // Filters
    const filterTag = url.searchParams.get("tag");
    const filterEdgeType = url.searchParams.get("edge_type");
    const filterContext = url.searchParams.get("context_territory_id");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Build query — ONLY public + active edges
    let query = supabase
      .from("trust_edges")
      .select(
        "id, from_node_type, from_node_id, to_node_type, to_node_id, edge_type, tags, score, note, evidence_url, context_territory_id, context_quest_id, context_guild_id, created_at, last_confirmed_at",
        { count: "exact" }
      )
      .eq("to_node_type", nodeType)
      .eq("to_node_id", nodeId)
      .eq("visibility", "public")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (filterTag) {
      query = query.contains("tags", [filterTag]);
    }
    if (filterEdgeType) {
      query = query.eq("edge_type", filterEdgeType);
    }
    if (filterContext && uuidRegex.test(filterContext)) {
      query = query.eq("context_territory_id", filterContext);
    }

    const { data: edges, count, error } = await query;

    if (error) {
      console.error("Query error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch trust edges" }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Resolve node metadata for from_node profiles
    const profileIds = [...new Set(
      (edges || [])
        .filter((e: any) => e.from_node_type === "profile")
        .map((e: any) => e.from_node_id)
    )];

    let profileMap: Record<string, any> = {};
    if (profileIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", profileIds);

      for (const p of profiles || []) {
        profileMap[p.user_id] = { name: p.name, avatar_url: p.avatar_url };
      }
    }

    // Resolve target node metadata
    let targetMeta: any = null;
    if (nodeType === "profile") {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .eq("user_id", nodeId)
        .single();
      if (data) targetMeta = { id: data.user_id, name: data.name, avatar_url: data.avatar_url };
    } else if (nodeType === "guild") {
      const { data } = await supabase
        .from("guilds")
        .select("id, name, logo_url")
        .eq("id", nodeId)
        .single();
      if (data) targetMeta = { id: data.id, name: data.name, logo_url: data.logo_url };
    } else if (nodeType === "company") {
      const { data } = await supabase
        .from("companies")
        .select("id, name, logo_url")
        .eq("id", nodeId)
        .single();
      if (data) targetMeta = { id: data.id, name: data.name, logo_url: data.logo_url };
    }

    // Build JSON-LD-compatible response
    const response = {
      "@context": "https://w3id.org/trust/v1",
      "@type": "TrustGraph",
      subject: {
        "@type": nodeType,
        "@id": nodeId,
        ...targetMeta,
      },
      pagination: {
        total: count ?? 0,
        limit,
        offset,
        hasMore: (count ?? 0) > offset + limit,
      },
      edges: (edges || []).map((e: any) => {
        // Strip __xp_halved internal tag from public view
        const publicTags = (e.tags || []).filter((t: string) => !t.startsWith("__"));

        const issuer: any = {
          "@type": e.from_node_type,
          "@id": e.from_node_id,
        };
        if (e.from_node_type === "profile" && profileMap[e.from_node_id]) {
          issuer.name = profileMap[e.from_node_id].name;
          issuer.avatar_url = profileMap[e.from_node_id].avatar_url;
        }

        return {
          "@type": "TrustAttestation",
          id: e.id,
          issuer,
          edgeType: e.edge_type,
          score: e.score,
          tags: publicTags,
          note: e.note,
          evidenceUrl: e.evidence_url,
          context: {
            territoryId: e.context_territory_id,
            questId: e.context_quest_id,
            guildId: e.context_guild_id,
          },
          issuedAt: e.created_at,
          lastConfirmedAt: e.last_confirmed_at,
        };
      }),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Cache-Control": "public, max-age=300" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
