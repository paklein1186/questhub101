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
    const {
      persona,
      name,
      headline,
      bio,
      links,
      manualAffiliations,
      selectedHouseIds,
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch existing guilds & companies for fuzzy matching context
    const [{ data: guilds }, { data: companies }, { data: topics }] = await Promise.all([
      supabase.from("guilds").select("id, name, type").eq("is_deleted", false).eq("is_approved", true).limit(200),
      supabase.from("companies").select("id, name, sector").eq("is_deleted", false).limit(200),
      supabase.from("topics").select("id, name, slug").limit(100),
    ]);

    const personaLabel =
      persona === "CREATIVE" ? "creative" : persona === "IMPACT" ? "impact" : "hybrid";

    const linksStr = [links?.website, links?.linkedin, links?.other].filter(Boolean).join(", ");
    const affiliationsStr = manualAffiliations
      ?.map((a: any) => `${a.name} (role: ${a.role || "unspecified"})`)
      .join("; ") || "none provided";

    const existingEntities = [
      ...(guilds || []).map((g: any) => `Guild: "${g.name}" (id:${g.id})`),
      ...(companies || []).map((c: any) => `Company: "${c.name}" (id:${c.id})`),
    ].join("\n");

    const topicsList = (topics || []).map((t: any) => `"${t.name}" (id:${t.id})`).join(", ");

    const systemPrompt = `You are an onboarding assistant for a collaborative platform called "changethegame". 
The user's persona is "${personaLabel}".

Your job is to analyze the user's profile info, links, and stated affiliations, then suggest:
1. Likely organizational affiliations (matching existing platform entities when possible)
2. Additional relevant Houses/topics they might be interested in
3. 1-2 draft services/skill sessions they could offer

Available guilds and companies on the platform:
${existingEntities}

Available topics/houses:
${topicsList}

The user's currently selected house IDs: ${JSON.stringify(selectedHouseIds || [])}

Respond ONLY with a JSON object using this exact structure (no markdown, no explanation):
{
  "suggestedAffiliations": [
    { "name": "string", "matchedEntityId": "string or null", "matchedEntityType": "GUILD or COMPANY or null", "role": "string or null", "confidence": 0.0-1.0 }
  ],
  "suggestedHouses": [
    { "topicId": "string", "topicName": "string", "reason": "short explanation", "confidence": 0.0-1.0 }
  ],
  "suggestedServices": [
    { "title": "string", "description": "1-3 sentences", "tags": ["string"] }
  ]
}

Rules:
- For affiliations, try to match user-provided names against existing guilds/companies. If a match seems likely (>70% name similarity), include the matchedEntityId.
- For houses, only suggest topics NOT already in the user's selected list.
- For services, adapt language to persona: creative="skill session", impact="service", hybrid="offering".
- Keep suggestions practical and grounded in what the user shared.
- Return 0-3 affiliations, 0-4 houses, and 1-2 services.`;

    const userPrompt = `User info:
- Name: ${name || "not provided"}
- Headline: ${headline || "not provided"}
- Bio: ${bio || "not provided"}
- Links: ${linksStr || "none"}
- Manual affiliations: ${affiliationsStr}
- Persona: ${personaLabel}`;

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
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";

    // Parse JSON from AI response (strip markdown fences if present)
    let parsed;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      parsed = { suggestedAffiliations: [], suggestedHouses: [], suggestedServices: [] };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("onboarding-suggest error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
