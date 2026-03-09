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

  const callerId = claimsData.claims.sub;

  const { email, territory_id, territory_name } = await req.json();
  if (!email || !territory_id) {
    return new Response(JSON.stringify({ error: "Missing fields" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  // Service-role client for privileged operations
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Verify caller is a steward of this territory (or admin)
  const { data: callerSteward } = await supabase
    .from("trust_edges")
    .select("id")
    .eq("from_node_id", callerId)
    .eq("to_node_id", territory_id)
    .eq("edge_type", "stewardship")
    .eq("status", "active")
    .maybeSingle();

  if (!callerSteward) {
    const { data: role } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) {
      return new Response(
        JSON.stringify({ error: "Not authorized as steward" }),
        { status: 403, headers: corsHeaders }
      );
    }
  }

  // Silent lookup — no error if not found
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, name")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (profile) {
    await supabase.from("trust_edges").insert({
      from_node_id: profile.user_id,
      from_node_type: "user",
      to_node_id: territory_id,
      to_node_type: "territory",
      edge_type: "stewardship",
      score: 1,
      tags: ["co-steward"],
      status: "active",
      created_by: callerId,
    });
  }

  // Always return the same response whether user exists or not
  return new Response(
    JSON.stringify({
      ok: true,
      message:
        "If a matching account exists, the invitation has been sent.",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
