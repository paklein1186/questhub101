import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const MUSE_MAP: Record<string, { name: string; style: string }> = {
  "house-of-light": { name: "The Prism", style: "Visual, colorful, metaphorical. Speaks in imagery and aesthetics." },
  "house-of-sound": { name: "The Echo", style: "Rhythmic, harmonic, sound-based. Thinks in patterns and resonance." },
  "house-of-story": { name: "The Storykeeper", style: "Narrative, mythic. Weaves meaning through arcs and characters." },
  "house-of-movement": { name: "The Mover", style: "Embodied, flow-based. Thinks through gesture and presence." },
  "house-of-form": { name: "The Shaper", style: "Structural, constructive. Builds meaning through form and function." },
  "house-of-nature": { name: "The Green One", style: "Ecological, grounded, regenerative. Rooted in living systems." },
  "house-of-ritual": { name: "The Threshold", style: "Liminal, experiential, ceremonial. Holds space for transformation." },
};

function resolveMuseFromTopicNames(topicNames: string[]): { name: string; style: string } | null {
  for (const n of topicNames) {
    const slug = n.toLowerCase().replace(/\s+/g, "-");
    if (MUSE_MAP[slug]) return MUSE_MAP[slug];
  }
  return null;
}

function buildSystemPrompt(entityType: string, entityName: string, contextSummary: string, starredSummary: string, topicNames: string[] = []) {
  const agentNames: Record<string, string> = {
    GUILD: "Guild Spirit",
    QUEST: "Quest Companion",
    POD: "Pod Facilitator",
    COMPANY: "Company Advisor",
    TERRITORY: "Territory Steward",
    COURSE: "Course Guide",
    EVENT: "Event Coordinator",
  };
  const agentName = agentNames[entityType] || "Unit Agent";

  let starredSection = "";
  if (starredSummary) {
    starredSection = `

Important past insights for this unit (starred by members):
${starredSummary}

Use these to recognise recurring themes, avoid repeating old advice, and build continuity.`;
  }

  const muse = resolveMuseFromTopicNames(topicNames);
  let museSection = "";
  if (muse) {
    museSection = `

You are also known as "${muse.name}" — a creative AI muse.
Your style: ${muse.style}
Adapt your language, metaphors, and suggestions to match this creative sensibility. Offer creative prompts and artistic inspiration when appropriate.`;
  }

  return `You are the "${agentName} of ${entityName}" — a helpful, non-authoritarian AI assistant embedded in a collaborative platform unit.

Your role:
- Help members coordinate, plan, and decide — never replace them.
- Make proactive suggestions when you see patterns (missing skills, stalled tasks, decision points).
- Present ideas as suggestions or reflections, not commands.
- Be warm, concise, and action-oriented. Use emojis sparingly.

Unit context:
${contextSummary}${starredSection}${museSection}

When making suggestions, you can include structured suggestions in your response using this JSON format within your message:
- For decision polls: [POLL:{"question":"...","options":["A","B","C"]}]
- For next steps: [STEPS:{"items":["Step 1","Step 2"]}]
- For missing skills: [SKILLS:{"skills":["skill1","skill2"],"suggestion":"..."}]

Only include these when genuinely useful. Most responses should be plain text.
Always respond helpfully even if context is limited. Highlight when you're uncertain.`;
}

