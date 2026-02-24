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

    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });

    // Step 1: Fetch edges where center node is source or target
    const { data: centerEdges, error: edgesErr } = await supabase
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

    // Auth & visibility filtering
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const isAuthenticated = !!user;

    const filterVisibility = (e: any) => {
      if (e.visibility === "public") return true;
      if (!isAuthenticated) return false;
      if (e.visibility === "network" || e.visibility === "followers") return true;
      if (e.visibility === "private") {
        return e.source_id === user?.id || e.target_id === user?.id;
      }
      return true;
    };

    const filteredCenterEdges = (centerEdges || []).filter(filterVisibility);

    // Collect neighbor IDs from center edges
    const neighborIds = new Set<string>();
    for (const edge of filteredCenterEdges) {
      if (edge.source_id !== centerId) neighborIds.add(edge.source_id);
      if (edge.target_id !== centerId) neighborIds.add(edge.target_id);
    }

    // Step 2: Fetch inter-neighbor edges (edges between neighbors)
    // This shows shared quests, mutual guild memberships, etc.
    let interEdges: any[] = [];
    const neighborArray = Array.from(neighborIds);
    if (neighborArray.length > 1 && neighborArray.length <= 200) {
      // Fetch edges where BOTH source and target are in the neighbor set
      const { data: betweenEdges } = await supabase
        .from("graph_edges")
        .select("*")
        .in("source_id", neighborArray)
        .in("target_id", neighborArray)
        .limit(500);

      if (betweenEdges) {
        interEdges = betweenEdges.filter(filterVisibility);
      }
    }

    // Merge all edges, deduplicate by id
    const allEdgesMap = new Map<string, any>();
    for (const e of filteredCenterEdges) allEdgesMap.set(e.id, e);
    for (const e of interEdges) allEdgesMap.set(e.id, e);
    const allEdges = Array.from(allEdgesMap.values());

    // Collect all unique node IDs grouped by type
    const nodeMap = new Map<string, string>();
    nodeMap.set(`${centerType}:${centerId}`, centerType);

    for (const edge of allEdges) {
      nodeMap.set(`${edge.source_type}:${edge.source_id}`, edge.source_type);
      nodeMap.set(`${edge.target_type}:${edge.target_id}`, edge.target_type);
    }

    const idsByType: Record<string, string[]> = {};
    for (const [key, type] of nodeMap) {
      const id = key.split(":")[1];
      if (!idsByType[type]) idsByType[type] = [];
      if (!idsByType[type].includes(id)) idsByType[type].push(id);
    }

    // Fetch node metadata
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
                id: p.user_id, type: "user",
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
                id: g.id, type: "guild",
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
          .select("id, title, cover_image_url")
          .in("id", idsByType["quest"])
          .eq("is_deleted", false)
          .then(({ data }) => {
            for (const q of data || []) {
              nodeData[`quest:${q.id}`] = {
                id: q.id, type: "quest",
                name: q.title,
                avatarUrl: q.cover_image_url,
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
          .select("id, name, slug, cover_image_url")
          .in("id", idsByType["territory"])
          .eq("is_deleted", false)
          .then(({ data }) => {
            for (const t of data || []) {
              nodeData[`territory:${t.id}`] = {
                id: t.id, type: "territory",
                name: t.name,
                avatarUrl: t.cover_image_url,
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
                id: c.id, type: "org",
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
                id: p.id, type: "pod",
                name: p.name,
                slug: `/pods/${p.id}`,
              };
            }
          })
      );
    }

    await Promise.all(fetchPromises);

    const centerKey = `${centerType}:${centerId}`;
    const center = nodeData[centerKey] || {
      id: centerId, type: centerType, name: "Unknown",
      slug: `/${centerType}s/${centerId}`,
    };

    const nodes = Object.values(nodeData).filter((n: any) => n.id !== centerId);

    const responseEdges = allEdges.map((e: any) => ({
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
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Graph function error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
