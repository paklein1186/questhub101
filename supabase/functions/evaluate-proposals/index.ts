import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { questId } = await req.json();
    if (!questId) throw new Error("questId required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return json({ error: "AI not configured" }, 500);
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch quest
    const { data: quest } = await sb.from("quests").select("*").eq("id", questId).single();
    if (!quest) return json({ error: "Quest not found" }, 404);

    // Fetch topics & territories
    const { data: questTopics } = await sb.from("quest_topics").select("topic_id, topics(name)").eq("quest_id", questId);
    const { data: questTerritories } = await sb.from("quest_territories").select("territory_id, territories(name)").eq("quest_id", questId);
    const houses = (questTopics || []).map((qt: any) => qt.topics?.name).filter(Boolean);
    const territories = (questTerritories || []).map((qt: any) => qt.territories?.name).filter(Boolean);

    // Fetch pending proposals
    const { data: proposals } = await sb
      .from("quest_proposals")
      .select("*")
      .eq("quest_id", questId)
      .eq("status", "PENDING")
      .order("upvotes_count", { ascending: false });

    if (!proposals || proposals.length === 0) {
      return json({ evaluations: [], comparison: null, message: "No pending proposals to evaluate." });
    }

    // Fetch proposer profiles + stats
    const proposerIds = proposals.map((p: any) => p.proposer_id);
    const { data: profiles } = await sb.from("profiles").select("user_id, name, xp, xp_level, xp_recent_12m").in("user_id", proposerIds);
    const profileMap: Record<string, any> = {};
    (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });

    // Fetch completed quests count per proposer
    const { data: completions } = await sb
      .from("quest_participants")
      .select("user_id, quests!inner(status)")
      .in("user_id", proposerIds)
      .eq("quests.status", "COMPLETED");

    const completionCount: Record<string, number> = {};
    (completions || []).forEach((c: any) => {
      completionCount[c.user_id] = (completionCount[c.user_id] || 0) + 1;
    });

    // Fetch comment counts per proposal
    const { data: comments } = await sb
      .from("comments")
      .select("target_id")
      .eq("target_type", "QUEST_PROPOSAL")
      .in("target_id", proposals.map((p: any) => p.id));

    const commentCount: Record<string, number> = {};
    (comments || []).forEach((c: any) => {
      commentCount[c.target_id] = (commentCount[c.target_id] || 0) + 1;
    });

    // Build context for AI
    const proposalSummaries = proposals.map((p: any) => {
      const profile = profileMap[p.proposer_id] || {};
      return {
        id: p.id,
        title: p.title,
        description: p.description || "No description",
        requestedCredits: p.requested_credits,
        upvotes: p.upvotes_count,
        comments: commentCount[p.id] || 0,
        proposerName: profile.name || "Unknown",
        proposerXpLevel: profile.xp_level || 1,
        proposerTotalXp: profile.xp || 0,
        proposerRecentXp: profile.xp_recent_12m || 0,
        completedQuests: completionCount[p.proposer_id] || 0,
      };
    });

    const prompt = `You are a neutral evaluator for quest proposals on a collaborative platform.

Quest: "${quest.title}"
Description: "${quest.description || "N/A"}"
Houses (topics): ${JSON.stringify(houses)}
Territories: ${JSON.stringify(territories)}
Credit budget in escrow: ${quest.escrow_credits}
Reward XP: ${quest.reward_xp}

There are ${proposals.length} PENDING proposals to evaluate:

${proposalSummaries.map((p, i) => `
--- Proposal ${i + 1}: "${p.title}" ---
Description: ${p.description}
Requested Credits: ${p.requestedCredits}
Community upvotes: ${p.upvotes}
Comments: ${p.comments}
Proposer: ${p.proposerName} (Level ${p.proposerXpLevel}, ${p.proposerTotalXp} XP total, ${p.proposerRecentXp} XP last 12m, ${p.completedQuests} completed quests)
`).join("\n")}

For each proposal, produce a neutral evaluation. Then produce a comparison matrix.

Return ONLY valid JSON:
{
  "evaluations": [
    {
      "proposalId": "<id>",
      "summary": "<150-200 word neutral summary covering clarity, feasibility, alignment, value>",
      "strengths": ["..."],
      "risks": ["..."],
      "neededConditions": ["..."],
      "score": <1-10 holistic score>
    }
  ],
  "comparison": {
    "topRecommendation": "<proposalId or null if unclear>",
    "reasoning": "<2-3 sentences explaining the comparison>",
    "recommendedMatches": ["<types of collaborators or guilds that could help>"]
  }
}

Guidelines:
- Be fair and neutral. Do NOT automatically accept/decline.
- Consider: clarity of proposal, feasibility, alignment with quest Houses & Territories, credits requested vs apparent workload, proposer experience (XP, completions), community signal (upvotes, comments).
- Highlight genuine strengths and real risks.
- "neededConditions" = what must be true for this proposal to succeed.
- Score 1-10 where 7+ = strong, 4-6 = decent, 1-3 = weak.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You evaluate quest proposals neutrally. Respond with only valid JSON, no markdown fences." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return json({ error: "Rate limit exceeded. Try again shortly." }, 429);
      if (response.status === 402) return json({ error: "AI credits exhausted." }, 402);
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return json({ error: "AI service unavailable" }, 500);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content ?? "";

    try {
      const match = raw.match(/\{[\s\S]*\}/);
      const parsed = match ? JSON.parse(match[0]) : null;
      if (parsed?.evaluations) {
        return json(parsed);
      }
    } catch { /* fallthrough */ }

    return json({ error: "Failed to parse AI evaluation" }, 500);
  } catch (e) {
    console.error("evaluate-proposals error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
