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

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!sig) {
      return new Response(JSON.stringify({ error: "No signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[WEBHOOK] Event: ${event.type}`);

     if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata || {};

      if (metadata.type === "credit_bundle" || metadata.type === "xp_bundle") {
        // Credit bundle purchase (also handles legacy xp_bundle type)
        const userId = metadata.user_id;
        const bundleCode = metadata.bundle_code;
        const creditsAmount = parseInt(metadata.credits_amount || metadata.xp_amount || "0", 10);

        console.log(`[WEBHOOK] Credit bundle purchase: user=${userId}, bundle=${bundleCode}, credits=${creditsAmount}`);

        if (creditsAmount > 0) {
          // Get current credits balance
          const { data: profile } = await supabase
            .from("profiles")
            .select("credits_balance")
            .eq("user_id", userId)
            .single();

          if (profile) {
            const currentBalance = (profile as any).credits_balance ?? 0;

            // Update credits balance
            await supabase
              .from("profiles")
              .update({ credits_balance: currentBalance + creditsAmount })
              .eq("user_id", userId);
          }

          // Log credit transaction
          await supabase.from("credit_transactions").insert({
            user_id: userId,
            type: "PURCHASE",
            amount: creditsAmount,
            source: `Bought credit bundle: ${bundleCode}`,
          });

          // Also log to xp_transactions for backward compatibility
          await supabase.from("xp_transactions").insert({
            user_id: userId,
            type: "PURCHASE",
            amount_xp: creditsAmount,
            description: `Bought credit bundle: ${bundleCode}`,
          });

          console.log(`[WEBHOOK] Credits granted: ${creditsAmount} credits to user ${userId}`);
        }
      } else if (metadata.type === "plan_subscription") {
        const userId = metadata.user_id;
        const subscriptionId = session.subscription as string;

        console.log(`[WEBHOOK] Plan subscription: user=${userId}, sub=${subscriptionId}`);

        // Get subscription details from Stripe
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price?.id;

        // Find matching plan
        const { data: plan } = await supabase
          .from("subscription_plans")
          .select("id, code")
          .eq("stripe_price_id", priceId)
          .single();

        if (plan) {
          // Deactivate old subscriptions
          await supabase
            .from("user_subscriptions")
            .update({ is_current: false, status: "CANCELED" })
            .eq("user_id", userId)
            .eq("is_current", true);

          // Create new subscription
          await supabase.from("user_subscriptions").insert({
            user_id: userId,
            plan_id: plan.id,
            status: "ACTIVE",
            is_current: true,
            stripe_subscription_id: subscriptionId,
            started_at: new Date().toISOString(),
            valid_until: new Date(subscription.current_period_end * 1000).toISOString(),
          });

          // Update profile plan code
          await supabase
            .from("profiles")
            .update({ current_plan_code: plan.code })
            .eq("user_id", userId);

          console.log(`[WEBHOOK] Plan updated to ${plan.code} for user ${userId}`);
        }
      } else if (metadata.type === "event_ticket") {
        // Event ticket purchase
        const eventId = metadata.event_id;
        const userId = metadata.user_id;
        const paymentIntentId = session.payment_intent as string;

        console.log(`[WEBHOOK] Event ticket: event=${eventId}, user=${userId}`);

        const { data: reg } = await supabase
          .from("guild_event_attendees")
          .select("id, status")
          .eq("event_id", eventId)
          .eq("user_id", userId)
          .order("registered_at", { ascending: false })
          .limit(1)
          .single();

        if (reg) {
          const { data: event } = await supabase
            .from("guild_events")
            .select("acceptance_mode, max_attendees")
            .eq("id", eventId)
            .single();

          const autoAccept = event?.acceptance_mode === "AUTO";

          await supabase
            .from("guild_event_attendees")
            .update({
              payment_status: "PAID",
              stripe_payment_intent_id: paymentIntentId,
              status: autoAccept ? "ACCEPTED" : "PENDING",
              accepted_at: autoAccept ? new Date().toISOString() : null,
            })
            .eq("id", reg.id);

          console.log(`[WEBHOOK] Event ticket paid for event ${eventId}, user ${userId}, auto=${autoAccept}`);
        }
      } else if (metadata.type === "booking_payment") {
        // Booking / service payment
        const bookingId = metadata.booking_id;
        const userId = metadata.user_id;
        const paymentIntentId = session.payment_intent as string;

        console.log(`[WEBHOOK] Booking payment: booking=${bookingId}, user=${userId}`);

        await supabase
          .from("bookings")
          .update({
            payment_status: "PAID",
            stripe_payment_intent_id: paymentIntentId,
            status: "CONFIRMED",
          })
          .eq("id", bookingId);

        console.log(`[WEBHOOK] Booking ${bookingId} marked as PAID and CONFIRMED`);
      } else if (metadata.type === "course_purchase") {
        // Course purchase
        const courseId = metadata.course_id;
        const userId = metadata.user_id;
        const paymentIntentId = session.payment_intent as string;

        console.log(`[WEBHOOK] Course purchase: course=${courseId}, user=${userId}`);

        // Update purchase record
        await supabase
          .from("course_purchases")
          .update({
            status: "PAID",
            stripe_payment_intent_id: paymentIntentId,
          })
          .eq("course_id", courseId)
          .eq("user_id", userId)
          .eq("status", "PENDING");

        // Auto-enroll the user
        const { data: existingEnrollment } = await supabase
          .from("course_enrollments")
          .select("id")
          .eq("course_id", courseId)
          .eq("user_id", userId)
          .maybeSingle();

        if (!existingEnrollment) {
          await supabase.from("course_enrollments").insert({
            course_id: courseId,
            user_id: userId,
          });
        }

        console.log(`[WEBHOOK] Course ${courseId} purchased and enrolled for user ${userId}`);
      }
    } else if (event.type === "customer.subscription.deleted") {
      // Subscription canceled/expired
      const subscription = event.data.object as Stripe.Subscription;
      const subId = subscription.id;

      // Find the user subscription
      const { data: userSub } = await supabase
        .from("user_subscriptions")
        .select("user_id")
        .eq("stripe_subscription_id", subId)
        .eq("is_current", true)
        .single();

      if (userSub) {
        // Mark subscription as canceled
        await supabase
          .from("user_subscriptions")
          .update({ is_current: false, status: "CANCELED", canceled_at: new Date().toISOString() })
          .eq("stripe_subscription_id", subId);

        // Get free plan
        const { data: freePlan } = await supabase
          .from("subscription_plans")
          .select("id")
          .eq("code", "FREE")
          .single();

        if (freePlan) {
          // Create new free subscription
          await supabase.from("user_subscriptions").insert({
            user_id: userSub.user_id,
            plan_id: freePlan.id,
            status: "ACTIVE",
            is_current: true,
          });
        }

        // Update profile
        await supabase
          .from("profiles")
          .update({ current_plan_code: "FREE" })
          .eq("user_id", userSub.user_id);

        console.log(`[WEBHOOK] Subscription canceled, reverted to FREE for user ${userSub.user_id}`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[WEBHOOK] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
