import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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

const SYSTEM_PROMPT = `You are the Quest Hub AI Assistant — a friendly, action-oriented guide for a community platform where "Gamechangers" collaborate through Quests, Guilds, Pods, Services, and Courses.

Your job is to understand what the user wants to accomplish and suggest CONCRETE platform actions. Always respond with a short, inspiring message AND a JSON object with suggested actions, recommended items, and an optional microcopy line.

Available action types:
- create_quest: User wants to create a new quest/project
- create_guild: User wants to create a guild/circle/collective
- create_pod: User wants to create a pod/team/ensemble
- create_company: User wants to create/register a company or organization
- create_course: User wants to create a course
- create_event: User wants to create an event in a guild
- create_service: User wants to offer a service or skill session
- create_post: User wants to post on a wall (global, guild, quest, user profile)
- join_quest: User wants to join an existing quest
- submit_proposal: User wants to submit a proposal on a quest
- find_guild: User wants to discover or join a guild
- join_pod: User wants to join an existing pod
- start_course: User wants to learn something via a course
- find_service: User wants to book a service/session
- explore_houses: User wants to browse topics/houses
- explore_territories: User wants to browse territories
- view_profile: User wants to check their profile/stats
- browse_quests: User wants to explore existing quests
- fund_quest: User wants to fund a quest with credits
- attend_event: User wants to find and attend guild events
- view_quest: User wants to view a specific quest
- view_guild: User wants to view a specific guild
- view_event: User wants to view a specific event
- view_service: User wants to view a specific service
- view_course: User wants to view a specific course
- view_user: User wants to view a specific user profile
- add_subtask: User wants to add a subtask to a quest

PLATFORM CONTENT will be provided below. When the user refers to existing content (a quest name, guild name, user name, event, etc.), match it to the provided content and include the entity_id and a route in each action.

ALWAYS respond in this exact JSON format:
{
  "message": "Your friendly, concise response (2-3 sentences max)",
  "microcopy": "One short inspiring phrase (optional)",
  "actions": [
    { "type": "view_quest", "label": "View Quest: Solar Farm", "description": "Open the Solar Farm quest", "route": "/quests/abc-123", "entity_id": "abc-123" }
  ],
  "recommended": {
    "quests": [{ "name": "Solar Farm", "id": "abc-123", "route": "/quests/abc-123" }],
    "guilds": [{ "name": "Green Guild", "id": "def-456", "route": "/guilds/def-456" }],
    "events": [{ "name": "Workshop", "id": "evt-789", "route": "/events/evt-789" }],
    "services": [{ "name": "Coaching", "id": "svc-111", "route": "/services/svc-111" }],
    "courses": [{ "name": "Intro to Impact", "id": "crs-222", "route": "/courses/crs-222" }],
    "users": [{ "name": "Alice", "id": "usr-333", "route": "/users/usr-333" }]
  }
}

Route patterns:
- Quest: /quests/{id}
- Guild: /guilds/{id}
- Pod: /pods/{id}
- Company: /companies/{id}
- Event: /events/{id}
- Service: /services/{id}
- Course: /courses/{id}
- User profile: /users/{id}
- Create quest: /quests/new
- Create guild: /explore?tab=entities&create=guild
- Create pod: /explore?tab=entities&create=pod
- Create company: /create/company-info
- Create course: /courses/new
- Create service: /services/new
- Create event in guild: /guilds/{guild_id} (with note to use Events tab)
- Post on guild wall: /guilds/{guild_id} (with note to use Wall tab)
- Post on quest wall: /quests/{quest_id}
- Post on global feed: /home
- Add subtask to quest: /quests/{quest_id} (with note to use Subtasks section)
- Browse quests: /explore?tab=quests
- Browse guilds: /explore?tab=entities
- Browse services: /explore?tab=services
- Browse courses: /explore?tab=courses
- Calendar: /calendar

Return 2-4 actions maximum. The "recommended" object should contain 0-3 items per category with real IDs and routes when matching content exists. Be warm, brief, and action-oriented. Adapt your language to the user's persona:
- IMPACT: focus on missions, systemic change, regeneration
- CREATIVE: focus on creation, expression, skill sharing
- HYBRID: blend both perspectives`;

