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

function sb() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

const SPARSE_THRESHOLD = 3; // entries below this count triggers fractal inference

async function fetchMemory(s: any, territoryId: string) {
  const { data } = await s
    .from("territory_memory")
    .select("id,title,content,category,visibility,tags,ai_score,is_included_in_summary")
    .eq("territory_id", territoryId)
    .order("updated_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

async function territoryContext(territoryId: string) {
  const s = sb();

  const [territory, quests, guilds, pods, users, companies, services, courses, children, memory] = await Promise.all([
    s.from("territories").select("id,name,level,slug,parent_id").eq("id", territoryId).single(),
    s.from("quest_territories").select("quest_id, quests(id,title,status,description,reward_xp,credit_budget,escrow_credits,quest_topics(topics(name)))").eq("territory_id", territoryId).limit(30),
    s.from("guild_territories").select("guild_id, guilds(id,name,description,type,guild_topics(topics(name)))").eq("territory_id", territoryId).limit(30),
    s.from("pod_territories").select("pod_id, pods(id,name,description,type,topic_id,topics(name))").eq("territory_id", territoryId).limit(20),
    s.from("user_territories").select("user_id, profiles:user_id(name,persona_type,xp,xp_level,headline,bio)").eq("territory_id", territoryId).limit(50),
    s.from("company_territories").select("company_id, companies(id,name,sector,description)").eq("territory_id", territoryId).limit(20),
    s.from("service_territories").select("service_id, services(id,title,description,price_amount,price_currency)").eq("territory_id", territoryId).limit(20),
    s.from("course_territories").select("course_id, courses(id,title,description,level)").eq("territory_id", territoryId).limit(20),
    s.from("territories").select("id,name,level").eq("parent_id", territoryId).eq("is_deleted", false).limit(20),
    fetchMemory(s, territoryId),
  ]);

  // Fractal inference: if memory is sparse, pull from parent + siblings
  let fractalContext: any = null;
  if (memory.length < SPARSE_THRESHOLD && territory.data?.parent_id) {
    const parentMemory = await fetchMemory(s, territory.data.parent_id);
    // Also fetch sibling territories
    const { data: siblings } = await s
      .from("territories")
      .select("id,name")
      .eq("parent_id", territory.data.parent_id)
      .neq("id", territoryId)
      .eq("is_deleted", false)
      .limit(5);

    let siblingMemory: any[] = [];
    if (siblings?.length) {
      const sibIds = siblings.map((sib: any) => sib.id);
      const { data: sibMem } = await s
        .from("territory_memory")
        .select("id,title,content,category,tags,ai_score")
        .in("territory_id", sibIds)
        .eq("visibility", "PUBLIC")
        .order("ai_score", { ascending: false })
        .limit(30);
      siblingMemory = sibMem ?? [];
    }

    fractalContext = {
      note: "This territory has sparse data. The following is contextual data from parent and neighboring territories to aid inference.",
      parentMemory: parentMemory.map((m: any) => ({ title: m.title, content: m.content, category: m.category })),
      siblingTerritories: siblings?.map((s: any) => s.name) ?? [],
      siblingMemory: siblingMemory.map((m: any) => ({ title: m.title, content: m.content, category: m.category })),
    };
  }

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
    services: (services.data ?? []).map((sv: any) => sv.services).filter(Boolean),
    courses: (courses.data ?? []).map((c: any) => c.courses).filter(Boolean),
    memory: memory.map((m: any) => ({
      id: m.id,
      title: m.title,
      content: m.content,
      category: m.category,
      tags: m.tags,
      ai_score: m.ai_score,
    })),
    fractalContext,
  };
}

const STRUCTURED_SYSTEM_PROMPT = `You are the Quest Hub Territorial Intelligence Analyst — an AI that provides deep strategic analysis of territories on a community platform.

A territory is a geographic or thematic region. You analyze all activity within it to surface insights.

You have access to the territory's AI Memory — structured knowledge entries contributed by community members covering economy, history, sociology, culture, infrastructure, risks, opportunities, and more. Use this memory as primary context for your analysis.

If fractalContext is provided, it means this territory has sparse data and you should use data from parent/neighboring territories as contextual hints. When you extrapolate from neighboring data, indicate uncertainty qualitatively, but still provide a coherent synthesis.

Given context about a territory (its quests, guilds, users, companies, services, courses, pods, and memory entries), produce a JSON object with this exact structure:

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
- Draw heavily from the territory memory entries for economic, historical, and sociological insights.
- ONLY output valid JSON, nothing else.`;

const FREEFORM_SYSTEM_PROMPT = `You are the Quest Hub Territorial Intelligence Analyst — an AI that provides deep strategic analysis of territories on a community platform.

You have access to the territory's complete context: quests, guilds, users, companies, services, courses, and most importantly — the AI Memory, a structured knowledge base contributed by community members covering economy, history, sociology, culture, infrastructure, risks, opportunities, and raw notes.

If fractalContext is provided, it means this territory has sparse data and you should use data from parent/neighboring territories as contextual hints. When extrapolating, indicate uncertainty qualitatively but still provide a coherent synthesis.

Analyze the territory based on the user's specific request. Use all available memory and data context. Provide clear, actionable, well-structured analysis in markdown format. Reference specific entities, people, and memory entries when relevant.

Be insightful, concrete, and strategic. Avoid generic advice — ground everything in the territory's actual data.`;

const SUMMARY_SYSTEM_PROMPT = `You are the Quest Hub Territorial Intelligence Analyst. Generate a comprehensive territory description/synthesis.

You will be given a territory's complete context including AI Memory entries, units, and optionally fractal context from neighboring territories.

Generate a rich, well-structured markdown synthesis covering:
1. **Overview** — What this territory is about, its identity and dynamics
2. **Key Actors** — Notable guilds, companies, and active community members
3. **Economic Landscape** — Based on available economic data, services, and quests
4. **Strengths** — What this territory does well
5. **Challenges & Risks** — Current issues and threats
6. **Opportunities** — Actionable opportunities for growth and collaboration

At the end, list which memory entry IDs you used most heavily (as a JSON array of IDs) in this format:
MEMORY_IDS_USED: ["id1", "id2", ...]

If fractalContext is present, you may draw from it but note when insights are inferred from neighboring territories rather than direct data.

Write in a professional but engaging style. Be concrete and reference actual entities.`;

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
    const { territoryId, analysisPrompt, action } = await req.json();
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

    // ── Action: generate-summary ──
    if (action === "generate-summary") {
      const userContent = `Territory: ${ctx.territory.name} (level: ${ctx.territory.level})\n\nTerritory Context:\n${JSON.stringify(ctx, null, 0)}`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SUMMARY_SYSTEM_PROMPT },
            { role: "user", content: userContent },
          ],
        }),
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("AI gateway error:", response.status, t);
        return new Response(JSON.stringify({ error: "AI gateway error" }), {
          status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content ?? "";

      // Extract memory IDs used
      let memoryIdsUsed: string[] = [];
      const idsMatch = raw.match(/MEMORY_IDS_USED:\s*\[([^\]]*)\]/);
      if (idsMatch) {
        try {
          memoryIdsUsed = JSON.parse(`[${idsMatch[1]}]`);
        } catch { /* ignore parse errors */ }
      }

      // Clean the content (remove the MEMORY_IDS_USED line)
      const cleanContent = raw.replace(/MEMORY_IDS_USED:\s*\[.*\]/, "").trim();

      // Store the summary using service role
      const s = sb();
      const { data: existing } = await s
        .from("territory_summaries")
        .select("id")
        .eq("territory_id", territoryId)
        .eq("summary_type", "OVERVIEW")
        .maybeSingle();

      if (existing) {
        await s.from("territory_summaries").update({
          content: cleanContent,
          generated_at: new Date().toISOString(),
          generated_by: "AI",
          based_on_memory_ids: memoryIdsUsed,
        }).eq("id", existing.id);
      } else {
        await s.from("territory_summaries").insert({
          territory_id: territoryId,
          summary_type: "OVERVIEW",
          content: cleanContent,
          generated_by: "AI",
          based_on_memory_ids: memoryIdsUsed,
        });
      }

      // Mark memory entries as used in summary
      if (memoryIdsUsed.length > 0) {
        await s.from("territory_memory")
          .update({ used_in_last_summary_at: new Date().toISOString() })
          .in("id", memoryIdsUsed);
      }

      return new Response(JSON.stringify({
        summary: cleanContent,
        memoryIdsUsed,
        hasFractalContext: !!ctx.fractalContext,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Action: score-memory ──
    if (action === "score-memory") {
      // AI scores a memory entry
      const { memoryId } = await req.json().catch(() => ({}));
      // Not implemented in this iteration — placeholder
      return new Response(JSON.stringify({ message: "Scoring not yet implemented" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Default: analysis (freeform or structured) ──
    const isFreeform = !!analysisPrompt;
    const systemPrompt = isFreeform ? FREEFORM_SYSTEM_PROMPT : STRUCTURED_SYSTEM_PROMPT;
    const userContent = isFreeform
      ? `Territory: ${ctx.territory.name} (level: ${ctx.territory.level})\n\nUser request: ${analysisPrompt}\n\nTerritory Context:\n${JSON.stringify(ctx, null, 0)}`
      : `Territory: ${ctx.territory.name} (level: ${ctx.territory.level})\n\nContext:\n${JSON.stringify(ctx, null, 0)}`;

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
          { role: "user", content: userContent },
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

    if (isFreeform) {
      return new Response(JSON.stringify({ analysisResponse: raw }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Structured mode: parse JSON
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