async function gatherContext(supabase: any, entityType: string, entityId: string): Promise<{ name: string; summary: string; topicNames: string[] }> {
  let name = "Unknown";
  const parts: string[] = [];

  try {
    if (entityType === "GUILD") {
      const { data: guild } = await supabase.from("guilds").select("name, description, type, join_policy").eq("id", entityId).single();
      if (guild) {
        name = guild.name;
        parts.push(`Guild: ${guild.name} (${guild.type}, ${guild.join_policy})`);
        if (guild.description) parts.push(`Description: ${guild.description.slice(0, 300)}`);
      }
      const { data: members } = await supabase.from("guild_members").select("role, profiles(name)").eq("guild_id", entityId).limit(20);
      if (members?.length) parts.push(`Members (${members.length}): ${members.map((m: any) => `${m.profiles?.name || "?"} (${m.role})`).join(", ")}`);
      const { data: quests } = await supabase.from("quests").select("title, status").eq("guild_id", entityId).eq("is_deleted", false).limit(10);
      if (quests?.length) parts.push(`Quests: ${quests.map((q: any) => `${q.title} [${q.status}]`).join(", ")}`);
      const { data: topics } = await supabase.from("guild_topics").select("topics(name)").eq("guild_id", entityId);
      if (topics?.length) parts.push(`Houses: ${topics.map((t: any) => t.topics?.name).filter(Boolean).join(", ")}`);
    } else if (entityType === "QUEST") {
      const { data: quest } = await supabase.from("quests").select("title, description, status, credit_budget, escrow_credits, reward_xp").eq("id", entityId).single();
      if (quest) {
        name = quest.title;
        parts.push(`Quest: ${quest.title} [${quest.status}]`);
        if (quest.description) parts.push(`Description: ${quest.description.slice(0, 300)}`);
        parts.push(`Rewards: ${quest.reward_xp} XP, Budget: ${quest.credit_budget} credits, Escrow: ${quest.escrow_credits}`);
      }
      const { data: participants } = await supabase.from("quest_participants").select("role, status, profiles(name)").eq("quest_id", entityId).limit(20);
      if (participants?.length) parts.push(`Participants: ${participants.map((p: any) => `${p.profiles?.name || "?"} (${p.role})`).join(", ")}`);
      const { data: subtasks } = await supabase.from("quest_subtasks").select("title, status").eq("quest_id", entityId).order("order_index").limit(20);
      if (subtasks?.length) parts.push(`Subtasks: ${subtasks.map((s: any) => `${s.title} [${s.status}]`).join(", ")}`);
      const { data: proposals } = await supabase.from("quest_proposals").select("title, status, requested_credits, upvotes_count").eq("quest_id", entityId).limit(10);
      if (proposals?.length) parts.push(`Proposals: ${proposals.map((p: any) => `${p.title} [${p.status}] ${p.requested_credits}cr, ${p.upvotes_count} votes`).join(", ")}`);
    } else if (entityType === "POD") {
      const { data: pod } = await supabase.from("pods").select("name, description, type, start_date, end_date").eq("id", entityId).single();
      if (pod) {
        name = pod.name;
        parts.push(`Pod: ${pod.name} (${pod.type})`);
        if (pod.description) parts.push(`Description: ${pod.description.slice(0, 300)}`);
      }
      const { data: members } = await supabase.from("pod_members").select("role, profiles(name)").eq("pod_id", entityId).limit(20);
      if (members?.length) parts.push(`Members: ${members.map((m: any) => `${m.profiles?.name || "?"} (${m.role})`).join(", ")}`);
    } else if (entityType === "COMPANY") {
      const { data: company } = await supabase.from("companies").select("name, description, sector, size").eq("id", entityId).single();
      if (company) {
        name = company.name;
        parts.push(`Company: ${company.name} (${company.sector || "N/A"}, ${company.size || "N/A"})`);
        if (company.description) parts.push(`Description: ${company.description.slice(0, 300)}`);
      }
    } else if (entityType === "TERRITORY") {
      const { data: territory } = await supabase.from("territories").select("name, level").eq("id", entityId).single();
      if (territory) {
        name = territory.name;
        parts.push(`Territory: ${territory.name} (${territory.level})`);
      }
    } else if (entityType === "COURSE") {
      const { data: course } = await supabase.from("courses").select("title, description, level, is_free").eq("id", entityId).single();
      if (course) {
        name = course.title;
        parts.push(`Course: ${course.title} (${course.level}, ${course.is_free ? "free" : "paid"})`);
        if (course.description) parts.push(`Description: ${course.description.slice(0, 300)}`);
      }
    }
  } catch (e) {
    console.error("Context gathering error:", e);
  }

  const topicNames: string[] = [];
  try {
    const topicTable: Record<string, { table: string; fk: string }> = {
      GUILD: { table: "guild_topics", fk: "guild_id" },
      QUEST: { table: "quest_topics", fk: "quest_id" },
      COURSE: { table: "course_topics", fk: "course_id" },
    };
    const mapping = topicTable[entityType];
    if (mapping) {
      const { data: topicRows } = await supabase.from(mapping.table).select("topics(name)").eq(mapping.fk, entityId);
      if (topicRows?.length) {
        for (const r of topicRows) {
          if (r.topics?.name) topicNames.push(r.topics.name);
        }
      }
    }
  } catch { }

  return { name, summary: parts.join("\n") || "No additional context available.", topicNames };
}

