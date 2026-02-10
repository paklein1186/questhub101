import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// XP Bundle config
const XP_BUNDLES: Record<string, { xpAmount: number; priceId: string; name: string }> = {
  STARTER: { xpAmount: 50, priceId: "price_1Sz4V0BttrYxqJqzjqX00x7D", name: "Starter (50 XP)" },
  GROWTH: { xpAmount: 150, priceId: "price_1Sz4WrBttrYxqJqzY3q9MAEz", name: "Growth (150 XP)" },
  PRO: { xpAmount: 400, priceId: "price_1Sz4X5BttrYxqJqzZGENFU94", name: "Pro (400 XP)" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { mode, bundleCode, planStripePriceId } = await req.json();
    const origin = req.headers.get("origin") || "http://localhost:5173";

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find or create customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    if (mode === "xp_bundle") {
      // One-off XP bundle purchase
      const bundle = XP_BUNDLES[bundleCode];
      if (!bundle) throw new Error(`Invalid bundle code: ${bundleCode}`);

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [{ price: bundle.priceId, quantity: 1 }],
        mode: "payment",
        success_url: `${origin}/me/xp?success=true&bundle=${bundleCode}`,
        cancel_url: `${origin}/me/xp?canceled=true`,
        metadata: {
          type: "xp_bundle",
          bundle_code: bundleCode,
          xp_amount: String(bundle.xpAmount),
          user_id: user.id,
        },
      });

      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (mode === "subscription") {
      // Plan subscription
      if (!planStripePriceId) throw new Error("Missing planStripePriceId");

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [{ price: planStripePriceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${origin}/plans?success=true`,
        cancel_url: `${origin}/plans?canceled=true`,
        metadata: {
          type: "plan_subscription",
          user_id: user.id,
        },
      });

      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      throw new Error("Invalid mode. Use 'xp_bundle' or 'subscription'.");
    }
  } catch (error) {
    console.error("Error in create-checkout:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
