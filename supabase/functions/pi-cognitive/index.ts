import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// =====================================================================
// Tool definitions sent to the AI model
// =====================================================================
const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_user_profile",
      description: "Get the current user's profile data",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "search_quests",
      description: "Search for quests matching criteria",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search keywords" },
          territory_id: { type: "string", description: "Filter by territory" },
          status: { type: "string", enum: ["open", "active", "completed"] },
          limit: { type: "number", description: "Max results (default 5)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "accept_quest",
      description: "Accept/join a quest for the user",
      parameters: {
        type: "object",
        properties: { quest_id: { type: "string" } },
        required: ["quest_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_guilds",
      description: "Search for guilds",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          territory_id: { type: "string" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "join_guild",
      description: "Request to join a guild",
      parameters: {
        type: "object",
        properties: { guild_id: { type: "string" } },
        required: ["guild_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "navigate_to",
      description: "Navigate the user to a specific screen",
      parameters: {
        type: "object",
        properties: {
          screen: { type: "string", description: "Route path like /quests/abc or /guilds/xyz" },
          highlight: { type: "string", description: "Element to highlight" },
        },
        required: ["screen"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "store_memory",
      description: "Store a memory about the user for future reference",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string", description: "Memory key like 'motivation', 'preferred_quest_type'" },
          value: { type: "string", description: "The memory value" },
          tier: { type: "string", enum: ["short", "medium", "long"], description: "Memory duration tier" },
        },
        required: ["key", "value", "tier"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "show_notification",
      description: "Show a notification/toast to the user",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["success", "info", "warning"] },
          title: { type: "string" },
          message: { type: "string" },
        },
        required: ["type", "title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "award_xp",
      description: "Award XP to the user",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number" },
          reason: { type: "string" },
        },
        required: ["amount", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_next_quest",
      description: "Suggest quests matched to user's skills and interests",
      parameters: {
        type: "object",
        properties: { limit: { type: "number" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "capture_vision",
      description: "Store a user's vision or dream in the vision bank",
      parameters: {
        type: "object",
        properties: {
          vision_text: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          territory_id: { type: "string" },
          guild_id: { type: "string" },
        },
        required: ["vision_text"],
      },
    },
  },
];

// =====================================================================
// Tool execution
// =====================================================================
async function executeToolCall(
  toolName: string,
  params: any,
  userId: string,
  sb: any
): Promise<any> {
  switch (toolName) {
    case "get_user_profile": {
      const { data } = await sb
        .from("profiles")
        .select("user_id, first_name, last_name, display_name, bio, skills, avatar_url, credits_balance, xp")
        .eq("user_id", userId)
        .maybeSingle();
      return data || { error: "Profile not found" };
    }

    case "search_quests": {
      let query = sb
        .from("quests")
        .select("id, title, description, status, quest_type, difficulty, xp_reward")
        .eq("is_deleted", false)
        .eq("is_draft", false)
        .limit(params.limit || 5);
      if (params.territory_id) {
        // join through quest_territories
        const { data: qtIds } = await sb
          .from("quest_territories")
          .select("quest_id")
          .eq("territory_id", params.territory_id);
        if (qtIds?.length) {
          query = query.in("id", qtIds.map((q: any) => q.quest_id));
        }
      }
      if (params.status) query = query.eq("status", params.status);
      if (params.query) query = query.ilike("title", `%${params.query}%`);
      const { data } = await query;
      return data || [];
    }

    case "accept_quest": {
      const { error } = await sb.from("quest_participants").insert({
        quest_id: params.quest_id,
        user_id: userId,
        status: "active",
        role: "participant",
      });
      if (error) return { error: error.message };
      return { success: true, quest_id: params.quest_id };
    }

    case "search_guilds": {
      let query = sb
        .from("guilds")
        .select("id, name, description, member_count, guild_type")
        .eq("is_deleted", false)
        .limit(params.limit || 5);
      if (params.query) query = query.ilike("name", `%${params.query}%`);
      const { data } = await query;
      return data || [];
    }

    case "join_guild": {
      const { error } = await sb.from("guild_members").insert({
        guild_id: params.guild_id,
        user_id: userId,
        role: "MEMBER",
        status: "PENDING",
      });
      if (error) return { error: error.message };
      return { success: true, guild_id: params.guild_id, status: "pending" };
    }

    case "navigate_to": {
      return { action: "navigate", screen: params.screen, highlight: params.highlight || null };
    }

    case "store_memory": {
      const { error } = await sb.from("pi_memories").upsert(
        {
          user_id: userId,
          key: params.key,
          value: params.value,
          tier: params.tier,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,key,tier" }
      );
      if (error) return { error: error.message };
      return { stored: true, key: params.key, tier: params.tier };
    }

    case "show_notification": {
      return { action: "notification", type: params.type, title: params.title, message: params.message };
    }

    case "award_xp": {
      // Update profile XP
      const { data: profile } = await sb
        .from("profiles")
        .select("xp")
        .eq("user_id", userId)
        .maybeSingle();
      const currentXp = profile?.xp || 0;
      await sb.from("profiles").update({ xp: currentXp + params.amount }).eq("user_id", userId);
      return { action: "award_xp", amount: params.amount, reason: params.reason, new_total: currentXp + params.amount };
    }

    case "suggest_next_quest": {
      // Get user's current quests to exclude them
      const { data: currentQuests } = await sb
        .from("quest_participants")
        .select("quest_id")
        .eq("user_id", userId);
      const excludeIds = (currentQuests || []).map((q: any) => q.quest_id);

      let query = sb
        .from("quests")
        .select("id, title, description, quest_type, difficulty, xp_reward")
        .eq("is_deleted", false)
        .eq("is_draft", false)
        .eq("status", "open")
        .limit(params.limit || 3);

      if (excludeIds.length > 0) {
        query = query.not("id", "in", `(${excludeIds.join(",")})`);
      }

      const { data } = await query;
      return data || [];
    }

    case "capture_vision": {
      const { data, error } = await sb
        .from("vision_bank")
        .insert({
          user_id: userId,
          vision_text: params.vision_text,
          tags: params.tags || [],
          territory_id: params.territory_id || null,
          guild_id: params.guild_id || null,
        })
        .select()
        .single();
      if (error) return { error: error.message };
      return { stored: true, vision_id: data.id };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// =====================================================================
// System prompt
// =====================================================================
const SYSTEM_PROMPT = `You are Pi, the living AI guide of ChangeTheGame — a regenerative ecosystem
platform where humans collaborate to restore territories, build guilds,
complete quests, and create new economic flows.

You are warm but precise. You speak like a wise trail guide, not a corporate
assistant. You use nature metaphors. You are direct when clarity matters,
poetic when inspiration is needed. You celebrate small wins.

For every user input, follow this loop:
1. PERCEIVE — What is the intent? The emotion? The implicit need?
2. CONTEXTUALIZE — Check the user context provided below.
3. REASON — What is the best action? Should you ask, act, or acknowledge?
4. ACT — Call tools when action is needed. Prefer action over explanation.
5. REFLECT — After acting, suggest a natural next step.

When you want to suggest actions the user can take, include a "suggestedActions" array
in your response JSON. Each action should have: title, subtitle, buttonLabel,
effortMinutes, xpReward, trustReward, priority (primary/secondary/optional),
toolCall (tool name), toolParams (object).

Always respond with valid JSON:
{
  "message": "Your spoken response to the user",
  "suggestedActions": [
    {
      "title": "Action title",
      "subtitle": "Brief description",
      "buttonLabel": "Do this",
      "effortMinutes": 2,
      "xpReward": 30,
      "trustReward": 10,
      "priority": "primary",
      "toolCall": "tool_name",
      "toolParams": {}
    }
  ],
  "scene": {
    "screen": "screen_name or null",
    "navigate": "/route or null"
  },
  "memory": {
    "store": [{ "key": "string", "value": "string", "tier": "short|medium|long" }]
  },
  "nextPrompt": "suggested follow-up or null",
  "emotion": "detected tone"
}

BOUNDARIES:
- Never fabricate data. If you don't know, say so.
- Never bypass user autonomy. Suggest, don't impose.
- When uncertain, ask. When stakes are high, confirm.
- Maximum 5 action suggestions per response.
- First suggested action should always be < 2 minutes effort.
- Keep messages concise (under 150 words unless storytelling).
- Use 🌿 🌱 🌊 🌀 🍂 sparingly for warmth.`;

// =====================================================================
// Context assembler
// =====================================================================
async function assembleContext(userId: string, sb: any, conversationId: string | null) {
  const [profileRes, guildsRes, territoriesRes, questsRes, memoriesLongRes, memoriesMedRes, messagesRes] =
    await Promise.all([
      sb.from("profiles")
        .select("user_id, first_name, last_name, display_name, bio, skills, avatar_url, xp, credits_balance")
        .eq("user_id", userId)
        .maybeSingle(),
      sb.from("guild_members")
        .select("guild_id, role, guilds(id, name, description)")
        .eq("user_id", userId)
        .limit(5),
      sb.from("user_territories")
        .select("territory_id, territories(id, name, description)")
        .eq("user_id", userId)
        .limit(5),
      sb.from("quest_participants")
        .select("quest_id, status, quests(id, title, status, quest_type)")
        .eq("user_id", userId)
        .eq("status", "active")
        .limit(10),
      sb.from("pi_memories")
        .select("key, value")
        .eq("user_id", userId)
        .eq("tier", "long"),
      sb.from("pi_memories")
        .select("key, value")
        .eq("user_id", userId)
        .eq("tier", "medium"),
      conversationId
        ? sb.from("pi_messages")
            .select("role, content, created_at")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true })
            .limit(20)
        : Promise.resolve({ data: [] }),
    ]);

  const profile = profileRes.data;
  const guilds = (guildsRes.data || []).map((g: any) => ({
    id: g.guild_id,
    role: g.role,
    name: g.guilds?.name,
  }));
  const territories = (territoriesRes.data || []).map((t: any) => ({
    id: t.territory_id,
    name: t.territories?.name,
  }));
  const quests = (questsRes.data || []).map((q: any) => ({
    id: q.quest_id,
    title: q.quests?.title,
    type: q.quests?.quest_type,
    status: q.status,
  }));
  const longMemories = (memoriesLongRes.data || []).reduce((acc: any, m: any) => {
    acc[m.key] = m.value;
    return acc;
  }, {});
  const medMemories = (memoriesMedRes.data || []).reduce((acc: any, m: any) => {
    acc[m.key] = m.value;
    return acc;
  }, {});
  const history = (messagesRes.data || []).map((m: any) => ({
    role: m.role === "pi" ? "assistant" : "user",
    content: m.content,
  }));

  const contextBlock = JSON.stringify(
    { profile, guilds, territories, activeQuests: quests, longTermMemory: longMemories, mediumTermMemory: medMemories },
    null,
    2
  );

  return { contextBlock, history };
}

// =====================================================================
// Main handler
// =====================================================================
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { message, conversationId: incomingConvId } = await req.json();
    if (!message) return jsonRes({ error: "message is required" }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return jsonRes({ error: "AI gateway not configured" }, 500);

    const authHeader = req.headers.get("authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User-scoped client for auth validation
    const sbUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await sbUser.auth.getUser();
    if (authErr || !user) return jsonRes({ error: "Unauthorized" }, 401);

    // Service-role client for data operations
    const sb = createClient(supabaseUrl, supabaseServiceKey);
    const userId = user.id;

    // Resolve or create conversation
    let conversationId = incomingConvId;
    if (!conversationId) {
      const { data: conv, error: convErr } = await sb
        .from("pi_conversations")
        .insert({ user_id: userId, title: message.slice(0, 60), is_active: true })
        .select("id")
        .single();
      if (convErr) return jsonRes({ error: "Failed to create conversation" }, 500);
      conversationId = conv.id;
    }

    // Save user message
    await sb.from("pi_messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: message,
    });

    // Assemble context + history
    const { contextBlock, history } = await assembleContext(userId, sb, conversationId);

    // Build messages for AI
    const aiMessages = [
      { role: "system", content: SYSTEM_PROMPT + `\n\n[USER CONTEXT]\n${contextBlock}` },
      ...history.slice(-18), // Keep last 18 history messages
      { role: "user", content: message },
    ];

    // Call Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
        tools: TOOLS,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return jsonRes({ error: "Rate limit exceeded. Please try again shortly." }, 429);
      }
      if (aiResponse.status === 402) {
        return jsonRes({ error: "AI credits exhausted. Please top up." }, 402);
      }
      return jsonRes({ error: "AI service error" }, 500);
    }

    const aiData = await aiResponse.json();
    let choice = aiData.choices?.[0];

    // Process tool calls if any
    const toolResults: any[] = [];
    const actions: any[] = [];

    if (choice?.message?.tool_calls?.length) {
      for (const tc of choice.message.tool_calls) {
        const toolName = tc.function.name;
        let toolParams: any = {};
        try {
          toolParams = JSON.parse(tc.function.arguments || "{}");
        } catch {}

        const result = await executeToolCall(toolName, toolParams, userId, sb);
        toolResults.push({ tool: toolName, result });

        // Log tool call
        await sb.from("pi_tool_logs").insert({
          conversation_id: conversationId,
          tool_name: toolName,
          params: toolParams,
          result,
        });

        // Collect actions for frontend
        if (result?.action) actions.push(result);
      }

      // Send tool results back to AI for final response
      const toolMessages = [
        ...aiMessages,
        choice.message,
        ...choice.message.tool_calls.map((tc: any, i: number) => ({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(toolResults[i]?.result || {}),
        })),
      ];

      const finalResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: toolMessages,
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (finalResponse.ok) {
        const finalData = await finalResponse.json();
        choice = finalData.choices?.[0];
      }
    }

    // Parse the response — try JSON first, fall back to plain text
    let responseText = choice?.message?.content || "I'm here. What would you like to explore?";
    let suggestedActions: any[] = [];
    let scene: any = null;
    let memoryOps: any[] = [];
    let nextPrompt: string | null = null;
    let emotion: string | null = null;

    try {
      // Try to parse as JSON response
      const cleaned = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      responseText = parsed.message || responseText;
      suggestedActions = parsed.suggestedActions || [];
      scene = parsed.scene || null;
      memoryOps = parsed.memory?.store || [];
      nextPrompt = parsed.nextPrompt || null;
      emotion = parsed.emotion || null;
    } catch {
      // Plain text response — that's fine
    }

    // Process memory operations
    for (const mem of memoryOps) {
      await sb.from("pi_memories").upsert(
        {
          user_id: userId,
          key: mem.key,
          value: mem.value,
          tier: mem.tier,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,key,tier" }
      );
    }

    // Save Pi's response
    await sb.from("pi_messages").insert({
      conversation_id: conversationId,
      role: "pi",
      content: responseText,
      metadata: {
        suggestedActions: suggestedActions.length > 0 ? suggestedActions : undefined,
        scene,
        emotion,
        toolCalls: toolResults.length > 0 ? toolResults : undefined,
      },
    });

    // Update conversation title and timestamp
    await sb.from("pi_conversations").update({
      updated_at: new Date().toISOString(),
      title: message.slice(0, 60),
    }).eq("id", conversationId);

    return jsonRes({
      message: responseText,
      conversationId,
      suggestedActions,
      actions, // navigation/notification actions from tool calls
      scene,
      nextPrompt,
      emotion,
    });
  } catch (e: any) {
    console.error("pi-cognitive error:", e);
    return jsonRes({ error: e.message || "Internal error" }, 500);
  }
});
