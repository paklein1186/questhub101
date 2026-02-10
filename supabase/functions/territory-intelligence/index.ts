import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function sb() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function territoryContext(territoryId: string) {
  const s = sb();

  const [territory, quests, guilds, pods, users, companies, services, courses, children] = await Promise.all([
    s.from("territories").select("id,name,level,slug,parent_id").eq("id", territoryId).single(),
    // Quests in this territory
    s.from("quest_territories").select("quest_id, quests(id,title,status,description,reward_xp,credit_budget,escrow_credits,quest_topics(topics(name)))").eq("territory_id", territoryId).limit(30),
    // Guilds
    s.from("guild_territories").select("guild_id, guilds(id,name,description,type,guild_topics(topics(name)))").eq("territory_id", territoryId).limit(30),
    // Pods
    s.from("pod_territories").select("pod_id, pods(id,name,description,type,topic_id,topics(name))").eq("territory_id", territoryId).limit(20),
    // Users
    s.from("user_territories").select("user_id, profiles:user_id(name,persona_type,xp,xp_level,headline,bio)").eq("territory_id", territoryId).limit(50),
    // Companies
    s.from("company_territories").select("company_id, companies(id,name,sector,description)").eq("territory_id", territoryId).limit(20),
    // Services
    s.from("service_territories").select("service_id, services(id,title,description,price_amount,price_currency)").eq("territory_id", territoryId).limit(20),
    // Courses
    s.from("course_territories").select("course_id, courses(id,title,description,level)").eq("territory_id", territoryId).limit(20),
    // Child territories
    s.from("territories").select("id,name,level").eq("parent_id", territoryId).eq("is_deleted", false).limit(20),
  ]);

  // Also get the parent territory name if exists
  let parentTerritory = null;
  if (territory.data?.parent_id) {
    const { data } = await s.from("territories").select("id,name,level").eq("id", territory.data.parent_id).single();
    parentTerritory = data;
  }

  return {
    territory: territory.data,
    parentTerritory,
    childTerritories: children.data ?? [],
    quests: (quests.data ?? []).map((q: any) => q.quests).filter(Boolean),
    guilds: (guilds.data ?? []).map((g: any) => g.guilds).filter(Boolean),
    pods: (pods.data ?? []).map((p: any) => p.pods).filter(Boolean),
    users: (users.data ?? []).map((u: any) => u.profiles).filter(Boolean),
    companies: (companies.data ?? []).map((c: any) => c.companies).filter(Boolean),
    services: (services.data ?? []).map((s: any) => s.services).filter(Boolean),
    courses: (courses.data ?? []).map((c: any) => c.courses).filter(Boolean),
  };
}

const SYSTEM_PROMPT = `You are the Quest Hub Territorial Intelligence Analyst — an AI that provides deep strategic analysis of territories on a community platform.

A territory is a geographic or thematic region. You analyze all activity within it to surface insights.

Given context about a territory (its quests, guilds, users, companies, services, courses, pods), produce a JSON object with this exact structure:

{
  "summary": "2-3 sentence executive summary of the territory's current state and dynamics",
  "activeQuests": [{"title":"...","status":"...","insight":"..."}],
  "activeGuilds": [{"name":"...","focus":"...","insight":"..."}],
  "gaps": [{"area":"...","description":"...","severity":"high|medium|low"}],
  "collaborations": [{"type":"user-user|guild-guild|quest-quest|cross-territory","description":"...","reason":"...","potential":"high|medium"}],
  "fundingPriorities": [{"area":"...","reason":"...","estimatedImpact":"..."}],
  "trends": ["..."],
  "risks": ["..."]
}

Guidelines:
- "gaps" should identify missing Houses (skill domains), missing roles/personas, underserved needs
- "collaborations" should suggest concrete pairings between users, guilds, or quests that could benefit from working together
- "fundingPriorities" should rank what areas deserve investment attention
- "trends" are 2-4 emerging patterns
- "risks" are 2-3 potential threats or challenges
- Keep each field concise. Arrays should have 2-5 items.
- Reference actual entities and people from the context when possible.
- ONLY output valid JSON, nothing else.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { territoryId } = await req.json();
    if (!territoryId) {
      return new Response(JSON.stringify({ error: "Missing territoryId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const ctx = await territoryContext(territoryId);

    if (!ctx.territory) {
      return new Response(JSON.stringify({ error: "Territory not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Territory: ${ctx.territory.name} (level: ${ctx.territory.level})\n\nContext:\n${JSON.stringify(ctx, null, 0)}` },
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

    let parsed;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: raw };
    } catch {
      parsed = { summary: raw };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("territory-intelligence error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
