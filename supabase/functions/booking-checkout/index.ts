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

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { bookingId } = await req.json();
    if (!bookingId) throw new Error("Missing bookingId");

    const origin = req.headers.get("origin") || "http://localhost:5173";

    // Get booking details
    const { data: booking, error: bookErr } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .eq("requester_id", user.id)
      .single();

    if (bookErr || !booking) throw new Error("Booking not found");
    if (booking.payment_status === "PAID") throw new Error("Already paid");

    // Get service title
    const { data: service } = await supabaseAdmin
      .from("services")
      .select("title, provider_user_id")
      .eq("id", booking.service_id)
      .single();

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const priceInCents = Math.round((booking.amount || 0) * 100);

    // Look up provider's Stripe Connect account
    let transferData: { destination: string } | undefined;
    let applicationFee: number | undefined;
    const providerUserId = booking.provider_user_id || service?.provider_user_id;

    if (providerUserId) {
      const { data: providerProfile } = await supabaseAdmin
        .from("profiles")
        .select("stripe_account_id, stripe_onboarding_complete")
        .eq("user_id", providerUserId)
        .single();

      if (providerProfile?.stripe_account_id && providerProfile?.stripe_onboarding_complete) {
        transferData = { destination: providerProfile.stripe_account_id };
        applicationFee = Math.round(priceInCents * 0.10); // 10% platform fee
        console.log(`[BOOKING-CHECKOUT] Routing payout to Connect account ${providerProfile.stripe_account_id}`);
      }
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{
        price_data: {
          currency: (booking.currency || "EUR").toLowerCase(),
          product_data: { name: `Booking: ${service?.title || "Service session"}` },
          unit_amount: priceInCents,
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${origin}/bookings/${bookingId}?payment=success`,
      cancel_url: `${origin}/bookings/${bookingId}?payment=cancelled`,
      metadata: {
        type: "booking_payment",
        booking_id: bookingId,
        service_id: booking.service_id,
        user_id: user.id,
      },
    };

    if (transferData) {
      sessionParams.payment_intent_data = {
        application_fee_amount: applicationFee,
        transfer_data: transferData,
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Update booking with checkout session ID
    await supabaseAdmin
      .from("bookings")
      .update({ stripe_checkout_session_id: session.id, payment_status: "PENDING" })
      .eq("id", bookingId);

    console.log(`[BOOKING-CHECKOUT] Created checkout for booking ${bookingId}, user ${user.id}`);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[BOOKING-CHECKOUT] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
