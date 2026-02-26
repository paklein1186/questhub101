import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");
    const user = userData.user;

    const { withdrawal_id } = await req.json();
    if (!withdrawal_id) throw new Error("Missing withdrawal_id");

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(withdrawal_id)) throw new Error("Invalid withdrawal_id format");

    // Fetch withdrawal request
    const { data: withdrawal, error: wErr } = await supabase
      .from("gameb_withdrawal_requests")
      .select("*")
      .eq("id", withdrawal_id)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .single();

    if (wErr || !withdrawal) throw new Error("Withdrawal request not found or already processed");

    // Fetch user profile for Stripe Connect account
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_account_id, stripe_connect_onboarded, gameb_tokens_balance")
      .eq("user_id", user.id)
      .single();

    if (!profile?.stripe_account_id || !profile?.stripe_connect_onboarded) {
      throw new Error("Stripe Connect account not set up. Please complete onboarding first.");
    }

    const tokenBalance = profile.gameb_tokens_balance ?? 0;
    if (tokenBalance < withdrawal.amount_tokens) {
      throw new Error(`Insufficient GameB Token balance. You have ${tokenBalance}, requested ${withdrawal.amount_tokens}.`);
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Create a Stripe Transfer to the connected account
    const amountCents = Math.round(withdrawal.amount_fiat * 100);
    if (amountCents < 100) throw new Error("Minimum withdrawal is €1.00");

    const transfer = await stripe.transfers.create({
      amount: amountCents,
      currency: withdrawal.currency?.toLowerCase() || "eur",
      destination: profile.stripe_account_id,
      description: `GameB Token withdrawal: ${withdrawal.amount_tokens} tokens`,
      metadata: {
        withdrawal_id: withdrawal.id,
        user_id: user.id,
        tokens_burned: String(withdrawal.amount_tokens),
      },
    });

    // Burn tokens from user balance
    await supabase
      .from("profiles")
      .update({ gameb_tokens_balance: tokenBalance - withdrawal.amount_tokens })
      .eq("user_id", user.id);

    // Record the transaction
    await supabase.from("gameb_token_transactions").insert({
      user_id: user.id,
      amount: -withdrawal.amount_tokens,
      type: "withdrawal",
      description: `Fiat withdrawal: €${withdrawal.amount_fiat} via Stripe`,
      fiat_backing_amount: withdrawal.amount_fiat,
      fiat_currency: withdrawal.currency || "EUR",
      related_entity_type: "withdrawal",
      related_entity_id: withdrawal.id,
    });

    // Update withdrawal status
    await supabase
      .from("gameb_withdrawal_requests")
      .update({
        status: "completed",
        processed_at: new Date().toISOString(),
        stripe_transfer_id: transfer.id,
      })
      .eq("id", withdrawal.id);

    return new Response(JSON.stringify({
      success: true,
      transfer_id: transfer.id,
      amount_fiat: withdrawal.amount_fiat,
      tokens_burned: withdrawal.amount_tokens,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[PROCESS-GAMEB-WITHDRAWAL] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
