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

    const { courseId } = await req.json();
    if (!courseId) throw new Error("Missing courseId");

    const origin = req.headers.get("origin") || "http://localhost:5173";

    // Get course details
    const { data: course, error: courseErr } = await supabaseAdmin
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .single();

    if (courseErr || !course) throw new Error("Course not found");
    if (course.is_free) throw new Error("Course is free, no checkout needed");

    // Check if already purchased
    const { data: existing } = await supabaseAdmin
      .from("course_purchases")
      .select("id")
      .eq("course_id", courseId)
      .eq("user_id", user.id)
      .eq("status", "PAID")
      .maybeSingle();

    if (existing) throw new Error("Already purchased");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const priceInCents = Math.round((course.price_amount || 0) * 100);

    // Look up course owner's Stripe Connect account
    let transferData: { destination: string } | undefined;
    let applicationFee: number | undefined;
    const ownerUserId = course.owner_user_id;

    if (ownerUserId) {
      const { data: ownerProfile } = await supabaseAdmin
        .from("profiles")
        .select("stripe_account_id, stripe_onboarding_complete")
        .eq("user_id", ownerUserId)
        .single();

      if (ownerProfile?.stripe_account_id && ownerProfile?.stripe_onboarding_complete) {
        transferData = { destination: ownerProfile.stripe_account_id };
        applicationFee = Math.round(priceInCents * 0.10); // 10% platform fee
        console.log(`[COURSE-CHECKOUT] Routing payout to Connect account ${ownerProfile.stripe_account_id}`);
      }
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{
        price_data: {
          currency: (course.price_currency || "EUR").toLowerCase(),
          product_data: { name: `Course: ${course.title}` },
          unit_amount: priceInCents,
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${origin}/courses/${courseId}?payment=success`,
      cancel_url: `${origin}/courses/${courseId}?payment=cancelled`,
      metadata: {
        type: "course_purchase",
        course_id: courseId,
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

    // Create pending purchase record
    await supabaseAdmin.from("course_purchases").insert({
      course_id: courseId,
      user_id: user.id,
      amount: course.price_amount ?? 0,
      currency: course.price_currency,
      status: "PENDING",
      stripe_payment_intent_id: session.id,
    });

    console.log(`[COURSE-CHECKOUT] Created checkout for course ${courseId}, user ${user.id}`);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[COURSE-CHECKOUT] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
