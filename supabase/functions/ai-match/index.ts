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

  // Fetch user's own profile & memberships
  const [profile, topics, territories, guilds, quests, services, pods] = await Promise.all([
    s.from("profiles").select("name, persona_type, xp, xp_level, bio, headline").eq("user_id", userId).single(),
    s.from("user_topics").select("topics(id,name)").eq("user_id", userId),
    s.from("user_territories").select("territory_id, territories(id,name)").eq("user_id", userId),
    s.from("guild_members").select("guild_id, guilds(id,name,description)").eq("user_id", userId).limit(10),
    s.from("quest_participants").select("quest_id, quests(id,title,status,description)").eq("user_id", userId).limit(10),
    s.from("services").select("id,title,description").eq("provider_user_id", userId).eq("is_deleted", false).limit(10),
    s.from("pod_members").select("pod_id, pods(id,name,description)").eq("user_id", userId).limit(10),
  ]);

  const userGuildIds = (guilds.data ?? []).map((g: any) => g.guild_id).filter(Boolean);
  const userQuestIds = (quests.data ?? []).map((q: any) => q.quest_id).filter(Boolean);
  const userPodIds = (pods.data ?? []).map((p: any) => p.pod_id).filter(Boolean);
  const userTopicIds = (topics.data ?? []).map((t: any) => t.topics?.id).filter(Boolean);
  const userTerritoryIds = (territories.data ?? []).map((t: any) => t.territories?.id).filter(Boolean);

  // Fetch candidates the user is NOT already part of
  const candidatePromises: Promise<any>[] = [];

  // Candidate guilds (not joined, not deleted)
  candidatePromises.push(
    s.from("guilds").select("id,name,description,type")
      .eq("is_deleted", false)
      .not("id", "in", userGuildIds.length ? `(${userGuildIds.join(",")})` : "(00000000-0000-0000-0000-000000000000)")
      .limit(15)
  );

  // Candidate quests (open, not joined)
  candidatePromises.push(
    s.from("quests").select("id,title,description,status")
      .eq("is_deleted", false).in("status", ["open", "in_progress"])
      .not("id", "in", userQuestIds.length ? `(${userQuestIds.join(",")})` : "(00000000-0000-0000-0000-000000000000)")
      .limit(15)
  );

  // Candidate pods (not joined)
  candidatePromises.push(
    s.from("pods").select("id,name,description")
      .eq("is_deleted", false)
      .not("id", "in", userPodIds.length ? `(${userPodIds.join(",")})` : "(00000000-0000-0000-0000-000000000000)")
      .limit(10)
  );

  // Candidate services (from other users)
  candidatePromises.push(
    s.from("services").select("id,title,description,provider_user_id")
      .eq("is_deleted", false).eq("is_published", true)
      .neq("provider_user_id", userId)
      .limit(15)
  );

  // Other users with complementary profiles
  candidatePromises.push(
    s.from("profiles").select("user_id,name,headline,persona_type,xp_level,bio")
      .neq("user_id", userId)
      .not("name", "is", null)
      .limit(20)
  );

  const [candidateGuilds, candidateQuests, candidatePods, candidateServices, candidateUsers] =
    await Promise.all(candidatePromises);

  return {
    userProfile: profile.data,
    userTopics: (topics.data ?? []).map((t: any) => t.topics).filter(Boolean),
    userTerritories: (territories.data ?? []).map((t: any) => t.territories).filter(Boolean),
    userGuilds: (guilds.data ?? []).map((g: any) => g.guilds).filter(Boolean),
    userQuests: (quests.data ?? []).map((q: any) => q.quests).filter(Boolean),
    userServices: services.data ?? [],
    userPods: (pods.data ?? []).map((p: any) => p.pods).filter(Boolean),
    candidateGuilds: candidateGuilds.data ?? [],
    candidateQuests: candidateQuests.data ?? [],
    candidatePods: candidatePods.data ?? [],
    candidateServices: candidateServices.data ?? [],
    candidateUsers: candidateUsers.data ?? [],
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

  const memberIds = (members.data ?? []).map((m: any) => m.user_id).filter(Boolean);

  // Candidate users NOT already members
  const candidateUsers = await s.from("profiles")
    .select("user_id,name,headline,persona_type,xp_level")
    .not("user_id", "in", memberIds.length ? `(${memberIds.join(",")})` : "(00000000-0000-0000-0000-000000000000)")
    .not("name", "is", null)
    .limit(20);

  return {
    guild: guild.data,
    members: members.data ?? [],
    topics: (topics.data ?? []).map((t: any) => t.topics).filter(Boolean),
    territories: (territories.data ?? []).map((t: any) => t.territories).filter(Boolean),
    quests: quests.data ?? [],
    candidateUsers: candidateUsers.data ?? [],
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

  const participantIds = (participants.data ?? []).map((p: any) => p.user_id).filter(Boolean);

  // Candidate users NOT already participants
  const candidateUsers = await s.from("profiles")
    .select("user_id,name,headline,persona_type,xp_level")
    .not("user_id", "in", participantIds.length ? `(${participantIds.join(",")})` : "(00000000-0000-0000-0000-000000000000)")
    .not("name", "is", null)
    .limit(20);

  // Candidate funding companies
  const candidateCompanies = await s.from("companies")
    .select("id,name,description,sector")
    .eq("is_deleted", false)
    .limit(10);

  return {
    quest: quest.data,
    participants: participants.data ?? [],
    topics: (topics.data ?? []).map((t: any) => t.topics).filter(Boolean),
    territories: (territories.data ?? []).map((t: any) => t.territories).filter(Boolean),
    subtasks: subtasks.data ?? [],
    proposals: proposals.data ?? [],
    candidateUsers: candidateUsers.data ?? [],
    candidateCompanies: candidateCompanies.data ?? [],
  };
}

// ── Main ──────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the Quest Hub Matchmaker — an AI that recommends relevant NEW connections on a community platform.

You will receive a matchType and context containing:
- The entity's own data (profile, memberships, topics, territories)
- CANDIDATE entities the user/guild/quest is NOT yet connected to

Your job is to find the BEST MATCHES among the candidates. Only recommend items from the candidate lists. Include their actual IDs so users can navigate to them.

## matchType = "user"
Recommend quests, guilds, pods, collaborators and services the user should connect with (that they are NOT already part of).
Output:
{
  "summary": "Brief personalized intro explaining the matching logic (2 sentences)",
  "quests": [{"id":"<actual-uuid>","title":"...","reason":"..."}],
  "guilds": [{"id":"<actual-uuid>","name":"...","reason":"..."}],
  "pods": [{"id":"<actual-uuid>","name":"...","reason":"..."}],
  "collaborators": [{"id":"<actual-user-uuid>","description":"Person name — why they complement this user","reason":"..."}],
  "services": [{"id":"<actual-uuid>","title":"...","reason":"..."}]
}

## matchType = "guild"
Recommend users and quests for a guild to recruit or engage with.
Output:
{
  "summary": "Brief guild-focused intro",
  "recommendedUsers": [{"id":"<actual-user-uuid>","description":"...","reason":"..."}],
  "recommendedQuests": [{"id":"<actual-uuid>","title":"...","reason":"..."}]
}

## matchType = "quest"
Recommend proposers, missing skills, and funding partners for a quest.
Output:
{
  "summary": "Brief quest-focused intro",
  "proposers": [{"id":"<actual-user-uuid>","description":"...","reason":"..."}],
  "missingSkills": [{"skill":"...","suggestion":"...","reason":"..."}],
  "fundingPartners": [{"id":"<actual-company-uuid>","description":"...","reason":"..."}]
}

Return 2-5 items per array. Keep reasons under 20 words. Be concrete and actionable. Reference actual context given.
ONLY recommend items from the candidate lists provided. Use real IDs from the data.
ONLY output valid JSON, nothing else.`;

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
  const { data: authData, error: authError } = await supabaseAuth.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authError || !authData.user) return unauthorizedResponse();
  // --- End auth check ---

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
