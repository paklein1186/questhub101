import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are the welcoming guide for changethegame — a community platform where people collaborate through Quests, Guilds, Pods, Services, and Courses to create impact and express creativity.

Your job is to warmly greet guests who haven't signed up yet and learn about them through a natural conversation. You want to understand:
1. Their intention — what brings them here (creating impact, learning, collaborating, offering services, etc.)
2. Their persona — are they more impact-driven, creative, or a hybrid?
3. Their interests/topics — what fields, causes, or skills they care about
4. What they're looking for — joining groups, offering services, learning, starting projects, etc.

CONVERSATION RULES:
- Ask ONE question at a time, keeping it warm and conversational
- After 2-3 discovery questions, when you feel you understand them, transition to signup by saying you'd love to set them up with an account
- When ready for signup, include "READY_FOR_SIGNUP" in your response (hidden from user display)
- Also include a JSON block with gathered context: {"persona": "impact|creative|hybrid", "interests": ["topic1", "topic2"], "goals": ["goal1"], "suggested_role": "GAMECHANGER|ECOSYSTEM_BUILDER"}
- Keep messages short (2-3 sentences max)
- Be enthusiastic but not overwhelming
- Use the platform terminology naturally (Quests for projects, Guilds for groups, etc.)
- If a user seems impatient or just wants to sign up, respect that and transition immediately

PLATFORM CONTEXT:
Available content on the platform will be provided to help you make relevant suggestions.

RESPONSE FORMAT when NOT ready for signup: just a friendly message string
RESPONSE FORMAT when ready for signup:
{
  "message": "Your transition message encouraging signup",
  "ready_for_signup": true,
  "context": {
    "persona": "impact|creative|hybrid",
    "interests": ["topic1", "topic2"],
    "goals": ["collaboration", "learning"],
    "suggested_role": "GAMECHANGER"
  }
}`;

async function fetchPublicContent(supabaseAdmin: any) {
  const [guildsRes, questsRes, coursesRes, topicsRes] = await Promise.all([
    supabaseAdmin.from("guilds").select("id, name, type").eq("is_deleted", false).eq("is_draft", false).limit(15),
    supabaseAdmin.from("quests").select("id, title").eq("is_deleted", false).limit(15),
    supabaseAdmin.from("courses").select("id, title").eq("is_deleted", false).eq("is_published", true).limit(10),
    supabaseAdmin.from("topics").select("id, name, slug").limit(30),
  ]);

  const lines: string[] = [];
  if (guildsRes.data?.length) {
    lines.push("## Active Guilds");
    for (const g of guildsRes.data) lines.push(`- ${g.name} (${g.type})`);
  }
  if (questsRes.data?.length) {
    lines.push("## Active Quests");
    for (const q of questsRes.data) lines.push(`- ${q.title}`);
  }
  if (coursesRes.data?.length) {
    lines.push("## Available Courses");
    for (const c of coursesRes.data) lines.push(`- ${c.title}`);
  }
  if (topicsRes.data?.length) {
    lines.push("## Topics/Houses");
    for (const t of topicsRes.data) lines.push(`- ${t.name}`);
  }
  return lines.length ? "\n\nPLATFORM CONTENT:\n" + lines.join("\n") : "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const platformContent = await fetchPublicContent(supabaseAdmin);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + platformContent },
          ...messages,
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
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content ?? "";

    // Check if AI signaled readiness for signup
    let result: any;
    if (raw.includes("READY_FOR_SIGNUP") || raw.includes("ready_for_signup")) {
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        result = jsonMatch ? JSON.parse(jsonMatch[0]) : { message: raw.replace("READY_FOR_SIGNUP", ""), ready_for_signup: true, context: {} };
      } catch {
        result = { message: raw.replace("READY_FOR_SIGNUP", ""), ready_for_signup: true, context: {} };
      }
    } else {
      result = { message: raw, ready_for_signup: false };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("guest-onboarding-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
