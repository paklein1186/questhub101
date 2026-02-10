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

// ── Context builders ──────────────────────────────────────

async function userContext(userId: string) {
  const s = sb();
  const [profile, topics, territories, guilds, quests, services, pods] = await Promise.all([
    s.from("profiles").select("name, persona_type, xp, xp_level, bio, headline").eq("user_id", userId).single(),
    s.from("user_topics").select("topics(id,name)").eq("user_id", userId),
    s.from("user_territories").select("territory_id, territories(id,name)").eq("user_id", userId),
    s.from("guild_members").select("guild_id, guilds(id,name,description)").eq("user_id", userId).limit(10),
    s.from("quest_participants").select("quest_id, quests(id,title,status,description)").eq("user_id", userId).limit(10),
    s.from("services").select("id,title,description").eq("provider_user_id", userId).eq("is_deleted", false).limit(10),
    s.from("pod_members").select("pod_id, pods(id,name,description)").eq("user_id", userId).limit(10),
  ]);
  return {
    profile: profile.data,
    topics: (topics.data ?? []).map((t: any) => t.topics).filter(Boolean),
    territories: (territories.data ?? []).map((t: any) => t.territories).filter(Boolean),
    guilds: (guilds.data ?? []).map((g: any) => g.guilds).filter(Boolean),
    quests: (quests.data ?? []).map((q: any) => q.quests).filter(Boolean),
    services: services.data ?? [],
    pods: (pods.data ?? []).map((p: any) => p.pods).filter(Boolean),
  };
}

async function guildContext(guildId: string) {
  const s = sb();
  const [guild, members, topics, territories, quests] = await Promise.all([
    s.from("guilds").select("id,name,description,type").eq("id", guildId).single(),
    s.from("guild_members").select("user_id, role, profiles:user_id(name,xp_level,persona_type)").eq("guild_id", guildId).limit(20),
    s.from("guild_topics").select("topics(id,name)").eq("guild_id", guildId),
    s.from("guild_territories").select("territories(id,name)").eq("guild_id", guildId),
    s.from("quests").select("id,title,status,description").eq("guild_id", guildId).eq("is_deleted", false).limit(10),
  ]);
  return {
    guild: guild.data,
    members: members.data ?? [],
    topics: (topics.data ?? []).map((t: any) => t.topics).filter(Boolean),
    territories: (territories.data ?? []).map((t: any) => t.territories).filter(Boolean),
    quests: quests.data ?? [],
  };
}

async function questContext(questId: string) {
  const s = sb();
  const [quest, participants, topics, territories, subtasks, proposals] = await Promise.all([
    s.from("quests").select("id,title,description,status,credit_budget,escrow_credits,reward_xp,allow_fundraising,funding_goal_credits").eq("id", questId).single(),
    s.from("quest_participants").select("user_id, role, profiles:user_id(name,xp_level,persona_type)").eq("quest_id", questId).limit(20),
    s.from("quest_topics").select("topics(id,name)").eq("quest_id", questId),
    s.from("quest_territories").select("territories(id,name)").eq("quest_id", questId),
    s.from("quest_subtasks").select("title,status").eq("quest_id", questId).limit(20),
    s.from("quest_proposals").select("title,status,requested_credits,upvotes_count").eq("quest_id", questId).limit(10),
  ]);
  return {
    quest: quest.data,
    participants: participants.data ?? [],
    topics: (topics.data ?? []).map((t: any) => t.topics).filter(Boolean),
    territories: (territories.data ?? []).map((t: any) => t.territories).filter(Boolean),
    subtasks: subtasks.data ?? [],
    proposals: proposals.data ?? [],
  };
}

// ── Main ──────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the Quest Hub Matchmaker — an AI that recommends relevant connections on a community platform.

You will receive a matchType and context. Respond with a JSON object matching the requested type.

## matchType = "user"
Recommend quests, guilds, pods, collaborators and services for a user.
Output:
{
  "summary": "Brief personalized intro (2 sentences)",
  "quests": [{"title":"...","reason":"..."}],
  "guilds": [{"name":"...","reason":"..."}],
  "pods": [{"name":"...","reason":"..."}],
  "collaborators": [{"description":"...","reason":"..."}],
  "services": [{"title":"...","reason":"..."}]
}

## matchType = "guild"
Recommend users and quests for a guild.
Output:
{
  "summary": "Brief guild-focused intro",
  "recommendedUsers": [{"description":"...","reason":"..."}],
  "recommendedQuests": [{"title":"...","reason":"..."}]
}

## matchType = "quest"
Recommend proposers, missing skills, and funding partners for a quest.
Output:
{
  "summary": "Brief quest-focused intro",
  "proposers": [{"description":"...","reason":"..."}],
  "missingSkills": [{"skill":"...","suggestion":"..."}],
  "fundingPartners": [{"description":"...","reason":"..."}]
}

Return 2-5 items per array. Keep reasons under 20 words. Be concrete and actionable. Reference actual context given.
ONLY output valid JSON, nothing else.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { matchType, userId, guildId, questId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let contextStr = "";

    if (matchType === "user" && userId) {
      const ctx = await userContext(userId);
      contextStr = JSON.stringify(ctx, null, 0);
    } else if (matchType === "guild" && guildId) {
      const ctx = await guildContext(guildId);
      contextStr = JSON.stringify(ctx, null, 0);
    } else if (matchType === "quest" && questId) {
      const ctx = await questContext(questId);
      contextStr = JSON.stringify(ctx, null, 0);
    } else {
      return new Response(JSON.stringify({ error: "Invalid matchType or missing id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
          { role: "user", content: `matchType: ${matchType}\n\nContext:\n${contextStr}` },
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
    console.error("ai-match error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
