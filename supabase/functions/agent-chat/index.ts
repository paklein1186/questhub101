import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    // Auth
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const agentId = typeof body.agentId === "string" ? body.agentId : "";
    const messages = Array.isArray(body.messages) ? body.messages : [];

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(agentId)) {
      return new Response(JSON.stringify({ error: "Invalid agentId format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate messages array
    if (!messages.length || messages.length > 50) {
      return new Response(JSON.stringify({ error: "messages must contain 1-50 items" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allowedRoles = new Set(["user", "assistant", "system"]);
    for (const m of messages) {
      if (typeof m.role !== "string" || !allowedRoles.has(m.role) || typeof m.content !== "string" || m.content.length === 0 || m.content.length > 10000) {
        return new Response(JSON.stringify({ error: "Invalid message format: each must have role (user|assistant|system) and content (1-10000 chars)" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch agent
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: agent, error: agentErr } = await adminClient
      .from("agents")
      .select("*")
      .eq("id", agentId)
      .single();

    if (agentErr || !agent) {
      return new Response(JSON.stringify({ error: "Agent not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check hire
    const { data: hire } = await adminClient
      .from("agent_hires")
      .select("id")
      .eq("user_id", user.id)
      .eq("agent_id", agentId)
      .eq("status", "active")
      .maybeSingle();

    if (!hire) {
      return new Response(JSON.stringify({ error: "You haven't hired this agent" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Hybrid billing ───────────────────────────────────────────
    const billingCurrency = agent.billing_currency || "credits";
    let chargedAmount = 0;
    let paymentType = "free"; // free | plan | credits | coins

    if (billingCurrency !== "free") {
      let usedPlan = false;

      const { data: profile } = await adminClient
        .from("profiles")
        .select("agent_interactions_this_month, agent_interactions_reset_at")
        .eq("id", user.id)
        .single();

      if (profile) {
        const monthStart = new Date();
        monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
        let currentCount = profile.agent_interactions_this_month || 0;

        if (!profile.agent_interactions_reset_at || new Date(profile.agent_interactions_reset_at) < monthStart) {
          currentCount = 0;
          await adminClient.from("profiles")
            .update({ agent_interactions_this_month: 0, agent_interactions_reset_at: monthStart.toISOString() })
            .eq("id", user.id);
        }

        const { data: sub } = await adminClient
          .from("user_subscriptions")
          .select("subscription_plans(monthly_agent_interactions)")
          .eq("user_id", user.id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();

        const planQuota = (sub as any)?.subscription_plans?.monthly_agent_interactions || 0;

        if (planQuota > 0 && currentCount < planQuota) {
          await adminClient.from("profiles")
            .update({ agent_interactions_this_month: currentCount + 1 })
            .eq("id", user.id);
          usedPlan = true;
          paymentType = "plan";
        }
      }

      if (!usedPlan) {
        chargedAmount = agent.cost_per_use;
        if (billingCurrency === "coins") {
          paymentType = "coins";
          const { error: spendErr } = await adminClient.rpc("spend_user_coins", {
            _amount: agent.cost_per_use,
            _type: "AGENT_USE",
            _source: `Agent: ${agent.name}`,
            _related_entity_type: "agent",
            _related_entity_id: agentId,
          });
          if (spendErr) {
            return new Response(JSON.stringify({
              error: `Insufficient coins. This agent costs ${agent.cost_per_use} coins per interaction.`,
            }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        } else {
          paymentType = "credits";
          const { error: spendErr } = await adminClient.rpc("spend_user_credits", {
            _amount: agent.cost_per_use,
            _type: "AGENT_USE",
            _source: `Agent: ${agent.name}`,
            _related_entity_type: "agent",
            _related_entity_id: agentId,
          });
          if (spendErr) {
            return new Response(JSON.stringify({
              error: `Insufficient credits. This agent costs ${agent.cost_per_use} credits per interaction.`,
            }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        }
      }
    }

    // ─── Revenue sharing (hired agent: 75% creator, 15% platform, 10% commons) ──
    if (chargedAmount > 0 && (paymentType === "credits" || paymentType === "coins")) {
      const balanceField = paymentType === "coins" ? "coins_balance" : "credits_balance";
      const creatorShare = Math.round(chargedAmount * 75) / 100;
      const commonsShare = Math.round(chargedAmount * 10) / 100;

      // Grant to creator
      await adminClient.from("profiles")
        .update({ [balanceField]: adminClient.rpc ? undefined : 0 })
        .eq("id", "noop"); // placeholder — use raw increment below
      await adminClient.rpc("increment_profile_balance", undefined).catch(() => {});
      // Direct increment for creator
      const { data: creatorProfile } = await adminClient
        .from("profiles")
        .select(balanceField)
        .eq("id", agent.creator_user_id)
        .single();
      if (creatorProfile) {
        await adminClient.from("profiles")
          .update({ [balanceField]: (creatorProfile as any)[balanceField] + creatorShare })
          .eq("id", agent.creator_user_id);
      }

      // Commons pool
      if (commonsShare > 0) {
        const { data: setting } = await adminClient
          .from("cooperative_settings")
          .select("value")
          .eq("key", "ctg_commons_wallet")
          .maybeSingle();
        const currentPool = setting ? Number((setting.value as any)?.amount || 0) : 0;
        await adminClient.from("cooperative_settings")
          .update({ value: { amount: currentPool + commonsShare }, updated_at: new Date().toISOString() })
          .eq("key", "ctg_commons_wallet");
      }

      // Log revenue shares
      const shares = [
        { beneficiary_type: "user", beneficiary_id: agent.creator_user_id, share_pct: 75, amount: creatorShare },
        { beneficiary_type: "platform", beneficiary_id: null, share_pct: 15, amount: Math.round(chargedAmount * 15) / 100 },
        { beneficiary_type: "user", beneficiary_id: null, share_pct: 10, amount: commonsShare },
      ];
      await adminClient.from("revenue_share_records").insert(
        shares.map(s => ({
          agent_id: agentId,
          beneficiary_type: s.beneficiary_type,
          beneficiary_id: s.beneficiary_id,
          share_pct: s.share_pct,
          amount: s.amount,
          currency: paymentType,
        }))
      );
    }

    // Increment usage count
    const newUsageCount = (agent.usage_count || 0) + 1;
    await adminClient
      .from("agents")
      .update({ usage_count: newUsageCount })
      .eq("id", agentId);

    // Update last_used_at
    await adminClient
      .from("agent_hires")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", hire.id);

    // ─── Route based on agent_source ───────────────────────────────
    let aiResponse: Response;
    const chatMessages = messages.map((m: any) => ({ role: m.role, content: m.content }));

    if (agent.agent_source === "webhook" && agent.external_webhook_url) {
      // ── Webhook agent ──
      const webhookHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (agent.webhook_secret) webhookHeaders["X-Webhook-Secret"] = agent.webhook_secret;

      try {
        aiResponse = await fetch(agent.external_webhook_url, {
          method: "POST",
          headers: webhookHeaders,
          body: JSON.stringify({
            messages: chatMessages,
            context: { agent_id: agentId, user_id: user.id },
          }),
          signal: AbortSignal.timeout(30_000),
        });

        await adminClient.from("agents").update({
          health_status: aiResponse.ok ? "healthy" : "degraded",
          last_health_check_at: new Date().toISOString(),
        }).eq("id", agentId);

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          console.error("Webhook error:", aiResponse.status, errText);
          throw new Error("Webhook returned " + aiResponse.status);
        }

        const ct = aiResponse.headers.get("content-type") || "";
        if (!ct.includes("text/event-stream")) {
          const json = await aiResponse.json();
          const text = json.content || json.message || json.text || json.reply || JSON.stringify(json);
          const ssePayload = `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\ndata: [DONE]\n\n`;
          aiResponse = new Response(ssePayload, { status: 200, headers: { "Content-Type": "text/event-stream" } });
        }
      } catch (err) {
        console.error("Webhook unreachable:", err);
        await adminClient.from("agents").update({
          health_status: "unreachable",
          last_health_check_at: new Date().toISOString(),
        }).eq("id", agentId);
        updateAgentTrust(adminClient, agentId, agent.name, agent.creator_user_id, newUsageCount, false).catch(
          (e) => console.error("Trust update error:", e)
        );
        return new Response(JSON.stringify({ error: "External agent unreachable" }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

    } else if (agent.agent_source === "custom_llm" && agent.external_llm_config) {
      // ── Custom LLM agent ──
      const cfg = agent.external_llm_config as { provider: string; model: string; api_key_ref: string };
      const { provider, model, api_key_ref } = cfg;

      const providerEndpoints: Record<string, string> = {
        openai: "https://api.openai.com/v1/chat/completions",
        mistral: "https://api.mistral.ai/v1/chat/completions",
        groq: "https://api.groq.com/openai/v1/chat/completions",
        anthropic: "https://api.anthropic.com/v1/messages",
      };

      const endpoint = providerEndpoints[provider];
      if (!endpoint) throw new Error(`Unsupported provider: ${provider}`);

      if (provider === "anthropic") {
        const userMessages = chatMessages.map((m: any) => ({ role: m.role === "system" ? "user" : m.role, content: m.content }));
        aiResponse = await fetch(endpoint, {
          method: "POST",
          headers: {
            "x-api-key": api_key_ref,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ model, system: agent.system_prompt, messages: userMessages, max_tokens: 4096, stream: true }),
        });
      } else {
        aiResponse = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${api_key_ref}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "system", content: agent.system_prompt }, ...chatMessages],
            stream: true,
          }),
        });
      }
    } else {
      // ── Platform agent (default) ──
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

      aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "system", content: agent.system_prompt }, ...chatMessages],
          stream: true,
        }),
      });
    }

    const aiSuccess = aiResponse.ok;

    // Fire-and-forget trust update
    updateAgentTrust(adminClient, agentId, agent.name, agent.creator_user_id, newUsageCount, aiSuccess).catch(
      (err) => console.error("Trust update error:", err)
    );

    if (!aiSuccess) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResponse.text();
      console.error("AI error:", status, t);
      return new Response(JSON.stringify({ error: "AI provider error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("agent-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── Trust progression helper ───────────────────────────────────────────────
const TRUST_THRESHOLDS = [
  { score: 20, level: 1, label: "Newcomer" },
  { score: 40, level: 2, label: "Recognized" },
  { score: 60, level: 3, label: "Trusted" },
  { score: 80, level: 4, label: "Established" },
];

async function updateAgentTrust(
  db: any,
  agentId: string,
  agentName: string,
  creatorUserId: string,
  usageCount: number,
  success: boolean
) {
  // 1. Get or create trust score row
  const { data: existing } = await db
    .from("agent_trust_scores")
    .select("*")
    .eq("agent_id", agentId)
    .maybeSingle();

  const prev = existing || {
    owner_trust: 50,
    history_score: 50,
    guild_endorsements: 0,
    xp_level: 0,
    penalties: 0,
    total_score: 0,
  };

  // 2. Increment / decrement history_score
  const delta = success ? 0.1 : -1.0;
  const newHistory = Math.max(0, Math.min(100, (prev.history_score ?? 50) + delta));

  // 3. Every 10 interactions → full recompute; otherwise just update history
  const doFullRecompute = usageCount % 10 === 0;
  let newTotal = prev.total_score;

  if (doFullRecompute) {
    newTotal = Math.max(
      0,
      Math.min(
        100,
        0.25 * (prev.owner_trust ?? 50) +
          0.25 * newHistory +
          0.2 * (prev.guild_endorsements ?? 0) +
          0.15 * (prev.xp_level ?? 0) -
          0.15 * (prev.penalties ?? 0)
      )
    );
  }

  const roundTwo = (n: number) => Math.round(n * 100) / 100;

  await db.from("agent_trust_scores").upsert(
    {
      agent_id: agentId,
      history_score: roundTwo(newHistory),
      total_score: roundTwo(doFullRecompute ? newTotal : prev.total_score),
      owner_trust: prev.owner_trust ?? 50,
      guild_endorsements: prev.guild_endorsements ?? 0,
      xp_level: prev.xp_level ?? 0,
      penalties: prev.penalties ?? 0,
      computed_at: new Date().toISOString(),
    },
    { onConflict: "agent_id" }
  );

  // 4. Threshold notification check (only on full recompute)
  if (doFullRecompute) {
    const oldScore = prev.total_score ?? 0;
    for (const t of TRUST_THRESHOLDS) {
      if (oldScore < t.score && newTotal >= t.score) {
        await db.from("notifications").insert({
          user_id: creatorUserId,
          type: "agent_trust",
          title: `Your agent ${agentName} reached Trust Level ${t.level}: ${t.label}`,
          body: `Trust score is now ${roundTwo(newTotal)}. Keep it up!`,
          link: `/agents/${agentId}`,
        });
        break; // only notify highest threshold crossed
      }
    }
  }
}
