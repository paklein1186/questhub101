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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const agentId = typeof body.agentId === "string" ? body.agentId : "";
    const unitType = typeof body.unitType === "string" ? body.unitType : "";
    const unitId = typeof body.unitId === "string" ? body.unitId : "";
    const messages = Array.isArray(body.messages) ? body.messages : [];

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const allowedUnitTypes = new Set(["guild", "pod", "quest"]);

    if (!uuidRegex.test(agentId) || !uuidRegex.test(unitId)) {
      return new Response(JSON.stringify({ error: "Invalid agentId or unitId format" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!allowedUnitTypes.has(unitType)) {
      return new Response(JSON.stringify({ error: "unitType must be guild, pod, or quest" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!messages.length || messages.length > 50) {
      return new Response(JSON.stringify({ error: "messages must contain 1-50 items" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const allowedRoles = new Set(["user", "assistant", "system"]);
    for (const m of messages) {
      if (typeof m.role !== "string" || !allowedRoles.has(m.role) || typeof m.content !== "string" || m.content.length === 0 || m.content.length > 10000) {
        return new Response(JSON.stringify({ error: "Invalid message format" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify agent is admitted to this unit
    const { data: unitAgent, error: uaErr } = await adminClient
      .from("unit_agents")
      .select("*, agents(*)")
      .eq("agent_id", agentId)
      .eq("unit_type", unitType)
      .eq("unit_id", unitId)
      .eq("is_active", true)
      .maybeSingle();

    if (!unitAgent) {
      return new Response(JSON.stringify({ error: "Agent not admitted to this unit" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const agent = unitAgent.agents;

    // Verify user is a member of the unit
    let isMember = false;
    if (unitType === "guild") {
      const { data } = await adminClient.from("guild_members").select("id").eq("guild_id", unitId).eq("user_id", user.id).maybeSingle();
      isMember = !!data;
    } else if (unitType === "pod") {
      const { data } = await adminClient.from("pod_members").select("id").eq("pod_id", unitId).eq("user_id", user.id).maybeSingle();
      isMember = !!data;
    } else if (unitType === "quest") {
      const { data } = await adminClient.from("quest_participants").select("id").eq("quest_id", unitId).eq("user_id", user.id).maybeSingle();
      isMember = !!data;
    }

    if (!isMember) {
      return new Response(JSON.stringify({ error: "You must be a member of this unit to chat with its agents" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gather unit context
    let unitContext = "";
    if (unitType === "guild") {
      const { data: guild } = await adminClient.from("guilds").select("name, description").eq("id", unitId).single();
      if (guild) unitContext += `Guild: ${guild.name}\nDescription: ${guild.description || "N/A"}\n`;

      // Recent posts
      const { data: posts } = await adminClient.from("feed_posts").select("content, created_at").eq("context_type", "GUILD").eq("context_id", unitId).eq("is_deleted", false).order("created_at", { ascending: false }).limit(5);
      if (posts?.length) {
        unitContext += "\nRecent posts:\n" + posts.map((p: any) => `- ${p.content?.slice(0, 200)}`).join("\n");
      }

      // Members
      const { data: members } = await adminClient.from("guild_members").select("user_id, role, profiles:user_id(name)").eq("guild_id", unitId).limit(20);
      if (members?.length) {
        unitContext += "\n\nMembers:\n" + members.map((m: any) => `- ${(m as any).profiles?.name || "Unknown"} (${m.role})`).join("\n");
      }

      // Docs
      const { data: docs } = await adminClient.from("guild_docs").select("title, content").eq("guild_id", unitId).limit(3);
      if (docs?.length) {
        unitContext += "\n\nDocuments:\n" + docs.map((d: any) => `- ${d.title}: ${d.content?.slice(0, 300) || ""}`).join("\n");
      }
    } else if (unitType === "pod") {
      const { data: pod } = await adminClient.from("pods").select("name, description").eq("id", unitId).single();
      if (pod) unitContext += `Pod: ${pod.name}\nDescription: ${pod.description || "N/A"}\n`;

      const { data: members } = await adminClient.from("pod_members").select("user_id, role, profiles:user_id(name)").eq("pod_id", unitId).limit(20);
      if (members?.length) {
        unitContext += "\nMembers:\n" + members.map((m: any) => `- ${(m as any).profiles?.name || "Unknown"} (${m.role})`).join("\n");
      }
    } else if (unitType === "quest") {
      const { data: quest } = await adminClient.from("quests").select("title, description, status, reward_xp").eq("id", unitId).single();
      if (quest) unitContext += `Quest: ${quest.title}\nDescription: ${quest.description || "N/A"}\nStatus: ${quest.status}\nReward: ${quest.reward_xp} XP\n`;

      const { data: participants } = await adminClient.from("quest_participants").select("user_id, role, status, profiles:user_id(name)").eq("quest_id", unitId).limit(20);
      if (participants?.length) {
        unitContext += "\nParticipants:\n" + participants.map((p: any) => `- ${(p as any).profiles?.name || "Unknown"} (${p.role}, ${p.status})`).join("\n");
      }

      // Recent updates
      const { data: updates } = await adminClient.from("quest_updates").select("title, content, type").eq("quest_id", unitId).eq("is_deleted", false).order("created_at", { ascending: false }).limit(5);
      if (updates?.length) {
        unitContext += "\n\nRecent updates:\n" + updates.map((u: any) => `- [${u.type}] ${u.title}: ${u.content?.slice(0, 200)}`).join("\n");
      }
    }

    // Build enriched system prompt
    const systemPrompt = `${agent.system_prompt}

---
CONTEXT: You are operating inside a ${unitType} on the changethegame platform. Use the following context to provide relevant, grounded answers.

${unitContext}
---
Respond helpfully based on this context. If you don't know something specific about the unit, say so.`;

    // ─── Hybrid billing ───────────────────────────────────────────
    const billingCurrency = agent.billing_currency || "credits";

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
        }
      }

      if (!usedPlan) {
        if (billingCurrency === "coins") {
          const { error: spendErr } = await adminClient.rpc("spend_user_coins", {
            _amount: agent.cost_per_use,
            _type: "AGENT_USE",
            _source: `Unit Agent: ${agent.name} (${unitType})`,
            _related_entity_type: "agent",
            _related_entity_id: agentId,
          });
          if (spendErr) {
            return new Response(JSON.stringify({
              error: `Insufficient coins. This agent costs ${agent.cost_per_use} coins per interaction.`,
            }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        } else {
          const { error: spendErr } = await adminClient.rpc("spend_user_credits", {
            _amount: agent.cost_per_use,
            _type: "AGENT_USE",
            _source: `Unit Agent: ${agent.name} (${unitType})`,
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

    // Increment usage
    const newUsageCount = (agent.usage_count || 0) + 1;
    await adminClient.from("agents").update({ usage_count: newUsageCount }).eq("id", agentId);

    // ─── Route based on agent_source ───────────────────────────────
    let aiResponse: Response;

    if (agent.agent_source === "webhook" && agent.external_webhook_url) {
      // ── Webhook agent ──
      const webhookHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (agent.webhook_secret) webhookHeaders["X-Webhook-Secret"] = agent.webhook_secret;

      try {
        aiResponse = await fetch(agent.external_webhook_url, {
          method: "POST",
          headers: webhookHeaders,
          body: JSON.stringify({
            messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
            context: { unit_type: unitType, unit_id: unitId, unit_context: unitContext, agent_id: agentId, user_id: user.id },
          }),
          signal: AbortSignal.timeout(30_000),
        });

        // Update health
        await adminClient.from("agents").update({
          health_status: aiResponse.ok ? "healthy" : "degraded",
          last_health_check_at: new Date().toISOString(),
        }).eq("id", agentId);

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          console.error("Webhook error:", aiResponse.status, errText);
          throw new Error("Webhook returned " + aiResponse.status);
        }

        // Check if SSE or JSON
        const ct = aiResponse.headers.get("content-type") || "";
        if (ct.includes("text/event-stream")) {
          // Pipe SSE through directly
        } else {
          // JSON response → wrap as SSE
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
        const aiSuccess = false;
        updateAgentTrust(adminClient, agentId, agent.name, agent.creator_user_id, newUsageCount, aiSuccess).catch(
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
        // Anthropic uses a different format
        const sysMsg = systemPrompt;
        const userMessages = messages.map((m: any) => ({ role: m.role === "system" ? "user" : m.role, content: m.content }));
        aiResponse = await fetch(endpoint, {
          method: "POST",
          headers: {
            "x-api-key": api_key_ref,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ model, system: sysMsg, messages: userMessages, max_tokens: 4096, stream: true }),
        });
      } else {
        // OpenAI-compatible (OpenAI, Mistral, Groq)
        aiResponse = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${api_key_ref}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "system", content: systemPrompt }, ...messages.map((m: any) => ({ role: m.role, content: m.content }))],
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
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.map((m: any) => ({ role: m.role, content: m.content })),
          ],
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
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
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
    console.error("unit-agent-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
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

  const delta = success ? 0.1 : -1.0;
  const newHistory = Math.max(0, Math.min(100, (prev.history_score ?? 50) + delta));

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
        break;
      }
    }
  }
}
