import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { resumeText, linkedinUrl, pastedDescription, existingProfile } = await req.json();

    const inputs: string[] = [];
    if (resumeText) inputs.push(`RESUME CONTENT:\n${resumeText.slice(0, 8000)}`);
    if (linkedinUrl) inputs.push(`LINKEDIN URL: ${linkedinUrl}\n(Please infer what you can from the URL structure — name, company, role.)`);
    if (pastedDescription) inputs.push(`USER-PROVIDED DESCRIPTION:\n${pastedDescription.slice(0, 6000)}`);

    if (inputs.length === 0) {
      return new Response(JSON.stringify({ error: "No input provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const existingContext = existingProfile
      ? `\nEXISTING PROFILE (DO NOT lose any of this information — only enhance):\nName: ${existingProfile.name || ""}\nBio: ${existingProfile.bio || ""}\nHeadline: ${existingProfile.headline || ""}\nTopics: ${(existingProfile.topics || []).join(", ")}\nTerritories: ${(existingProfile.territories || []).join(", ")}\n`
      : "";

    const systemPrompt = `You are Pulse, the Living Guide of the Changethegame ecosystem — a regenerative collaboration platform.
Your role: help users build a compelling public profile (vitrine/showcase) from their resume, LinkedIn, or self-description.

CRITICAL RULES:
1. NEVER delete or overwrite existing profile data. Only ENHANCE and COMPLEMENT.
2. Propose suggestions the user can accept, reject, or modify.
3. Be warm, regenerative in tone — like a gardener helping something grow, not a corporate optimizer.
4. Match tone to the user's apparent style (academic → precise, activist → poetic, institutional → structured).

OUTPUT FORMAT — Return a valid JSON object with these fields:
{
  "bioVariants": {
    "short": "3-line bio",
    "medium": "About section paragraph",
    "narrative": "Storytelling version"
  },
  "headline": "Suggested headline",
  "suggestedTopics": ["topic1", "topic2", ...],
  "suggestedTerritories": ["territory1", "territory2", ...],
  "detectedOrganizations": [
    { "name": "Org Name", "role": "Role held", "type": "company|ngo|academic|public_sector|foundation|cooperative", "isCurrent": true/false }
  ],
  "suggestedCompletedQuests": [
    { "title": "Quest title describing past achievement", "description": "Brief description" }
  ],
  "suggestedOpenQuests": [
    { "title": "Dream quest or ongoing project", "description": "Brief description" }
  ],
  "skills": ["skill1", "skill2", ...],
  "pulseMessage": "A warm, personalized message from Pulse summarizing what was found and encouraging next steps"
}`;

    const userMessage = `${existingContext}\n\nHere is the information provided by the user:\n\n${inputs.join("\n\n---\n\n")}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "profile_enrichment",
              description: "Return structured profile enrichment suggestions",
              parameters: {
                type: "object",
                properties: {
                  bioVariants: {
                    type: "object",
                    properties: {
                      short: { type: "string" },
                      medium: { type: "string" },
                      narrative: { type: "string" },
                    },
                    required: ["short", "medium", "narrative"],
                  },
                  headline: { type: "string" },
                  suggestedTopics: { type: "array", items: { type: "string" } },
                  suggestedTerritories: { type: "array", items: { type: "string" } },
                  detectedOrganizations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        role: { type: "string" },
                        type: { type: "string" },
                        isCurrent: { type: "boolean" },
                      },
                      required: ["name", "role", "type", "isCurrent"],
                    },
                  },
                  suggestedCompletedQuests: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                      },
                      required: ["title", "description"],
                    },
                  },
                  suggestedOpenQuests: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                      },
                      required: ["title", "description"],
                    },
                  },
                  skills: { type: "array", items: { type: "string" } },
                  pulseMessage: { type: "string" },
                },
                required: [
                  "bioVariants",
                  "headline",
                  "suggestedTopics",
                  "suggestedTerritories",
                  "detectedOrganizations",
                  "suggestedCompletedQuests",
                  "suggestedOpenQuests",
                  "skills",
                  "pulseMessage",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "profile_enrichment" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited — please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      // Fallback: try parsing content directly
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        try {
          const parsed = JSON.parse(content);
          return new Response(JSON.stringify(parsed), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch {
          return new Response(JSON.stringify({ error: "AI returned unexpected format", raw: content }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      throw new Error("No tool call in response");
    }

    const result = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("profile-enrichment error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
