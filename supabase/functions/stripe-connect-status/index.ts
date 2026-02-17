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

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_account_id, stripe_onboarding_complete")
      .eq("user_id", user.id)
      .single();

    if (!profile?.stripe_account_id) {
      return new Response(
        JSON.stringify({ connected: false, onboarding_complete: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const account = await stripe.accounts.retrieve(profile.stripe_account_id);
    const chargesEnabled = account.charges_enabled ?? false;
    const payoutsEnabled = account.payouts_enabled ?? false;
    const detailsSubmitted = account.details_submitted ?? false;
    const onboardingComplete = chargesEnabled && payoutsEnabled && detailsSubmitted;

    // Update profile if onboarding status changed
    if (onboardingComplete !== profile.stripe_onboarding_complete) {
      await supabase
        .from("profiles")
        .update({ stripe_onboarding_complete: onboardingComplete })
        .eq("user_id", user.id);
    }

    return new Response(
      JSON.stringify({
        connected: true,
        onboarding_complete: onboardingComplete,
        charges_enabled: chargesEnabled,
        payouts_enabled: payoutsEnabled,
        details_submitted: detailsSubmitted,
        account_id: profile.stripe_account_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[STRIPE-CONNECT-STATUS] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
