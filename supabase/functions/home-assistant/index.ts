import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are the Quest Hub AI Assistant — a friendly, action-oriented guide for a community platform where "Gamechangers" collaborate through Quests, Guilds, Pods, Services, and Courses.

Your job is to understand what the user wants to accomplish and suggest CONCRETE platform actions. Always respond with a short, inspiring message AND a JSON array of suggested actions.

Available action types:
- create_quest: User wants to create a new quest/project
- find_guild: User wants to discover or join a guild
- join_pod: User wants to join or create a study/quest pod
- start_course: User wants to learn something via a course
- find_service: User wants to book a service/session
- explore_houses: User wants to browse topics/houses
- view_profile: User wants to check their profile/stats
- browse_quests: User wants to explore existing quests

ALWAYS respond in this exact JSON format:
{
  "message": "Your friendly, concise response (2-3 sentences max)",
  "actions": [
    { "type": "create_quest", "label": "Create a Quest", "description": "Short description" },
    { "type": "find_guild", "label": "Find a Guild", "description": "Short description" }
  ]
}

Return 2-4 actions maximum. Be warm, brief, and action-oriented. Use emojis sparingly.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { message, userContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const contextNote = userContext
      ? `\n\nUser context: Name: ${userContext.name}, Role: ${userContext.role}, XP Level: ${userContext.xpLevel}, Topics: ${userContext.topics?.join(", ") || "none"}, Territories: ${userContext.territories?.join(", ") || "none"}`
      : "";

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

    // Extract JSON from response (handle markdown code blocks)
    let parsed;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { message: raw, actions: [] };
    } catch {
      parsed = { message: raw, actions: [] };
    }

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
