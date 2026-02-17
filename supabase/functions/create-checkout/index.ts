import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Credit Bundle config (maps bundle codes to Stripe price IDs)
const CREDIT_BUNDLES: Record<string, { credits: number; priceId: string; name: string }> = {
  STARTER_100: { credits: 100, priceId: "price_1SzRJsBttrYxqJqzDOZdcEfR", name: "Starter (100 Credits)" },
  CREATOR_300: { credits: 300, priceId: "price_1SzRJtBttrYxqJqz6Uwn7fN8", name: "Creator (300 Credits)" },
  CATALYST_1000: { credits: 1000, priceId: "price_1SzRJuBttrYxqJqzUnFTnprq", name: "Catalyst (1000 Credits)" },
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

    const { mode, bundleCode, planStripePriceId, shareClass, quantity, pricePerShare } = await req.json();
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

    if (mode === "credit_bundle") {
      // One-off credit bundle purchase
      const bundle = CREDIT_BUNDLES[bundleCode];
      if (!bundle) throw new Error(`Invalid bundle code: ${bundleCode}`);

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [{ price: bundle.priceId, quantity: 1 }],
        mode: "payment",
        success_url: `${origin}/me/credits?success=true&bundle=${bundleCode}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/me/credits?canceled=true`,
        metadata: {
          type: "credit_bundle",
          bundle_code: bundleCode,
          credits_amount: String(bundle.credits),
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
    } else if (mode === "xp_bundle") {
      // Legacy XP bundle support — redirect to credit bundles
      const legacyMap: Record<string, string> = {
        STARTER: "STARTER_100",
        GROWTH: "CREATOR_300",
        PRO: "CATALYST_1000",
      };
      const mappedCode = legacyMap[bundleCode] || bundleCode;
      const bundle = CREDIT_BUNDLES[mappedCode];
      if (!bundle) throw new Error(`Invalid bundle code: ${bundleCode}`);

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [{ price: bundle.priceId, quantity: 1 }],
        mode: "payment",
        success_url: `${origin}/me/credits?success=true&bundle=${mappedCode}`,
        cancel_url: `${origin}/me/credits?canceled=true`,
        metadata: {
          type: "credit_bundle",
          bundle_code: mappedCode,
          credits_amount: String(bundle.credits),
          user_id: user.id,
        },
      });

      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (mode === "shares") {
      // Share purchase — only Class B allowed from frontend
      if (shareClass !== "B") {
        throw new Error("Class A shares require manual application. Please contact pa@changethegame.xyz");
      }
      const qty = Math.max(1, Math.min(100, Number(quantity) || 1));
      const unitPrice = Number(pricePerShare) || 10;
      const totalAmount = qty * unitPrice * 100; // cents

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [{
          price_data: {
            currency: "eur",
            product_data: { name: `Class B Community Shares (×${qty})` },
            unit_amount: unitPrice * 100,
          },
          quantity: qty,
        }],
        mode: "payment",
        success_url: `${origin}/shares?success=true&class=B&qty=${qty}`,
        cancel_url: `${origin}/shares?canceled=true`,
        metadata: {
          type: "share_purchase",
          share_class: "B",
          quantity: String(qty),
          price_per_share: String(unitPrice),
          user_id: user.id,
        },
      });

      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      throw new Error("Invalid mode. Use 'credit_bundle', 'xp_bundle', 'subscription', or 'shares'.");
    }
  } catch (error) {
    console.error("Error in create-checkout:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
