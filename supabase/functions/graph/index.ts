import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    const centerType = url.searchParams.get("centerType");
    const centerId = url.searchParams.get("centerId");

    if (!centerType || !centerId) {
      return new Response(JSON.stringify({ error: "centerType and centerId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validTypes = ["user", "guild", "quest", "territory", "org", "pod"];
    if (!validTypes.includes(centerType)) {
      return new Response(JSON.stringify({ error: "Invalid centerType" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(centerId)) {
      return new Response(JSON.stringify({ error: "Invalid centerId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create supabase client - use auth header if present for RLS
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });

    // Fetch edges where center node is source or target
    const { data: edges, error: edgesErr } = await supabase
      .from("graph_edges")
      .select("*")
      .or(
        `and(source_id.eq.${centerId},source_type.eq.${centerType}),and(target_id.eq.${centerId},target_type.eq.${centerType})`
      );

    if (edgesErr) {
      console.error("Edges query error:", edgesErr);
      return new Response(JSON.stringify({ error: "Failed to fetch graph edges" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter: only show public edges for unauthenticated users
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const isAuthenticated = !!user;

    const filteredEdges = (edges || []).filter((e: any) => {
      if (e.visibility === "public") return true;
      if (!isAuthenticated) return false;
      // For network/followers visibility, show to authenticated users
      if (e.visibility === "network" || e.visibility === "followers") return true;
      // Private: only if user is source or target
      if (e.visibility === "private") {
        return e.source_id === user?.id || e.target_id === user?.id;
      }
      return true;
    });

    // Collect all unique node IDs grouped by type
    const nodeMap = new Map<string, string>(); // "type:id" -> type
    nodeMap.set(`${centerType}:${centerId}`, centerType);

    for (const edge of filteredEdges) {
      nodeMap.set(`${edge.source_type}:${edge.source_id}`, edge.source_type);
      nodeMap.set(`${edge.target_type}:${edge.target_id}`, edge.target_type);
    }

    // Group IDs by type for batch fetching
    const idsByType: Record<string, string[]> = {};
    for (const [key, type] of nodeMap) {
      const id = key.split(":")[1];
      if (!idsByType[type]) idsByType[type] = [];
      if (!idsByType[type].includes(id)) idsByType[type].push(id);
    }

    // Fetch node metadata from respective tables
    const nodeData: Record<string, any> = {};

    const fetchPromises: Promise<void>[] = [];

    if (idsByType["user"]?.length) {
      fetchPromises.push(
        supabase
          .from("profiles")
          .select("user_id, name, avatar_url")
          .in("user_id", idsByType["user"])
          .then(({ data }) => {
            for (const p of data || []) {
              nodeData[`user:${p.user_id}`] = {
                id: p.user_id,
                type: "user",
                name: p.name || "Unknown",
                avatarUrl: p.avatar_url,
                slug: `/users/${p.user_id}`,
              };
            }
          })
      );
    }

    if (idsByType["guild"]?.length) {
      fetchPromises.push(
        supabase
          .from("guilds")
          .select("id, name, logo_url")
          .in("id", idsByType["guild"])
          .eq("is_deleted", false)
          .then(({ data }) => {
            for (const g of data || []) {
              nodeData[`guild:${g.id}`] = {
                id: g.id,
                type: "guild",
                name: g.name,
                avatarUrl: g.logo_url,
                slug: `/guilds/${g.id}`,
              };
            }
          })
      );
    }

    if (idsByType["quest"]?.length) {
      fetchPromises.push(
        supabase
          .from("quests")
          .select("id, title")
          .in("id", idsByType["quest"])
          .eq("is_deleted", false)
          .then(({ data }) => {
            for (const q of data || []) {
              nodeData[`quest:${q.id}`] = {
                id: q.id,
                type: "quest",
                name: q.title,
                slug: `/quests/${q.id}`,
              };
            }
          })
      );
    }

    if (idsByType["territory"]?.length) {
      fetchPromises.push(
        supabase
          .from("territories")
          .select("id, name, slug")
          .in("id", idsByType["territory"])
          .eq("is_deleted", false)
          .then(({ data }) => {
            for (const t of data || []) {
              nodeData[`territory:${t.id}`] = {
                id: t.id,
                type: "territory",
                name: t.name,
                slug: `/territories/${t.slug || t.id}`,
              };
            }
          })
      );
    }

    if (idsByType["org"]?.length) {
      fetchPromises.push(
        supabase
          .from("companies")
          .select("id, name, logo_url")
          .in("id", idsByType["org"])
          .eq("is_deleted", false)
          .then(({ data }) => {
            for (const c of data || []) {
              nodeData[`org:${c.id}`] = {
                id: c.id,
                type: "org",
                name: c.name,
                avatarUrl: c.logo_url,
                slug: `/companies/${c.id}`,
              };
            }
          })
      );
    }

    if (idsByType["pod"]?.length) {
      fetchPromises.push(
        supabase
          .from("pods")
          .select("id, name")
          .in("id", idsByType["pod"])
          .eq("is_deleted", false)
          .then(({ data }) => {
            for (const p of data || []) {
              nodeData[`pod:${p.id}`] = {
                id: p.id,
                type: "pod",
                name: p.name,
                slug: `/pods/${p.id}`,
              };
            }
          })
      );
    }

    await Promise.all(fetchPromises);

    // Build center node
    const centerKey = `${centerType}:${centerId}`;
    const center = nodeData[centerKey] || {
      id: centerId,
      type: centerType,
      name: "Unknown",
      slug: `/${centerType}s/${centerId}`,
    };

    // Build nodes list (excluding center)
    const nodes = Object.values(nodeData).filter((n: any) => n.id !== centerId);

    // Build edges response
    const responseEdges = filteredEdges.map((e: any) => ({
      id: e.id,
      source: e.source_id,
      target: e.target_id,
      sourceType: e.source_type,
      targetType: e.target_type,
      relationType: e.relation_type,
      weight: Number(e.weight) || 0.1,
      visibility: e.visibility,
    }));

    return new Response(
      JSON.stringify({ center, nodes, edges: responseEdges }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Graph function error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
