import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { selections, freeText, topics } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // If no AI key, use heuristic
    if (!LOVABLE_API_KEY) {
      const persona = heuristic(selections);
      return json({ persona, confidence: 0.6, source: "onboarding_heuristic" });
    }

    const prompt = `Based on the following user onboarding answers, classify them into exactly one of: IMPACT, CREATIVE, or HYBRID.

Selections (multi-choice): ${JSON.stringify(selections)}
Free-text description: "${freeText || ""}"
Selected topics/houses: ${JSON.stringify(topics || [])}

Respond with ONLY a JSON object:
{"persona": "IMPACT"|"CREATIVE"|"HYBRID", "confidence": 0.0-1.0}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You classify users into persona types. Respond with only valid JSON." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      // Fallback to heuristic
      const persona = heuristic(selections);
      return json({ persona, confidence: 0.5, source: "onboarding_heuristic" });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content ?? "";

    try {
      const match = raw.match(/\{[\s\S]*\}/);
      const parsed = match ? JSON.parse(match[0]) : null;
      if (parsed?.persona && ["IMPACT", "CREATIVE", "HYBRID"].includes(parsed.persona)) {
        return json({ persona: parsed.persona, confidence: parsed.confidence || 0.8, source: "onboarding_ai" });
      }
    } catch { /* fallthrough */ }

    const persona = heuristic(selections);
    return json({ persona, confidence: 0.5, source: "onboarding_heuristic" });
  } catch (e) {
    console.error("infer-persona error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function heuristic(selections: string[]): string {
  const s = (selections || []).map((x: string) => x.toLowerCase());
  const hasWork = s.some(x => x.includes("work") || x.includes("mission") || x.includes("impact") || x.includes("consulting"));
  const hasCreative = s.some(x => x.includes("creative") || x.includes("art") || x.includes("writing") || x.includes("performance"));
  if (hasWork && hasCreative) return "HYBRID";
  if (hasWork) return "IMPACT";
  if (hasCreative) return "CREATIVE";
  return "HYBRID"; // default to hybrid if unclear
}

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
