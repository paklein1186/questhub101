import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const { eventId, notes } = await req.json();
    if (!eventId) throw new Error("Missing eventId");

    const origin = req.headers.get("origin") || "http://localhost:5173";

    // Use service role to read event details
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: event, error: eventErr } = await supabaseAdmin
      .from("guild_events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (eventErr || !event) throw new Error("Event not found");
    if (event.is_cancelled || event.status === "CANCELLED") throw new Error("Event is cancelled");
    if (!event.is_paid) throw new Error("Event is free, no checkout needed");

    // Check if already registered
    const { data: existing } = await supabaseAdmin
      .from("guild_event_attendees")
      .select("id, status")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing && existing.status !== "CANCELLED" && existing.status !== "REFUSED") {
      throw new Error("Already registered for this event");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const priceInCents = Math.round((event.price_per_ticket || 0) * 100);

    // Look up host's Stripe Connect account for payout routing
    let transferData: { destination: string } | undefined;
    let applicationFee: number | undefined;
    if (event.created_by_user_id) {
      const { data: hostProfile } = await supabaseAdmin
        .from("profiles")
        .select("stripe_account_id, stripe_onboarding_complete")
        .eq("user_id", event.created_by_user_id)
        .single();

      if (hostProfile?.stripe_account_id && hostProfile?.stripe_onboarding_complete) {
        transferData = { destination: hostProfile.stripe_account_id };
        applicationFee = Math.round(priceInCents * 0.10); // 10% platform fee
        console.log(`[EVENT-CHECKOUT] Routing payout to Connect account ${hostProfile.stripe_account_id}`);
      }
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{
        price_data: {
          currency: (event.currency || "EUR").toLowerCase(),
          product_data: { name: `Ticket: ${event.title}` },
          unit_amount: priceInCents,
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${origin}/events/${eventId}?payment=success`,
      cancel_url: `${origin}/events/${eventId}?payment=cancelled`,
      metadata: {
        type: "event_ticket",
        event_id: eventId,
        user_id: user.id,
        notes: notes || "",
      },
    };

    if (transferData) {
      sessionParams.payment_intent_data = {
        application_fee_amount: applicationFee,
        transfer_data: transferData,
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Create pending registration
    if (existing) {
      await supabaseAdmin
        .from("guild_event_attendees")
        .update({
          status: "PENDING",
          payment_status: "REQUIRED",
          stripe_payment_intent_id: null,
          cancelled_at: null,
          refunded_at: null,
          notes: notes || null,
        })
        .eq("id", existing.id);
    } else {
      await supabaseAdmin
        .from("guild_event_attendees")
        .insert({
          event_id: eventId,
          user_id: user.id,
          status: "PENDING",
          payment_status: "REQUIRED",
          notes: notes || null,
        });
    }

    console.log(`[EVENT-CHECKOUT] Created checkout for event ${eventId}, user ${user.id}`);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[EVENT-CHECKOUT] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
