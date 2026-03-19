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

    // Deduct credits
    const { error: spendErr } = await adminClient.rpc("spend_user_credits", {
      _amount: agent.cost_per_use,
      _type: "AGENT_USE",
      _source: `Agent: ${agent.name}`,
      _related_entity_type: "agent",
      _related_entity_id: agentId,
    });

    // If insufficient credits, allow anyway but warn (or block)
    if (spendErr) {
      console.error("Credit spend error:", spendErr.message);
      // Don't block — let them chat but log it
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

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: agent.system_prompt },
          ...messages.map((m: any) => ({ role: m.role, content: m.content })),
        ],
        stream: true,
      }),
    });

    const aiSuccess = aiResponse.ok;

    // Fire-and-forget trust update
    updateAgentTrust(adminClient, agentId, agent.name, agent.creator_user_id, newUsageCount, aiSuccess).catch(
      (err) => console.error("Trust update error:", err)
    );

    if (!aiSuccess) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResponse.text();
      console.error("AI gateway error:", status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
