import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// action_type -> { max count, window in seconds }
const LIMITS: Record<string, { max: number; windowSeconds: number }> = {
  comment:        { max: 10, windowSeconds: 60 },
  direct_message: { max: 20, windowSeconds: 60 },
  quest_creation: { max: 3,  windowSeconds: 3600 },
  pod_creation:   { max: 3,  windowSeconds: 3600 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await anonClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    const { action } = await req.json();
    if (!action || !LIMITS[action]) {
      return new Response(
        JSON.stringify({ error: "Invalid action type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const limit = LIMITS[action];
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Cleanup old entries periodically (fire and forget)
    serviceClient.rpc("cleanup_old_rate_limits").then(() => {});

    // Count recent entries within window
    const windowStart = new Date(Date.now() - limit.windowSeconds * 1000).toISOString();

    const { count, error: countErr } = await serviceClient
      .from("rate_limit_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("action_type", action)
      .gte("created_at", windowStart);

    if (countErr) throw countErr;

    if ((count ?? 0) >= limit.max) {
      return new Response(
        JSON.stringify({
          allowed: false,
          message: "You're doing too much too fast. Please slow down.",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record this action
    const { error: insertErr } = await serviceClient
      .from("rate_limit_entries")
      .insert({ user_id: userId, action_type: action });

    if (insertErr) throw insertErr;

    return new Response(
      JSON.stringify({ allowed: true, remaining: limit.max - (count ?? 0) - 1 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Rate limit check failed:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
