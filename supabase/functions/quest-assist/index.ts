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
  const { data: userData, error: authError } = await supabaseAuth.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authError || !userData.user) return unauthorizedResponse();
  // --- End auth check ---

  try {
    const { title, keywords, persona, houses, territories, xpLevel } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `You are a quest creation assistant for a collaborative platform focused on impact, creativity, and regeneration.

Given the following inputs, generate a complete quest draft:

Quest title: "${title}"
Keywords/notes from creator: "${keywords || "none"}"
Creator persona: ${persona || "HYBRID"} (IMPACT = mission-driven, CREATIVE = artistic/expressive, HYBRID = both)
Creator XP level: ${xpLevel || 1}
Selected Houses (topics): ${JSON.stringify(houses || [])}
Selected Territories (locations): ${JSON.stringify(territories || [])}

Return ONLY valid JSON with this exact structure:
{
  "description": "A compelling 2-4 paragraph quest description in markdown",
  "subtasks": [
    { "title": "Subtask title", "description": "Brief description" }
  ],
  "rewardXp": <number 50-500 based on complexity>,
  "creditBudget": <number 0-100 based on scope>,
  "suggestedHouses": ["house names that fit this quest"],
  "suggestedTerritories": ["territory names that fit"],
  "suggestedCollaborators": ["type of collaborator needed, e.g. 'graphic designer', 'facilitator'"],
  "fundingGoal": <number or null>,
  "microcopy": "One inspiring sentence about this quest"
}

Guidelines:
- Description should be inspiring and action-oriented
- Create 3-7 subtasks that break the quest into clear steps
- XP reward should reflect estimated effort (50=quick, 100=medium, 200+=complex)
- Credit budget should be 0 for community quests, 10-50 for funded ones
- Only suggest Houses/Territories that genuinely fit
- Suggest 2-4 types of collaborators who would add value
- Funding goal only if the quest seems to need resources`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You generate structured quest data. Respond with only valid JSON, no markdown fences." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content ?? "";

    try {
      const match = raw.match(/\{[\s\S]*\}/);
      const parsed = match ? JSON.parse(match[0]) : null;
      if (parsed?.description) {
        return new Response(JSON.stringify(parsed), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch { /* fallthrough */ }

    return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("quest-assist error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
