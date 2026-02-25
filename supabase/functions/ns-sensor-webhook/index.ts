import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

/**
 * Sensor / IoT webhook endpoint for Natural System data ingestion.
 *
 * Expected payload (single or array):
 * {
 *   "natural_system_id": "uuid",
 *   "metric": "water_level",
 *   "value": 3.42,
 *   "unit": "m",              // optional
 *   "recorded_at": "ISO8601"  // optional, defaults to now()
 * }
 *
 * Authentication: either
 *   - Bearer token (Supabase JWT) in Authorization header
 *   - x-webhook-secret header matching the stored NS_WEBHOOK_SECRET
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Auth check: JWT or webhook secret
    const authHeader = req.headers.get("Authorization");
    const webhookSecret = req.headers.get("x-webhook-secret");
    const expectedSecret = Deno.env.get("NS_WEBHOOK_SECRET");

    let authenticated = false;

    if (webhookSecret && expectedSecret && webhookSecret === expectedSecret) {
      authenticated = true;
    } else if (authHeader?.startsWith("Bearer ")) {
      const supabaseAuth = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const token = authHeader.replace("Bearer ", "");
      const { error } = await supabaseAuth.auth.getClaims(token);
      if (!error) authenticated = true;
    }

    if (!authenticated) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const payloads = Array.isArray(body) ? body : [body];

    // Validate
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const rows: {
      natural_system_id: string;
      metric: string;
      value: number;
      unit: string | null;
      source: string;
      recorded_at: string;
    }[] = [];

    for (const p of payloads) {
      if (!p.natural_system_id || !UUID_RE.test(p.natural_system_id)) {
        return new Response(
          JSON.stringify({ error: "Invalid natural_system_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!p.metric || typeof p.metric !== "string" || p.metric.length > 100) {
        return new Response(
          JSON.stringify({ error: "Invalid metric" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (typeof p.value !== "number" || !isFinite(p.value)) {
        return new Response(
          JSON.stringify({ error: "Invalid value" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      rows.push({
        natural_system_id: p.natural_system_id,
        metric: p.metric,
        value: p.value,
        unit: p.unit ?? null,
        source: "sensor",
        recorded_at: p.recorded_at ?? new Date().toISOString(),
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: insertErr } = await supabase
      .from("natural_system_data_points")
      .insert(rows);

    if (insertErr) throw insertErr;

    // Recompute indicators for each affected system
    const systemIds = [...new Set(rows.map((r) => r.natural_system_id))];
    for (const nsId of systemIds) {
      await supabase.rpc("recompute_natural_system_indicators", {
        p_natural_system_id: nsId,
      });
    }

    return new Response(
      JSON.stringify({ ok: true, inserted: rows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
