import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SENSITIVITY_MULTIPLIERS: Record<string, number> = {
  public: 1.0,
  restricted: 1.5,
  private: 2.0,
};

const REVENUE_SPLIT = {
  creator: 0.70,
  platform: 0.20,
  commons: 0.10,
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
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error("Not authenticated");

    const body = await req.json();
    const {
      agent_id,
      action_code,
      resource_type,
      resource_id,
      creator_type,
      creator_id,
      sensitivity = "public",
      count = 1,
    } = body;

    if (!agent_id || !action_code) {
      throw new Error("agent_id and action_code are required");
    }

    // 1. Fetch action type
    const { data: actionType, error: atErr } = await supabase
      .from("monetized_action_types")
      .select("*")
      .eq("code", action_code)
      .single();
    if (atErr || !actionType) throw new Error(`Unknown action code: ${action_code}`);

    // 2. Fetch billing profile
    const { data: billing } = await supabase
      .from("agent_billing_profiles")
      .select("*, agent_plans(*)")
      .eq("agent_id", agent_id)
      .maybeSingle();

    const payerId = billing?.payer_id || user.id;
    const payerType = billing?.payer_type || "user";

    // 3. Trust multiplier (use agent's trust or default 50)
    const trustScore = 50; // TODO: integrate with OTG trust score lookup
    const trustMultiplier = Math.max(0.5, Math.min(1.5, 1.5 - (trustScore / 100)));

    // 4. Sensitivity multiplier
    const sensitivityMultiplier = SENSITIVITY_MULTIPLIERS[sensitivity] || 1.0;

    // 5. Value factor from owning entity
    let valueFactor = 1.0;
    if (resource_type && creator_id) {
      const table = resource_type === "guild" ? "guilds" :
                    resource_type === "entity" ? "companies" :
                    resource_type === "territory" ? "territories" : null;
      if (table) {
        const { data: entity } = await supabase.from(table).select("value_factor").eq("id", creator_id).maybeSingle();
        if (entity?.value_factor) valueFactor = Number(entity.value_factor);
      }
    }

    // 6. Base price
    const basePrice = Number(actionType.base_price) * count;

    // 7. Volume multiplier (kept at 1.0 for now)
    const volumeMultiplier = 1.0;

    // 8. Final price
    let finalPrice = basePrice * trustMultiplier * sensitivityMultiplier * valueFactor * volumeMultiplier;
    finalPrice = Math.round(finalPrice * 100) / 100;

    // 9. Check subscription quota
    let billedFromPlan = false;
    if (billing?.current_plan_id && billing?.agent_plans?.quota_json) {
      const quota = billing.agent_plans.quota_json as Record<string, number>;
      const allowedQuota = quota[action_code] || 0;

      if (allowedQuota > 0) {
        // Count usage this month under plan
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const { count: usedCount } = await supabase
          .from("agent_usage_records")
          .select("*", { count: "exact", head: true })
          .eq("agent_id", agent_id)
          .eq("billed_from_plan", true)
          .gte("created_at", monthStart.toISOString());

        if ((usedCount || 0) < allowedQuota * count) {
          billedFromPlan = true;
          finalPrice = 0;
        }
      }
    }

    // 10. Monthly spend limit check
    if (!billedFromPlan && billing?.monthly_spend_limit) {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const { data: monthUsage } = await supabase
        .from("agent_usage_records")
        .select("final_price")
        .eq("agent_id", agent_id)
        .eq("billed_from_plan", false)
        .gte("created_at", monthStart.toISOString());

      const totalSpent = (monthUsage || []).reduce((s, r) => s + Number(r.final_price), 0);
      if (totalSpent + finalPrice > Number(billing.monthly_spend_limit)) {
        if (billing.auto_pause_over_limit) {
          throw new Error("Agent over monthly spend limit");
        }
      }
    }

    // 11. Deduct credits from payer (only if not covered by plan)
    if (!billedFromPlan && finalPrice > 0) {
      // Check balance
      const { data: profile } = await supabase
        .from("profiles")
        .select("credits_balance")
        .eq("id", payerId)
        .single();

      if (!profile || Number(profile.credits_balance) < finalPrice) {
        throw new Error("Insufficient credits");
      }

      // Deduct
      const { error: deductErr } = await supabase.rpc("spend_credits", {
        p_user_id: payerId,
        p_amount: Math.ceil(finalPrice),
        p_type: "agent_action",
        p_related_entity_type: "agent",
        p_related_entity_id: agent_id,
        p_source: `agent:${action_code}`,
      });
      if (deductErr) throw new Error(`Credit deduction failed: ${deductErr.message}`);
    }

    // 12. Record usage
    const { data: usageRecord, error: usageErr } = await supabase
      .from("agent_usage_records")
      .insert({
        agent_id,
        payer_type: payerType,
        payer_id: payerId,
        action_type_id: actionType.id,
        resource_type,
        resource_id,
        sensitivity,
        trust_score_at_action: trustScore,
        value_factor: valueFactor,
        base_price: basePrice,
        trust_multiplier: trustMultiplier,
        sensitivity_multiplier: sensitivityMultiplier,
        value_multiplier: valueFactor,
        volume_multiplier: volumeMultiplier,
        final_price: finalPrice,
        billed_from_plan: billedFromPlan,
        creator_type: creator_type || "user",
        creator_id: creator_id || user.id,
      })
      .select("id")
      .single();

    if (usageErr) throw new Error(`Usage record failed: ${usageErr.message}`);

    // 13. Revenue redistribution (only if actually charged)
    if (!billedFromPlan && finalPrice > 0) {
      const creatorShare = Math.round(finalPrice * REVENUE_SPLIT.creator * 100) / 100;
      const platformShare = Math.round(finalPrice * REVENUE_SPLIT.platform * 100) / 100;
      const commonsShare = Math.round(finalPrice * REVENUE_SPLIT.commons * 100) / 100;

      await supabase.from("revenue_share_records").insert([
        { usage_record_id: usageRecord!.id, beneficiary_type: creator_type || "user", beneficiary_id: creator_id, amount: creatorShare },
        { usage_record_id: usageRecord!.id, beneficiary_type: "platform", beneficiary_id: null, amount: platformShare },
        { usage_record_id: usageRecord!.id, beneficiary_type: "commons", beneficiary_id: null, amount: commonsShare },
      ]);

      // Credit the creator
      if (creator_id && creatorShare > 0) {
        await supabase.rpc("grant_credits_admin", {
          p_user_id: creator_id,
          p_amount: Math.floor(creatorShare),
          p_type: "agent_revenue",
          p_related_entity_type: "agent",
          p_related_entity_id: agent_id,
          p_source: `revenue:${action_code}`,
        }).catch(() => { /* creator may not be a user */ });
      }
    }

    return new Response(JSON.stringify({
      usage_record_id: usageRecord?.id,
      final_price: finalPrice,
      billed_from_plan: billedFromPlan,
      breakdown: {
        base_price: basePrice,
        trust_multiplier: trustMultiplier,
        sensitivity_multiplier: sensitivityMultiplier,
        value_factor: valueFactor,
        volume_multiplier: volumeMultiplier,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
