import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * GET-style endpoint for Natural System timeseries & indicators.
 *
 * POST body:
 * {
 *   "natural_system_id": "uuid",
 *   "mode": "timeseries" | "indicators",
 *   "metric": "water_level",      // optional, for timeseries
 *   "indicator": "health_index",   // optional, for indicators
 *   "since_days": 30               // optional, default 30
 * }
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    // Auth via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { error: authErr } = await supabaseUser.auth.getClaims(token);
    if (authErr) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { natural_system_id, mode, metric, indicator, since_days } = body;

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!natural_system_id || !UUID_RE.test(natural_system_id)) {
      return new Response(JSON.stringify({ error: "Invalid natural_system_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to read data (RLS allows authenticated reads anyway)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (mode === "indicators") {
      const { data, error } = await supabase.rpc("get_latest_indicator", {
        p_natural_system_id: natural_system_id,
        p_indicator: indicator ?? null,
      });
      if (error) throw error;
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default: timeseries
    const since = new Date(
      Date.now() - (since_days ?? 30) * 86400_000
    ).toISOString();

    const { data, error } = await supabase.rpc("get_recent_data_points", {
      p_natural_system_id: natural_system_id,
      p_metric: metric ?? null,
      p_since: since,
      p_limit: 1000,
    });
    if (error) throw error;

    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
