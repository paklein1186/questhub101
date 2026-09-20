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
  // ── Quest context tools (operate on the quest the user is viewing) ──
  {
    type: "function",
    function: {
      name: "list_quest_members",
      description: "List participants and hosts of a quest with their roles and statuses.",
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
      name: "list_quest_discussions",
      description: "Return the most recent feed posts (discussions) attached to a quest.",
      parameters: {
        type: "object",
        properties: {
          quest_id: { type: "string" },
          limit: { type: "number", description: "Max posts (default 10)" },
        },
        required: ["quest_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_quest_files",
      description: "List files and links attached to recent posts of a quest.",
      parameters: {
        type: "object",
        properties: {
          quest_id: { type: "string" },
          limit: { type: "number", description: "Max files (default 20)" },
        },
        required: ["quest_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "summarize_quest_progress",
      description: "Return a structured snapshot of quest progress: subtasks, members, recent activity.",
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
      name: "search_site",
      description: "Search across the whole platform — quests, guilds, territories, services, courses and published AI agents — not just the entity currently being viewed. Use this when the user asks a broad 'where can I find...' / 'is there anything about...' question rather than a single-entity lookup.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search keywords" },
          limit: { type: "number", description: "Max results per entity type (default 5)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_web",
      description: "Search the open web for information not available on the platform (news, definitions, external organizations, general knowledge). Returns a short instant-answer summary and related links, not a full page fetch.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Web search query" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_my_active_agents",
      description: "List the AI agents currently active (attached) in the user's guilds, quests and pods. Use this to know what specialized help is already available to the user before answering yourself, or to point them to the right agent.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "consult_agent",
      description: "Ask one of the user's active agents a question and get its answer, so you can relay it instead of answering yourself. Give the agent's NAME (e.g. \"Space2\") — you do not need ids; the current page's space is used when the agent is available there. Write the question so it stands alone (the agent does not see this conversation).",
      parameters: {
        type: "object",
        properties: {
          agent_name: { type: "string", description: "Name (or part of the name) of the agent, e.g. Space2" },
          question: { type: "string", description: "Self-contained question to ask the agent" },
          deep: { type: "boolean", description: "true ONLY when the user explicitly asks for an in-depth, thorough analysis: the agent then uses a bigger model and costs more credits. Default: false." },
          agent_id: { type: "string", description: "Optional, from list_my_active_agents" },
          unit_type: { type: "string", enum: ["guild", "pod", "quest"], description: "Optional, from list_my_active_agents" },
          unit_id: { type: "string", description: "Optional, from list_my_active_agents" },
        },
        required: ["question"],
      },
    },
  },
];

// =====================================================================
// Tool execution
// =====================================================================
/** Agents active in the guilds, pods and quests the user belongs to. */
async function listActiveAgents(sb: any, userId: string) {
  const [guildMemberships, podMemberships, questMemberships] = await Promise.all([
    sb.from("guild_members").select("guild_id, guilds(id, name)").eq("user_id", userId),
    sb.from("pod_members").select("pod_id, pods(id, name)").eq("user_id", userId),
    sb.from("quest_participants").select("quest_id, quests(id, title)").eq("user_id", userId),
  ]);

  const units: { unit_type: string; unit_id: string; unit_name: string }[] = [
    ...((guildMemberships.data || []) as any[]).filter((m) => m.guilds).map((m) => ({ unit_type: "guild", unit_id: m.guild_id, unit_name: m.guilds.name })),
    ...((podMemberships.data || []) as any[]).filter((m) => m.pods).map((m) => ({ unit_type: "pod", unit_id: m.pod_id, unit_name: m.pods.name })),
    ...((questMemberships.data || []) as any[]).filter((m) => m.quests).map((m) => ({ unit_type: "quest", unit_id: m.quest_id, unit_name: m.quests.title })),
  ];
  if (units.length === 0) return [];

  const byType: Record<string, string[]> = {};
  for (const u of units) (byType[u.unit_type] ??= []).push(u.unit_id);

  const results = await Promise.all(
    Object.entries(byType).map(([unitType, unitIds]) =>
      sb.from("unit_agents").select("agent_id, unit_type, unit_id, agents(id, name, description, category)")
        .eq("unit_type", unitType).in("unit_id", unitIds).eq("is_active", true)
    )
  );
  const unitNameByKey = new Map(units.map((u) => [`${u.unit_type}:${u.unit_id}`, u.unit_name]));

  return results.flatMap((r: any) => (r.data || []) as any[]).map((ua: any) => ({
    agent_id: ua.agent_id,
    agent_name: ua.agents?.name as string | undefined,
    description: ua.agents?.description,
    category: ua.agents?.category,
    unit_type: ua.unit_type as string,
    unit_id: ua.unit_id as string,
    unit_name: unitNameByKey.get(`${ua.unit_type}:${ua.unit_id}`) || null,
  }));
}

const normAgentName = (v: string) => v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

async function executeToolCall(
  toolName: string,
  params: any,
  userId: string,
  sb: any,
  authHeader?: string,
  pageCtx?: { type?: string; id?: string; language?: string }
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
      const limit = params.limit || 8;
      const q = (params.query || "").trim();

      // Build candidate id set from territory filter
      let territoryIds: string[] | null = null;
      if (params.territory_id) {
        const { data: qtIds } = await sb
          .from("quest_territories")
          .select("quest_id")
          .eq("territory_id", params.territory_id);
        territoryIds = (qtIds || []).map((x: any) => x.quest_id);
        if (territoryIds.length === 0) return [];
      }

      // Build candidate id set from topic match (name or slug fuzzy match)
      let topicQuestIds: string[] = [];
      if (q) {
        const { data: matchingTopics } = await sb
          .from("topics")
          .select("id")
          .or(`name.ilike.%${q}%,slug.ilike.%${q}%`)
          .eq("is_deleted", false);
        if (matchingTopics?.length) {
          const { data: qt } = await sb
            .from("quest_topics")
            .select("quest_id")
            .in("topic_id", matchingTopics.map((t: any) => t.id));
          topicQuestIds = (qt || []).map((x: any) => x.quest_id);
        }
      }

      let query = sb
        .from("quests")
        .select("id, title, description, status, quest_nature, difficulty, xp_reward")
        .eq("is_deleted", false)
        .eq("is_draft", false)
        .limit(limit);
      if (territoryIds) query = query.in("id", territoryIds);
      if (params.status) query = query.eq("status", params.status);
      if (q) {
        // Match title OR description OR topic-based ids
        const orClauses = [`title.ilike.%${q}%`, `description.ilike.%${q}%`];
        if (topicQuestIds.length) orClauses.push(`id.in.(${topicQuestIds.join(",")})`);
        query = query.or(orClauses.join(","));
      }
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
      const q = (params.query || "").trim();
      let topicGuildIds: string[] = [];
      if (q) {
        const { data: matchingTopics } = await sb
          .from("topics")
          .select("id")
          .or(`name.ilike.%${q}%,slug.ilike.%${q}%`)
          .eq("is_deleted", false);
        if (matchingTopics?.length) {
          const { data: gt } = await sb
            .from("guild_topics")
            .select("guild_id")
            .in("topic_id", matchingTopics.map((t: any) => t.id));
          topicGuildIds = (gt || []).map((x: any) => x.guild_id);
        }
      }
      let query = sb
        .from("guilds")
        .select("id, name, description, member_count, guild_type")
        .eq("is_deleted", false)
        .limit(params.limit || 8);
      if (q) {
        const orClauses = [`name.ilike.%${q}%`, `description.ilike.%${q}%`];
        if (topicGuildIds.length) orClauses.push(`id.in.(${topicGuildIds.join(",")})`);
        query = query.or(orClauses.join(","));
      }
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
        .select("id, title, description, quest_nature, difficulty, xp_reward")
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

    case "list_quest_members": {
      const qid = params.quest_id;
      if (!qid) return { error: "quest_id required" };
      const [partsR, hostsR] = await Promise.all([
        sb.from("quest_participants")
          .select("user_id, role, status")
          .eq("quest_id", qid).limit(100),
        sb.from("quest_hosts")
          .select("entity_type, entity_id, role").eq("quest_id", qid),
      ]);
      await hydrateProfiles(sb, partsR.data as any[], "user_id");
      return {
        participants: (partsR.data || []).map((p: any) => ({
          user_id: p.user_id, role: p.role, status: p.status, name: p.profiles?.name,
        })),
        hosts: hostsR.data || [],
      };
    }

    case "list_quest_discussions": {
      const qid = params.quest_id;
      if (!qid) return { error: "quest_id required" };
      const limit = Math.min(params.limit || 10, 30);
      const { data } = await sb.from("feed_posts")
        .select("id, author_user_id, content, created_at, upvote_count")
        .eq("context_type", "QUEST").eq("context_id", qid)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false }).limit(limit);
      await hydrateProfiles(sb, data as any[], "author_user_id");
      return (data || []).map((p: any) => ({
        id: p.id, author: p.profiles?.name, created_at: p.created_at,
        upvotes: p.upvote_count, content: (p.content || "").slice(0, 600),
      }));
    }

    case "list_quest_files": {
      const qid = params.quest_id;
      if (!qid) return { error: "quest_id required" };
      const limit = Math.min(params.limit || 20, 50);
      const results: any[] = [];

      // 1) Files/links attached directly to the quest (Resources / Files tab)
      const { data: unitAtts, error: unitErr } = await sb.from("attachments")
        .select("id, title, file_name, file_url, mime_type, target_type, target_id, created_at")
        .eq("target_id", qid)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (unitErr) console.error("[pi] attachments error:", unitErr.message);
      for (const a of unitAtts || []) {
        results.push({
          source: "quest_resources",
          name: a.title || a.file_name || "file",
          url: a.file_url,
          mime_type: a.mime_type,
          created_at: a.created_at,
        });
      }

      // 2) Files attached to quest discussion posts
      const { data: posts } = await sb.from("feed_posts")
        .select("id").eq("context_type", "QUEST").eq("context_id", qid)
        .eq("is_deleted", false).order("created_at", { ascending: false }).limit(50);
      const ids = (posts || []).map((p: any) => p.id);
      if (ids.length) {
        const { data: postAtts } = await sb.from("post_attachments")
          .select("post_id, type, url, file_name, mime_type, created_at")
          .in("post_id", ids).limit(limit);
        for (const a of postAtts || []) {
          results.push({
            source: "discussion",
            name: a.file_name || a.type || "file",
            url: a.url,
            mime_type: a.mime_type,
            created_at: a.created_at,
          });
        }
      }

      return results.slice(0, limit);
    }

    case "summarize_quest_progress": {
      const qid = params.quest_id;
      if (!qid) return { error: "quest_id required" };
      const [questR, subsR, partsR, postsR] = await Promise.all([
        sb.from("quests").select("id, title, status, deadline, description").eq("id", qid).maybeSingle(),
        sb.from("quest_subtasks").select("id, title, status, assignee_user_id, due_date").eq("quest_id", qid).order("order_index"),
        sb.from("quest_participants").select("user_id, status").eq("quest_id", qid),
        sb.from("feed_posts").select("id, created_at").eq("context_type", "QUEST").eq("context_id", qid).eq("is_deleted", false).order("created_at", { ascending: false }).limit(1),
      ]);
      const subs = (subsR.data || []) as any[];
      const parts = (partsR.data || []) as any[];
      return {
        quest: questR.data,
        subtasks: { total: subs.length, done: subs.filter(s => (s.status || "").toUpperCase() === "DONE").length, items: subs },
        members: { total: parts.length, active: parts.filter(p => (p.status || "").toLowerCase() === "active").length },
        last_discussion_at: postsR.data?.[0]?.created_at || null,
      };
    }

    case "search_site": {
      const q = (params.query || "").trim();
      if (!q) return { error: "query required" };
      const limit = params.limit || 5;
      const like = `%${q}%`;

      const [quests, guilds, territories, services, courses, agents] = await Promise.all([
        sb.from("quests").select("id, title, description")
          .eq("is_deleted", false).eq("is_draft", false)
          .or(`title.ilike.${like},description.ilike.${like}`).limit(limit),
        sb.from("guilds").select("id, name, description")
          .eq("is_deleted", false)
          .or(`name.ilike.${like},description.ilike.${like}`).limit(limit),
        sb.from("territories").select("id, name")
          .ilike("name", like).limit(limit),
        sb.from("services").select("id, title, description")
          .eq("is_deleted", false)
          .or(`title.ilike.${like},description.ilike.${like}`).limit(limit),
        sb.from("courses").select("id, title, description")
          .eq("is_deleted", false).eq("is_published", true)
          .or(`title.ilike.${like},description.ilike.${like}`).limit(limit),
        sb.from("agents").select("id, name, description, category, purpose")
          .eq("is_published", true)
          .or(`name.ilike.${like},description.ilike.${like},purpose.ilike.${like}`).limit(limit),
      ]);

      return {
        quests: quests.data || [],
        guilds: guilds.data || [],
        territories: territories.data || [],
        services: services.data || [],
        courses: courses.data || [],
        agents: agents.data || [],
      };
    }

    case "search_web": {
      const q = (params.query || "").trim();
      if (!q) return { error: "query required" };
      try {
        const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`;
        const res = await fetch(url);
        if (!res.ok) return { error: `Web search failed (${res.status})` };
        const data = await res.json();
        const relatedTopics = (data.RelatedTopics || [])
          .filter((t: any) => t.Text)
          .slice(0, 5)
          .map((t: any) => ({ text: t.Text, url: t.FirstURL }));
        return {
          summary: data.AbstractText || null,
          summary_source: data.AbstractURL || null,
          related: relatedTopics,
          note: relatedTopics.length === 0 && !data.AbstractText
            ? "No instant-answer result for this query — this tool covers known entities/topics, not full web search."
            : undefined,
        };
      } catch (e: any) {
        return { error: `Web search error: ${e?.message || e}` };
      }
    }

    case "list_my_active_agents": {
      return await listActiveAgents(sb, userId);
    }

    case "consult_agent": {
      const question = String(params.question ?? "").trim();
      if (!question) return { error: "question is required" };
      if (!authHeader) return { error: "Cannot consult agent: missing auth context" };

      const available = await listActiveAgents(sb, userId);
      const wanted = normAgentName(String(params.agent_name ?? ""));
      let matches = available.filter((a) =>
        params.agent_id ? a.agent_id === params.agent_id && (!params.unit_id || a.unit_id === params.unit_id)
          : wanted ? normAgentName(a.agent_name ?? "").includes(wanted) : false);
      if (!matches.length) {
        return {
          error: "No active agent matches. The agent must be attached to a guild, pod or quest the user belongs to.",
          available_agents: [...new Set(available.map((a) => a.agent_name).filter(Boolean))],
        };
      }
      // Prefer the space the user is looking at, then guild, quest, pod.
      const rank = (a: any) => (pageCtx?.id && pageCtx.id === a.unit_id ? 0 : a.unit_type === "guild" ? 1 : a.unit_type === "quest" ? 2 : 3);
      matches = [...matches].sort((x, y) => rank(x) - rank(y));
      const target = matches[0];

      // On a quest page, ask in the quest's own context when the agent comes from its guild.
      const attempts: { unit_type: string; unit_id: string }[] = [];
      if (pageCtx?.type === "quest" && pageCtx.id && target.unit_type === "guild") {
        const { data: q } = await sb.from("quests").select("guild_id").eq("id", pageCtx.id).maybeSingle();
        if (q?.guild_id === target.unit_id) attempts.push({ unit_type: "quest", unit_id: pageCtx.id });
      }
      attempts.push({ unit_type: target.unit_type, unit_id: target.unit_id });

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      let lastError = "Agent chat failed";
      for (const at of attempts) {
        try {
          const res = await fetch(`${supabaseUrl}/functions/v1/unit-agent-chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: authHeader },
            body: JSON.stringify({ agentId: target.agent_id, unitType: at.unit_type, unitId: at.unit_id, messages: [{ role: "user", content: question }], language: pageCtx?.language, depth: params.deep === true ? "deep" : "fast" }),
            signal: AbortSignal.timeout(65_000),
          });
          const contentType = res.headers.get("content-type") || "";
          if (res.ok && contentType.includes("text/event-stream")) {
            const text = await res.text();
            const content = text.split("\n")
              .filter((l) => l.startsWith("data: ") && !l.includes("[DONE]"))
              .map((l) => { try { return JSON.parse(l.slice(6))?.choices?.[0]?.delta?.content || ""; } catch { return ""; } })
              .join("");
            return { agent: target.agent_name, space: target.unit_name, answer: content || null };
          }
          const data = await res.json().catch(() => ({}));
          if (res.ok) return { agent: target.agent_name, space: target.unit_name, answer: data.content || data.answer || null };
          if (res.status === 402) return { error: "The user does not have enough credits for this agent.", needs_top_up: true, top_up_path: "/me/credit-shop" };
          lastError = data?.error || `Agent chat failed (${res.status})`;
        } catch (e: any) {
          lastError = `Failed to consult agent: ${e?.message || e}`;
        }
      }
      return { error: lastError };
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
// profiles has NO foreign key to other tables, so PostgREST embeds like
// `profiles:user_id(name)` always return null. Hydrate manually via profiles.user_id.
// Removes leftover JSON fragments (stray "}]", "```json" fences, dangling braces)
// that leak into the visible reply when the model mixes prose and JSON.
function sanitizeAiText(text: string): string {
  return (text || "")
    .replace(/```(?:json)?/gi, "")
    .replace(/^\s*[}\])]+[,;]?\s*$/gm, "")
    .replace(/^\s*"?(action_cards|suggestedActions|nextPrompt|memory|scene|emotion)"?\s*:\s*.*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function hydrateProfiles(sb: any, rows: any[] | null, key: string): Promise<any[]> {
  const list = rows || [];
  const ids = Array.from(new Set(list.map((r: any) => r?.[key]).filter(Boolean)));
  if (!ids.length) return list;
  const { data } = await sb.from("profiles").select("user_id,name,avatar_url").in("user_id", ids);
  const map = new Map<string, any>((data || []).map((p: any) => [p.user_id, p]));
  for (const r of list) r.profiles = map.get(r?.[key]) || null;
  return list;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English", fr: "French", es: "Spanish", de: "German", it: "Italian",
  pt: "Portuguese", nl: "Dutch", pl: "Polish", ro: "Romanian", ar: "Arabic",
};
function languageDirective(code?: string | null): string {
  const lang = (code || "en").split("-")[0].toLowerCase();
  const name = LANGUAGE_NAMES[lang] || lang;
  return `

MULTILINGUAL RULES:
- The reader's interface language is ${name} (${lang}). ALWAYS write your answer in ${name}, whatever language the question or the source material is in.
- The activity, discussions, member profiles and uploaded documents you scan may be in other languages. Read them in their original language and translate the relevant parts into ${name} when you quote or summarise them.
- Keep proper nouns, entity names, quest titles, file names and mention tokens of the form @[Name](type:id) verbatim — never translate or alter them.
- If a term has no good equivalent, keep the original and add a short gloss in ${name} in parentheses.`;
}

const ROUTING_PROMPT = `

## AGENTS AND KNOWLEDGE — HOW TO ROUTE A QUESTION
You are the front door to the platform's specialised AI agents, and you can chain several tool calls in a row.
- NEVER say "I have no information" or "I cannot interact with agents" before trying: search_site (it covers guilds, quests, territories, services, courses AND published agents), then list_my_active_agents.
- If the user names an agent (for example "Space2") or asks about a domain an agent covers (for example third places / tiers-lieux, which Space2 knows), call consult_agent with agent_name and a self-contained question, then relay its answer faithfully. Say which agent answered and keep the sources it cites. Relay its answer in full — never shorten, summarise or flatten it unless the user asks; you may add a one-line pointer to a next question. Do not invent anything beyond what it returned.
- If the user asks what an agent is, describe it from search_site (name, description, purpose) and offer to ask it something.
- If consult_agent returns needs_top_up, tell the user they need more credits and link /me/credit-shop. If no agent matches, say which agents are available (available_agents) instead of guessing.
- Follow-ups such as "an agent…" or "yes, that one" refer to the previous messages: resolve them from the conversation before asking the user to repeat.
- Answer in the user's language, keep it concise, and still return the JSON format described above.`;

const BASE_SYSTEM_PROMPT = `You are Pi, the AI assistant of ChangeTheGame — a regenerative ecosystem
platform where humans collaborate to restore territories, build guilds,
complete quests, and create new economic flows.

You are helpful, clear, and concise. You speak in a neutral, professional tone.
You are direct when clarity matters and supportive when needed.
You avoid flowery language, excessive metaphors, and poetic flourishes.
You keep responses focused and practical.

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
        .select("quest_id, status, quests(id, title, status, quest_nature)")
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
    type: q.quests?.quest_nature,
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
    const { message, conversationId: incomingConvId, actionCardId, greeting: isGreetingRequest, contextType, contextId, language } = await req.json();
    console.log("[pi-cognitive] req contextType=", contextType, "contextId=", contextId, "greeting=", isGreetingRequest);
    if (!message && !isGreetingRequest) return jsonRes({ error: "message is required" }, 400);

    // Fetch current-page context (the entity the user is looking at)
    async function buildPageContext(sb: any, ctxType: string | undefined, ctxId: string | undefined): Promise<string> {
      if (!ctxType || !ctxId || ctxType === "global" || ctxType === "onboarding") return "";
      try {
        const tableMap: Record<string, { table: string; nameCol: string; descCol?: string; authorCol?: string }> = {
          quest: { table: "quests", nameCol: "title", descCol: "description", authorCol: "created_by_user_id" },
          guild: { table: "guilds", nameCol: "name", descCol: "description", authorCol: "created_by_user_id" },
          territory: { table: "territories", nameCol: "name", descCol: "description" },
        };
        const cfg = tableMap[ctxType];
        if (!cfg) return "";
        const cols = ["id", cfg.nameCol, cfg.descCol, cfg.authorCol].filter(Boolean).join(",");
        const { data: row, error: rowErr } = await sb.from(cfg.table).select(cols).eq("id", ctxId).maybeSingle();
        console.log("[buildPageContext] ctxType=", ctxType, "ctxId=", ctxId, "row?", !!row, "err=", rowErr?.message);
        if (!row) return "";
        let authorName = "";
        if (cfg.authorCol && (row as any)[cfg.authorCol]) {
          const { data: prof } = await sb.from("profiles").select("name").eq("user_id", (row as any)[cfg.authorCol]).maybeSingle();
          authorName = prof?.name || "";
        }
        const name = (row as any)[cfg.nameCol] || "Unknown";
        const desc = ((row as any)[cfg.descCol] || "").slice(0, 800);

        // ===== Enriched context: members, subtasks, recent posts, files =====
        let enriched = "";
        try {
          if (ctxType === "quest") {
            const [partsR, hostsR, subsR, postsR] = await Promise.all([
              sb.from("quest_participants")
                .select("user_id, role, status")
                .eq("quest_id", ctxId)
                .limit(30),
              sb.from("quest_hosts")
                .select("entity_type, entity_id, role")
                .eq("quest_id", ctxId)
                .limit(10),
              sb.from("quest_subtasks")
                .select("id, title, status, assignee_user_id, due_date, priority")
                .eq("quest_id", ctxId)
                .order("order_index", { ascending: true })
                .limit(20),
              sb.from("feed_posts")
                .select("id, author_user_id, content, created_at, upvote_count")
                .eq("context_type", "QUEST")
                .eq("context_id", ctxId)
                .eq("is_deleted", false)
                .order("created_at", { ascending: false })
                .limit(8),
            ]);

            const parts = await hydrateProfiles(sb, partsR.data as any[], "user_id");
            const subs = (subsR.data || []) as any[];
            const posts = await hydrateProfiles(sb, postsR.data as any[], "author_user_id");
            const hosts = (hostsR.data || []) as any[];
            const activeMembers = parts.filter(p => (p.status || "").toLowerCase() === "active").length;
            const doneSubs = subs.filter(s => (s.status || "").toUpperCase() === "DONE").length;

            let files: any[] = [];
            const { data: questAtts } = await sb.from("attachments")
              .select("id, title, file_name, file_url, mime_type, created_at")
              .eq("target_id", ctxId)
              .order("created_at", { ascending: false })
              .limit(20);
            for (const a of questAtts || []) {
              files.push({ type: "RESOURCE", file_name: a.title || a.file_name, url: a.file_url, mime_type: a.mime_type });
            }
            if (posts.length) {
              const { data: attR } = await sb.from("post_attachments")
                .select("post_id, type, url, file_name, mime_type")
                .in("post_id", posts.map(p => p.id))
                .limit(20);
              files = files.concat(attR || []);
            }

            const memberList = parts.slice(0, 12).map(p =>
              `- ${p.profiles?.name || "Unnamed member"} (${p.role}, ${p.status})`
            ).join("\n") || "- none";
            const hostList = hosts.map(h => `- ${h.entity_type}:${h.entity_id} (${h.role})`).join("\n") || "- none";
            const subList = subs.slice(0, 12).map(s =>
              `- [${s.status}] ${s.title}${s.priority && s.priority !== "NONE" ? ` (${s.priority})` : ""}${s.due_date ? ` — due ${String(s.due_date).slice(0,10)}` : ""}`
            ).join("\n") || "- none";
            const postList = posts.slice(0, 6).map(p => {
              const snippet = (p.content || "").replace(/\s+/g, " ").slice(0, 160);
              return `- ${p.profiles?.name || "Unknown"} (${new Date(p.created_at).toISOString().slice(0,10)}, ⬆${p.upvote_count}): ${snippet}`;
            }).join("\n") || "- none";
            const fileList = files.slice(0, 10).map(f =>
              `- [${f.type}] ${f.file_name || f.url}${f.mime_type ? ` (${f.mime_type})` : ""}`
            ).join("\n") || "- none";

            enriched =
              `\n\n### MEMBERS (${activeMembers}/${parts.length} active)\n${memberList}` +
              `\n\n### HOSTS\n${hostList}` +
              `\n\n### SUBTASKS (${doneSubs}/${subs.length} done)\n${subList}` +
              `\n\n### RECENT DISCUSSIONS (${posts.length})\n${postList}` +
              `\n\n### ATTACHED FILES\n${fileList}`;
          } else if (ctxType === "guild") {
            const [membersR, postsR] = await Promise.all([
              sb.from("guild_members")
                .select("user_id, role, status")
                .eq("guild_id", ctxId)
                .limit(30),
              sb.from("feed_posts")
                .select("id, author_user_id, content, created_at")
                .eq("context_type", "GUILD")
                .eq("context_id", ctxId)
                .eq("is_deleted", false)
                .order("created_at", { ascending: false })
                .limit(6),
            ]);
            const members = await hydrateProfiles(sb, membersR.data as any[], "user_id");
            const posts = await hydrateProfiles(sb, postsR.data as any[], "author_user_id");
            const memberList = members.slice(0, 15).map(m =>
              `- ${m.profiles?.name || "Unnamed member"} (${m.role}, ${m.status})`
            ).join("\n") || "- none";
            const postList = posts.map(p => {
              const snippet = (p.content || "").replace(/\s+/g, " ").slice(0, 160);
              return `- ${p.profiles?.name || "Unknown"} (${new Date(p.created_at).toISOString().slice(0,10)}): ${snippet}`;
            }).join("\n") || "- none";
            enriched =
              `\n\n### MEMBERS (${members.length})\n${memberList}` +
              `\n\n### RECENT DISCUSSIONS\n${postList}`;
          }
        } catch (e) {
          console.error("buildPageContext enrich error", e);
        }

        return `\n\n## CURRENT PAGE CONTEXT (AUTHORITATIVE — OVERRIDES ANY PRIOR DENIAL)\nYou CAN see what page the user is on. The system injects this for every request.\nThe user is RIGHT NOW viewing a ${ctxType} called "${name}" (id: ${ctxId})${authorName ? `\nCreated by: ${authorName}` : ""}${desc ? `\nDescription: ${desc}` : ""}${enriched}\n\nRULES:\n- NEVER say "I cannot see the page" or "I don't know which page you're on". You DO know — it's stated above.\n- When the user asks about members, tasks, discussions, files, or progress of THIS ${ctxType}, answer using the lists above directly.\n- For more detail call list_quest_members / list_quest_discussions / list_quest_files / summarize_quest_progress with quest_id="${ctxId}".\n- If a previous assistant message in history claimed you couldn't see the page, IGNORE it. That was wrong.`;
      } catch (e) {
        console.error("buildPageContext error", e);
        return "";
      }
    }

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

      let systemPrompt = BASE_SYSTEM_PROMPT + languageDirective(language);
      if (profile?.current_path && PATH_PROMPTS[profile.current_path]) {
        systemPrompt += PATH_PROMPTS[profile.current_path](profile.path_step || 1);
      }

      systemPrompt += `\n\n## SESSION GREETING CONTEXT\n${greeting.greetingContext}${triggerContext}\n\nGenerate a warm, proactive opening message. Do NOT wait for the user to speak first. Greet them and suggest what to do next based on the context above.`;

      const pageContext = await buildPageContext(sb, contextType, contextId);
      systemPrompt += pageContext;

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
          const result = await executeToolCall(toolName, toolParams, userId, sb, authHeader);
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
        const cleaned = responseText.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
        let parsed: any = null;
        try {
          parsed = JSON.parse(cleaned);
        } catch {
          const firstBrace = cleaned.indexOf("{");
          const lastBrace = cleaned.lastIndexOf("}");
          if (firstBrace !== -1 && lastBrace > firstBrace) {
            try {
              parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
              const prose = cleaned.slice(0, firstBrace).trim();
              if (prose && !parsed.message) parsed.message = prose;
            } catch { /* ignore */ }
          }
        }
        if (parsed) {
          responseText = parsed.message || responseText;
          actionCards = parsed.action_cards || parsed.suggestedActions || [];
          nextPrompt = parsed.nextPrompt || null;
        }
      } catch {}
      responseText = sanitizeAiText(responseText);

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
    let systemPrompt = BASE_SYSTEM_PROMPT + languageDirective(language);
    if (profile?.current_path && PATH_PROMPTS[profile.current_path]) {
      systemPrompt += PATH_PROMPTS[profile.current_path](profile.path_step || 1);
    }

    const pageContext2 = await buildPageContext(sb, contextType, contextId);
    systemPrompt += pageContext2;
    systemPrompt += ROUTING_PROMPT;
    try {
      // What the user already has at hand, so Pi can point to it without having to look it up first.
      const mine = await listActiveAgents(sb, userId);
      if (mine.length) {
        const lines = mine.slice(0, 12).map((a) => `- ${a.agent_name} — ${a.description || a.category || ""} (in ${a.unit_name ?? a.unit_type})`);
        systemPrompt += `\n\n## THE USER'S ACTIVE AGENTS (already available in their spaces)\n${lines.join("\n")}\nWhen a request matches one of them, offer to ask it (or consult it directly) and suggest one concrete question to try.`;
      }
    } catch (e) {
      console.error("agents brief error", e);
    }

    // Build messages for AI
    const aiMessages = [
      { role: "system", content: systemPrompt + `\n\n[USER CONTEXT]\n${contextBlock}` },
      ...history.slice(-18),
      { role: "user", content: message },
    ];

    // Agentic loop: the model can chain tool calls (search → list agents → consult an agent …).
    const PI_MODEL = "google/gemini-3-flash-preview";
    const MAX_TOOL_ROUNDS = 5;
    const convo: any[] = [...aiMessages];
    const toolResults: any[] = [];
    const actions: any[] = [];
    let choice: any = null;

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      // The last round has no tools, so the model must answer with what it gathered.
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: PI_MODEL,
          messages: convo,
          ...(round < MAX_TOOL_ROUNDS ? { tools: TOOLS } : {}),
          temperature: 0.4,
          max_tokens: 4000,
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
      choice = aiData.choices?.[0];
      const calls = choice?.message?.tool_calls ?? [];
      if (!calls.length) break;

      convo.push(choice.message);
      for (const tc of calls) {
        const toolName = tc.function.name;
        let toolParams: any = {};
        try {
          toolParams = JSON.parse(tc.function.arguments || "{}");
        } catch {}

        const result = await executeToolCall(toolName, toolParams, userId, sb, authHeader, { type: contextType, id: contextId, language });
        toolResults.push({ tool: toolName, result });

        await sb.from("pi_tool_logs").insert({
          conversation_id: conversationId,
          tool_name: toolName,
          params: toolParams,
          result,
        });

        if (result?.action) actions.push(result);
        convo.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result ?? {}).slice(0, 12000) });
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
      const cleaned = responseText.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
      let parsed: any = null;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        // Try to extract an embedded JSON object (model returned prose + JSON)
        const firstBrace = cleaned.indexOf("{");
        const lastBrace = cleaned.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace > firstBrace) {
          const candidate = cleaned.slice(firstBrace, lastBrace + 1);
          try {
            parsed = JSON.parse(candidate);
            const prose = cleaned.slice(0, firstBrace).trim();
            if (prose && !parsed.message) parsed.message = prose;
          } catch { /* leave as plain text */ }
        }
      }
      if (parsed) {
        responseText = parsed.message || responseText;
        actionCards = parsed.action_cards || parsed.suggestedActions || [];
        scene = parsed.scene || null;
        memoryOps = parsed.memory?.store || [];
        nextPrompt = parsed.nextPrompt || null;
        emotion = parsed.emotion || null;
      }
    } catch {
      // Plain text response — that's fine
    }
    responseText = sanitizeAiText(responseText);

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