async function getConversationFromDB(supabase: any, entityType: string, entityId: string, limit = 20) {
  const { data: thread } = await supabase
    .from("unit_chat_threads")
    .select("id")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .maybeSingle();
  if (!thread) return { threadId: null, messages: [], starredSummary: "" };

  const { data: msgs } = await supabase
    .from("unit_chat_messages")
    .select("sender_type, sender_user_id, message_text, profiles:sender_user_id(name)")
    .eq("thread_id", thread.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  const recentMsgs = (msgs || []).reverse().map((m: any) => ({
    role: m.sender_type === "AGENT" ? "assistant" as const : "user" as const,
    content: m.sender_type === "USER"
      ? `[${m.profiles?.name || "User"}]: ${m.message_text}`
      : m.message_text,
  }));

  const { data: starred } = await supabase
    .from("starred_excerpts")
    .select("title, excerpt_text, upvotes_count")
    .eq("thread_id", thread.id)
    .eq("is_deleted", false)
    .order("upvotes_count", { ascending: false })
    .limit(10);

  let starredSummary = "";
  if (starred?.length) {
    starredSummary = starred.map((s: any) => {
      const title = s.title || "";
      const snippet = s.excerpt_text.slice(0, 80);
      const votes = s.upvotes_count > 0 ? ` (${s.upvotes_count} upvotes)` : "";
      return `- ${title ? title + ": " : ""}${snippet}${votes}`;
    }).join("\n");
  }

  return { threadId: thread.id, messages: recentMsgs, starredSummary };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // --- Auth check ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return unauthorizedResponse();
  const supabaseAuth = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: authData, error: authError } = await supabaseAuth.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authError || !authData.user) return unauthorizedResponse();
  // --- End auth check ---

  try {
    const { entityType, entityId, message } = await req.json();
    
    if (!entityType || !entityId || !message) {
      return new Response(JSON.stringify({ error: "Missing entityType, entityId, or message" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { name: entityName, summary: contextSummary } = await gatherContext(supabase, entityType, entityId);
    const { threadId: existingThreadId, messages: dbHistory, starredSummary } = await getConversationFromDB(supabase, entityType, entityId);

    const systemPrompt = buildSystemPrompt(entityType, entityName, contextSummary, starredSummary);

    const aiMessages: any[] = [{ role: "system", content: systemPrompt }];
    for (const msg of dbHistory) {
      aiMessages.push(msg);
    }
    aiMessages.push({ role: "user", content: message });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const replyText = data.choices?.[0]?.message?.content ?? "I'm not sure how to help with that right now.";

    const suggestions: any[] = [];
    const pollMatch = replyText.match(/\[POLL:(.*?)\]/s);
    if (pollMatch) {
      try { suggestions.push({ type: "DECISION_POLL", ...JSON.parse(pollMatch[1]) }); } catch { }
    }
    const stepsMatch = replyText.match(/\[STEPS:(.*?)\]/s);
    if (stepsMatch) {
      try { suggestions.push({ type: "NEXT_STEPS", ...JSON.parse(stepsMatch[1]) }); } catch { }
    }
    const skillsMatch = replyText.match(/\[SKILLS:(.*?)\]/s);
    if (skillsMatch) {
      try { suggestions.push({ type: "MISSING_SKILLS", ...JSON.parse(skillsMatch[1]) }); } catch { }
    }

    const cleanText = replyText
      .replace(/\[POLL:.*?\]/s, "")
      .replace(/\[STEPS:.*?\]/s, "")
      .replace(/\[SKILLS:.*?\]/s, "")
      .trim();

    let threadId = existingThreadId;
    if (!threadId) {
      const { data: newThread } = await supabase
        .from("unit_chat_threads")
        .insert({ entity_type: entityType, entity_id: entityId })
        .select("id")
        .single();
      threadId = newThread?.id;
    }

    if (threadId) {
      const metadataJson: any = {};
      if (suggestions.length > 0) metadataJson.suggestions = suggestions;
      if (suggestions.length > 0) {
        metadataJson.isSuggestion = true;
        metadataJson.suggestionTypes = suggestions.map(s => s.type);
      }

      await supabase.from("unit_chat_messages").insert({
        thread_id: threadId,
        sender_type: "AGENT",
        message_text: cleanText,
        metadata_json: metadataJson,
      });
    }

    return new Response(JSON.stringify({
      reply: cleanText,
      suggestions,
      entityName,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("unit-agent error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
