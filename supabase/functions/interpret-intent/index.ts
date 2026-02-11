import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_ROUTES: Record<string, string> = {
  "/quests/new": "Create a Quest",
  "/services/new": "Create a Service",
  "/courses/new": "Create a Course",
  "/explore": "Explore everything",
  "/explore?tab=entities": "Explore entities",
  "/explore?tab=quests": "Explore quests",
  "/explore?tab=services": "Explore services",
  "/explore?tab=courses": "Explore courses",
  "/explore?tab=events": "Explore events",
  "/explore?tab=people": "Find people",
  "/work": "See my work & quests",
  "/network": "My network",
  "/network?tab=entities": "My entities",
  "/network?tab=people": "People in my orbit",
  "/network?tab=territories": "My territories",
  "/wall": "My wall / feed",
  "/me": "My profile",
  "/guilds": "Browse guilds",
  "/pods": "Browse pods",
  "/companies": "Browse organizations",
  "/services": "Browse services",
  "/quests": "Browse quests",
  "/courses": "Browse courses",
  "/territories": "Explore territories",
};

const VALID_ROUTES_LIST = Object.entries(VALID_ROUTES).map(([route, desc]) => `  ${route} — ${desc}`).join("\n");

function sanitizeRoute(route: string): string {
  // Check exact match first
  if (VALID_ROUTES[route]) return route;
  // Check if it starts with a valid prefix
  const validPrefixes = Object.keys(VALID_ROUTES);
  for (const prefix of validPrefixes) {
    if (route === prefix || route.startsWith(prefix + "?") || route.startsWith(prefix + "#")) {
      return route;
    }
  }
  // Fallback: map common AI hallucinations to real routes
  if (route.includes("quest")) return "/explore?tab=quests";
  if (route.includes("service")) return "/explore?tab=services";
  if (route.includes("people") || route.includes("user")) return "/explore?tab=people";
  if (route.includes("guild") || route.includes("entit")) return "/explore?tab=entities";
  if (route.includes("territor")) return "/territories";
  if (route.includes("course") || route.includes("learn")) return "/explore?tab=courses";
  if (route.includes("event")) return "/explore?tab=events";
  if (route.includes("work") || route.includes("my")) return "/work";
  if (route.includes("wall") || route.includes("post") || route.includes("share")) return "/wall";
  return "/explore";
}

const SYSTEM_PROMPT = `You are the intent-routing AI for "changethegame", a regenerative community platform.
Your ONLY job is to classify a user's freeform text into one actionable intent.

VALID action types:
- CREATE_QUEST: User wants to start a quest/project/mission
- CREATE_SERVICE: User wants to offer a service or skill session
- CREATE_EVENT: User wants to create an event
- CREATE_COURSE: User wants to create a course
- START_POD: User wants to start a pod/team/ensemble
- START_GUILD: User wants to create a guild/circle
- POST_WALL: User wants to share a thought on their wall
- FIND_PEOPLE: User wants to discover people, collaborators, mentors
- FIND_ENTITIES: User wants to discover guilds, pods, companies
- FIND_QUESTS: User wants to explore quests/missions/creations
- FIND_SERVICES: User wants to book services or sessions
- FIND_COURSES: User wants to learn via courses
- FIND_EVENTS: User wants to attend events
- EXPLORE_TERRITORIES: User wants to explore a territory/place
- VIEW_MY_WORK: User wants to see their active quests/work
- VIEW_MY_ENTITIES: User wants to see guilds/pods they belong to
- LEARN: User wants to learn/grow/find mentors
- OTHER: Doesn't fit any known flow — this is an odd/novel proposal

VALID ROUTES (you MUST only use these exact routes):
${VALID_ROUTES_LIST}

Respond ONLY with this JSON:
{
  "actionType": "ONE_OF_THE_ABOVE",
  "confidence": 0.0-1.0,
  "summary": "one-sentence summary of the user's intent",
  "suggestions": [
    { "label": "Short CTA label", "route": "/exact/valid/route", "description": "Why this fits" }
  ],
  "followUpQuestion": "optional clarifying question if intent is ambiguous"
}

Give 2-3 suggestions max. ONLY use routes from the VALID ROUTES list above.
If actionType is OTHER, set confidence to the probability it IS a real intent (low = truly odd).
Adapt language to the persona provided in context.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAuth = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: authData, error: authError } = await supabaseAuth.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authError || !authData.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { intentText, persona, source } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const contextLine = `\n\nUser persona: ${persona || "UNSET"}. Source: ${source || "HOME_FREE"}.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + contextLine },
          { role: "user", content: intentText },
        ],
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
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content ?? "";

    let parsed;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { actionType: "OTHER", confidence: 0.3, summary: raw, suggestions: [] };
    } catch {
      parsed = { actionType: "OTHER", confidence: 0.3, summary: raw, suggestions: [] };
    }

    // Ensure defaults
    if (!parsed.suggestions) parsed.suggestions = [];
    if (!parsed.confidence) parsed.confidence = 0.5;
    if (!parsed.actionType) parsed.actionType = "OTHER";

    // Sanitize all suggestion routes to prevent broken links
    parsed.suggestions = parsed.suggestions.map((s: any) => ({
      ...s,
      route: sanitizeRoute(s.route || "/explore"),
    }));

    // Log odd proposals to feature_suggestions
    const isOdd = parsed.actionType === "OTHER" || parsed.confidence < 0.5;
    if (isOdd) {
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await adminClient.from("feature_suggestions").insert({
        user_id: authData.user.id,
        source: source || "HOME_FREE",
        persona_at_time: persona || "UNSET",
        original_text: intentText,
        interpreted_action_type: parsed.actionType,
        confidence_score: parsed.confidence,
        user_explicit: false,
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("interpret-intent error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
