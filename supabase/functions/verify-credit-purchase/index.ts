import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[VERIFY-CREDIT-PURCHASE] ${step}${d}`);
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

  const supabaseAnon = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");
    const user = userData.user;
    logStep("User authenticated", { userId: user.id });

    const { bundleCode, sessionId } = await req.json();
    if (!bundleCode && !sessionId) throw new Error("Missing bundleCode or sessionId");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    let matchingSession: Stripe.Checkout.Session | null = null;

    // Strategy 1: Direct session retrieval (preferred — fast and reliable)
    if (sessionId) {
      logStep("Retrieving session directly", { sessionId });
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (
          session.payment_status === "paid" &&
          session.metadata?.type === "credit_bundle" &&
          session.metadata?.user_id === user.id
        ) {
          matchingSession = session;
          logStep("Session matched via direct retrieval");
        } else {
          logStep("Session found but metadata mismatch or not paid", {
            paymentStatus: session.payment_status,
            metaType: session.metadata?.type,
            metaUserId: session.metadata?.user_id,
          });
        }
      } catch (e) {
        logStep("Direct session retrieval failed", { error: (e as Error).message });
      }
    }

    // Strategy 2: Fallback — search by customer email
    if (!matchingSession && bundleCode) {
      logStep("Falling back to customer search");
      const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
      if (customers.data.length > 0) {
        const customerId = customers.data[0].id;
        logStep("Found customer", { customerId });
        const sessions = await stripe.checkout.sessions.list({
          customer: customerId,
          limit: 10,
        });
        matchingSession = sessions.data.find(
          (s) =>
            s.payment_status === "paid" &&
            s.metadata?.type === "credit_bundle" &&
            s.metadata?.bundle_code === bundleCode &&
            s.metadata?.user_id === user.id
        ) ?? null;
      } else {
        logStep("No customer found, trying sessions by email");
        // Some checkouts use customer_email without creating a customer
        // Search recent checkout sessions via list (limited)
      }
    }

    if (!matchingSession) {
      logStep("No matching paid session found");
      return new Response(JSON.stringify({ granted: false, reason: "No matching paid session found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const foundSessionId = matchingSession.id;
    const creditsAmount = parseInt(matchingSession.metadata?.credits_amount || "0", 10);
    logStep("Found matching session", { sessionId: foundSessionId, creditsAmount });

    if (creditsAmount <= 0) {
      return new Response(JSON.stringify({ granted: false, reason: "Invalid credits amount" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if this session was already processed (idempotency)
    const { data: existingTx } = await supabase
      .from("credit_transactions")
      .select("id")
      .eq("user_id", user.id)
      .eq("type", "PURCHASE")
      .eq("related_entity_id", foundSessionId)
      .limit(1);

    if (existingTx && existingTx.length > 0) {
      logStep("Already processed", { sessionId: foundSessionId });
      return new Response(JSON.stringify({ granted: false, reason: "Already processed", alreadyGranted: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Grant credits
    const { data: profile } = await supabase
      .from("profiles")
      .select("credits_balance, name")
      .eq("user_id", user.id)
      .single();

    const currentBalance = profile?.credits_balance ?? 0;
    const newBalance = currentBalance + creditsAmount;

    await supabase
      .from("profiles")
      .update({ credits_balance: newBalance })
      .eq("user_id", user.id);

    // Log transaction with session ID for idempotency
    await supabase.from("credit_transactions").insert({
      user_id: user.id,
      type: "PURCHASE",
      amount: creditsAmount,
      source: `Bought credit bundle: ${matchingSession.metadata?.bundle_code || bundleCode}`,
      related_entity_type: "stripe_session",
      related_entity_id: foundSessionId,
    });

    // Also log to xp_transactions for backward compat
    await supabase.from("xp_transactions").insert({
      user_id: user.id,
      type: "PURCHASE",
      amount_xp: creditsAmount,
      description: `Bought credit bundle: ${matchingSession.metadata?.bundle_code || bundleCode}`,
    });

    logStep("Credits granted", { creditsAmount, newBalance });

    // Notify superadmins about the purchase
    const { data: superadmins } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["superadmin", "admin"]);

    const buyerName = profile?.name || user.email || "Unknown";
    const amountPaid = matchingSession.amount_total
      ? `€${(matchingSession.amount_total / 100).toFixed(2)}`
      : "N/A";

    if (superadmins && superadmins.length > 0) {
      const notifications = superadmins.map((sa: any) => ({
        user_id: sa.user_id,
        type: "SYSTEM_SHARE_PURCHASE",
        title: `💰 Credit purchase: ${buyerName}`,
        body: `${buyerName} bought ${creditsAmount} credits (${matchingSession!.metadata?.bundle_code || bundleCode}) for ${amountPaid}`,
        related_entity_type: "CREDIT_PURCHASE",
        related_entity_id: foundSessionId,
        deep_link_url: "/admin?tab=economy",
      }));

      await supabase.from("notifications").insert(notifications);
      logStep("Superadmins notified", { count: superadmins.length });
    }

    return new Response(JSON.stringify({ granted: true, creditsAmount, newBalance }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});