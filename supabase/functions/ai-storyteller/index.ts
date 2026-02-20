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
    const { type, context } = await req.json();
    // type: "bio" | "guild_identity" | "quest_story" | "quest_update" | "event_description"
    // context: { name, persona, role, houses, territories, xp, bio, headline, description, title, status, updateType, ... }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let systemPrompt = "You are a storytelling assistant for a collaborative impact & creative platform. Write in a warm, authentic, human voice. Never use corporate jargon. Be concise.";
    let userPrompt = "";

    const sharedContext = `
User persona: ${context.persona || "HYBRID"}
Houses (topics): ${JSON.stringify(context.houses || [])}
Territories: ${JSON.stringify(context.territories || [])}
XP level: ${context.xpLevel || 1}`;

    switch (type) {
      case "bio":
        userPrompt = `Write a compelling personal bio (80-150 words) for a platform member.
${sharedContext}
Name: ${context.name || "Member"}
Role: ${context.role || "Gamechanger"}
Headline: ${context.headline || "not set"}
Current bio: "${context.currentText || "empty"}"

The bio should:
- Reflect their persona (IMPACT=mission-driven, CREATIVE=artistic, HYBRID=both)
- Reference their Houses and Territories naturally
- Feel genuine and inviting, not a résumé
- End with what they're looking for on the platform

Return ONLY valid JSON: { "text": "the bio text", "tone": "a one-word tone descriptor" }`;
        break;

      case "guild_identity":
        userPrompt = `Write a guild/collective identity statement (100-200 words).
${sharedContext}
Guild name: ${context.title || "Unnamed"}
Current description: "${context.currentText || "empty"}"
Guild type: ${context.guildType || "GUILD"}
Member count: ${context.memberCount || 0}

The identity statement should:
- Explain the guild's purpose and values
- Convey community and shared mission
- Be welcoming to potential new members
- Reference topics/territories if relevant

Return ONLY valid JSON: { "text": "the identity statement", "tagline": "a short 5-8 word tagline" }`;
        break;

      case "quest_story":
        userPrompt = `Write a quest narrative description (150-250 words).
${sharedContext}
Quest title: ${context.title || "Unnamed Quest"}
Current description: "${context.currentText || "empty"}"
Status: ${context.status || "OPEN"}
Credit reward: ${context.creditReward || 0}
Credit budget: ${context.creditBudget || 0}

The narrative should:
- Open with a compelling "why this matters"
- Describe the journey / what participants will do
- Convey the impact or creative outcome
- Include a call to action

Return ONLY valid JSON: { "text": "the quest narrative", "hook": "a one-sentence attention grabber" }`;
        break;

      case "quest_update":
        userPrompt = `Write a quest update post (80-150 words).
${sharedContext}
Quest title: ${context.title || "Quest"}
Update type: ${context.updateType || "GENERAL"} (GENERAL, MILESTONE, CALL_FOR_HELP, REFLECTION)
Update title: "${context.updateTitle || ""}"
Draft content: "${context.currentText || "empty"}"

The update should:
- Match the update type tone (milestone=celebratory, call_for_help=urgent, reflection=thoughtful)
- Be engaging and actionable
- Feel like a real team update, not AI-generated

Return ONLY valid JSON: { "text": "the update content", "suggestedTitle": "a catchy title if the current one is empty" }`;
        break;

      case "event_description":
        userPrompt = `Write an event description (80-150 words).
${sharedContext}
Event title: ${context.title || "Event"}
Current description: "${context.currentText || "empty"}"
Location type: ${context.locationType || "online"}

The description should:
- Explain what attendees will experience
- Set expectations (format, duration, tone)
- Be inviting and specific

Return ONLY valid JSON: { "text": "the event description" }`;
        break;

      case "rewrite_title":
        userPrompt = `Rewrite and improve this title for a ${context.entityType || "quest"}.
${sharedContext}
Current title: "${context.currentText || ""}"
Keywords/notes from user: "${context.keywords || ""}"

Rules:
- Keep it under 80 characters
- Make it compelling, clear, and action-oriented
- If the current text is just a few keywords, expand them into a proper title
- If the current text is already a title, improve it

Return ONLY valid JSON: { "text": "the improved title" }`;
        break;

      case "rewrite_description":
        userPrompt = `Rewrite and improve this description for a ${context.entityType || "quest"}.
${sharedContext}
Title: "${context.title || ""}"
Current description: "${context.currentText || ""}"
Keywords/notes from user: "${context.keywords || ""}"

Rules:
- Keep it 50-200 words
- If the current text is just keywords or a rough sentence, expand into a proper description
- Make it clear, engaging, and actionable
- For quest subtasks, keep it shorter (1-3 sentences)

Return ONLY valid JSON: { "text": "the improved description" }`;
        break;

      default:
        return new Response(JSON.stringify({ error: `Unknown type: ${type}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
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
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content ?? "";

    try {
      const match = raw.match(/\{[\s\S]*\}/);
      const parsed = match ? JSON.parse(match[0]) : null;
      if (parsed?.text) {
        return new Response(JSON.stringify(parsed), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch { /* fallthrough */ }

    return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-storyteller error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
