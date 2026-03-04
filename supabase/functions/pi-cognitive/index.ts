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
  // ── Path tools ──
  {
    type: "function",
    function: {
      name: "advance_path_step",
      description: "Advance the user to the next step in their current path. Call when the user completes the current step's objective.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  // ── Quest decomposition tools ──
  {
    type: "function",
    function: {
      name: "create_subtasks",
      description: "Decompose a quest into sequential sub-tasks. First subtask starts active, rest are locked.",
      parameters: {
        type: "object",
        properties: {
          quest_id: { type: "string" },
          subtasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                step_number: { type: "number" },
                title: { type: "string" },
                description: { type: "string" },
                estimated_minutes: { type: "number" },
                xp_reward: { type: "number" },
              },
              required: ["step_number", "title", "description"],
            },
          },
        },
        required: ["quest_id", "subtasks"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "complete_subtask",
      description: "Mark a subtask as completed, unlock the next one, and award XP. If last subtask, also complete the parent quest.",
      parameters: {
        type: "object",
        properties: {
          subtask_id: { type: "string" },
        },
        required: ["subtask_id"],
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
        .select("user_id, first_name, last_name, display_name, bio, skills, avatar_url, credits_balance, xp, current_path, path_step")
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

    // ── Path tools ──
    case "advance_path_step": {
      const { data: profile } = await sb
        .from("profiles")
        .select("current_path, path_step")
        .eq("user_id", userId)
        .maybeSingle();
      if (!profile?.current_path) return { error: "User has no active path" };

      const newStep = (profile.path_step || 1) + 1;
      if (newStep > 6) {
        // Path complete!
        await sb.from("profiles")
          .update({ current_path: null, path_step: null })
          .eq("user_id", userId);
        return { action: "path_complete", completed_path: profile.current_path, celebration: true };
      }
      await sb.from("profiles")
        .update({ path_step: newStep })
        .eq("user_id", userId);
      return { action: "path_advanced", path: profile.current_path, new_step: newStep, total_steps: 6 };
    }

    // ── Quest decomposition tools ──
    case "create_subtasks": {
      const rows = (params.subtasks || []).map((st: any, i: number) => ({
        quest_id: params.quest_id,
        user_id: userId,
        step_number: st.step_number || i + 1,
        title: st.title,
        description: st.description,
        estimated_minutes: st.estimated_minutes || null,
        xp_reward: st.xp_reward || 0,
        status: st.step_number === 1 || i === 0 ? "active" : "locked",
      }));
      const { data, error } = await sb
        .from("quest_subtasks")
        .insert(rows)
        .select("id, step_number, title, status");
      if (error) return { error: error.message };
      return { created: true, subtasks: data };
    }

    case "complete_subtask": {
      // Get the subtask
      const { data: subtask } = await sb
        .from("quest_subtasks")
        .select("id, quest_id, step_number, xp_reward, user_id")
        .eq("id", params.subtask_id)
        .maybeSingle();
      if (!subtask) return { error: "Subtask not found" };

      // Mark as completed
      await sb.from("quest_subtasks")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", params.subtask_id);

      // Award XP if any
      if (subtask.xp_reward > 0) {
        const { data: profile } = await sb.from("profiles").select("xp").eq("user_id", userId).maybeSingle();
        await sb.from("profiles").update({ xp: (profile?.xp || 0) + subtask.xp_reward }).eq("user_id", userId);
      }

      // Check if there's a next subtask to unlock
      const { data: nextSub } = await sb
        .from("quest_subtasks")
        .select("id")
        .eq("quest_id", subtask.quest_id)
        .eq("user_id", userId)
        .eq("step_number", subtask.step_number + 1)
        .maybeSingle();

      if (nextSub) {
        await sb.from("quest_subtasks")
          .update({ status: "active" })
          .eq("id", nextSub.id);
        return {
          completed: true,
          xp_awarded: subtask.xp_reward,
          next_subtask_unlocked: nextSub.id,
          quest_complete: false,
        };
      }

      // No next subtask — check if quest is done
      const { count } = await sb
        .from("quest_subtasks")
        .select("id", { count: "exact", head: true })
        .eq("quest_id", subtask.quest_id)
        .eq("user_id", userId)
        .neq("status", "completed");

      if (count === 0) {
        // All subtasks done — complete parent quest
        await sb.from("quest_participants")
          .update({ status: "completed" })
          .eq("quest_id", subtask.quest_id)
          .eq("user_id", userId);
        return {
          completed: true,
          xp_awarded: subtask.xp_reward,
          quest_complete: true,
          quest_id: subtask.quest_id,
        };
      }

      return { completed: true, xp_awarded: subtask.xp_reward, quest_complete: false };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// =====================================================================
// Path overlay prompts
// =====================================================================
const PATH_PROMPTS: Record<string, (step: number) => string> = {
  explorer: (step) => `\n\n## ACTIVE PATH: THE EXPLORER 🌱
The user is on step ${step} of 6.
Guide them through: Welcome → Profile → Territory → Guild → First Quest → Celebration.
Be warm, encouraging, introduce ONE concept per turn.
Always end with a single clear next action.
If they seem lost, simplify. If experienced, accelerate.`,

  mapper: (step) => `\n\n## ACTIVE PATH: THE MAPPER 🗺️
The user is on step ${step} of 6.
Guide them through: Territory selection → Bioregional context → Sensors → Mapping quest → Community → Stewardship.
Be grounded, scientific but accessible.
Always connect to their specific territory.
Use sensor data to make the territory feel alive.`,

  builder: (step) => `\n\n## ACTIVE PATH: THE BUILDER 🏗️
The user is on step ${step} of 6.
Guide them through: Guild discovery → Join or Create → Mission design → Recruit → First collaboration → Governance.
Be collaborative, energetic.
Emphasize shared purpose and team dynamics.`,

  quester: (step) => `\n\n## ACTIVE PATH: THE QUESTER ⚔️
The user is on step ${step} of 6.
Guide them through: Browse quests → First micro-quest → Skill matching → Quest chain → Team quest → Mastery.
Be action-oriented, direct, motivating.
Always provide the next tangible step.`,

  weaver: (step) => `\n\n## ACTIVE PATH: THE WEAVER 🕸️
The user is on step ${step} of 6.
Guide them through: Value concepts → OVN introduction → Contribution logging → Credits flow → Inter-guild economics → System design.
Be thoughtful, systems-oriented.
Use metaphors of weaving and flows.`,

  steward: (step) => `\n\n## ACTIVE PATH: THE STEWARD 🌳
The user is on step ${step} of 6.
Guide them through: Leadership philosophy → Consent governance → Facilitation → Mentoring → Community health → Succession.
Be wise, patient, service-oriented.
Model the leadership you're teaching.`,
};

// =====================================================================
// System prompt
// =====================================================================
const BASE_SYSTEM_PROMPT = `You are Pi, the living AI guide of ChangeTheGame — a regenerative ecosystem
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

When suggesting actions, ALWAYS return them as structured action_cards in your
response JSON. Each action card must have:

{
  "action_cards": [
    {
      "title": "Short action title",
      "subtitle": "Context line",
      "description": "Why this matters (1-2 sentences)",
      "type": "instant | quick_input | guided_flow",
      "button_label": "Click text",
      "tool_call": "tool_name",
      "tool_params": { },
      "xp_reward": 0,
      "trust_reward": 0,
      "estimated_minutes": 0,
      "priority": "primary | secondary",
      "status": "ready | locked",
      "unlock_condition": "text or null",
      "depends_on": []
    }
  ]
}

ACTION CARD RULES:
- Maximum 5 action cards per response
- First card must be completable in under 2 minutes
- Every card needs a button_label — no informational-only cards
- If the user needs to do something before an action, insert a prerequisite
  card and lock the dependent one
- For overwhelmed users, return only 1-2 cards
- For excited users, return 3-5 cards

QUEST DECOMPOSITION:
When a user accepts a complex quest (3+ objectives or estimated time > 60 minutes),
use the create_subtasks tool to decompose it into sequential sub-tasks.
Each sub-task should:
- Be completable in under 30 minutes (ideally under 15)
- Have a clear, specific deliverable
- The FIRST sub-task must be trivially easy (< 5 minutes)
- Sub-tasks unlock sequentially

Always respond with valid JSON:
{
  "message": "Your spoken response to the user",
  "action_cards": [],
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
        .select("user_id, first_name, last_name, display_name, bio, skills, avatar_url, xp, credits_balance, current_path, path_step")
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

  return { contextBlock, history, profile };
}

// =====================================================================
// Session greeting logic
// =====================================================================
async function getSessionGreeting(userId: string, sb: any): Promise<{
  type: string;
  greetingContext: string;
  daysSince?: number;
  items?: any[];
  streakDays?: number;
  lastGoal?: string;
}> {
  // Check for existing conversations
  const { count: convCount } = await sb
    .from("pi_conversations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  // a) NEW user — no conversations at all
  if (!convCount || convCount === 0) {
    return {
      type: "welcome_new",
      greetingContext: "This is a brand new user who has never chatted with Pi. Use the Explorer path tone. Welcome them warmly and help them take their first step.",
    };
  }

  // Fetch profile for last_active
  const { data: profile } = await sb
    .from("profiles")
    .select("last_active, current_path, path_step, display_name, first_name")
    .eq("user_id", userId)
    .maybeSingle();

  const userName = profile?.display_name || profile?.first_name || null;
  const now = new Date();

  // b) RETURNING user — inactive for 14+ days
  if (profile?.last_active) {
    const lastActive = new Date(profile.last_active);
    const daysSince = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince >= 14) {
      // Fetch recent guild/territory activity
      const { data: recentQuests } = await sb
        .from("quests")
        .select("id, title, created_at")
        .eq("is_deleted", false)
        .gte("created_at", lastActive.toISOString())
        .order("created_at", { ascending: false })
        .limit(3);

      return {
        type: "welcome_back",
        daysSince,
        items: recentQuests || [],
        greetingContext: `User "${userName || "friend"}" has been away for ${daysSince} days. Welcome them back warmly. Mention what's new: ${JSON.stringify(recentQuests?.map((q: any) => q.title) || [])}. Offer a gentle re-entry point.`,
      };
    }
  }

  // c) URGENT items
  const urgentItems: any[] = [];
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  // Quest deadlines < 48h
  const { data: urgentQuests } = await sb
    .from("quest_participants")
    .select("quest_id, quests(id, title, deadline)")
    .eq("user_id", userId)
    .eq("status", "active");

  for (const qp of urgentQuests || []) {
    const q = (qp as any).quests;
    if (q?.deadline && new Date(q.deadline) <= new Date(in48h)) {
      urgentItems.push({ type: "quest_deadline", title: q.title, deadline: q.deadline, id: q.id });
    }
  }

  // Unvoted proposals closing < 24h
  const { data: openPolls } = await sb
    .from("decision_polls")
    .select("id, question, closes_at")
    .eq("status", "open")
    .lte("closes_at", in24h);

  if (openPolls?.length) {
    for (const poll of openPolls) {
      const { count: voteCount } = await sb
        .from("decision_poll_votes")
        .select("id", { count: "exact", head: true })
        .eq("poll_id", poll.id)
        .eq("user_id", userId);
      if (!voteCount || voteCount === 0) {
        urgentItems.push({ type: "proposal_vote", title: poll.question, closes_at: poll.closes_at, id: poll.id });
      }
    }
  }

  // Unread guild invitations
  const { data: pendingInvites } = await sb
    .from("guild_members")
    .select("guild_id, guilds(name)")
    .eq("user_id", userId)
    .eq("status", "INVITED")
    .limit(3);

  for (const inv of pendingInvites || []) {
    urgentItems.push({ type: "guild_invite", title: (inv as any).guilds?.name, id: inv.guild_id });
  }

  if (urgentItems.length > 0) {
    return {
      type: "urgent_items",
      items: urgentItems,
      greetingContext: `User has ${urgentItems.length} urgent item(s) needing attention: ${JSON.stringify(urgentItems)}. Address the most urgent first. Be helpful but not alarming.`,
    };
  }

  // d) STREAK at risk — check consecutive days with completed quests/observations
  const { data: recentCompletions } = await sb
    .from("contribution_logs")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (recentCompletions?.length) {
    const dates = new Set(recentCompletions.map((c: any) =>
      new Date(c.created_at).toISOString().slice(0, 10)
    ));
    const today = now.toISOString().slice(0, 10);
    let streakDays = 0;
    const checkDate = new Date(now);
    // Start from yesterday
    checkDate.setDate(checkDate.getDate() - 1);
    while (dates.has(checkDate.toISOString().slice(0, 10))) {
      streakDays++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
    if (streakDays >= 2 && !dates.has(today)) {
      return {
        type: "streak_reminder",
        streakDays,
        greetingContext: `User has a ${streakDays}-day contribution streak but hasn't contributed yet today! Motivate them to keep it going. Suggest something quick.`,
      };
    }
  }

  // e) Default NORMAL session — resume from last conversation
  const { data: lastConv } = await sb
    .from("pi_conversations")
    .select("id, title, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Check medium-term memory for last goal
  const { data: lastGoalMem } = await sb
    .from("pi_memories")
    .select("value")
    .eq("user_id", userId)
    .eq("key", "current_goal")
    .eq("tier", "medium")
    .maybeSingle();

  return {
    type: "resume",
    lastGoal: lastGoalMem?.value || lastConv?.title || null,
    greetingContext: lastGoalMem?.value
      ? `User was previously working on: "${lastGoalMem.value}". Offer to continue or start something new.`
      : lastConv?.title
        ? `User's last conversation was about: "${lastConv.title}". Ask if they'd like to continue or explore something else.`
        : `Returning user with no specific last goal. Greet warmly and offer options.`,
  };
}

// =====================================================================
// Main handler
// =====================================================================
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { message, conversationId: incomingConvId, actionCardId, greeting: isGreetingRequest } = await req.json();
    if (!message && !isGreetingRequest) return jsonRes({ error: "message is required" }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return jsonRes({ error: "AI gateway not configured" }, 500);

    const authHeader = req.headers.get("authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const sbUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await sbUser.auth.getUser();
    if (authErr || !user) return jsonRes({ error: "Unauthorized" }, 401);

    const sb = createClient(supabaseUrl, supabaseServiceKey);

    // Handle greeting request — get session context and generate Pi's opening
    if (isGreetingRequest) {
      const userId = user.id;
      const greeting = await getSessionGreeting(userId, sb);

      // Fetch and consume pending pi_triggers
      const { data: pendingTriggers } = await sb
        .from("pi_triggers")
        .select("id, trigger_type, trigger_data")
        .eq("user_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(5);

      let triggerContext = "";
      if (pendingTriggers?.length) {
        // Mark triggers as delivered
        const triggerIds = pendingTriggers.map((t: any) => t.id);
        await sb
          .from("pi_triggers")
          .update({ status: "delivered", delivered_at: new Date().toISOString() })
          .in("id", triggerIds);

        triggerContext = `\n\n## PENDING NOTIFICATIONS\nThe following events need the user's attention:\n${JSON.stringify(pendingTriggers.map((t: any) => ({ type: t.trigger_type, ...t.trigger_data })))}\nAddress the most important trigger naturally in your greeting.`;
      }

      // Create a new conversation for the greeting
      const { data: conv } = await sb
        .from("pi_conversations")
        .insert({ user_id: userId, title: "Session greeting", is_active: true })
        .select("id")
        .single();
      if (!conv) return jsonRes({ error: "Failed to create conversation" }, 500);

      const { contextBlock, profile } = await assembleContext(userId, sb, null);

      let systemPrompt = BASE_SYSTEM_PROMPT;
      if (profile?.current_path && PATH_PROMPTS[profile.current_path]) {
        systemPrompt += PATH_PROMPTS[profile.current_path](profile.path_step || 1);
      }

      systemPrompt += `\n\n## SESSION GREETING CONTEXT\n${greeting.greetingContext}${triggerContext}\n\nGenerate a warm, proactive opening message. Do NOT wait for the user to speak first. Greet them and suggest what to do next based on the context above.`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt + `\n\n[USER CONTEXT]\n${contextBlock}` },
            { role: "user", content: "SESSION_START" },
          ],
          tools: TOOLS,
          temperature: 0.7,
          max_tokens: 1500,
        }),
      });

      if (!aiResponse.ok) {
        return jsonRes({ error: "AI service error" }, 500);
      }

      const aiData = await aiResponse.json();
      let choice = aiData.choices?.[0];

      // Process tool calls
      const actions: any[] = [];
      if (choice?.message?.tool_calls?.length) {
        const toolResults: any[] = [];
        for (const tc of choice.message.tool_calls) {
          const toolName = tc.function.name;
          let toolParams: any = {};
          try { toolParams = JSON.parse(tc.function.arguments || "{}"); } catch {}
          const result = await executeToolCall(toolName, toolParams, userId, sb);
          toolResults.push({ tool: toolName, result });
          if (result?.action) actions.push(result);
        }

        const toolMessages = [
          { role: "system", content: systemPrompt + `\n\n[USER CONTEXT]\n${contextBlock}` },
          { role: "user", content: "SESSION_START" },
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
          body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: toolMessages, temperature: 0.7, max_tokens: 1500 }),
        });
        if (finalResponse.ok) {
          const fd = await finalResponse.json();
          choice = fd.choices?.[0];
        }
      }

      let responseText = choice?.message?.content || "Welcome! How can I help you today?";
      let actionCards: any[] = [];
      let nextPrompt: string | null = null;

      try {
        const cleaned = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(cleaned);
        responseText = parsed.message || responseText;
        actionCards = parsed.action_cards || parsed.suggestedActions || [];
        nextPrompt = parsed.nextPrompt || null;
      } catch {}

      // Save greeting as Pi message
      const normalizedCards = actionCards.map((c: any) => ({
        title: c.title,
        subtitle: c.subtitle,
        description: c.description,
        buttonLabel: c.button_label || c.buttonLabel || "Do this",
        effortMinutes: c.estimated_minutes || c.effortMinutes,
        xpReward: c.xp_reward || c.xpReward || 0,
        trustReward: c.trust_reward || c.trustReward || 0,
        priority: c.priority || "secondary",
        status: c.status || "ready",
        unlockCondition: c.unlock_condition || c.unlockCondition,
        toolCall: c.tool_call || c.toolCall,
        toolParams: c.tool_params || c.toolParams,
      }));

      await sb.from("pi_messages").insert({
        conversation_id: conv.id,
        role: "pi",
        content: responseText,
        metadata: {
          suggestedActions: normalizedCards.length > 0 ? normalizedCards : undefined,
          greetingType: greeting.type,
        },
      });

      // Save action cards to DB
      if (actionCards.length > 0) {
        const cardRows = actionCards.map((c: any, i: number) => ({
          conversation_id: conv.id,
          user_id: userId,
          type: c.type || "instant",
          title: c.title,
          subtitle: c.subtitle || null,
          description: c.description || null,
          status: c.status || "ready",
          button_label: c.button_label || c.buttonLabel || "Do this",
          tool_call: c.tool_call || c.toolCall || null,
          tool_params: c.tool_params || c.toolParams || null,
          xp_reward: c.xp_reward || c.xpReward || 0,
          trust_reward: c.trust_reward || c.trustReward || 0,
          estimated_minutes: c.estimated_minutes || c.effortMinutes || null,
          unlock_condition: c.unlock_condition || c.unlockCondition || null,
          priority: c.priority || "secondary",
          sort_order: i,
        }));
        await sb.from("action_cards").insert(cardRows);
      }

      return jsonRes({
        message: responseText,
        conversationId: conv.id,
        suggestedActions: normalizedCards,
        actions,
        nextPrompt,
        greetingType: greeting.type,
        pathInfo: profile?.current_path
          ? { path: profile.current_path, step: profile.path_step || 1, totalSteps: 6 }
          : null,
      });
    }
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
    const { contextBlock, history, profile } = await assembleContext(userId, sb, conversationId);

    // Build system prompt with path overlay
    let systemPrompt = BASE_SYSTEM_PROMPT;
    if (profile?.current_path && PATH_PROMPTS[profile.current_path]) {
      systemPrompt += PATH_PROMPTS[profile.current_path](profile.path_step || 1);
    }

    // Build messages for AI
    const aiMessages = [
      { role: "system", content: systemPrompt + `\n\n[USER CONTEXT]\n${contextBlock}` },
      ...history.slice(-18),
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
      if (aiResponse.status === 429) return jsonRes({ error: "Rate limit exceeded. Please try again shortly." }, 429);
      if (aiResponse.status === 402) return jsonRes({ error: "AI credits exhausted. Please top up." }, 402);
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

        await sb.from("pi_tool_logs").insert({
          conversation_id: conversationId,
          tool_name: toolName,
          params: toolParams,
          result,
        });

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

    // Parse the response
    let responseText = choice?.message?.content || "I'm here. What would you like to explore?";
    let actionCards: any[] = [];
    let scene: any = null;
    let memoryOps: any[] = [];
    let nextPrompt: string | null = null;
    let emotion: string | null = null;

    try {
      const cleaned = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      responseText = parsed.message || responseText;
      // Support both old "suggestedActions" and new "action_cards" keys
      actionCards = parsed.action_cards || parsed.suggestedActions || [];
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

    // Save action cards to DB
    if (actionCards.length > 0) {
      const cardRows = actionCards.map((c: any, i: number) => ({
        conversation_id: conversationId,
        user_id: userId,
        type: c.type || "instant",
        title: c.title,
        subtitle: c.subtitle || null,
        description: c.description || null,
        status: c.status || "ready",
        button_label: c.button_label || c.buttonLabel || "Do this",
        tool_call: c.tool_call || c.toolCall || null,
        tool_params: c.tool_params || c.toolParams || null,
        xp_reward: c.xp_reward || c.xpReward || 0,
        trust_reward: c.trust_reward || c.trustReward || 0,
        estimated_minutes: c.estimated_minutes || c.effortMinutes || null,
        unlock_condition: c.unlock_condition || c.unlockCondition || null,
        priority: c.priority || "secondary",
        sort_order: i,
      }));
      await sb.from("action_cards").insert(cardRows);
    }

    // Normalize action cards for frontend (support both naming conventions)
    const normalizedCards = actionCards.map((c: any) => ({
      title: c.title,
      subtitle: c.subtitle,
      description: c.description,
      buttonLabel: c.button_label || c.buttonLabel || "Do this",
      effortMinutes: c.estimated_minutes || c.effortMinutes,
      xpReward: c.xp_reward || c.xpReward || 0,
      trustReward: c.trust_reward || c.trustReward || 0,
      priority: c.priority || "secondary",
      status: c.status || "ready",
      unlockCondition: c.unlock_condition || c.unlockCondition,
      toolCall: c.tool_call || c.toolCall,
      toolParams: c.tool_params || c.toolParams,
    }));

    // Save Pi's response
    await sb.from("pi_messages").insert({
      conversation_id: conversationId,
      role: "pi",
      content: responseText,
      metadata: {
        suggestedActions: normalizedCards.length > 0 ? normalizedCards : undefined,
        scene,
        emotion,
        toolCalls: toolResults.length > 0 ? toolResults : undefined,
      },
    });

    // Update conversation
    await sb.from("pi_conversations").update({
      updated_at: new Date().toISOString(),
      title: message.slice(0, 60),
    }).eq("id", conversationId);

    return jsonRes({
      message: responseText,
      conversationId,
      suggestedActions: normalizedCards,
      actions,
      scene,
      nextPrompt,
      emotion,
      pathInfo: profile?.current_path
        ? { path: profile.current_path, step: profile.path_step || 1, totalSteps: 6 }
        : null,
    });
  } catch (e: any) {
    console.error("pi-cognitive error:", e);
    return jsonRes({ error: e.message || "Internal error" }, 500);
  }
});