async function fetchPlatformContent(supabaseAdmin: any, userId: string) {
  // Fetch recent/relevant content in parallel for context
  const [questsRes, guildsRes, eventsRes, servicesRes, coursesRes, usersRes, userGuildsRes, userQuestsRes] = await Promise.all([
    supabaseAdmin.from("quests").select("id, title, status").eq("is_deleted", false).order("created_at", { ascending: false }).limit(30),
    supabaseAdmin.from("guilds").select("id, name, type").eq("is_deleted", false).eq("is_draft", false).order("created_at", { ascending: false }).limit(30),
    supabaseAdmin.from("guild_events").select("id, title, guild_id, start_at, status").eq("is_cancelled", false).order("start_at", { ascending: false }).limit(20),
    supabaseAdmin.from("services").select("id, title, status").eq("is_deleted", false).eq("is_published", true).order("created_at", { ascending: false }).limit(20),
    supabaseAdmin.from("courses").select("id, title, level").eq("is_deleted", false).eq("is_published", true).order("created_at", { ascending: false }).limit(20),
    supabaseAdmin.from("profiles").select("id, display_name, role").limit(30),
    supabaseAdmin.from("guild_members").select("guild_id, guilds(id, name)").eq("user_id", userId).limit(20),
    supabaseAdmin.from("quest_members").select("quest_id, quests(id, title)").eq("user_id", userId).limit(20),
  ]);

  const lines: string[] = [];

  if (questsRes.data?.length) {
    lines.push("## Available Quests");
    for (const q of questsRes.data) lines.push(`- "${q.title}" (id: ${q.id}, status: ${q.status})`);
  }
  if (guildsRes.data?.length) {
    lines.push("## Available Guilds");
    for (const g of guildsRes.data) lines.push(`- "${g.name}" (id: ${g.id}, type: ${g.type})`);
  }
  if (eventsRes.data?.length) {
    lines.push("## Upcoming Events");
    for (const e of eventsRes.data) lines.push(`- "${e.title}" (id: ${e.id}, guild_id: ${e.guild_id}, starts: ${e.start_at})`);
  }
  if (servicesRes.data?.length) {
    lines.push("## Available Services");
    for (const s of servicesRes.data) lines.push(`- "${s.title}" (id: ${s.id})`);
  }
  if (coursesRes.data?.length) {
    lines.push("## Available Courses");
    for (const c of coursesRes.data) lines.push(`- "${c.title}" (id: ${c.id})`);
  }
  if (usersRes.data?.length) {
    lines.push("## Community Members");
    for (const u of usersRes.data) lines.push(`- "${u.display_name || 'Unnamed'}" (id: ${u.id})`);
  }
  if (userGuildsRes.data?.length) {
    lines.push("## User's Guilds");
    for (const m of userGuildsRes.data) {
      const g = m.guilds as any;
      if (g) lines.push(`- "${g.name}" (id: ${g.id})`);
    }
  }
  if (userQuestsRes.data?.length) {
    lines.push("## User's Quests");
    for (const m of userQuestsRes.data) {
      const q = m.quests as any;
      if (q) lines.push(`- "${q.title}" (id: ${q.id})`);
    }
  }

  return lines.length > 0 ? "\n\nPLATFORM CONTENT:\n" + lines.join("\n") : "";
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
  const userId = authData.user.id;
  // --- End auth check ---

  try {
    const { message, userContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Use service role to query platform content
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch platform content and user context in parallel
    const [platformContent] = await Promise.all([
      fetchPlatformContent(supabaseAdmin, userId),
    ]);

    let contextNote = "";
    if (userContext) {
      const parts = [
        `Name: ${userContext.name || "Anonymous"}`,
        `Persona: ${userContext.personaType || "UNSET"}`,
        `XP Level: ${userContext.xpLevel || 1}`,
      ];
      if (userContext.topics?.length) parts.push(`Houses/Topics: ${userContext.topics.join(", ")}`);
      if (userContext.territories?.length) parts.push(`Territories: ${userContext.territories.join(", ")}`);
      if (userContext.recentQuests?.length) parts.push(`Recent quests: ${userContext.recentQuests.join(", ")}`);
      if (userContext.recentGuilds?.length) parts.push(`Member of guilds: ${userContext.recentGuilds.join(", ")}`);
      if (userContext.recentServices?.length) parts.push(`Offers services: ${userContext.recentServices.join(", ")}`);
      if (userContext.recentPods?.length) parts.push(`Active pods: ${userContext.recentPods.join(", ")}`);
      contextNote = `\n\nUser context: ${parts.join(", ")}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + contextNote + platformContent },
          { role: "user", content: message },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content ?? "";

    let parsed;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { message: raw, actions: [] };
    } catch {
      parsed = { message: raw, actions: [] };
    }

    // Ensure structure
    if (!parsed.actions) parsed.actions = [];
    if (!parsed.recommended) parsed.recommended = {};
    if (!parsed.microcopy) parsed.microcopy = "";

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("home-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
