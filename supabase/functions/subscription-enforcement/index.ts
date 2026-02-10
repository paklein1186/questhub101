import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date().toISOString();

    // Find expired subscriptions that are still marked active/current
    const { data: expired, error: fetchErr } = await supabase
      .from("user_subscriptions")
      .select("id, user_id, plan_id")
      .eq("is_current", true)
      .in("status", ["ACTIVE", "TRIAL"])
      .lt("valid_until", now);

    if (fetchErr) throw fetchErr;
    if (!expired || expired.length === 0) {
      console.log("No expired subscriptions found");
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get FREE plan id
    const { data: freePlan } = await supabase
      .from("subscription_plans")
      .select("id")
      .eq("code", "FREE")
      .single();

    if (!freePlan) throw new Error("FREE plan not found");

    let processed = 0;
    for (const sub of expired) {
      // Mark old subscription as expired
      await supabase
        .from("user_subscriptions")
        .update({ status: "EXPIRED", is_current: false })
        .eq("id", sub.id);

      // Create new FREE subscription
      await supabase.from("user_subscriptions").insert({
        user_id: sub.user_id,
        plan_id: freePlan.id,
        status: "ACTIVE",
        is_current: true,
      });

      // Update profile plan code
      await supabase
        .from("profiles")
        .update({ current_plan_code: "FREE" })
        .eq("user_id", sub.user_id);

      processed++;
    }

    console.log(`Subscription enforcement: reverted ${processed} users to FREE`);
    return new Response(JSON.stringify({ success: true, processed }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Subscription enforcement failed:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
