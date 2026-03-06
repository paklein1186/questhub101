import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function err(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return err(401, "Unauthorized");

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await anonClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) return err(401, "Unauthorized");
    const userId = claims.claims.sub as string;

    const body = await req.json();
    const { ctg_amount, preview } = body;

    if (typeof ctg_amount !== "number" || !isFinite(ctg_amount) || ctg_amount <= 0) {
      return err(400, "ctg_amount must be a positive number");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get active rate
    const { data: rateRow } = await supabase
      .from("ctg_exchange_rates")
      .select("rate_ctg_to_credits")
      .eq("active", true)
      .limit(1)
      .single();

    if (!rateRow) return err(503, "Exchange temporarily unavailable — no active rate configured");

    const rate = rateRow.rate_ctg_to_credits;

    // Preview mode
    if (preview === true) {
      return new Response(
        JSON.stringify({
          credits_you_will_receive: Math.floor(ctg_amount * rate),
          rate,
          no_action_taken: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Rate limit: max 3 exchanges per hour
    const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await supabase
      .from("ctg_transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("type", "EXCHANGE_TO_CREDITS")
      .gte("created_at", oneHourAgo);

    if ((count ?? 0) >= 3) {
      return err(429, "Rate limit: maximum 3 exchanges per hour");
    }

    // Execute exchange
    const { data, error: rpcErr } = await supabase.rpc("exchange_ctg_to_credits", {
      p_user_id: userId,
      p_ctg_amount: ctg_amount,
    });

    if (rpcErr) {
      const msg = rpcErr.message || "";
      if (msg.includes("Insufficient")) return err(400, "Insufficient $CTG balance");
      if (msg.includes("No active exchange rate")) return err(503, "Exchange temporarily unavailable");
      return err(400, msg);
    }

    // Get updated balances
    const { data: profile } = await supabase
      .from("profiles")
      .select("ctg_balance, credits_balance, name")
      .eq("user_id", userId)
      .single();

    // Notification
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "CTG_EXCHANGE",
      title: `Exchange: ${data.ctg_spent} $CTG → ${data.credits_received} credits`,
      message: `Rate: ${data.rate_used} credits per $CTG`,
      metadata: data,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        ctg_spent: data.ctg_spent,
        credits_received: data.credits_received,
        rate_used: data.rate_used,
        new_ctg_balance: profile?.ctg_balance ?? 0,
        new_credits_balance: profile?.credits_balance ?? 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return err(500, e.message || "Internal error");
  }
});
