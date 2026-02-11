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
- join_quest: User wants to join an existing quest
- submit_proposal: User wants to submit a proposal on a quest
- find_guild: User wants to discover or join a guild
- join_pod: User wants to join or create a study/quest pod
- start_course: User wants to learn something via a course
- find_service: User wants to book a service/session
- create_service: User wants to offer a service or skill session
- explore_houses: User wants to browse topics/houses
- explore_territories: User wants to browse territories
- view_profile: User wants to check their profile/stats
- browse_quests: User wants to explore existing quests
- fund_quest: User wants to fund a quest with credits
- attend_event: User wants to find and attend guild events

ALWAYS respond in this exact JSON format:
{
  "message": "Your friendly, concise response (2-3 sentences max)",
  "microcopy": "One short inspiring phrase (optional, e.g. 'Every small action ripples outward.')",
  "actions": [
    { "type": "create_quest", "label": "Create a Quest", "description": "Short description" }
  ],
  "recommended": {
    "quests": ["quest title suggestion based on user context"],
    "guilds": ["guild name suggestion based on user interests"],
    "territories": ["territory name if relevant"],
    "collaborators": ["type of collaborator they might seek"]
  }
}

Return 2-4 actions maximum. The "recommended" object should contain 0-3 items per category, based on context. Be warm, brief, and action-oriented. Use emojis sparingly. Adapt your language to the user's persona:
- IMPACT: focus on missions, systemic change, regeneration
- CREATIVE: focus on creation, expression, skill sharing
- HYBRID: blend both perspectives`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { message, userContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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
          { role: "system", content: SYSTEM_PROMPT + contextNote },
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
