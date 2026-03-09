import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate caller
  const authHeader = req.headers.get("Authorization") ?? "";
  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: authErr } =
    await anonClient.auth.getClaims(token);
  if (authErr || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  const callerId = claimsData.claims.sub as string;

  const { recipient_user_id, xp_amount, territory_id } = await req.json();
  if (!recipient_user_id || !xp_amount || !territory_id) {
    return new Response(JSON.stringify({ error: "Missing fields" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Verify caller is a steward of this territory
  const { data: edge } = await supabase
    .from("trust_edges")
    .select("id")
    .eq("from_node_id", callerId)
    .eq("to_node_id", territory_id)
    .eq("edge_type", "stewardship")
    .eq("status", "active")
    .maybeSingle();

  // Check admin role
  const { data: adminRole } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", callerId)
    .eq("role", "admin")
    .maybeSingle();

  if (!edge && !adminRole) {
    return new Response(
      JSON.stringify({ error: "Not a steward of this territory" }),
      { status: 403, headers: corsHeaders }
    );
  }

  // Get caller's XP level for cap enforcement
  const { data: profile } = await supabase
    .from("profiles")
    .select("xp_level")
    .eq("user_id", callerId)
    .single();

  const callerLevel = (profile as any)?.xp_level ?? 1;
  const maxGrant = callerLevel >= 12 ? 200 : 50;
  const safeAmount = Math.min(
    Math.max(1, Math.floor(Number(xp_amount))),
    maxGrant
  );

  // Insert XP event
  const { error: insertErr } = await supabase.from("xp_events").insert({
    user_id: recipient_user_id,
    event_type: "STEWARDSHIP_DUTY",
    xp_amount: safeAmount,
    related_entity_id: territory_id,
    related_entity_type: "territory",
    description: `Steward XP grant (cap: ${maxGrant})`,
  });

  if (insertErr) {
    return new Response(
      JSON.stringify({ error: insertErr.message }),
      { status: 500, headers: corsHeaders }
    );
  }

  return new Response(
    JSON.stringify({ ok: true, granted: safeAmount }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
