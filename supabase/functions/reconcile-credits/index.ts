import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[RECONCILE-CREDITS] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  // Use anon client to verify the user's JWT
  const anonClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  // Use service-role client for privileged DB operations
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  try {
    // Admin check — use anon client to verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !userData.user) throw new Error("Not authenticated");

    logStep("User identified", { userId: userData.user.id });

    const { data: adminRoles, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .in("role", ["superadmin", "admin"]);

    const adminRole = adminRoles && adminRoles.length > 0 ? adminRoles[0] : null;

    logStep("Admin role check", { adminRole, roleError, serviceKeyPrefix: serviceKey?.substring(0, 20) });
    if (!adminRole) throw new Error("Admin access required");

    logStep("Admin authenticated", { userId: userData.user.id });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // List all completed checkout sessions for credit bundles
    const sessions = await stripe.checkout.sessions.list({ limit: 100 });
    const creditSessions = sessions.data.filter(
      (s) =>
        s.payment_status === "paid" &&
        s.metadata?.type === "credit_bundle" &&
        s.metadata?.user_id &&
        s.metadata?.credits_amount
    );

    logStep("Found credit bundle sessions", { count: creditSessions.length });

    const results: any[] = [];

    for (const session of creditSessions) {
      const userId = session.metadata!.user_id!;
      const creditsAmount = parseInt(session.metadata!.credits_amount!, 10);
      const bundleCode = session.metadata?.bundle_code || "unknown";

      if (creditsAmount <= 0) continue;

      // Check idempotency
      const { data: existing } = await supabase
        .from("credit_transactions")
        .select("id")
        .eq("user_id", userId)
        .eq("type", "PURCHASE")
        .eq("related_entity_id", session.id)
        .limit(1);

      if (existing && existing.length > 0) {
        results.push({ sessionId: session.id, userId, status: "already_processed" });
        continue;
      }

      // Grant credits
      const { data: profile } = await supabase
        .from("profiles")
        .select("credits_balance, name")
        .eq("user_id", userId)
        .single();

      if (!profile) {
        results.push({ sessionId: session.id, userId, status: "profile_not_found" });
        continue;
      }

      const newBalance = (profile.credits_balance ?? 0) + creditsAmount;

      await supabase
        .from("profiles")
        .update({ credits_balance: newBalance })
        .eq("user_id", userId);

      await supabase.from("credit_transactions").insert({
        user_id: userId,
        type: "PURCHASE",
        amount: creditsAmount,
        source: `Reconciled credit bundle: ${bundleCode}`,
        related_entity_type: "stripe_session",
        related_entity_id: session.id,
      });

      await supabase.from("xp_transactions").insert({
        user_id: userId,
        type: "PURCHASE",
        amount_xp: creditsAmount,
        description: `Reconciled credit bundle: ${bundleCode}`,
      });

      logStep("Granted credits", { userId, creditsAmount, newBalance, sessionId: session.id });
      results.push({ sessionId: session.id, userId, status: "granted", creditsAmount, newBalance });
    }

    return new Response(JSON.stringify({ reconciled: results }), {
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